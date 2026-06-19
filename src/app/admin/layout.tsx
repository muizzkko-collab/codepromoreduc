import { LangProvider } from '@/components/admin/LangContext'
import { PermissionsProvider } from '@/components/admin/PermissionsContext'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { getCurrentAdminProfile } from '@/lib/admin-auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — Admin' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentAdminProfile()

  return (
    <LangProvider>
      <PermissionsProvider value={{ email: profile?.email ?? '', permissions: profile?.permissions ?? {} }}>
        <div className="flex min-h-screen bg-gray-50">
          <AdminSidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </PermissionsProvider>
    </LangProvider>
  )
}
