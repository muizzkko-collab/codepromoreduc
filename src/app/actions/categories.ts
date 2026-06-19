'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/admin-auth'

export async function addCategory(name: string, slug: string) {
  try { await requirePermission('categories') } catch (e) { return { data: null, error: (e as Error).message } }
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('categories').insert({ name, slug }).select().single()
  return { data, error: error?.message ?? null }
}

export async function renameCategory(id: string, name: string, slug: string) {
  try { await requirePermission('categories') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('categories').update({ name, slug }).eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteCategory(id: string) {
  try { await requirePermission('categories') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  return { error: error?.message ?? null }
}
