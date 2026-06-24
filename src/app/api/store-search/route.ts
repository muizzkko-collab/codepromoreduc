import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 1) return NextResponse.json([])

  const supabase = await createClient()
  const { data } = await supabase
    .from('stores')
    .select('name, slug, logo_url, coupon_count')
    .eq('is_active', true)
    .ilike('name', `${q}%`)   // starts-with match for fast dropdown
    .order('coupon_count', { ascending: false })
    .limit(8)

  // If starts-with returns few results, also try contains
  const results = data ?? []
  if (results.length < 4) {
    const { data: extra } = await supabase
      .from('stores')
      .select('name, slug, logo_url, coupon_count')
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .not('slug', 'in', `(${results.map(r => `"${r.slug}"`).join(',') || '"__none__"'})`)
      .order('coupon_count', { ascending: false })
      .limit(8 - results.length)

    results.push(...(extra ?? []))
  }

  return NextResponse.json(results)
}
