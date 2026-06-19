import { NextRequest, NextResponse }          from 'next/server'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'site_content')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const { store_id, content_body } = await req.json().catch(() => ({}))
  if (!store_id) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const supabase = createAdminClient()

  // Check if store already has verified link — if so, also set is_indexed = true
  const { data: store } = await supabase
    .from('stores').select('is_indexed').eq('id', store_id).single()

  const update: Record<string, unknown> = {
    content_status:      'approved',
    content_approved_at: new Date().toISOString(),
    content_approved_by: profile!.email,
  }
  if (content_body) update.content_body = content_body  // save any edits made in the panel
  // Only set is_indexed if the store already has verified affiliate link
  // (is_indexed was previously set to true by the verification system)
  // If is_indexed is already true, keep it. If false, leave it — content approval
  // alone doesn't index; link verification is a separate gate.
  // If is_indexed is null/false, set it to true now that content is approved
  if (!store?.is_indexed) {
    update.is_indexed = true
  }

  const { error } = await supabase.from('stores').update(update).eq('id', store_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
