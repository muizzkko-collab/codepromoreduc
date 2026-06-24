'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getDailyDeals() {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('coupons')
    .select('*, store:stores(*)')
    .eq('is_active', true)
    .or(`is_daily_deal.eq.true,created_at.gte.${since}`)
    .order('created_at', { ascending: false })
    .limit(50)
  return { data, error: error?.message ?? null }
}

export async function getWeeklyDeals() {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('coupons')
    .select('*, store:stores(*)')
    .eq('is_active', true)
    .or(`is_weekly_deal.eq.true,created_at.gte.${since}`)
    .order('created_at', { ascending: false })
    .limit(60)
  return { data, error: error?.message ?? null }
}

export async function getDailyStores() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .eq('show_on_daily', true)
    .order('coupon_count', { ascending: false })
    .limit(12)
  return { data, error: error?.message ?? null }
}

export async function getWeeklyStores() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .eq('show_on_weekly', true)
    .order('coupon_count', { ascending: false })
    .limit(12)
  return { data, error: error?.message ?? null }
}
