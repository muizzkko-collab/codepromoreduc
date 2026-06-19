import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoreCoupons, mapPromoToCoupon } from '@/lib/awin'

export const maxDuration = 300 // 5 min (Vercel Pro)

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const start    = Date.now()

  // Create a running log entry
  const { data: logRow } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', sync_type: 'awin' })
    .select()
    .single()
  const logId = logRow?.id

  let totalAdded = 0, totalUpdated = 0, totalDeactivated = 0
  let storesSynced = 0, storesFailed = 0
  const storeResults: {
    store_id: string; store_name: string; status: string
    added: number; updated: number; deactivated: number; error_msg: string | null
  }[] = []

  try {
    // Fetch all Awin-linked stores
    const { data: stores, error: storesErr } = await supabase
      .from('stores')
      .select('id,name,slug')
      .not('awin_merchant_id', 'is', null)
      .eq('is_active', true)
      .order('name')

    if (storesErr) throw new Error(`Failed to fetch stores: ${storesErr.message}`)
    if (!stores?.length) {
      await supabase.from('sync_logs').update({
        status: 'success', coupons_added: 0, coupons_removed: 0,
        coupons_updated: 0, stores_synced: 0, duration_ms: Date.now() - start,
      }).eq('id', logId ?? '')
      return NextResponse.json({ message: 'No Awin-linked stores found. Run populate-awin-ids.js first.' })
    }

    for (const store of stores) {
      const result = { store_id: store.id, store_name: store.name, status: 'success', added: 0, updated: 0, deactivated: 0, error_msg: null as string | null }

      try {
        // Get store's awin_merchant_id
        const { data: storeRow } = await supabase
          .from('stores')
          .select('awin_merchant_id')
          .eq('id', store.id)
          .single()
        if (!storeRow?.awin_merchant_id) continue

        // Fetch live coupons from Awin
        const awinCoupons = await getStoreCoupons(storeRow.awin_merchant_id)
        // awinCoupons mapped below — build existingByPromoId lookup instead

        // Get current active Awin coupons in Supabase
        const { data: existing } = await supabase
          .from('coupons')
          .select('id,awin_promo_id,expiry_date,code,title')
          .eq('store_id', store.id)
          .eq('is_active', true)
          .not('awin_promo_id', 'is', null)

        const existingByPromoId = new Map(
          (existing ?? []).map(c => [c.awin_promo_id, c])
        )

        // Upsert each Awin promo
        for (const promo of awinCoupons) {
          const mapped = mapPromoToCoupon(promo)
          const existingCoupon = existingByPromoId.get(mapped.awin_promo_id)

          if (!existingCoupon) {
            // New coupon — insert
            const { error } = await supabase.from('coupons').insert({
              store_id: store.id,
              ...mapped,
            })
            if (!error) result.added++
          } else {
            // Existing coupon — update expiry + title if changed
            const needsUpdate =
              existingCoupon.expiry_date !== mapped.expiry_date ||
              existingCoupon.title !== mapped.title
            if (needsUpdate) {
              await supabase.from('coupons')
                .update({ expiry_date: mapped.expiry_date, title: mapped.title, destination_url: mapped.destination_url })
                .eq('id', existingCoupon.id)
              result.updated++
            }
            // Remove from map — what remains was not in Awin feed
            existingByPromoId.delete(mapped.awin_promo_id)
          }
        }

        // Deactivate coupons no longer in Awin feed
        const toDeactivate = Array.from(existingByPromoId.values()).map(c => c.id)
        if (toDeactivate.length > 0) {
          await supabase.from('coupons')
            .update({ is_active: false })
            .in('id', toDeactivate)
          result.deactivated = toDeactivate.length
        }

        totalAdded       += result.added
        totalUpdated     += result.updated
        totalDeactivated += result.deactivated
        storesSynced++
      } catch (e: unknown) {
        result.status   = 'error'
        result.error_msg = (e as Error).message
        storesFailed++
      }

      storeResults.push(result)
      // Small pause to avoid rate-limiting
      await new Promise(r => setTimeout(r, 50))
    }

    // Persist per-store results
    if (logId && storeResults.length > 0) {
      await supabase.from('store_sync_logs').insert(
        storeResults.map(r => ({ sync_log_id: logId, ...r }))
      )
    }

    // Final log update
    await supabase.from('sync_logs').update({
      status:          'success',
      sync_type:       'awin',
      coupons_added:   totalAdded,
      coupons_removed: totalDeactivated,
      coupons_updated: totalUpdated,
      stores_synced:   storesSynced,
      stores_failed:   storesFailed,
      duration_ms:     Date.now() - start,
    }).eq('id', logId ?? '')

    return NextResponse.json({
      added: totalAdded, updated: totalUpdated, deactivated: totalDeactivated,
      stores: storesSynced, failed: storesFailed,
      duration_s: ((Date.now() - start) / 1000).toFixed(1),
    })
  } catch (e: unknown) {
    await supabase.from('sync_logs').update({
      status: 'error', error_message: (e as Error).message,
      duration_ms: Date.now() - start,
    }).eq('id', logId ?? '')
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
