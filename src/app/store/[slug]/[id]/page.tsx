import { createClient }   from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getSiteUrl, getCurrentMonthYear, hasCode } from '@/lib/utils'
import { breadcrumbJsonLd } from '@/components/Breadcrumb'
import type { Metadata } from 'next'
import type { Store } from '@/lib/types'
import { CouponRevealClient } from './CouponRevealClient'

interface Props { params: Promise<{ slug: string; id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: coupon } = await supabase
    .from('coupons')
    .select('title, discount_value, store:stores(name, slug)')
    .eq('public_id', parseInt(id))
    .single()
  if (!coupon) return {}
  const store  = coupon.store as unknown as { name: string; slug: string }
  const disc   = coupon.discount_value ? `${coupon.discount_value} ` : ''
  const month  = getCurrentMonthYear()
  return {
    title:       `${disc}chez ${store.name} — Code Promo ${month}`,
    description: `${coupon.title} — Profitez de cette offre chez ${store.name} avec codepromoreduc.fr`,
    alternates:  { canonical: `${getSiteUrl()}/store/${slug}/${id}/` },
    robots:      { index: true, follow: true },
  }
}

export default async function CouponRevealPage({ params }: Props) {
  const { slug, id } = await params
  const publicId     = parseInt(id)
  if (isNaN(publicId)) notFound()

  const supabase = await createClient()

  const { data: coupon } = await supabase
    .from('coupons')
    .select('*, store:stores(*)')
    .eq('public_id', publicId)
    .single()

  if (!coupon) notFound()

  const store = coupon.store as unknown as Store
  // Canonical slug redirect (e.g. old WordPress URL had different slug)
  if (store.slug !== slug) redirect(`/store/${store.slug}/${id}/`)

  // Fetch similar stores (server-side, no client round-trip)
  const { data: catData } = await supabase
    .from('store_categories').select('category_id').eq('store_id', store.id).limit(5)
  const catIds = (catData ?? []).map(r => r.category_id)

  let similarStores: { name: string; slug: string; logo_url: string | null }[] = []
  if (catIds.length > 0) {
    const { data: scData } = await supabase
      .from('store_categories').select('store_id')
      .in('category_id', catIds).neq('store_id', store.id).limit(40)
    const storeIds = [...new Set((scData ?? []).map(r => r.store_id))].slice(0, 20)
    if (storeIds.length > 0) {
      const { data: sData } = await supabase
        .from('stores').select('name, slug, logo_url')
        .in('id', storeIds).eq('is_active', true).limit(8)
      similarStores = (sData ?? []) as typeof similarStores
    }
  }

  const couponTyped  = coupon as unknown as import('@/lib/types').Coupon & { store: import('@/lib/types').Store }
  const affiliateUrl = couponTyped.destination_url || store.affiliate_url || `/store/${slug}/`

  const siteUrl = getSiteUrl()
  const offerJsonLd = {
    '@context': 'https://schema.org',
    '@type':    hasCode(couponTyped) ? 'DiscountCode' : 'Offer',
    name:       couponTyped.title,
    description: couponTyped.title,
    seller:     { '@type': 'Organization', name: store.name, url: `${siteUrl}/store/${slug}/` },
    ...(couponTyped.discount_value ? { discount: couponTyped.discount_value } : {}),
    ...(hasCode(couponTyped) && couponTyped.code ? { code: couponTyped.code } : {}),
    ...(couponTyped.expiry_date ? { validThrough: couponTyped.expiry_date } : {}),
    url: `${siteUrl}/store/${slug}/${id}/`,
  }

  const breadcrumbLd = breadcrumbJsonLd([
    { label: 'Accueil', href: '/' },
    { label: store.name, href: `/store/${slug}/` },
    { label: coupon.title.slice(0, 50) },
  ], siteUrl)

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <CouponRevealClient
        couponCode={couponTyped.code ?? null}
        couponTitle={couponTyped.title}
        discountValue={couponTyped.discount_value ?? null}
        couponType={(couponTyped.type ?? 'deal') as 'code' | 'deal' | 'free_shipping'}
        storeName={store.name}
        storeSlug={slug}
        logoUrl={store.logo_url ?? null}
        bannerUrl={store.popup_banner_url ?? null}
        affiliateUrl={affiliateUrl}
        expiryDate={couponTyped.expiry_date ?? null}
        similarStores={similarStores}
      />
    </>
  )
}
