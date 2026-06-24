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

// lareduction.fr is Cloudflare-protected (403) — excluded
const TARGET_DOMAINS = ['radins.com', 'reduc.fr', 'ma-reduc.com', 'ouest-france.fr']

// Hard 404/error page indicators — only match in the very first 300 chars (page title area)
const ERROR_PHRASES = ['page introuvable', 'erreur 404', 'page not found', '404 not found']

function isErrorPage(md: string): boolean {
  // Only look in first 300 chars (the page title) to avoid false positives
  const lower = md.toLowerCase().slice(0, 300)
  return ERROR_PHRASES.some(p => lower.includes(p))
}

async function firecrawlScrape(url: string): Promise<string> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'] }),
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) return ''
    const json = await res.json()
    const md = (json?.data?.markdown as string | undefined) ?? ''
    return isErrorPage(md) ? '' : md
  } catch { return '' }
}

// Search Firecrawl for a store's coupon page on a specific domain
async function searchStoreUrl(storeName: string, domain: string): Promise<string> {
  const trySearch = async (query: string): Promise<string> => {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 3 }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return ''
    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (json?.data ?? []) as any[]
    // Return first URL that is domain-specific (not the homepage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hit = results.find((r: any) => {
      const url: string = r.url ?? ''
      return url.includes(domain) && url.length > `https://www.${domain}`.length + 5
    })
    return (hit?.url as string) ?? ''
  }

  // Try 1: exact store name with quotes
  let url = await trySearch(`"${storeName}" code promo site:${domain}`).catch(() => '')

  // Try 2: without quotes (broader match for hyphenated/accented names)
  if (!url) url = await trySearch(`${storeName} code promo réduction site:${domain}`).catch(() => '')

  // Try 3: just the store name on that domain (last resort)
  if (!url) url = await trySearch(`${storeName} site:${domain}`).catch(() => '')

  return url
}

// Search per domain: find the store page URL, then scrape it
async function findAndScrape(storeName: string, domain: string): Promise<string> {
  try {
    const url = await searchStoreUrl(storeName, domain)
    if (!url) return ''
    return await firecrawlScrape(url)
  } catch { return '' }
}

async function scrapeWithFirecrawlAndClaude(storeName: string, _storeSlug: string): Promise<ExtractedCoupon[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Search all 5 target sites in parallel to find their store-specific coupon pages
  const results = await Promise.allSettled(
    TARGET_DOMAINS.map(domain => findAndScrape(storeName, domain))
  )

  const markdownChunks: string[] = []
  results.forEach((r, i) => {
    const md = r.status === 'fulfilled' ? r.value : ''
    if (md.length > 200) {
      // Skip the first 500 chars (usually site header/nav) then take 5000 chars of actual content
      const content = md.length > 500 ? md.slice(500, 5500) : md.slice(0, 5000)
      markdownChunks.push(`[source: ${TARGET_DOMAINS[i]}]\n${content}`)
    }
  })

  if (markdownChunks.length === 0) return []

  const combinedContent = markdownChunks.join('\n\n---\n\n').slice(0, 14000)

  // Step 3 — Claude extracts structured coupons from all the combined content
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
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
  let skipped = 0
  const insertErrors: string[] = []

  for (const coupon of coupons) {
    // Skip duplicates by code
    if (coupon.code) {
      const { count } = await supabase.from('coupons')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId).eq('code', coupon.code).eq('is_active', true)
      if ((count ?? 0) > 0) { skipped++; continue }
    }

    const { error } = await supabase.from('coupons').insert({
      store_id:         storeId,
      title:            coupon.title,
      code:             coupon.code ?? null,
      type:             coupon.type,
      discount_value:   null,
      expiry_date:      coupon.expiry ?? null,
      destination_url:  null,
      is_active:        true,
      is_free_shipping: coupon.type === 'shipping',
      network:          'scraper',
      scraper_source:   'firecrawl+claude',
    })
    if (error) {
      insertErrors.push(`${coupon.title}: ${error.message}`)
    } else {
      added++
    }
  }

  const detail = [
    `${added} added`,
    skipped > 0 ? `${skipped} skipped (duplicate)` : '',
    insertErrors.length > 0 ? `errors: ${insertErrors.slice(0, 2).join('; ')}` : '',
  ].filter(Boolean).join(', ')

  return { store_name: storeName, method: 'scraper', added, updated: 0, deactivated: 0, message: detail || '0 coupons added' }
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
      const networkResult = await syncFromNetwork(store.id, store.name, store.awin_merchant_id, store.network_merchant_ids)
      // If the network returned nothing, fall back to the Firecrawl scraper
      if (networkResult.added === 0 && networkResult.updated === 0) {
        const scraperResult = await syncFromScraper(store.id, store.name, store.slug)
        return {
          data: {
            ...scraperResult,
            message: `Network had no new offers → scraper: ${scraperResult.message}`,
          },
          error: null,
        }
      }
      return { data: networkResult, error: null }
    } else {
      const result = await syncFromScraper(store.id, store.name, store.slug)
      return { data: result, error: null }
    }
  } catch (e: unknown) {
    return { data: null, error: (e as Error).message }
  }
}
