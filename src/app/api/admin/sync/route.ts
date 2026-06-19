/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'

export async function POST() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'automation')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const apiKey = process.env.AWIN_API_KEY
  const pubId  = process.env.AWIN_PUBLISHER_ID

  if (!apiKey || !pubId) {
    return NextResponse.json({ error: 'AWIN_API_KEY and AWIN_PUBLISHER_ID not configured' }, { status: 500 })
  }

  const supabase = createAdminClient()
  const start    = Date.now()
  let added = 0
  const removed = 0

  try {
    const { data: logRow } = await supabase.from('sync_logs').insert({ status: 'running' }).select().single()

    const { data: stores } = await supabase.from('stores').select('id,name,slug').eq('is_active', true).limit(5000)
    if (!stores?.length) {
      await supabase.from('sync_logs').update({ status: 'success', coupons_added: 0, coupons_removed: 0, duration_ms: Date.now() - start }).eq('id', logRow?.id ?? '')
      return NextResponse.json({ added: 0, removed: 0 })
    }

    const promoRes = await fetch(
      `https://api.awin.com/publishers/${pubId}/promotions?countryCode=FR&promotionType=code`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!promoRes.ok) throw new Error(`Awin API error: ${promoRes.status}`)
    const promos: any[] = await promoRes.json()

    for (const promo of promos) {
      const store = stores.find(s =>
        s.name.toLowerCase().includes((promo.advertiserName ?? '').toLowerCase()) ||
        (promo.advertiserName ?? '').toLowerCase().includes(s.name.toLowerCase())
      )
      if (!store) continue

      const { error } = await supabase.from('coupons').upsert({
        store_id:       store.id,
        title:          promo.description ?? promo.title ?? 'Offre',
        code:           promo.code ?? null,
        type:           promo.code ? 'code' : 'deal',
        discount_value: promo.discountAmount ? `${promo.discountAmount}${promo.discountType === 'percent' ? '%' : '€'}` : null,
        destination_url: promo.clickThroughUrl ?? null,
        expiry_date:    promo.endDate ? promo.endDate.split('T')[0] : null,
        is_active:      true,
        is_free_shipping: false,
      }, { onConflict: 'store_id,code' })

      if (!error) added++
    }

    await supabase.from('sync_logs').update({
      status: 'success', coupons_added: added, coupons_removed: removed,
      stores_synced: stores.length, duration_ms: Date.now() - start,
    }).eq('id', logRow?.id ?? '')

    return NextResponse.json({ added, removed })
  } catch (e: unknown) {
    await supabase.from('sync_logs').insert({
      status: 'error', error_message: (e as Error).message, duration_ms: Date.now() - start,
    })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
