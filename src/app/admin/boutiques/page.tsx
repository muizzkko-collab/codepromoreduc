import { createClient } from '@/lib/supabase/server'
import { StoresAdmin } from '@/components/admin/StoresAdmin'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { AccessDenied } from '@/components/admin/AccessDenied'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Boutiques' }

export default async function AdminStoresPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'stores')) {
    return <AccessDenied title="Accès refusé" desc="Vous n'avez pas la permission d'accéder à cette page. Contactez un administrateur." />
  }

  const supabase = await createClient()
  const { data: stores } = await supabase.from('stores').select('*').order('name').limit(5000)
  return <StoresAdmin initialStores={stores ?? []} />
}
