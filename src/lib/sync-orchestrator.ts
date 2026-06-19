import { createAdminClient }  from '@/lib/supabase/admin'
import { getBulkPromotions, mapPromoToCoupon } from '@/lib/awin'
import { getPromotions as getTDPromotions }    from '@/lib/networks/tradedoubler'
import { getPromotions as getKwPromotions }    from '@/lib/networks/kwanko'
import { getPromotions as getEffPromotions }   from '@/lib/networks/effiliation'
import type { NetworkCoupon } from '@/lib/networks/types'

type Network = 'awin' | 'tradedoubler' | 'kwanko' | 'effiliation'

// Priority order for deduplication — highest priority wins
const PRIORITY: Record<Network, number> = {
  awin: 4, tradedoubler: 3, kwanko: 2, effiliation: 1
}

export interface SyncResult {
  network:    Network
  added:      number
  updated:    number
  deactivated: number
  stores:     number
  errors:     number
  duration_ms: number
  error?:     string
}

interface StoreRow {
  id:               string
  name:             string
  slug:             string
  awin_merchant_id: number | null
  network_merchant_ids: Record<string, string> | null
}

// ─── Map a NetworkCoupon to a coupons table row ───────────────────────────────
function networkCouponToRow(c: NetworkCoupon, storeId: string) {
  return {
    store_id:           storeId,
    title:              c.title,
    description:        c.description,
    code:               c.code,
    coupon_type:        c.type,
    discount_value:     c.discount_value,
    discount_type:      c.discount_type,
    destination_url:    c.destination_url,
    expiry_date:        c.expiry_date,
    is_exclusive:       c.is_exclusive,
    is_active:          true,
    network:            c.network,
    network_coupon_id:  c.network_coupon_id,
    network_merchant_id: c.network_merchant_id,
  }
}

// ─── Awin sync (existing logic, wrapped) ────────────────────────────────────
async function syncAwin(stores: StoreRow[]): Promise<SyncResult> {
  const supabase = createAdminClient()
  const start    = Date.now()
  const result: SyncResult = { network: 'awin', added: 0, updated: 0, deactivated: 0, stores: 0, errors: 0, duration_ms: 0 }

  const awinStores = stores.filter(s => s.awin_merchant_id)
  if (!awinStores.length) return { ...result, duration_ms: Date.now() - start }

  try {
    const merchantIds = awinStores.map(s => s.awin_merchant_id!)
    const allPromos   = await getBulkPromotions(merchantIds)
    const byMerchant  = new Map<number, typeof allPromos>()
    for (const p of allPromos) {
      if (!byMerchant.has(p.advertiserId)) byMerchant.set(p.advertiserId, [])
      byMerchant.get(p.advertiserId)!.push(p)
    }

    for (const store of awinStores) {
      try {
        const promos = byMerchant.get(store.awin_merchant_id!) ?? []
        const { data: existing } = await supabase
          .from('coupons').select('id,awin_promo_id,expiry_date,title')
          .eq('store_id', store.id).eq('is_active', true).not('awin_promo_id', 'is', null)
        const existingMap = new Map((existing ?? []).map(c => [c.awin_promo_id, c]))

        for (const promo of promos) {
          const mapped = mapPromoToCoupon(promo)
          const ex     = existingMap.get(mapped.awin_promo_id)
          if (!ex) {
            const { error } = await supabase.from('coupons').insert({ store_id: store.id, ...mapped })
            if (!error) result.added++
          } else {
            if (ex.expiry_date !== mapped.expiry_date || ex.title !== mapped.title) {
              await supabase.from('coupons')
                .update({ expiry_date: mapped.expiry_date, title: mapped.title, destination_url: mapped.destination_url })
                .eq('id', ex.id)
              result.updated++
            }
            existingMap.delete(mapped.awin_promo_id)
          }
        }

        const toDeactivate = Array.from(existingMap.values()).map(c => c.id)
        if (toDeactivate.length) {
          await supabase.from('coupons').update({ is_active: false }).in('id', toDeactivate)
          result.deactivated += toDeactivate.length
        }
        result.stores++
      } catch { result.errors++ }
    }
  } catch (e: unknown) {
    result.error = (e as Error).message
  }

  return { ...result, duration_ms: Date.now() - start }
}

// ─── Generic sync for Tradedoubler / Kwanko / Effiliation ───────────────────
async function syncNetwork(
  network: Exclude<Network, 'awin'>,
  stores: StoreRow[],
  fetchFn: (merchantId?: string) => Promise<NetworkCoupon[]>
): Promise<SyncResult> {
  const supabase = createAdminClient()
  const start    = Date.now()
  const result: SyncResult = { network, added: 0, updated: 0, deactivated: 0, stores: 0, errors: 0, duration_ms: 0 }

  // Fetch all promotions from this network at once
  let allPromos: NetworkCoupon[] = []
  try {
    allPromos = await fetchFn()
  } catch (e: unknown) {
    return { ...result, error: (e as Error).message, duration_ms: Date.now() - start }
  }

  if (!allPromos.length) return { ...result, duration_ms: Date.now() - start }

  // Build a map: network_merchant_id → NetworkCoupon[]
  const byMerchant = new Map<string, NetworkCoupon[]>()
  for (const p of allPromos) {
    if (!byMerchant.has(p.network_merchant_id)) byMerchant.set(p.network_merchant_id, [])
    byMerchant.get(p.network_merchant_id)!.push(p)
  }

  for (const store of stores) {
    const merchantId = store.network_merchant_ids?.[network]
    if (!merchantId) continue

    try {
      const promos = byMerchant.get(merchantId) ?? []
      const { data: existing } = await supabase
        .from('coupons').select('id,network_coupon_id,expiry_date,title')
        .eq('store_id', store.id).eq('is_active', true).eq('network', network)

      const existingMap = new Map((existing ?? []).map(c => [c.network_coupon_id, c]))

      for (const promo of promos) {
        // Duplicate check: skip if a higher-priority network already has this code
        if (promo.code) {
          const { data: dup } = await supabase
            .from('coupons').select('id,network').eq('store_id', store.id)
            .eq('code', promo.code).eq('is_active', true).single()
          if (dup && PRIORITY[dup.network as Network] > PRIORITY[network]) continue
        }

        const row = networkCouponToRow(promo, store.id)
        const ex  = existingMap.get(promo.network_coupon_id)

        if (!ex) {
          const { error } = await supabase.from('coupons').insert(row)
          if (!error) result.added++
        } else {
          if (ex.expiry_date !== promo.expiry_date || ex.title !== promo.title) {
            await supabase.from('coupons')
              .update({ expiry_date: promo.expiry_date, title: promo.title, destination_url: promo.destination_url })
              .eq('id', ex.id)
            result.updated++
          }
          existingMap.delete(promo.network_coupon_id)
        }
      }

      const toDeactivate = Array.from(existingMap.values()).map(c => c.id)
      if (toDeactivate.length) {
        await supabase.from('coupons').update({ is_active: false }).in('id', toDeactivate)
        result.deactivated += toDeactivate.length
      }
      result.stores++
    } catch { result.errors++ }
  }

  return { ...result, duration_ms: Date.now() - start }
}

// ─── Main orchestrator — runs all networks in parallel ───────────────────────
export async function syncAllNetworks(networks?: Network[]): Promise<SyncResult[]> {
  const supabase = createAdminClient()

  const { data: stores } = await supabase
    .from('stores')
    .select('id,name,slug,awin_merchant_id,network_merchant_ids')
    .eq('is_active', true)

  if (!stores?.length) return []

  const toRun = networks ?? ['awin', 'tradedoubler', 'kwanko', 'effiliation']

  const tasks: Promise<SyncResult>[] = []
  if (toRun.includes('awin'))         tasks.push(syncAwin(stores))
  if (toRun.includes('tradedoubler')) tasks.push(syncNetwork('tradedoubler', stores, getTDPromotions))
  if (toRun.includes('kwanko'))       tasks.push(syncNetwork('kwanko', stores, getKwPromotions))
  if (toRun.includes('effiliation'))  tasks.push(syncNetwork('effiliation', stores, getEffPromotions))

  return Promise.all(tasks)
}
