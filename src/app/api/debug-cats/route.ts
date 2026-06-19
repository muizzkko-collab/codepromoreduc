import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: cats } = await supabase
    .from('categories').select('id,name,slug,store_count').order('store_count', { ascending: false }).limit(10)

  const { data: scSample } = await supabase
    .from('store_categories').select('store_id,category_id').limit(10)

  const results: Record<string, unknown>[] = []
  for (const cat of (cats ?? [])) {
    const { data: jRows } = await supabase
      .from('store_categories').select('store_id').eq('category_id', cat.id).limit(5)
    results.push({ cat_id: cat.id, name: cat.name, store_count: cat.store_count, junction_rows: jRows?.length ?? 0, sample_ids: jRows?.map(r => r.store_id) })
  }

  return NextResponse.json({ categories: results, sc_sample: scSample })
}
