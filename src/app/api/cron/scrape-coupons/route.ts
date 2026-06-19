/**
 * Weekly scraper for stores NOT linked to Awin.
 * Fetches coupon data from public coupon aggregator pages
 * using simple HTML extraction (no browser required).
 *
 * Runs every Sunday at 4am UTC (5am Paris).
 * Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300

const UA = 'Mozilla/5.0 (compatible; codepromoreduc-bot/1.0)'

interface ScrapedCoupon {
  title:           string
  code:            string | null
  discount_value:  string | null
  expiry_date:     string | null
  is_free_shipping:boolean
}

// ── Scraper: ma-reduction.fr ─────────────────────────────────
async function scrapeMaReduction(slug: string): Promise<ScrapedCoupon[]> {
  const url = `https://www.ma-reduction.fr/${slug}/`
  let html: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    html = await res.text()
  } catch {
    return []
  }

  const coupons: ScrapedCoupon[] = []

  // Extract coupon blocks — look for patterns in the HTML
  // Pattern: code blocks usually contain a <code> or data-code attribute
  const codeMatches  = Array.from(html.matchAll(/data-code="([^"]{3,30})"/g))
  const titleMatches = Array.from(html.matchAll(/class="[^"]*promo[^"]*title[^"]*"[^>]*>([^<]{10,120})</gi))
  const discountMatches = Array.from(html.matchAll(/(-?\d+\s*%|-?\d+\s*€\s*(?:de\s+r[eé]duction)?)/gi))

  const codes = codeMatches.map(m => m[1]).slice(0, 20)
  const titles = titleMatches.map(m => m[1].trim()).filter(Boolean).slice(0, 20)
  const discounts = discountMatches.map(m => m[1].trim()).slice(0, 20)

  const count = Math.max(codes.length, titles.length, 1)
  for (let i = 0; i < Math.min(count, 15); i++) {
    const title = titles[i] ?? `Code promo ${slug}`
    const code  = codes[i] ?? null
    const dv    = discounts[i] ?? null
    if (!title && !code) continue
    coupons.push({
      title,
      code,
      discount_value:   dv,
      expiry_date:      null,
      is_free_shipping: title.toLowerCase().includes('livraison'),
    })
  }

  return coupons
}

// ── Scraper: poulpeo.com ──────────────────────────────────────
async function scrapePoulpeo(slug: string): Promise<ScrapedCoupon[]> {
  const url = `https://www.poulpeo.com/boutique/${slug}/`
  let html: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    html = await res.text()
  } catch {
    return []
  }

  const coupons: ScrapedCoupon[] = []

  // Extract code coupon blocks
  const blocks = Array.from(html.matchAll(/<[^>]*class="[^"]*code[^"]*coupon[^"]*"[^>]*>([\s\S]{0,500}?)<\/[^>]+>/gi))
  for (const block of blocks) {
    const inner = block[1]
    const codeM = inner.match(/([A-Z0-9\-]{4,20})/)
    const titleM = inner.match(/<[^>]*>(.*?)<\/[^>]*>/)
    const discM  = inner.match(/(\d+\s*%|\d+\s*€)/)
    if (!codeM && !titleM) continue
    coupons.push({
      title:           (titleM?.[1] ?? `Code promo ${slug}`).replace(/<[^>]*>/g, '').trim(),
      code:            codeM?.[1] ?? null,
      discount_value:  discM?.[1] ?? null,
      expiry_date:     null,
      is_free_shipping:false,
    })
    if (coupons.length >= 10) break
  }

  return coupons
}

async function scrapeCoupons(storeName: string, storeSlug: string): Promise<ScrapedCoupon[]> {
  const slug = storeSlug.replace(/[^a-z0-9-]/g, '')
  const [mr, pp] = await Promise.all([
    scrapeMaReduction(slug),
    scrapePoulpeo(slug),
  ])

  // Merge, deduplicate by code
  const seen = new Set<string>()
  const all  = [...mr, ...pp].filter(c => {
    const key = c.code ?? c.title
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return all.slice(0, 20)
}

// ── Route handler ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const start    = Date.now()

  const { data: logRow } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', sync_type: 'scraper' })
    .select()
    .single()
  const logId = logRow?.id

  let totalAdded = 0, storesSynced = 0, storesFailed = 0

  try {
    // Get stores without Awin ID — limit to active ones with low coupon count
    const { data: stores } = await supabase
      .from('stores')
      .select('id,name,slug,coupon_count')
      .is('awin_merchant_id', null)
      .eq('is_active', true)
      .lte('coupon_count', 5)          // Focus on stores with few/no coupons
      .order('coupon_count', { ascending: true })
      .limit(50)                        // Process max 50 per run

    if (!stores?.length) {
      await supabase.from('sync_logs').update({
        status: 'success', sync_type: 'scraper', coupons_added: 0, duration_ms: Date.now() - start,
      }).eq('id', logId ?? '')
      return NextResponse.json({ message: 'No stores to scrape' })
    }

    for (const store of stores) {
      try {
        const scraped = await scrapeCoupons(store.name, store.slug)
        let added = 0

        for (const coupon of scraped) {
          // Skip if a very similar coupon already exists
          if (coupon.code) {
            const { count } = await supabase
              .from('coupons')
              .select('*', { count: 'exact', head: true })
              .eq('store_id', store.id)
              .eq('code', coupon.code)
            if ((count ?? 0) > 0) continue
          }

          const { error } = await supabase.from('coupons').insert({
            store_id:         store.id,
            title:            coupon.title,
            code:             coupon.code,
            type:             coupon.code ? 'code' : 'deal',
            discount_value:   coupon.discount_value,
            expiry_date:      coupon.expiry_date,
            destination_url:  null,
            is_active:        true,
            is_free_shipping: coupon.is_free_shipping,
            scraper_source:   'poulpeo+ma-reduction',
          })
          if (!error) added++
        }

        totalAdded += added
        storesSynced++
      } catch {
        storesFailed++
      }

      // Polite delay between stores
      await new Promise(r => setTimeout(r, 200))
    }

    await supabase.from('sync_logs').update({
      status:        'success',
      sync_type:     'scraper',
      coupons_added: totalAdded,
      stores_synced: storesSynced,
      stores_failed: storesFailed,
      duration_ms:   Date.now() - start,
    }).eq('id', logId ?? '')

    return NextResponse.json({ added: totalAdded, stores: storesSynced, failed: storesFailed })
  } catch (e: unknown) {
    await supabase.from('sync_logs').update({
      status: 'error', error_message: (e as Error).message, duration_ms: Date.now() - start,
    }).eq('id', logId ?? '')
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
