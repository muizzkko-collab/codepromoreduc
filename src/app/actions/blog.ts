'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/admin-auth'

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image_url: string | null
  author: string
  category: string
  tags: string[]
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export async function getBlogPosts(publishedOnly = true) {
  const supabase = createAdminClient()
  let query = supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
  if (publishedOnly) query = query.eq('is_published', true)
  const { data, error } = await query
  return { data: data as BlogPost[] | null, error: error?.message ?? null }
}

export async function getBlogPost(slug: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single()
  return { data: data as BlogPost | null, error: error?.message ?? null }
}

export async function upsertBlogPost(payload: Partial<BlogPost> & { title: string; slug: string }) {
  try { await requirePermission('site_content') } catch (e) { return { data: null, error: (e as Error).message } }
  const supabase = createAdminClient()
  const { id, ...rest } = payload
  const fields = { ...rest, updated_at: new Date().toISOString() }
  if (id) {
    const { data, error } = await supabase.from('blog_posts').update(fields).eq('id', id).select().single()
    return { data: data as BlogPost | null, error: error?.message ?? null }
  } else {
    const { data, error } = await supabase.from('blog_posts').insert(fields).select().single()
    return { data: data as BlogPost | null, error: error?.message ?? null }
  }
}

export async function deleteBlogPost(id: string) {
  try { await requirePermission('site_content') } catch (e) { return { error: (e as Error).message } }
  const supabase = createAdminClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  return { error: error?.message ?? null }
}
