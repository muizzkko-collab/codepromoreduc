import { createClient } from '@/lib/supabase/server'
import { CouponsAdmin } from '@/components/admin/CouponsAdmin'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { AccessDenied } from '@/components/admin/AccessDenied'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Coupons' }

export default async function AdminCouponsPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'coupons')) {
    return <AccessDenied title="Accès refusé" desc="Vous n'avez pas la permission d'accéder à cette page. Contactez un administrateur." />
  }

  const supabase = await createClient()
  const [{ data: coupons }, { data: stores }] = await Promise.all([
    supabase.from('coupons')
      .select('*,store:stores(id,name,slug,logo_url)')
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase.from('stores').select('id,name,slug').eq('is_active', true).order('name').limit(5000),
  ])
  return <CouponsAdmin initialCoupons={coupons ?? []} stores={stores ?? []} />
}
