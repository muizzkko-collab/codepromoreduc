'use server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBulkPromotions, mapPromoToCoupon } from '@/lib/awin'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const start = Date.now()

  const { data: logRow } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', sync_type: 'awin' })
    .select().single()
  const logId = logRow?.id

  let totalAdded = 0, totalUpdated = 0, totalDeactivated = 0
  let storesSynced = 0, storesFailed = 0

  try {
    // 1. Get all stores that have an awin_merchant_id (our known list for codepromoreduc.fr only)
    const { data: stores, error: storesErr } = await supabase
      .from('stores')
      .select('id,name,slug,awin_merchant_id')
      .not('awin_merchant_id', 'is', null)
      .eq('is_active', true)
      .order('name')

    if (storesErr) throw new Error(`Failed to fetch stores: ${storesErr.message}`)
    if (!stores?.length) {
      await supabase.from('sync_logs').update({
        status: 'success', coupons_added: 0, coupons_removed: 0,
        coupons_updated: 0, stores_synced: 0, duration_ms: Date.now() - start,
      }).eq('id', logId ?? '')
      return NextResponse.json({ message: 'No Awin-linked stores found.' })
    }

    // 2. Bulk-fetch all promotions for our known advertiser IDs in one request (batched 50 at a time)
    const merchantIds = stores.map(s => s.awin_merchant_id as number)
    console.log(`Fetching promotions for ${merchantIds.length} stores from Awin...`)
    const allPromos = await getBulkPromotions(merchantIds)
    console.log(`Received ${allPromos.length} total promotions from Awin`)

    // 3. Group promos by advertiser ID
    const promosByMerchant = new Map<number, typeof allPromos>()
    for (const promo of allPromos) {
      const id = promo.advertiserId
      if (!promosByMerchant.has(id)) promosByMerchant.set(id, [])
      promosByMerchant.get(id)!.push(promo)
    }

    const storeResults: {
      store_id: string; store_name: string; status: string
      added: number; updated: number; deactivated: number; error_msg: string | null
    }[] = []

    // 4. For each store, upsert coupons from the bulk result
    for (const store of stores) {
      const result = {
        store_id: store.id, store_name: store.name, status: 'success',
        added: 0, updated: 0, deactivated: 0, error_msg: null as string | null
      }

      try {
        const awinCoupons = promosByMerchant.get(store.awin_merchant_id as number) ?? []

        const { data: existing } = await supabase
          .from('coupons')
          .select('id,awin_promo_id,expiry_date,title')
          .eq('store_id', store.id)
          .eq('is_active', true)
          .not('awin_promo_id', 'is', null)

        const existingByPromoId = new Map((existing ?? []).map(c => [c.awin_promo_id, c]))

        for (const promo of awinCoupons) {
          const mapped = mapPromoToCoupon(promo)
          const existing = existingByPromoId.get(mapped.awin_promo_id)

          if (!existing) {
            const { error } = await supabase.from('coupons').insert({ store_id: store.id, ...mapped })
            if (!error) result.added++
          } else {
            const needsUpdate = existing.expiry_date !== mapped.expiry_date || existing.title !== mapped.title
            if (needsUpdate) {
              await supabase.from('coupons')
                .update({ expiry_date: mapped.expiry_date, title: mapped.title, destination_url: mapped.destination_url })
                .eq('id', existing.id)
              result.updated++
            }
            existingByPromoId.delete(mapped.awin_promo_id)
          }
        }

        // Deactivate coupons no longer in Awin feed
        const toDeactivate = [...existingByPromoId.values()].map(c => c.id)
        if (toDeactivate.length > 0) {
          await supabase.from('coupons').update({ is_active: false }).in('id', toDeactivate)
          result.deactivated = toDeactivate.length
        }

        totalAdded       += result.added
        totalUpdated     += result.updated
        totalDeactivated += result.deactivated
        storesSynced++
      } catch (e: unknown) {
        result.status    = 'error'
        result.error_msg = (e as Error).message
        storesFailed++
      }

      storeResults.push(result)
    }

    if (logId && storeResults.length > 0) {
      await supabase.from('store_sync_logs').insert(
        storeResults.map(r => ({ sync_log_id: logId, ...r }))
      )
    }

    await supabase.from('sync_logs').update({
      status: 'success', sync_type: 'awin',
      coupons_added: totalAdded, coupons_removed: totalDeactivated,
      coupons_updated: totalUpdated, stores_synced: storesSynced,
      stores_failed: storesFailed, duration_ms: Date.now() - start,
    }).eq('id', logId ?? '')

    return NextResponse.json({
      added: totalAdded, updated: totalUpdated, deactivated: totalDeactivated,
      stores_with_awin: stores.length, stores_synced: storesSynced, stores_failed: storesFailed,
      total_promos_from_awin: allPromos.length,
      duration_s: ((Date.now() - start) / 1000).toFixed(1),
    })
  } catch (e: unknown) {
    await supabase.from('sync_logs').update({
      status: 'error', error_message: (e as Error).message, duration_ms: Date.now() - start,
    }).eq('id', logId ?? '')
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
