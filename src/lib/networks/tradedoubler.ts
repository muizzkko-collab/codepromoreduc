import type { NetworkCoupon, NetworkMerchant } from './types'

const VOUCHER_TOKEN = process.env.TRADEDOUBLER_VOUCHERS_TOKEN!
const SITE_ID       = process.env.TRADEDOUBLER_SITE_ID!
const BASE          = 'https://api.tradedoubler.com/1.0'

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'))
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : ''
}

function parseVoucher(chunk: string): NetworkCoupon | null {
  const id          = extractTag(chunk, 'id')
  const programId   = extractTag(chunk, 'programId')
  const code        = extractTag(chunk, 'code')
  const title       = extractTag(chunk, 'title')
  const description = extractTag(chunk, 'description')
  const trackUri    = extractTag(chunk, 'defaultTrackUri')
  const endDateRaw  = extractTag(chunk, 'endDate')
  const discountAmt = parseFloat(extractTag(chunk, 'discountAmount') || '0')
  const isPercent   = extractTag(chunk, 'isPercentage') === 'true'
  const exclusive   = extractTag(chunk, 'exclusive') === 'true'
  const typeId      = extractTag(chunk, 'voucherTypeId')

  if (!id || !programId || !trackUri) return null

  let expiry: string | null = null
  if (endDateRaw) {
    const ms = parseInt(endDateRaw)
    if (!isNaN(ms) && ms > 0) {
      expiry = new Date(ms).toISOString().split('T')[0]
    }
  }

  let type: NetworkCoupon['type'] = 'deal'
  if (typeId === '1') type = 'code'
  else if (typeId === '3') type = 'shipping'
  else if (code) type = 'code'

  return {
    network:             'tradedoubler',
    network_coupon_id:   id,
    network_merchant_id: programId,
    title:               title || 'Promotion Tradedoubler',
    description:         description || null,
    code:                code || null,
    type,
    discount_value:      discountAmt > 0 ? discountAmt : null,
    discount_type:       discountAmt > 0 ? (isPercent ? 'percent' : 'fixed') : null,
    destination_url:     trackUri,
    expiry_date:         expiry,
    is_exclusive:        exclusive,
  }
}

export async function getPromotions(merchantId?: string): Promise<NetworkCoupon[]> {
  const pageSize = 100
  const results: NetworkCoupon[] = []
  let page = 1

  // Tradedoubler vouchers endpoint — programId filter if provided
  const programFilter = merchantId ? `;programId=${merchantId}` : ''

  while (true) {
    const url = `${BASE}/vouchers;fid=${SITE_ID}${programFilter}?token=${VOUCHER_TOKEN}&pageSize=${pageSize}&page=${page}`
    const res = await fetch(url)
    if (!res.ok) break
    const xml = await res.text()

    const chunks = xml.split('</voucher>')
    let found = 0
    for (const chunk of chunks) {
      const start = chunk.indexOf('<voucher')
      if (start === -1) continue
      const v = parseVoucher(chunk.slice(start))
      if (v) { results.push(v); found++ }
    }

    if (found < pageSize) break
    page++
    if (page > 20) break  // safety cap: 2,000 vouchers max
  }

  return results
}

export async function getMerchants(): Promise<NetworkMerchant[]> {
  // Tradedoubler programmes endpoint requires a different auth token type (OAuth)
  // which is not yet configured. Return empty until token is obtained.
  return []
}

export async function searchMerchant(name: string): Promise<NetworkMerchant[]> {
  const all = await getMerchants()
  const q   = name.toLowerCase()
  return all.filter(m => m.name.toLowerCase().includes(q))
}
