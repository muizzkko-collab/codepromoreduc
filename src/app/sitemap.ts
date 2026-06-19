import { createAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/utils'
import type { MetadataRoute } from 'next'

async function fetchAllSlugs(
  supabase: ReturnType<typeof createAdminClient>,
  table: 'stores' | 'categories',
  filter?: { column: string; value: boolean }
): Promise<{ slug: string }[]> {
  const PAGE = 1000
  const results: { slug: string }[] = []
  let offset = 0
  while (true) {
    let q = supabase.from(table).select('slug').order('slug').range(offset, offset + PAGE - 1)
    if (filter) q = q.eq(filter.column, filter.value)
    const { data } = await q
    if (!data || data.length === 0) break
    results.push(...(data as { slug: string }[]))
    if (data.length < PAGE) break
    offset += PAGE
  }
  return results
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()
  const siteUrl  = getSiteUrl()
  const now      = new Date()

  const [storesSlugs, catsSlugs] = await Promise.all([
    fetchAllSlugs(supabase, 'stores', { column: 'is_active', value: true }),
    fetchAllSlugs(supabase, 'categories'),
  ])

  const storesRes = { data: storesSlugs }
  const catsRes   = { data: catsSlugs }
  const couponsRes = { data: [] as { wp_post_id: string; store: { slug: string } | null }[] }

  const storePaths = (storesRes.data ?? []).map(s => ({
    url: `${siteUrl}/store/${s.slug}/`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const catPaths = (catsRes.data ?? []).map(c => ({
    url: `${siteUrl}/coupon-category/${c.slug}/`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const couponPaths = (couponsRes.data ?? [])
    .filter(c => c.store && (c.store as unknown as { slug: string }).slug)
    .map(c => ({
      url: `${siteUrl}/store/${(c.store as unknown as { slug: string }).slug}/${c.wp_post_id}/`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))

  return [
    { url: siteUrl + '/',                   lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: siteUrl + '/all-stores/',        lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: siteUrl + '/coupon-categories/', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ...storePaths,
    ...catPaths,
    ...couponPaths,
  ]
}
