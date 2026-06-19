import { createClient } from '@/lib/supabase/server'
import { AutomationAdmin } from '@/components/admin/AutomationAdmin'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { AccessDenied } from '@/components/admin/AccessDenied'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Automatisation' }

export default async function AdminAutomationPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'automation')) {
    return <AccessDenied title="Accès refusé" desc="Vous n'avez pas la permission d'accéder à cette page. Contactez un administrateur." />
  }

  const supabase = await createClient()

  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [
    { data: logs },
    { data: storeLogs },
    { count: awinStores },
    { count: scraperStores },
    { count: addedToday },
    { count: expiredToday },
  ] = await Promise.all([
    supabase.from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30),

    supabase.from('store_sync_logs')
      .select('store_name,status,added,updated,deactivated,error_msg,created_at')
      .gte('created_at', `${yesterday}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(100),

    supabase.from('stores')
      .select('*', { count: 'exact', head: true })
      .not('awin_merchant_id', 'is', null)
      .eq('is_active', true),

    supabase.from('stores')
      .select('*', { count: 'exact', head: true })
      .is('awin_merchant_id', null)
      .eq('is_active', true),

    supabase.from('coupons')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00Z`),

    supabase.from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false)
      .gte('updated_at', `${today}T00:00:00Z`)
      .not('expiry_date', 'is', null),
  ])

  return (
    <AutomationAdmin
      syncLogs={logs ?? []}
      storeLogs={storeLogs ?? []}
      stats={{
        awinStores:    awinStores    ?? 0,
        scraperStores: scraperStores ?? 0,
        addedToday:    addedToday    ?? 0,
        expiredToday:  expiredToday  ?? 0,
      }}
    />
  )
}
