import { NextRequest, NextResponse }          from 'next/server'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'site_content')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const { store_id } = await req.json().catch(() => ({}))
  if (!store_id) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('stores')
    .update({
      content_status:       'not_generated',
      content_body:         null,
      content_generated_at: null,
      content_tier:         null,
    })
    .eq('id', store_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
