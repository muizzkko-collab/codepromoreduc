import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSiteUrl, formatDate } from '@/lib/utils'
import { getBlogPost } from '@/app/actions/blog'
import { createClient } from '@/lib/supabase/server'
import type { Coupon, Store } from '@/lib/types'
import { ChevronRight, Calendar, User } from 'lucide-react'

export const revalidate = 3600

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: post } = await getBlogPost(slug)
  if (!post) return { title: 'Article introuvable' }
  return {
    title: `${post.title} | Blog codepromoreduc.fr`,
    description: post.excerpt ?? undefined,
    alternates: { canonical: getSiteUrl() + `/blog/${post.slug}/` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      url: getSiteUrl() + `/blog/${post.slug}/`,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: post }, couponsRes] = await Promise.all([
    getBlogPost(slug),
    supabase.from('coupons').select('*, store:stores(*)').eq('is_active', true)
      .or(`expiry_date.is.null,expiry_date.gte.${today}`)
      .order('created_at', { ascending: false }).limit(6),
  ])

  if (!post || !post.is_published) notFound()

  type CouponWithStore = Coupon & { store: Store }
  const latestCoupons = ((couponsRes.data ?? []) as unknown as CouponWithStore[])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: getSiteUrl() + '/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: getSiteUrl() + '/blog/' },
          { '@type': 'ListItem', position: 3, name: post.title, item: getSiteUrl() + `/blog/${post.slug}/` },
        ],
      },
      {
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        author: { '@type': 'Person', name: post.author },
        datePublished: post.published_at ?? post.created_at,
        dateModified: post.updated_at,
        image: post.cover_image_url,
        url: getSiteUrl() + `/blog/${post.slug}/`,
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ minHeight: '100vh', background: '#040612', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '20px 0', fontSize: 13, color: 'rgba(255,255,255,.4)', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>Accueil</Link>
            <ChevronRight style={{ width: 12, height: 12 }} />
            <Link href="/blog/" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>Blog</Link>
            <ChevronRight style={{ width: 12, height: 12 }} />
            <span style={{ color: '#38bdf8' }}>{post.title}</span>
          </nav>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>

            {/* Main content */}
            <article>
              {post.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.cover_image_url} alt={post.title}
                  style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 16, marginBottom: 32 }} />
              )}

              <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '.08em', background: 'rgba(56,189,248,.1)', borderRadius: 6, padding: '4px 10px' }}>
                {post.category}
              </span>

              <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.5rem)', fontWeight: 900, letterSpacing: '-.03em', margin: '16px 0 12px', lineHeight: 1.2 }}>
                {post.title}
              </h1>

              <div style={{ display: 'flex', gap: 20, marginBottom: 32, fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <User style={{ width: 13, height: 13 }} /> {post.author}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar style={{ width: 13, height: 13 }} />
                  {formatDate(post.published_at ?? post.created_at)}
                </span>
              </div>

              {post.content && (
                <div
                  style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(255,255,255,.75)' }}
                  dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
                />
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div style={{ marginTop: 32, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {post.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,.5)' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Internal links */}
              <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/blog/" style={{ padding: '10px 20px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  ← Retour au Blog
                </Link>
                <Link href="/daily-deals/" style={{ padding: '10px 20px', background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.2)', borderRadius: 10, color: '#38bdf8', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  Offres du Jour →
                </Link>
              </div>
            </article>

            {/* Sidebar */}
            <aside style={{ position: 'sticky', top: 24 }}>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '20px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: '#fff' }}>Codes Promo Récents</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {latestCoupons.map(coupon => (
                    <div key={coupon.id} style={{ borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: 12 }}>
                      {coupon.discount_value && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,.1)', borderRadius: 6, padding: '2px 7px', marginBottom: 6, display: 'inline-block' }}>
                          {coupon.discount_value}
                        </span>
                      )}
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.4, marginBottom: 4 }}>{coupon.title}</p>
                      {coupon.store && (
                        <Link href={`/store/${coupon.store.slug}/`} style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none' }}>
                          {coupon.store.name} →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
                <Link href="/daily-deals/" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13, fontWeight: 700, color: '#38bdf8', textDecoration: 'none', padding: '10px', background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.2)', borderRadius: 10 }}>
                  Voir toutes les offres →
                </Link>
              </div>
            </aside>
          </div>

        </div>
      </div>
    </>
  )
}
