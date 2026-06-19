const AWIN_BASE = 'https://api.awin.com'
const PUB_ID    = process.env.AWIN_PUBLISHER_ID ?? '857351'
const API_KEY   = process.env.AWIN_API_KEY ?? ''

export interface AwinPromotion {
  promotionId:    number
  advertiserName: string
  advertiserId:   number
  promotionName:  string
  description:    string | null
  code:           string | null
  startDate:      string | null
  endDate:        string | null
  clickThroughUrl:string | null
  discountAmount: number | null
  discountType:   'percent' | 'absolute' | null
  promotionType:  string
}

export interface AwinProgramme {
  id:             number
  name:           string
  logoUrl:        string | null
  clickThroughUrl:string | null
  displayUrl:     string | null
}

export interface MappedCoupon {
  awin_promo_id:    string
  title:            string
  code:             string | null
  type:             'code' | 'deal'
  discount_value:   string | null
  destination_url:  string | null
  expiry_date:      string | null
  is_active:        boolean
  is_free_shipping: boolean
  scraper_source:   null
}

function authHeaders() {
  return { Authorization: `Bearer ${API_KEY}` }
}

export async function getAllMerchants(): Promise<AwinProgramme[]> {
  const res = await fetch(
    `${AWIN_BASE}/publishers/${PUB_ID}/programmes?relationship=joined&countryCode=FR`,
    { headers: authHeaders(), next: { revalidate: 3600 } }
  )
  if (!res.ok) throw new Error(`Awin programmes error: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : (data.programmes ?? [])
}

export async function getStoreCoupons(merchantId: number): Promise<AwinPromotion[]> {
  const res = await fetch(
    `${AWIN_BASE}/publishers/${PUB_ID}/promotions?countryCode=FR&advertiserId=${merchantId}`,
    { headers: authHeaders() }
  )
  if (!res.ok) throw new Error(`Awin promotions error: ${res.status} for merchant ${merchantId}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getStoreByName(name: string): Promise<AwinProgramme | null> {
  const merchants = await getAllMerchants()
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const n = norm(name)
  return merchants.find(m => {
    const mn = norm(m.name)
    return mn === n || mn.includes(n) || n.includes(mn)
  }) ?? null
}

export function mapPromoToCoupon(promo: AwinPromotion): MappedCoupon {
  let discount_value: string | null = null
  if (promo.discountAmount) {
    discount_value = promo.discountType === 'percent'
      ? `${promo.discountAmount}%`
      : `${promo.discountAmount}€`
  }

  const isShipping = (promo.promotionName + (promo.description ?? ''))
    .toLowerCase()
    .includes('livraison')

  return {
    awin_promo_id:    String(promo.promotionId),
    title:            promo.promotionName || promo.description || 'Offre',
    code:             promo.code ?? null,
    type:             promo.code ? 'code' : 'deal',
    discount_value,
    destination_url:  promo.clickThroughUrl ?? null,
    expiry_date:      promo.endDate ? promo.endDate.split('T')[0] : null,
    is_active:        true,
    is_free_shipping: isShipping,
    scraper_source:   null,
  }
}
