import { createClient } from '@/lib/supabase/server'
import { FlaggedAdmin } from '@/components/admin/FlaggedAdmin'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { AccessDenied } from '@/components/admin/AccessDenied'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Signalements' }

export default async function AdminFlaggedPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'flagged')) {
    return <AccessDenied title="Accès refusé" desc="Vous n'avez pas la permission d'accéder à cette page. Contactez un administrateur." />
  }

  const supabase = await createClient()
  const { data } = await supabase.from('flagged_coupons')
    .select('id,reason,created_at,coupon:coupons(id,title,is_active,store:stores(name,slug))')
    .order('created_at', { ascending: false })
  return <FlaggedAdmin initialFlags={data ?? []} />
}
