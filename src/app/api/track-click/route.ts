import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { couponId, storeId } = await req.json()
    const supabase = createAdminClient()
    await Promise.all([
      supabase.rpc('increment_coupon_clicks', { coupon_id: couponId }).then(({ error }) => {
        if (error) {
          // Fallback: read-then-update
          return supabase.from('coupons').select('click_count').eq('id', couponId).single()
            .then(({ data }) => supabase.from('coupons').update({ click_count: (data?.click_count ?? 0) + 1 }).eq('id', couponId))
        }
      }),
      supabase.rpc('increment_store_clicks', { store_id: storeId }).then(({ error }) => {
        if (error) {
          return supabase.from('stores').select('click_count').eq('id', storeId).single()
            .then(({ data }) => supabase.from('stores').update({ click_count: (data?.click_count ?? 0) + 1 }).eq('id', storeId))
        }
      }),
    ])
  } catch (_) { /* fire and forget */ }
  return NextResponse.json({ ok: true })
}
