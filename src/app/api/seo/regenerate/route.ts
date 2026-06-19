import { NextRequest, NextResponse }                                from 'next/server'
import { getCurrentAdminProfile, hasPermission }                   from '@/lib/admin-auth'
import { createAdminClient }                                       from '@/lib/supabase/admin'
import { gatherStoreFacts }                                        from '@/lib/seo/gather-store-facts'
import { generateContent, resolveInternalLinks, checkSimilarity }  from '@/lib/seo/generate-content'

export async function POST(req: NextRequest) {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'site_content')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const { store_id } = await req.json().catch(() => ({}))
  if (!store_id) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  try {
    const facts   = await gatherStoreFacts(store_id)
    const raw     = await generateContent(facts)
    const content = resolveInternalLinks(raw, facts.relatedStores, facts.categories)

    const { isSimilar, conflictingStoreId } = await checkSimilarity(
      content.description, store_id, facts.categories[0]?.slug ?? null
    )

    const supabase = createAdminClient()
    await supabase.from('stores').update({
      content_body:         content,
      content_status:       isSimilar ? 'needs_review' : 'draft',
      content_generated_at: new Date().toISOString(),
      content_tier:         facts.tier,
      content_approved_at:  null,
      content_approved_by:  null,
    }).eq('id', store_id)

    await supabase.from('content_generation_logs').insert({
      store_id, status: isSimilar ? 'needs_review' : 'draft',
      error_message: isSimilar ? `Similar to store ${conflictingStoreId}` : null,
    })

    return NextResponse.json({ content, tier: facts.tier, needs_review: isSimilar, conflicting_store_id: conflictingStoreId })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
