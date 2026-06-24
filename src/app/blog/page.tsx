import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteUrl, formatDate } from '@/lib/utils'
import { getBlogPosts } from '@/app/actions/blog'
import { ChevronRight, BookOpen } from 'lucide-react'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Blog — Conseils & Bons Plans | codepromoreduc.fr',
  description: 'Découvrez nos conseils pour économiser, trouver les meilleures offres et utiliser les codes promo intelligemment.',
  alternates: { canonical: getSiteUrl() + '/blog/' },
  openGraph: {
    title: 'Blog Conseils & Bons Plans | codepromoreduc.fr',
    description: 'Astuces, guides et conseils pour économiser sur vos achats en ligne.',
    url: getSiteUrl() + '/blog/',
  },
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 16,
  overflow: 'hidden',
  transition: 'all 200ms ease',
}

export default async function BlogPage() {
  const { data: posts } = await getBlogPosts(true)
  const allPosts = posts ?? []

  return (
    <div style={{ minHeight: '100vh', background: '#040612', color: '#fff' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a0f2e 0%, #040612 50%, #0d1a3a 100%)', padding: '60px 24px 40px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.2)', borderRadius: 99, padding: '6px 16px', marginBottom: 20 }}>
            <BookOpen style={{ width: 14, height: 14, color: '#38bdf8' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Blog</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, letterSpacing: '-.03em', marginBottom: 12, lineHeight: 1.1 }}>
            Notre Blog — <span style={{ color: '#38bdf8' }}>Conseils & Bons Plans</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)' }}>
            Astuces, guides et conseils pour économiser intelligemment
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '16px 0', fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>Accueil</Link>
          <ChevronRight style={{ width: 12, height: 12 }} />
          <span style={{ color: '#38bdf8' }}>Blog</span>
        </nav>

        {allPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,.4)' }}>
            <BookOpen style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: .4 }} />
            <p style={{ fontSize: 16 }}>Aucun article publié pour le moment.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20, padding: '24px 0 48px' }}>
            {allPosts.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}/`} style={{ textDecoration: 'none' }}>
                <article style={card}>
                  {post.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.cover_image_url} alt={post.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '.08em', background: 'rgba(56,189,248,.1)', borderRadius: 6, padding: '3px 8px' }}>
                        {post.category}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.4 }}>{post.title}</h2>
                    {post.excerpt && (
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, marginBottom: 14 }}>{post.excerpt}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
                      <span>{post.author}</span>
                      <span>{post.published_at ? formatDate(post.published_at) : formatDate(post.created_at)}</span>
                    </div>
                    <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>Lire l&apos;article →</div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* Internal links */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
          <Link href="/daily-deals/" style={{ padding: '10px 20px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            Offres du Jour →
          </Link>
          <Link href="/weekly-deals/" style={{ padding: '10px 20px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            Offres de la Semaine →
          </Link>
        </div>

      </div>
    </div>
  )
}
