import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { breadcrumbJsonLd } from '@/components/Breadcrumb'
import { Store, Coupon } from '@/lib/types'
import { getSiteUrl, getCurrentMonthYear, hasCode } from '@/lib/utils'
import { getSidebarBanners } from '@/app/actions/site-content'
import type { Metadata } from 'next'
import { StorePageClient } from './StorePageClient'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase  = await createClient()
  const { data: store } = await supabase
    .from('stores')
    .select('name,meta_title,meta_description,slug,logo_url')
    .eq('slug', slug).single()
  if (!store) return {}

  const monthYear = getCurrentMonthYear()
  const title = store.meta_title
    || `Code Promo ${store.name} → Réductions Valides ${monthYear}`
  const desc  = store.meta_description
    || `Retrouvez tous les codes promo et réductions ${store.name} valides en ${monthYear}. Économisez sur vos achats avec codepromoreduc.fr`
  const siteUrl = getSiteUrl()
  const ogImage = `${siteUrl}/api/og/${slug}`

  return {
    title,
    description: desc,
    alternates: { canonical: `${siteUrl}/store/${slug}/` },
    openGraph: {
      title,
      description: desc,
      url: `${siteUrl}/store/${slug}/`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Code Promo ${store.name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImage],
    },
  }
}

/** Build the store-level affiliate tracking URL from whatever network data is available */
function resolveStoreAffiliateUrl(store: Store, siteUrl: string): string {
  const aff = store.affiliate_url?.trim()
  if (aff) return aff
  // Generate Awin tracking link when merchant ID is known
  if (store.awin_merchant_id) {
    const pubId = process.env.AWIN_PUBLISHER_ID ?? '857351'
    return `https://www.awin1.com/cread.php?awinmid=${store.awin_merchant_id}&awinaffid=${pubId}`
  }
  // Last resort: store page on our own site
  return `${siteUrl}/store/${store.slug}/`
}

export default async function StorePage({ params }: Props) {
  const { slug }  = await params
  const supabase  = await createClient()
  const today     = new Date().toISOString().split('T')[0]
  const siteUrl   = getSiteUrl()

  const [{ data: store }, { data: sidebarBanners }] = await Promise.all([
    supabase.from('stores').select('*').eq('slug', slug).eq('is_active', true).single(),
    getSidebarBanners(),
  ])
  if (!store) notFound()

  const { data: couponsData } = await supabase
    .from('coupons').select('*')
    .eq('store_id', store.id).eq('is_active', true)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .order('created_at', { ascending: false })
  const coupons = (couponsData ?? []) as Coupon[]

  // Similar store coupons (codes only) from same-category stores
  const { data: storeCatData } = await supabase
    .from('store_categories').select('category_id').eq('store_id', store.id).limit(5)
  const categoryIds = (storeCatData ?? []).map(sc => sc.category_id)

  interface SimilarCoupon {
    id: string; wp_post_id: number | null; title: string; code: string | null; discount_value: string | null
    expiry_date: string | null; store_id: string; is_featured: boolean | null
    store: { name: string; slug: string; logo_url: string | null; affiliate_url: string | null } | null
  }

  let similarCoupons: SimilarCoupon[] = []
  if (categoryIds.length > 0) {
    const { data: scData } = await supabase
      .from('store_categories').select('store_id')
      .in('category_id', categoryIds).neq('store_id', store.id).limit(50)
    const seen = new Set<string>(); const storeIds: string[] = []
    for (const r of scData ?? []) {
      if (!seen.has(r.store_id)) { seen.add(r.store_id); storeIds.push(r.store_id) }
    }
    if (storeIds.length > 0) {
      // Fetch up to 80 candidates, one per store, featuring top coupon
      const { data: simCoupons } = await supabase
        .from('coupons')
        .select('id, wp_post_id, title, code, discount_value, expiry_date, store_id, is_featured, store:stores(name,slug,logo_url,affiliate_url)')
        .in('store_id', storeIds)
        .eq('is_active', true)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`)
        .order('is_featured', { ascending: false, nullsFirst: false })
        .order('click_count', { ascending: false })
        .limit(80)

      // Keep only 1 coupon per store (best one), cap at 8 stores shown
      const seen = new Set<string>()
      const deduped: typeof simCoupons = []
      for (const c of simCoupons ?? []) {
        const sid = (c as { store_id: string }).store_id
        if (!seen.has(sid)) { seen.add(sid); deduped.push(c) }
        if (deduped.length === 8) break
      }
      similarCoupons = deduped as unknown as SimilarCoupon[]
    }
  }

  const crumbs = [
    { label: 'Accueil', href: '/' },
    { label: 'Boutiques', href: '/all-stores/' },
    { label: store.name },
  ]

  // Organization JSON-LD
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: store.name,
    url: store.affiliate_url || `${siteUrl}/store/${slug}/`,
    ...(store.logo_url ? { logo: store.logo_url } : {}),
    ...(store.description ? { description: store.description } : {}),
  }

  // ItemList of coupons JSON-LD
  const offersJsonLd = coupons.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Codes promo ${store.name}`,
    itemListElement: coupons.slice(0, 20).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': hasCode(c) ? 'DiscountCode' : 'Offer',
        name: c.title,
        description: c.title,
        seller: { '@type': 'Organization', name: store.name },
        ...(c.discount_value ? { discount: c.discount_value } : {}),
        ...(hasCode(c) ? { code: c.code } : {}),
        ...(c.expiry_date ? { validThrough: c.expiry_date } : {}),
        ...(c.destination_url ? { url: c.destination_url } : {}),
      },
    })),
  } : null

  // FAQPage JSON-LD — only when content is approved and has FAQs
  const faqJsonLd = (store.content_status === 'approved' && store.content_body?.faqs?.length)
    ? {
        '@context': 'https://schema.org',
        '@type':    'FAQPage',
        mainEntity: store.content_body.faqs.map((f: { question: string; answer: string }) => ({
          '@type': 'Question',
          name:    f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, siteUrl)) }} />
      {offersJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offersJsonLd) }} />
      )}
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <StorePageClient store={store} coupons={coupons} similarCoupons={similarCoupons} sidebarBanners={sidebarBanners} storeAffiliateUrl={resolveStoreAffiliateUrl(store as Store, siteUrl)} />
    </>
  )
}
