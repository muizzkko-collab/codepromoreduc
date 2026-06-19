import { createAdminClient }          from '@/lib/supabase/admin'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { redirect }                  from 'next/navigation'
import { ContentAdmin }              from '@/components/admin/ContentAdmin'
import type { Metadata }             from 'next'
import type { ContentStatus, ContentTier, ContentBody } from '@/lib/types'

export const metadata: Metadata = { title: 'Contenu SEO' }
export const revalidate = 0

interface StoreRow {
  id:                   string
  name:                 string
  slug:                 string
  coupon_count:         number
  click_count:          number
  content_status:       ContentStatus | null
  content_body:         ContentBody | null
  content_tier:         ContentTier | null
  content_generated_at: string | null
  content_approved_at:  string | null
  content_approved_by:  string | null
}

export default async function ContentSeoPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'site_content')) redirect('/admin/')

  const supabase = createAdminClient()

  // Stat counts
  const [
    { count: total },
    { count: draft },
    { count: needsReview },
    { count: approved },
  ] = await Promise.all([
    supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('stores').select('*', { count: 'exact', head: true }).eq('content_status', 'draft'),
    supabase.from('stores').select('*', { count: 'exact', head: true }).eq('content_status', 'needs_review'),
    supabase.from('stores').select('*', { count: 'exact', head: true }).eq('content_status', 'approved'),
  ])

  const notGenerated = (total ?? 0) - (draft ?? 0) - (needsReview ?? 0) - (approved ?? 0)

  // Review queue: draft + needs_review, ordered by tier priority
  const { data: queue } = await supabase
    .from('stores')
    .select('id,name,slug,coupon_count,click_count,content_status,content_body,content_tier,content_generated_at,content_approved_at,content_approved_by')
    .in('content_status', ['draft', 'needs_review'])
    .order('content_tier', { ascending: true })  // premium first (alphabetically p < s < l)
    .order('coupon_count', { ascending: false })
    .limit(100)

  return (
    <ContentAdmin
      stats={{ total: total ?? 0, notGenerated, draft: draft ?? 0, needsReview: needsReview ?? 0, approved: approved ?? 0 }}
      queue={(queue ?? []) as StoreRow[]}
    />
  )
}
