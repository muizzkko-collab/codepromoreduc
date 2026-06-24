'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBulkPromotions, mapPromoToCoupon } from '@/lib/awin'
import { getPromotions as getKwPromotions } from '@/lib/networks/kwanko'
import { getPromotions as getEffPromotions } from '@/lib/networks/effiliation'
import { getPromotions as getTDPromotions } from '@/lib/networks/tradedoubler'
import Anthropic from '@anthropic-ai/sdk'
import FirecrawlApp from '@mendable/firecrawl-js'

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

const COUPON_SITES = [
  (slug: string) => `https://www.poulpeo.com/boutique/${slug}/`,
  (slug: string) => `https://www.radins.com/codes-promo/${slug}/`,
  (slug: string) => `https://www.bonreduction.com/codes-promo-${slug}.html`,
]

interface ExtractedCoupon {
  title: string
  code: string | null
  discount: string | null
  type: 'code' | 'deal' | 'shipping'
  expiry: string | null
}

async function scrapeWithFirecrawlAndClaude(storeName: string, storeSlug: string): Promise<ExtractedCoupon[]> {
  const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! })
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Try each coupon site until we get content
  let markdown = ''
  for (const urlFn of COUPON_SITES) {
    const url = urlFn(storeSlug)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await firecrawl.scrapeUrl(url, { formats: ['markdown'] })
      if (result?.markdown && (result.markdown as string).length > 200) {
        markdown = result.markdown as string
        break
      }
    } catch {
      continue
    }
  }

  // If Firecrawl failed all sites, try search on radins.com
  if (!markdown) {
    try {
      const searchUrl = `https://www.radins.com/codes-promo/recherche/?q=${encodeURIComponent(storeName)}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await firecrawl.scrapeUrl(searchUrl, { formats: ['markdown'] })
      if (result?.markdown) markdown = result.markdown as string
    } catch {
      return []
    }
  }

  if (!markdown) return []

  // Ask Claude to extract structured coupon data from the markdown
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract all coupon codes and deals for the store "${storeName}" from this page content. Return a JSON array only, no explanation.

Each item must have:
- title: string (short description of the offer)
- code: string or null (the promo code if present)
- discount: string or null (e.g. "20%", "5€", "Livraison gratuite")
- type: "code" | "deal" | "shipping"
- expiry: string or null (date in YYYY-MM-DD format if found, else null)

Page content:
${markdown.slice(0, 6000)}

Return only valid JSON array, nothing else.`,
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
