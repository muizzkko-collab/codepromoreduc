'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBulkPromotions, mapPromoToCoupon } from '@/lib/awin'
import { getPromotions as getKwPromotions } from '@/lib/networks/kwanko'
import { getPromotions as getEffPromotions } from '@/lib/networks/effiliation'
import { getPromotions as getTDPromotions } from '@/lib/networks/tradedoubler'
import Anthropic from '@anthropic-ai/sdk'

export interface UpdateResult {
  store_name: string
  method:     'network' | 'scraper'
  added:      number
  updated:    number
  deactivated:number
  message:    string
}

// ── Network sync for a single store ──────────────────────────────────────────

async function syncFromNetwork(storeId: string, storeName: string, awinMerchantId: number | null, networkIds: Record<string, string> | null): Promise<UpdateResult> {
  const supabase = createAdminClient()
  let added = 0, updated = 0, deactivated = 0

  // Awin
  if (awinMerchantId) {
    const promos = await getBulkPromotions([awinMerchantId])
    const { data: existing } = await supabase
      .from('coupons').select('id,awin_promo_id,expiry_date,title')
      .eq('store_id', storeId).eq('is_active', true).not('awin_promo_id', 'is', null)
    const existMap = new Map((existing ?? []).map(c => [c.awin_promo_id, c]))

    for (const promo of promos) {
      const mapped = mapPromoToCoupon(promo)
      const ex = existMap.get(mapped.awin_promo_id)
      if (!ex) {
        const { error } = await supabase.from('coupons').insert({ store_id: storeId, ...mapped })
        if (!error) added++
      } else {
        if (ex.expiry_date !== mapped.expiry_date || ex.title !== mapped.title) {
          await supabase.from('coupons').update({ expiry_date: mapped.expiry_date, title: mapped.title, destination_url: mapped.destination_url }).eq('id', ex.id)
          updated++
        }
        existMap.delete(mapped.awin_promo_id)
      }
    }

    const toDeactivate = Array.from(existMap.values()).map(c => c.id)
    if (toDeactivate.length) {
      await supabase.from('coupons').update({ is_active: false }).in('id', toDeactivate)
      deactivated += toDeactivate.length
    }
  }

  // Other networks (Kwanko, Effiliation, Tradedoubler)
  const networkFns: Array<{ key: string; fn: (id?: string) => Promise<import('@/lib/networks/types').NetworkCoupon[]> }> = [
    { key: 'kwanko', fn: getKwPromotions },
    { key: 'effiliation', fn: getEffPromotions },
    { key: 'tradedoubler', fn: getTDPromotions },
  ]

  for (const { key, fn } of networkFns) {
    const merchantId = networkIds?.[key]
    if (!merchantId) continue

    try {
      const promos = (await fn()).filter(p => p.network_merchant_id === merchantId)
      const { data: existing } = await supabase
        .from('coupons').select('id,network_coupon_id,expiry_date,title')
        .eq('store_id', storeId).eq('is_active', true).eq('network', key)

      const existMap = new Map((existing ?? []).map(c => [c.network_coupon_id, c]))

      for (const promo of promos) {
        const ex = existMap.get(promo.network_coupon_id)
        if (!ex) {
          await supabase.from('coupons').insert({
            store_id: storeId, title: promo.title, description: promo.description,
            code: promo.code, coupon_type: promo.type, discount_value: promo.discount_value,
            discount_type: promo.discount_type, destination_url: promo.destination_url,
            expiry_date: promo.expiry_date, is_exclusive: promo.is_exclusive,
            is_active: true, network: promo.network, network_coupon_id: promo.network_coupon_id,
            network_merchant_id: promo.network_merchant_id,
          })
          added++
        } else {
          if (ex.expiry_date !== promo.expiry_date || ex.title !== promo.title) {
            await supabase.from('coupons').update({ expiry_date: promo.expiry_date, title: promo.title }).eq('id', ex.id)
            updated++
          }
          existMap.delete(promo.network_coupon_id)
        }
      }

      const toDeactivate = Array.from(existMap.values()).map(c => c.id)
      if (toDeactivate.length) {
        await supabase.from('coupons').update({ is_active: false }).in('id', toDeactivate)
        deactivated += toDeactivate.length
      }
    } catch {
      // Network unavailable, skip
    }
  }

  return {
    store_name: storeName,
    method: 'network',
    added, updated, deactivated,
    message: `${added} added, ${updated} updated, ${deactivated} deactivated`,
  }
}

// ── Scraper: Firecrawl + Claude for stores not on any network ────────────────

interface ExtractedCoupon {
  title: string
  code: string | null
  discount: string | null
  type: 'code' | 'deal' | 'shipping'
  expiry: string | null
}

// ── Firecrawl helpers ─────────────────────────────────────────────────────────

async function firecrawlScrape(url: string): Promise<string> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'], waitFor: 2000 }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return ''
    const json = await res.json()
    return (json?.data?.markdown as string | undefined) ?? ''
  } catch { return '' }
}

// Use Firecrawl Search to find the exact coupon page URL on a given domain
async function firecrawlSearch(query: string, limitDomain?: string): Promise<string[]> {
  try {
    const searchQuery = limitDomain ? `site:${limitDomain} ${query}` : query
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery, limit: 3 }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return []
    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((json?.data ?? []) as any[]).map((r: any) => r.url as string).filter(Boolean)
  } catch { return [] }
}

// ── The 5 target coupon sites with their known URL patterns ───────────────────
// Each entry: [domain, urlBuilder]
const COUPON_SITES: Array<{ domain: string; url: (name: string, slug: string) => string }> = [
  { domain: 'lareduction.fr',    url: (_n, s) => `https://www.lareduction.fr/boutique/${s}/` },
  { domain: 'radins.com',        url: (_n, s) => `https://www.radins.com/codes-promo/${s}/` },
  { domain: 'reduc.fr',          url: (_n, s) => `https://www.reduc.fr/boutique/${s}/` },
  { domain: 'ma-reduc.com',      url: (_n, s) => `https://www.ma-reduc.com/codes-promo-${s}.html` },
  { domain: 'ouest-france.fr',   url: (n, _s) => `https://www.ouest-france.fr/bons-plans/code-promo/${encodeURIComponent(n.toLowerCase())}/` },
]

async function scrapeWithFirecrawlAndClaude(storeName: string, storeSlug: string): Promise<ExtractedCoupon[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const markdownChunks: string[] = []

  // Step 1 — try direct URL patterns for all 5 sites in parallel
  const directResults = await Promise.allSettled(
    COUPON_SITES.map(site => firecrawlScrape(site.url(storeName, storeSlug)))
  )
  for (const r of directResults) {
    if (r.status === 'fulfilled' && r.value.length > 300) {
      markdownChunks.push(r.value.slice(0, 3000))
    }
  }

  // Step 2 — for any site that gave no content, search for the correct URL then scrape it
  const missedSites = COUPON_SITES.filter((_, i) => {
    const r = directResults[i]
    return r.status !== 'fulfilled' || r.value.length <= 300
  })

  if (missedSites.length > 0 && markdownChunks.length < 3) {
    const searchQuery = `${storeName} code promo réduction`
    const searchResults = await Promise.allSettled(
      missedSites.map(site => firecrawlSearch(searchQuery, site.domain))
    )
    const foundUrls: string[] = []
    for (const r of searchResults) {
      if (r.status === 'fulfilled') foundUrls.push(...r.value.slice(0, 1))
    }

    // Scrape the found URLs (up to 4)
    const scraped = await Promise.allSettled(
      foundUrls.slice(0, 4).map(url => firecrawlScrape(url))
    )
    for (const r of scraped) {
      if (r.status === 'fulfilled' && r.value.length > 300) {
        markdownChunks.push(r.value.slice(0, 2000))
      }
    }
  }

  if (markdownChunks.length === 0) return []

  const combinedContent = markdownChunks.join('\n\n---\n\n').slice(0, 8000)

  // Step 3 — Claude extracts structured coupons from all the combined content
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are a coupon extraction assistant. Extract ALL valid coupon codes and deals for the store "${storeName}" from the following French coupon website content.

Return ONLY a JSON array with no explanation. Each item must have:
- "title": string — clear description of the offer in French (e.g. "20% de réduction sur tout le site")
- "code": string or null — the exact promo code if present (uppercase), null if no code
- "discount": string or null — the discount amount (e.g. "20%", "10€", "Livraison gratuite")
- "type": "code" if there is a promo code, "shipping" if free delivery, "deal" otherwise
- "expiry": string or null — expiry date as YYYY-MM-DD if found, otherwise null

Rules:
- Skip duplicates (same code or very similar title)
- Skip expired offers if you can tell from the date
- Include deals even without a code
- Max 20 results

Content from French coupon sites:
${combinedContent}

Return only a valid JSON array, nothing else.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0]) as ExtractedCoupon[]
    return Array.isArray(parsed) ? parsed.slice(0, 20) : []
  } catch {
    return []
  }
}

async function syncFromScraper(storeId: string, storeName: string, storeSlug: string): Promise<UpdateResult> {
  const supabase = createAdminClient()

  const coupons = await scrapeWithFirecrawlAndClaude(storeName, storeSlug)

  if (!coupons.length) {
    return { store_name: storeName, method: 'scraper', added: 0, updated: 0, deactivated: 0, message: 'No coupons found on coupon sites' }
  }

  let added = 0

  for (const coupon of coupons) {
    // Skip duplicates by code
    if (coupon.code) {
      const { count } = await supabase.from('coupons')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId).eq('code', coupon.code).eq('is_active', true)
      if ((count ?? 0) > 0) continue
    }

    const { error } = await supabase.from('coupons').insert({
      store_id:        storeId,
      title:           coupon.title,
      code:            coupon.code,
      coupon_type:     coupon.type,
      discount_value:  null,
      expiry_date:     coupon.expiry,
      destination_url: null,
      is_active:       true,
      is_free_shipping: coupon.type === 'shipping',
      network:         'scraper',
      scraper_source:  'firecrawl+claude',
    })
    if (!error) added++
  }

  return { store_name: storeName, method: 'scraper', added, updated: 0, deactivated: 0, message: `${added} coupons scraped and added` }
}

// ── Main exported action ──────────────────────────────────────────────────────

export async function updateStore(storeId: string): Promise<{ data: UpdateResult | null; error: string | null }> {
  const supabase = createAdminClient()

  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .select('id,name,slug,awin_merchant_id,network_merchant_ids')
    .eq('id', storeId)
    .single()

  if (storeErr || !store) return { data: null, error: storeErr?.message ?? 'Store not found' }

  const hasNetwork = store.awin_merchant_id || (store.network_merchant_ids && Object.keys(store.network_merchant_ids).length > 0)

  try {
    if (hasNetwork) {
      const result = await syncFromNetwork(store.id, store.name, store.awin_merchant_id, store.network_merchant_ids)
      return { data: result, error: null }
    } else {
      const result = await syncFromScraper(store.id, store.name, store.slug)
      return { data: result, error: null }
    }
  } catch (e: unknown) {
    return { data: null, error: (e as Error).message }
  }
}
