'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission, type Permission } from '@/lib/admin-auth'

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let out = ''
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export interface AdminUserRow {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  permissions: Partial<Record<Permission, boolean>>
}

export async function listAdminUsers(): Promise<{ data: AdminUserRow[]; error: string | null }> {
  try {
    await requirePermission('users')
  } catch (e) {
    return { data: [], error: (e as Error).message }
  }

  const admin = createAdminClient()
  const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (authErr) return { data: [], error: authErr.message }

  const { data: profiles } = await admin.from('admin_profiles').select('*')
  const byId = new Map((profiles ?? []).map(p => [p.id, p]))

  const merged: AdminUserRow[] = authUsers.users.map(u => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    permissions: byId.get(u.id)?.permissions ?? {},
  }))

  return { data: merged, error: null }
}

export async function createAdminUser(payload: {
  email: string
  permissions: Partial<Record<Permission, boolean>>
}): Promise<{ error: string | null; password: string | null }> {
  try {
    await requirePermission('users')
  } catch (e) {
    return { error: (e as Error).message, password: null }
  }

  const admin = createAdminClient()
  const password = randomPassword()

  const { data: created, error } = await admin.auth.admin.createUser({
    email: payload.email,
    password,
    email_confirm: true,
  })
  if (error || !created.user) {
    return { error: error?.message ?? 'Création échouée', password: null }
  }

  const { error: profileErr } = await admin.from('admin_profiles').insert({
    id: created.user.id,
    email: payload.email,
    permissions: payload.permissions,
  })
  if (profileErr) {
    // Roll back the auth user so we don't leave an orphaned login with no profile
    await admin.auth.admin.deleteUser(created.user.id)
    return { error: profileErr.message, password: null }
  }

  return { error: null, password }
}

export async function updateAdminUserPermissions(
  id: string,
  permissions: Partial<Record<Permission, boolean>>
): Promise<{ error: string | null }> {
  try {
    await requirePermission('users')
  } catch (e) {
    return { error: (e as Error).message }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('admin_profiles').upsert({ id, permissions }, { onConflict: 'id' })
  return { error: error?.message ?? null }
}

export async function deleteAdminUser(id: string): Promise<{ error: string | null }> {
  let profile
  try {
    profile = await requirePermission('users')
  } catch (e) {
    return { error: (e as Error).message }
  }

  if (profile.id === id) {
    return { error: 'cannotDeleteSelf' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  return { error: error?.message ?? null }
}

export async function resetAdminUserPassword(id: string): Promise<{ error: string | null; password: string | null }> {
  try {
    await requirePermission('users')
  } catch (e) {
    return { error: (e as Error).message, password: null }
  }

  const admin = createAdminClient()
  const password = randomPassword()
  const { error } = await admin.auth.admin.updateUserById(id, { password })
  return { error: error?.message ?? null, password: error ? null : password }
}
