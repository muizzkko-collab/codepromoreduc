import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/admin/DashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function AdminDashboard() {
  const supabase = await createClient()
  const today    = new Date()
  const in7days  = new Date(today); in7days.setDate(today.getDate() + 7)

  const [
    { count: totalStores },
    { count: totalCoupons },
    { count: expiringSoon },
    { count: flaggedCount },
    { data: topStores },
    { data: dailyRaw },
    { data: flaggedList },
  ] = await Promise.all([
    supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('coupons').select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('expiry_date', today.toISOString().split('T')[0])
      .lte('expiry_date', in7days.toISOString().split('T')[0]),
    supabase.from('flagged_coupons').select('*', { count: 'exact', head: true }),
    supabase.from('stores')
      .select('id,name,slug,logo_url,click_count,coupon_count')
      .eq('is_active', true)
      .order('click_count', { ascending: false })
      .limit(10),
    supabase.from('sync_logs')
      .select('created_at,coupons_added,coupons_removed')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('flagged_coupons')
      .select('id,reason,created_at,coupon:coupons(title,store:stores(name))')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Build daily clicks from sync_logs as proxy (last 30 days calendar)
  const days: { date: string; clicks: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const log = (dailyRaw ?? []).find(r => r.created_at?.startsWith(dateStr))
    days.push({ date: dateStr, clicks: log ? (log.coupons_added ?? 0) : 0 })
  }

  // Total clicks this month: sum store click_count (approximation)
  const clicksThisMonth = (topStores ?? []).reduce((s, r) => s + (r.click_count ?? 0), 0)

  return (
    <DashboardClient
      stats={{
        totalStores:     totalStores   ?? 0,
        totalCoupons:    totalCoupons  ?? 0,
        expiringSoon:    expiringSoon  ?? 0,
        flaggedCount:    flaggedCount  ?? 0,
        clicksThisMonth,
      }}
      topStores={topStores ?? []}
      dailyClicks={days}
      recentFlags={flaggedList ?? []}
    />
  )
}
