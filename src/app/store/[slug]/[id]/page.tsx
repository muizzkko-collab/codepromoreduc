import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CouponCard } from '@/components/CouponCard'
import { StoreLogo } from '@/components/StoreLogo'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/Breadcrumb'
import { Store, Coupon } from '@/lib/types'
import { getSiteUrl, getCurrentMonthYear, hasCode } from '@/lib/utils'
import type { Metadata } from 'next'
import Link from 'next/link'

interface Props { params: Promise<{ slug: string; id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: coupon } = await supabase.from('coupons')
    .select('title,discount_value,store:stores(name,slug)')
    .eq('wp_post_id', parseInt(id)).single()
  if (!coupon) return {}
  const store = coupon.store as unknown as { name: string; slug: string }
  const monthYear = getCurrentMonthYear()
  const disc = coupon.discount_value ? `${coupon.discount_value} ` : ''
  const title = `${disc}chez ${store.name} — Code Promo ${monthYear}`
  return {
    title,
    description: `${coupon.title} — Profitez de cette offre chez ${store.name} avec codepromoreduc.fr`,
    alternates: { canonical: `${getSiteUrl()}/store/${slug}/${id}/` },
  }
}

export default async function CouponPage({ params }: Props) {
  const { slug, id } = await params
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: store } = await supabase.from('stores').select('*').eq('slug', slug).single()
  if (!store) notFound()

  const { data: coupon } = await supabase.from('coupons')
    .select('*')
    .eq('wp_post_id', parseInt(id))
    .eq('store_id', store.id)
    .single()
  if (!coupon) notFound()

  const { data: relatedData } = await supabase.from('coupons')
    .select('*')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .neq('id', coupon.id)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .limit(4)
  const related = (relatedData ?? []) as Coupon[]

  const siteUrl = getSiteUrl()
  const crumbs = [
    { label: 'Accueil', href: '/' },
    { label: store.name, href: `/store/${slug}/` },
    { label: coupon.title.slice(0, 40) },
  ]

  const offerJsonLd = {
    '@context': 'https://schema.org',
    '@type': hasCode(coupon) ? 'DiscountCode' : 'Offer',
    name: coupon.title,
    description: coupon.title,
    seller: { '@type': 'Organization', name: store.name },
    ...(coupon.discount_value ? { discount: coupon.discount_value } : {}),
    ...(hasCode(coupon) ? { code: coupon.code } : {}),
    ...(coupon.expiry_date ? { validThrough: coupon.expiry_date } : {}),
    ...(coupon.destination_url ? { url: coupon.destination_url } : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, siteUrl)) }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb crumbs={crumbs} />

        <div className="mt-6 flex items-center gap-4">
          <StoreLogo src={store.logo_url} name={store.name} size="sm" />
          <Link href={`/store/${slug}/`} className="font-semibold text-navy hover:text-primary transition-colors">
            {store.name}
          </Link>
        </div>

        <div className="mt-6 max-w-md">
          <CouponCard
            couponId={(coupon as Coupon).id}
            storeId={(store as Store).id}
            couponCode={(coupon as Coupon).code ?? null}
            couponTitle={(coupon as Coupon).title}
            discountValue={(coupon as Coupon).discount_value ?? ''}
            couponType={(coupon as Coupon).code ? 'code' : 'deal'}
            storeLogoUrl={(store as Store).logo_url ?? null}
            storeName={(store as Store).name}
            affiliateUrl={(coupon as unknown as { destination_url?: string }).destination_url || (store as Store).affiliate_url || '/'}
            expiryDate={(coupon as Coupon).expiry_date ?? null}
            variant="homepage"
          />
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-navy mb-4">Autres offres {store.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map(c => (
                <CouponCard
                  key={c.id}
                  couponId={c.id}
                  storeId={(store as Store).id}
                  couponCode={c.code ?? null}
                  couponTitle={c.title}
                  discountValue={c.discount_value ?? ''}
                  couponType={c.code ? 'code' : 'deal'}
                  storeLogoUrl={(store as Store).logo_url ?? null}
                  storeName={(store as Store).name}
                  affiliateUrl={(c as unknown as { destination_url?: string }).destination_url || (store as Store).affiliate_url || '/'}
                  expiryDate={c.expiry_date ?? null}
                  variant="homepage"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
