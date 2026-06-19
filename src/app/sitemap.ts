import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/utils'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const siteUrl  = getSiteUrl()
  const now      = new Date()

  const [storesRes, catsRes, couponsRes] = await Promise.all([
    supabase.from('stores').select('slug').eq('is_active', true).limit(5000),
    supabase.from('categories').select('slug').limit(500),
    supabase.from('coupons').select('wp_post_id,store:stores(slug)').eq('is_active', true).limit(10000),
  ])

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
