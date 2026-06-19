import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') ?? ''

  const supabase = await createClient()

  // Get the store's categories
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!store) return NextResponse.json([])

  const { data: catRows } = await supabase
    .from('store_categories')
    .select('category_id')
    .eq('store_id', store.id)

  const catIds = (catRows ?? []).map(r => r.category_id)

  if (catIds.length === 0) {
    // Fallback: just return popular stores excluding this one
    const { data } = await supabase
      .from('stores')
      .select('name, slug, logo_url')
      .eq('is_active', true)
      .neq('id', store.id)
      .order('coupon_count', { ascending: false })
      .limit(6)
    return NextResponse.json(data ?? [])
  }

  // Get stores sharing at least one category
  const { data: siblingRows } = await supabase
    .from('store_categories')
    .select('store_id')
    .in('category_id', catIds)
    .neq('store_id', store.id)

  const seen = new Set<string>()
  const ids: string[] = []
  for (const r of siblingRows ?? []) {
    if (!seen.has(r.store_id)) { seen.add(r.store_id); ids.push(r.store_id) }
    if (ids.length >= 20) break
  }

  if (ids.length === 0) return NextResponse.json([])

  const { data: similar } = await supabase
    .from('stores')
    .select('name, slug, logo_url')
    .eq('is_active', true)
    .in('id', ids)
    .order('coupon_count', { ascending: false })
    .limit(6)

  return NextResponse.json(similar ?? [])
}
