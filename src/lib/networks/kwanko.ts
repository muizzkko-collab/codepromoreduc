import type { NetworkCoupon, NetworkMerchant } from './types'

const API_KEY    = process.env.KWANKO_API_KEY!
const BASE       = process.env.KWANKO_API_BASE ?? 'https://api.kwanko.com'
// website_per_language id for codepromoreduc FR — found via /publishers/ads response
const CPR_WPL_ID = parseInt(process.env.KWANKO_WEBSITE_PER_LANGUAGE_ID ?? '493471', 10)

interface KwAd {
  id:          string
  type:        string
  name:        string | null
  code:        string | null
  description: string | null
  campaign:    { id: string; name: string }
  validity_date: { start?: string; end?: string }
  tracked_material_per_websites: {
    website_per_language: { id: number; name: string }
    urls: { click: string; display: string }
  }[]
}

interface KwCampaign {
  id:          string | number
  name:        string
  url:         string | null
  logo:        string | null
  description: string | null
  languages:   string[]
}

// Parse discount from name field like "5€", "-10%", "PROMO 15%", etc.
function parseDiscount(name: string | null): { value: number | null; type: 'percent' | 'fixed' | null } {
  if (!name) return { value: null, type: null }
  const pct   = name.match(/(\d+(?:[.,]\d+)?)\s*%/)
  if (pct) return { value: parseFloat(pct[1].replace(',', '.')), type: 'percent' }
  const fixed = name.match(/(\d+(?:[.,]\d+)?)\s*€/)
  if (fixed) return { value: parseFloat(fixed[1].replace(',', '.')), type: 'fixed' }
  return { value: null, type: null }
}

function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null
  return raw.slice(0, 10)  // ISO 8601 → YYYY-MM-DD
}

export async function getMerchants(): Promise<NetworkMerchant[]> {
  const res = await fetch(`${BASE}/publishers/all-campaigns`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) throw new Error(`Kwanko all-campaigns: ${res.status}`)
  const data: { campaigns: KwCampaign[] } = await res.json()

  return (data.campaigns ?? []).map(c => ({
    id:          String(c.id),
    name:        c.name,
    logo_url:    c.logo ?? null,
    website_url: c.url ?? null,
    join_url:    null,
  }))
}

export async function searchMerchant(name: string): Promise<NetworkMerchant[]> {
  const all = await getMerchants()
  const q   = name.toLowerCase()
  return all.filter(m => m.name.toLowerCase().includes(q))
}

export async function getPromotions(merchantId?: string): Promise<NetworkCoupon[]> {
  const res = await fetch(`${BASE}/publishers/ads?ad_types=voucher_code`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) throw new Error(`Kwanko ads: ${res.status}`)
  const data: { ads: KwAd[] } = await res.json()

  const results: NetworkCoupon[] = []

  for (const ad of data.ads ?? []) {
    // Filter by merchant if requested
    if (merchantId && ad.campaign.id !== merchantId) continue

    // Find the tracking URL for codepromoreduc specifically
    const site = ad.tracked_material_per_websites.find(
      w => w.website_per_language.id === CPR_WPL_ID
    )
    const clickUrl = site?.urls?.click ?? ''
    if (!clickUrl) continue  // skip ads not assigned to our site

    const { value, type } = parseDiscount(ad.name)

    results.push({
      network:             'kwanko',
      network_coupon_id:   ad.id,
      network_merchant_id: ad.campaign.id,
      title:               ad.name ?? ad.description ?? 'Promotion Kwanko',
      description:         ad.description ?? null,
      code:                ad.code ?? null,
      type:                'code',
      discount_value:      value,
      discount_type:       type,
      destination_url:     clickUrl,
      expiry_date:         toIsoDate(ad.validity_date?.end),
      is_exclusive:        false,
    })
  }

  return results
}
