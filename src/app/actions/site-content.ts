'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/admin-auth'

export interface HeroSlide {
  id: string
  title: string
  subtitle: string
  description: string | null
  image_url: string | null
  tag: string | null
  discount_label: string | null
  button_label: string
  link_url: string
  color_theme: string
  sort_order: number
  is_active: boolean
}

export interface SiteStat {
  key: string
  label: string
  value: string
  sort_order: number
}

// ── Hero slides ──────────────────────────────────────────────
export async function listHeroSlides() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('hero_slides').select('*').order('sort_order')
  return { data: (data ?? []) as HeroSlide[], error: error?.message ?? null }
}

export async function upsertHeroSlide(payload: Partial<HeroSlide> & { id?: string }) {
  try { await requirePermission('site_content') } catch (e) { return { data: null, error: (e as Error).message } }
  const supabase = createAdminClient()
  const { id, ...rest } = payload
  if (id) {
    const { data, error } = await supabase.from('hero_slides').update(rest).eq('id', id).select().single()
    return { data, error: error?.message ?? null }
  }
  const { data, error } = await supabase.from('hero_slides').insert(rest).select().single()
  return { data, error: error?.message ?? null }
}

export async function deleteHeroSlide(id: string) {
  try { await requirePermission('site_content') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('hero_slides').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export async function uploadHeroImage(slideId: string, formData: FormData) {
  try { await requirePermission('site_content') } catch (e) { return { url: null, error: (e as Error).message } }
  const supabase = createAdminClient()
  const file = formData.get('image') as File
  if (!file || file.size === 0) return { url: null, error: null }

  const ext   = file.name.split('.').pop()
  const path  = `hero/${slideId}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage.from('logos').upload(path, bytes, { contentType: file.type, upsert: true })
  if (error) return { url: null, error: error.message }
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

// ── Sidebar banner ───────────────────────────────────────────
export interface SidebarBanner {
  id: string
  label: string
  title: string
  description: string | null
  button_label: string
  button_code: string | null
  link_url: string
  is_active: boolean
  sort_order: number
  updated_at: string
}

export async function getSidebarBanners() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sidebar_banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .limit(4)
  return { data: (data ?? []) as SidebarBanner[], error: error?.message ?? null }
}

export async function listAllSidebarBanners() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sidebar_banners')
    .select('*')
    .order('sort_order')
  return { data: (data ?? []) as SidebarBanner[], error: error?.message ?? null }
}

export async function upsertSidebarBanner(payload: Omit<SidebarBanner, 'id' | 'updated_at'> & { id?: string }) {
  try { await requirePermission('site_content') } catch (e) { return { data: null, error: (e as Error).message } }
  const supabase = createAdminClient()
  const { id, ...rest } = payload
  const row = { ...rest, updated_at: new Date().toISOString() }
  if (id) {
    const { data, error } = await supabase.from('sidebar_banners').update(row).eq('id', id).select().single()
    return { data, error: error?.message ?? null }
  }
  const { data, error } = await supabase.from('sidebar_banners').insert(row).select().single()
  return { data, error: error?.message ?? null }
}

export async function deleteSidebarBanner(id: string) {
  try { await requirePermission('site_content') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('sidebar_banners').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// ── Site stats ───────────────────────────────────────────────
export async function listSiteStats() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('site_stats').select('*').order('sort_order')
  return { data: (data ?? []) as SiteStat[], error: error?.message ?? null }
}

export async function updateSiteStat(key: string, label: string, value: string) {
  try { await requirePermission('site_content') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('site_stats').update({ label, value, updated_at: new Date().toISOString() }).eq('key', key)
  return { error: error?.message ?? null }
}
