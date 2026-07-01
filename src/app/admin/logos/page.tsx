import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { LogosAdmin } from '@/components/admin/LogosAdmin'

export const dynamic = 'force-dynamic'

export default async function LogosPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'stores') && !hasPermission(profile, 'automation')) {
    redirect('/admin/')
  }

  const supabase = createAdminClient()

  // Summary stats
  const { count: total }   = await supabase.from('stores').select('*', { count: 'exact', head: true })
  const { count: hasLogo } = await supabase.from('stores').select('*', { count: 'exact', head: true }).not('logo_url', 'is', null).neq('logo_url', '')
  const { count: placeholder } = await supabase.from('stores').select('*', { count: 'exact', head: true }).eq('logo_source', 'placeholder')
  const { count: missing } = await supabase.from('stores').select('*', { count: 'exact', head: true }).or('logo_url.is.null,logo_url.eq.')

  // Logo source breakdown
  const { data: sources } = await supabase
    .from('stores')
    .select('logo_source')
    .not('logo_url', 'is', null)
    .neq('logo_url', '')

  const sourceCounts: Record<string, number> = {}
  for (const s of sources ?? []) {
    const key = s.logo_source ?? 'unknown'
    sourceCounts[key] = (sourceCounts[key] ?? 0) + 1
  }

  // Placeholder stores sorted by coupon_count desc (highest priority first)
  const { data: placeholderStores } = await supabase
    .from('stores')
    .select('id,name,slug,logo_url,logo_source,coupon_count,affiliate_url')
    .eq('logo_source', 'placeholder')
    .order('coupon_count', { ascending: false })
    .limit(200)

  // Stores with no logo at all
  const { data: noLogoStores } = await supabase
    .from('stores')
    .select('id,name,slug,logo_url,logo_source,coupon_count,affiliate_url')
    .or('logo_url.is.null,logo_url.eq.')
    .order('coupon_count', { ascending: false })
    .limit(200)

  return (
    <LogosAdmin
      stats={{
        total:       total ?? 0,
        hasLogo:     hasLogo ?? 0,
        missing:     missing ?? 0,
        placeholder: placeholder ?? 0,
        sources:     sourceCounts,
      }}
      placeholderStores={placeholderStores ?? []}
      noLogoStores={noLogoStores ?? []}
    />
  )
}
