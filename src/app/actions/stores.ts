'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/admin-auth'

export async function upsertStore(payload: {
  id?: string
  name: string; slug: string
  affiliate_url: string | null; meta_title: string | null; meta_description: string | null
  is_featured: boolean; is_active: boolean; logo_url?: string | null
  popup_banner_url?: string | null; awin_merchant_id?: number | null
  show_on_daily?: boolean; show_on_weekly?: boolean
}) {
  try { await requirePermission('stores') } catch (e) { return { data: null, error: (e as Error).message } }

  const supabase = createAdminClient()
  const { id, ...rest } = payload

  if (id) {
    const { data, error } = await supabase
      .from('stores').update(rest).eq('id', id).select().single()
    return { data, error: error?.message ?? null }
  } else {
    const { data, error } = await supabase
      .from('stores').insert(rest).select().single()
    return { data, error: error?.message ?? null }
  }
}

export async function deleteStore(id: string) {
  try { await requirePermission('stores') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('stores').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export async function toggleStoreField(id: string, field: 'is_active' | 'is_featured', value: boolean) {
  try { await requirePermission('stores') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('stores').update({ [field]: value }).eq('id', id)
  return { error: error?.message ?? null }
}

export async function uploadStoreLogo(storeId: string, formData: FormData) {
  try { await requirePermission('stores') } catch (e) { return { url: null, error: (e as Error).message } }

  const supabase = createAdminClient()
  const file = formData.get('logo') as File
  if (!file || file.size === 0) return { url: null, error: null }

  const ext  = file.name.split('.').pop()
  const path = `stores/${storeId}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('logos')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) return { url: null, error: error.message }
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
