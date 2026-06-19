import { createAdminClient } from '@/lib/supabase/admin'
import type { ContentTier } from '@/lib/types'

export interface RelatedStore {
  id:   string
  name: string
  slug: string
}

export interface RelatedCategory {
  name: string
  slug: string
}

export interface StoreFacts {
  // From Supabase
  id:           string
  name:         string
  slug:         string
  affiliate_url: string | null
  coupon_count: number
  click_count:  number
  tier:         ContentTier

  // Coupon snapshot
  activeCouponTypes:  string[]   // e.g. ['code', 'deal', 'shipping']
  discountRange:      { min: number | null; max: number | null }
  sampleCoupons:      { title: string; code: string | null; discount_value: string | null }[]

  // Categories
  categories: RelatedCategory[]

  // Related stores for internal linking
  relatedStores: RelatedStore[]

  // From Firecrawl (null if scrape failed)
  scraped: ScrapedFacts | null
  scrapeError: string | null
}

export interface ScrapedFacts {
  pageTitle:       string | null
  metaDescription: string | null
  mainText:        string        // first ~1000 chars of visible body text
  productCategories: string[]    // extracted product/category mentions
  brandPositioning:  string | null
}

// ─── Tier assignment ─────────────────────────────────────────────────────────
export function assignTier(coupon_count: number, click_count: number): ContentTier {
  const score = coupon_count * 2 + click_count * 5
  if (score >= 500 || coupon_count >= 15) return 'premium'
  if (score >= 100 || coupon_count >= 5)  return 'standard'
  return 'light'
}

// ─── Firecrawl scrape ─────────────────────────────────────────────────────────
async function scrapeStore(url: string): Promise<ScrapedFacts | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey || !url) return null

  try {
    // Resolve affiliate URL to final destination domain for scraping
    const target = url.startsWith('http') ? url : `https://${url}`

    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method:  'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url:     target,
        formats: ['markdown', 'links'],
        actions: [],
        onlyMainContent: true,
        timeout: 20000,
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null

    const md:   string = data.data?.markdown ?? ''
    const meta: Record<string, string> = data.data?.metadata ?? {}

    // Extract first ~1000 chars of meaningful text from markdown
    const mainText = md
      .replace(/!\[.*?\]\(.*?\)/g, '')    // remove images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // flatten links
      .replace(/#{1,6}\s*/g, '')           // remove headings markers
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')  // remove bold/italic
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 1200)

    // Try to extract product category mentions
    const catPatterns = /\b(vêtements?|chaussures?|électronique?s?|beauté|cosmétique|voyages?|sport|cuisine|jardinage|jouets?|livres?|mode|maison|décoration|informatique|high.?tech|accessoires?)\b/gi
    const catMatches = Array.from(mainText.matchAll(catPatterns)).map(m => m[1].toLowerCase())
    const productCategories = Array.from(new Set(catMatches)).slice(0, 6)

    // Brand positioning: first sentence of the meta description or first paragraph
    const brandPositioning = (meta.description ?? '').slice(0, 300) || null

    return {
      pageTitle:        meta.title ?? null,
      metaDescription:  meta.description ?? null,
      mainText,
      productCategories,
      brandPositioning,
    }
  } catch {
    return null
  }
}

// ─── Main gather function ─────────────────────────────────────────────────────
export async function gatherStoreFacts(storeId: string): Promise<StoreFacts> {
  const supabase = createAdminClient()

  // 1. Fetch the store
  const { data: store } = await supabase
    .from('stores')
    .select('id,name,slug,affiliate_url,coupon_count,click_count')
    .eq('id', storeId)
    .single()
  if (!store) throw new Error(`Store not found: ${storeId}`)

  const tier = assignTier(store.coupon_count, store.click_count)

  // 2. Active coupons snapshot
  const today = new Date().toISOString().split('T')[0]
  const { data: coupons } = await supabase
    .from('coupons')
    .select('title,code,type,discount_value')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .limit(20)

  const couponRows = coupons ?? []
  const activeCouponTypes = Array.from(new Set(couponRows.map(c => c.type).filter(Boolean))) as string[]
  const discountNums = couponRows
    .map(c => parseFloat((c.discount_value ?? '').replace('%','').replace('€','').replace(',','.')))
    .filter(n => !isNaN(n) && n > 0)
  const discountRange = {
    min: discountNums.length ? Math.min(...discountNums) : null,
    max: discountNums.length ? Math.max(...discountNums) : null,
  }
  const sampleCoupons = couponRows.slice(0, 4).map(c => ({
    title: c.title, code: c.code, discount_value: c.discount_value,
  }))

  // 3. Categories for this store
  const { data: scData } = await supabase
    .from('store_categories')
    .select('category:categories(name,slug)')
    .eq('store_id', storeId)
    .limit(5)
  const categories: RelatedCategory[] = (scData ?? [])
    .map(r => r.category as unknown as { name: string; slug: string } | null)
    .filter((c): c is RelatedCategory => c !== null && typeof c === 'object')

  // 4. Related stores: same category, prefer is_indexed=true, similar coupon count
  let relatedStores: RelatedStore[] = []
  if (categories.length > 0) {
    const { data: catStores } = await supabase
      .from('store_categories')
      .select('store_id')
      .eq('category_id', (
        await supabase
          .from('categories')
          .select('id')
          .eq('slug', categories[0].slug)
          .single()
      ).data?.id ?? '')
      .neq('store_id', storeId)
      .limit(50)

    const storeIds = Array.from(new Set((catStores ?? []).map(r => r.store_id)))
    if (storeIds.length > 0) {
      const { data: related } = await supabase
        .from('stores')
        .select('id,name,slug,is_indexed,coupon_count')
        .in('id', storeIds)
        .eq('is_active', true)
        .order('is_indexed', { ascending: false })
        .order('coupon_count', { ascending: false })
        .limit(4)
      relatedStores = (related ?? []).map(s => ({ id: s.id, name: s.name, slug: s.slug }))
    }
  }

  // 5. Firecrawl scrape (best-effort — never throws)
  let scraped: ScrapedFacts | null = null
  let scrapeError: string | null   = null
  try {
    if (store.affiliate_url) {
      scraped = await scrapeStore(store.affiliate_url)
      if (!scraped) scrapeError = 'Scrape returned no data'
    } else {
      scrapeError = 'No affiliate_url available'
    }
  } catch (e: unknown) {
    scrapeError = (e as Error).message
  }

  return {
    id:               store.id,
    name:             store.name,
    slug:             store.slug,
    affiliate_url:    store.affiliate_url,
    coupon_count:     store.coupon_count,
    click_count:      store.click_count,
    tier,
    activeCouponTypes,
    discountRange,
    sampleCoupons,
    categories,
    relatedStores,
    scraped,
    scrapeError,
  }
}
