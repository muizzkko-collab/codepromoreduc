import { listAdminUsers } from '@/app/actions/admin-users'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { AdminUsersAdmin } from '@/components/admin/AdminUsersAdmin'
import { AccessDenied } from '@/components/admin/AccessDenied'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Utilisateurs' }

export default async function AdminUsersPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'users')) {
    return <AccessDenied title="Accès refusé" desc="Vous n'avez pas la permission d'accéder à cette page. Contactez un administrateur." />
  }

  const { data: users } = await listAdminUsers()
  return <AdminUsersAdmin initialUsers={users} currentUserId={profile!.id} />
}
