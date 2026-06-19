import { createClient } from '@/lib/supabase/server'
import { CategoriesAdmin } from '@/components/admin/CategoriesAdmin'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { AccessDenied } from '@/components/admin/AccessDenied'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Catégories' }

export default async function AdminCategoriesPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'categories')) {
    return <AccessDenied title="Accès refusé" desc="Vous n'avez pas la permission d'accéder à cette page. Contactez un administrateur." />
  }

  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('*').order('name')
  return <CategoriesAdmin initialCategories={data ?? []} />
}
