import { NextRequest, NextResponse }  from 'next/server'
import { createAdminClient }          from '@/lib/supabase/admin'
import { gatherStoreFacts, assignTier } from '@/lib/seo/gather-store-facts'
import { generateContent, resolveInternalLinks, checkSimilarity } from '@/lib/seo/generate-content'

export const maxDuration = 300

interface BatchResult {
  store_id:   string
  store_name: string
  status:     'success' | 'needs_review' | 'failed'
  tier?:      string
  error?:     string
  conflicting_store_id?: string | null
}

async function processStore(storeId: string): Promise<BatchResult> {
  const supabase = createAdminClient()
  let storeName  = storeId

  try {
    // 1. Gather facts
    const facts = await gatherStoreFacts(storeId)
    storeName   = facts.name

    // 2. Generate content via Claude
    const raw = await generateContent(facts)

    // 3. Resolve internal link markers
    const content = resolveInternalLinks(raw, facts.relatedStores, facts.categories)

    // 4. Similarity check
    const categorySlug = facts.categories[0]?.slug ?? null
    const { isSimilar, conflictingStoreId } = await checkSimilarity(
      content.description, storeId, categorySlug
    )

    const contentStatus = isSimilar ? 'needs_review' : 'draft'

    // 5. Save to store
    const { error: saveErr } = await supabase
      .from('stores')
      .update({
        content_body:         content,
        content_status:       contentStatus,
        content_generated_at: new Date().toISOString(),
        content_tier:         facts.tier,
      })
      .eq('id', storeId)

    if (saveErr) throw new Error(`DB save failed: ${saveErr.message}`)

    // 6. Log
    await supabase.from('content_generation_logs').insert([{
      store_id:  storeId,
      status:    contentStatus,
      error_message: isSimilar ? `Similar to store ${conflictingStoreId}` : null,
    }])

    return {
      store_id:   storeId,
      store_name: storeName,
      status:     isSimilar ? 'needs_review' : 'success',
      tier:       facts.tier,
      conflicting_store_id: isSimilar ? conflictingStoreId : null,
    }
  } catch (e: unknown) {
    const msg = (e as Error).message
    // Log failure
    const supabase2 = createAdminClient()
    await supabase2.from('content_generation_logs').insert([{
      store_id:      storeId,
      status:        'error',
      error_message: msg,
    }])

    return { store_id: storeId, store_name: storeName, status: 'failed', error: msg }
  }
}

// Run N stores with concurrency cap
async function processConcurrent<T>(
  items:       T[],
  concurrency: number,
  fn:          (item: T) => Promise<BatchResult>,
  delayMs:     number = 1500,
): Promise<BatchResult[]> {
  const results: BatchResult[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency)
    const batch = await Promise.all(chunk.map(fn))
    results.push(...batch)
    if (i + concurrency < items.length) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  return results
}

export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.headers.get('authorization')
  const isAdmin = req.headers.get('x-admin-request') === '1'
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { batchSize?: number; tier?: string } = {}
  try { body = await req.json() } catch { /* no body */ }

  const batchSize = Math.min(Math.max(body.batchSize ?? 50, 1), 100)
  const tierFilter = body.tier ?? null

  const supabase = createAdminClient()

  // Query stores to process: not_generated, ordered by priority
  let query = supabase
    .from('stores')
    .select('id,name,coupon_count,click_count')
    .eq('is_active', true)
    .eq('content_status', 'not_generated')

  if (tierFilter) {
    // Filter by tier assignment (compute in DB isn't possible for a formula,
    // so we fetch candidates and filter in JS)
  }

  // Order by priority: coupon_count*2 + click_count*5 (approximate via coupon_count first)
  query = query
    .order('coupon_count', { ascending: false })
    .order('click_count',  { ascending: false })
    .limit(batchSize * 3)  // over-fetch to allow tier filtering

  const { data: candidates, error: qErr } = await query
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
  if (!candidates?.length) {
    return NextResponse.json({ message: 'No stores to process', processed: 0 })
  }

  // Apply tier filter in JS if requested
  const filtered = tierFilter
    ? candidates.filter(s => assignTier(s.coupon_count, s.click_count) === tierFilter)
    : candidates
  const toProcess = filtered.slice(0, batchSize)

  // Process with concurrency=4, 1.5s delay between chunks
  const results = await processConcurrent(
    toProcess,
    4,
    s => processStore(s.id),
    1500,
  )

  const summary = {
    processed:    results.length,
    succeeded:    results.filter(r => r.status === 'success').length,
    needs_review: results.filter(r => r.status === 'needs_review').length,
    failed:       results.filter(r => r.status === 'failed').length,
    results,
  }

  return NextResponse.json(summary)
}
