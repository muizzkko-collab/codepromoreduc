import { AutoAddAdmin } from '@/components/admin/AutoAddAdmin'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { AccessDenied } from '@/components/admin/AccessDenied'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ajout automatique' }

export default async function AdminAutoAddPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'auto_add')) {
    return <AccessDenied title="Accès refusé" desc="Vous n'avez pas la permission d'accéder à cette page. Contactez un administrateur." />
  }
  return <AutoAddAdmin />
}
