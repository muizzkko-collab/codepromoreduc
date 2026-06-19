import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from './supabase/admin'

export type Permission =
  | 'stores' | 'coupons' | 'categories' | 'flagged'
  | 'automation' | 'auto_add' | 'users' | 'site_content'

export const ALL_PERMISSIONS: Permission[] = [
  'stores', 'coupons', 'categories', 'flagged', 'automation', 'auto_add', 'users', 'site_content',
]

export interface AdminProfile {
  id: string
  email: string
  permissions: Partial<Record<Permission, boolean>>
}

/** Reads the logged-in user's permission profile. Returns null if not authenticated. */
export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* no-op: read-only context */ },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin.from('admin_profiles').select('*').eq('id', user.id).single()

  // No profile row yet → no permissions granted (fail closed, not open)
  if (!data) return { id: user.id, email: user.email ?? '', permissions: {} }

  return { id: data.id, email: data.email, permissions: data.permissions ?? {} }
}

export function hasPermission(profile: AdminProfile | null, perm: Permission): boolean {
  return !!profile?.permissions?.[perm]
}

/** Throws if the current user lacks the permission. Use inside Server Actions / Route Handlers. */
export async function requirePermission(perm: Permission): Promise<AdminProfile> {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, perm)) {
    throw new Error(`Permission refusée : ${perm} requis.`)
  }
  return profile!
}
