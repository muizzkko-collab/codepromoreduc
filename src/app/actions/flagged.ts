'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/admin-auth'

export async function disableFlaggedCoupon(couponId: string, flagId: string) {
  try { await requirePermission('flagged') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error: e1 } = await supabase.from('coupons').update({ is_active: false }).eq('id', couponId)
  if (e1) return { error: e1.message }
  const { error: e2 } = await supabase.from('flagged_coupons').delete().eq('id', flagId)
  return { error: e2?.message ?? null }
}

export async function ignoreFlag(flagId: string) {
  try { await requirePermission('flagged') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('flagged_coupons').delete().eq('id', flagId)
  return { error: error?.message ?? null }
}
