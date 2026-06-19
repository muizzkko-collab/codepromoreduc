'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/admin-auth'

export async function upsertCoupon(payload: {
  id?: string; store_id: string; title: string; code: string | null
  type: string | null; discount_value: string | null; destination_url: string | null
  expiry_date: string | null; is_active: boolean; is_free_shipping: boolean; is_featured?: boolean
}) {
  try { await requirePermission('coupons') } catch (e) { return { data: null, error: (e as Error).message } }

  const supabase = createAdminClient()
  const { id, ...rest } = payload
  if (id) {
    const { data, error } = await supabase.from('coupons').update(rest).eq('id', id).select().single()
    return { data, error: error?.message ?? null }
  } else {
    const { data, error } = await supabase.from('coupons').insert(rest).select().single()
    return { data, error: error?.message ?? null }
  }
}

export async function deleteCoupon(id: string) {
  try { await requirePermission('coupons') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export async function toggleCouponActive(id: string, value: boolean) {
  try { await requirePermission('coupons') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').update({ is_active: value }).eq('id', id)
  return { error: error?.message ?? null }
}

export async function bulkDeactivateCoupons(ids: string[]) {
  try { await requirePermission('coupons') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').update({ is_active: false }).in('id', ids)
  return { error: error?.message ?? null }
}

export async function bulkDeleteCoupons(ids: string[]) {
  try { await requirePermission('coupons') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').delete().in('id', ids)
  return { error: error?.message ?? null }
}
