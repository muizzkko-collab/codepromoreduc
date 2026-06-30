import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { searchProgrammes, getStoreCoupons, mapPromoToCoupon } from '@/lib/awin'
import { searchMerchant as kwankoSearch, getPromotions as kwankoPromos } from '@/lib/networks/kwanko'
import { searchMerchant as effSearch, getPromotions as effPromos } from '@/lib/networks/effiliation'
import { searchMerchant as tdSearch } from '@/lib/networks/tradedoubler'

export interface NetworkStoreResult {
  found: boolean
  source: 'awin' | 'kwanko' | 'effiliation' | 'tradedoubler' | null
  name: string
  logo_url: string | null
  affiliate_url: string | null
  website_url: string | null
  awin_id: string | null
  network_merchant_ids: Record<string, string>
  coupons: Array<{ title: string; code: string | null; discount: string | null; type: string }>
}

export async function GET(req: NextRequest) {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'auto_add') && !hasPermission(profile, 'stores')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ error: 'Query too short' }, { status: 400 })

  // Search all networks in parallel
  const [awinRes, kwRes, effRes, tdRes] = await Promise.allSettled([
    searchProgrammes(q),
    kwankoSearch(q).catch(() => []),
    effSearch(q).catch(() => []),
    tdSearch(q).catch(() => []),
  ])

  const awin   = awinRes.status === 'fulfilled' ? awinRes.value : []
  const kwanko = kwRes.status   === 'fulfilled' ? kwRes.value   : []
  const eff    = effRes.status  === 'fulfilled' ? effRes.value  : []
  const td     = tdRes.status   === 'fulfilled' ? tdRes.value   : []

  // Priority: Awin > Kwanko > Effiliation > Tradedoubler
  if (awin.length > 0) {
    const m = awin[0]
    let coupons: NetworkStoreResult['coupons'] = []
    try {
      const promos = await getStoreCoupons(m.id)
      coupons = promos.slice(0, 20).map(p => {
        const c = mapPromoToCoupon(p)
        return { title: c.title, code: c.code, discount: c.discount_value, type: c.type }
      })
    } catch {}
    return NextResponse.json({
      store: {
        found: true, source: 'awin',
        name: m.name, logo_url: m.logoUrl ?? null,
        affiliate_url: m.clickThroughUrl ?? null, website_url: m.displayUrl ?? null,
        awin_id: String(m.id), network_merchant_ids: {},
        coupons,
      } satisfies NetworkStoreResult,
    })
  }

  if (kwanko.length > 0) {
    const m = kwanko[0]
    let coupons: NetworkStoreResult['coupons'] = []
    try {
      const promos = await kwankoPromos(m.id)
      coupons = promos.slice(0, 20).map(p => ({
        title: p.title, code: p.code,
        discount: p.discount_value ? `${p.discount_value}${p.discount_type === 'percent' ? '%' : '€'}` : null,
        type: p.type,
      }))
    } catch {}
    return NextResponse.json({
      store: {
        found: true, source: 'kwanko',
        name: m.name, logo_url: m.logo_url, affiliate_url: null, website_url: m.website_url,
        awin_id: null, network_merchant_ids: { kwanko: m.id },
        coupons,
      } satisfies NetworkStoreResult,
    })
  }

  if (eff.length > 0) {
    const m = eff[0]
    let coupons: NetworkStoreResult['coupons'] = []
    try {
      const promos = await effPromos(m.id)
      coupons = promos.slice(0, 20).map(p => ({
        title: p.title, code: p.code,
        discount: p.discount_value ? `${p.discount_value}${p.discount_type === 'percent' ? '%' : '€'}` : null,
        type: p.type,
      }))
    } catch {}
    return NextResponse.json({
      store: {
        found: true, source: 'effiliation',
        name: m.name, logo_url: m.logo_url, affiliate_url: m.join_url, website_url: m.website_url,
        awin_id: null, network_merchant_ids: { effiliation: m.id },
        coupons,
      } satisfies NetworkStoreResult,
    })
  }

  if (td.length > 0) {
    const m = td[0]
    return NextResponse.json({
      store: {
        found: true, source: 'tradedoubler',
        name: m.name, logo_url: m.logo_url, affiliate_url: m.join_url, website_url: m.website_url,
        awin_id: null, network_merchant_ids: { tradedoubler: m.id },
        coupons: [],
      } satisfies NetworkStoreResult,
    })
  }

  // Not found in any network
  return NextResponse.json({
    store: {
      found: false, source: null,
      name: q, logo_url: null, affiliate_url: null, website_url: null,
      awin_id: null, network_merchant_ids: {},
      coupons: [],
    } satisfies NetworkStoreResult,
  })
}
