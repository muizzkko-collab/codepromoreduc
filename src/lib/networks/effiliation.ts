import type { NetworkCoupon, NetworkMerchant } from './types'

const API_KEY      = process.env.EFFILIATION_API_KEY!
const BASE         = 'https://apiv2.effiliation.com/apiv2'

interface EffProgram {
  id:       string | number
  name:     string
  logo?:    string
  website?: string
  url?:     string
}

interface EffCode {
  id:            string | number
  program_id?:   string | number
  programid?:    string | number
  code?:         string
  title?:        string
  description?:  string
  reduction?:    string | number
  type_reduc?:   string  // 'percent' | 'amount'
  type?:         string  // 'code' | 'deal'
  link?:         string
  url?:          string
  date_fin?:     string
  exclusive?:    string | boolean
}

function toIsoDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  // Common formats: "2026-06-30", "30/06/2026", Unix seconds
  if (/^\d{10}$/.test(raw)) {
    return new Date(parseInt(raw) * 1000).toISOString().split('T')[0]
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/')
    return `${y}-${m}-${d}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  return null
}

export async function getMerchants(): Promise<NetworkMerchant[]> {
  const res = await fetch(`${BASE}/programs.json?key=${API_KEY}&filter=mines&nb=500`)
  if (!res.ok) throw new Error(`Effiliation programs: ${res.status}`)
  const data: EffProgram[] = await res.json()
  return data.map(p => ({
    id:          String(p.id),
    name:        p.name,
    logo_url:    p.logo ?? null,
    website_url: p.website ?? null,
    join_url:    p.url ?? null,
  }))
}

export async function searchMerchant(name: string): Promise<NetworkMerchant[]> {
  const all = await getMerchants()
  const q   = name.toLowerCase()
  return all.filter(m => m.name.toLowerCase().includes(q))
}

export async function getPromotions(merchantId?: string): Promise<NetworkCoupon[]> {
  const results: NetworkCoupon[] = []

  // If filtering by merchant, only fetch codes for that program
  const programFilter = merchantId ? `&program_id=${merchantId}` : ''
  let page = 1

  while (true) {
    const url = `${BASE}/getcodes.json?key=${API_KEY}${programFilter}&nb=200&page=${page}`
    const res = await fetch(url)
    if (!res.ok) break

    let data: EffCode[]
    try { data = await res.json() } catch { break }
    if (!Array.isArray(data) || data.length === 0) break

    for (const c of data) {
      const link = c.link ?? c.url ?? ''
      if (!link) continue

      const pId   = String(c.program_id ?? c.programid ?? '')
      const red   = parseFloat(String(c.reduction ?? '0'))
      const isPC  = (c.type_reduc ?? '') === 'percent'

      let type: NetworkCoupon['type'] = c.code ? 'code' : 'deal'
      if ((c.type ?? '').toLowerCase().includes('livraison')) type = 'shipping'

      results.push({
        network:             'effiliation',
        network_coupon_id:   String(c.id),
        network_merchant_id: pId,
        title:               c.title ?? 'Promotion Effiliation',
        description:         c.description ?? null,
        code:                c.code ?? null,
        type,
        discount_value:      red > 0 ? red : null,
        discount_type:       red > 0 ? (isPC ? 'percent' : 'fixed') : null,
        destination_url:     link,
        expiry_date:         toIsoDate(c.date_fin),
        is_exclusive:        c.exclusive === true || c.exclusive === '1',
      })
    }

    if (data.length < 200) break
    page++
    if (page > 50) break  // safety cap: 10,000 codes
  }

  return results
}
