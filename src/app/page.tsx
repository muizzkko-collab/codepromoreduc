import { createClient } from '@/lib/supabase/server'
import { HomeStoreSearch } from '@/components/HomeStoreSearch'
import { HeroCarousel } from '@/components/HeroCarousel'
import { SiteStatsBar } from '@/components/SiteStatsBar'
import { VerificationEngine } from '@/components/VerificationEngine'
import { StoreDirectory } from '@/components/StoreDirectory'
import type { DirectoryTab } from '@/components/StoreDirectory'
import { ExtensionPromo } from '@/components/ExtensionPromo'
import { LatestCoupons } from '@/components/LatestCoupons'
import { BrandMarquee } from '@/components/BrandMarquee'
import { FeaturedStores } from '@/components/FeaturedStores'
import { listHeroSlides, listSiteStats } from '@/app/actions/site-content'
import { breadcrumbJsonLd } from '@/components/Breadcrumb'
import { Store, Coupon } from '@/lib/types'
import { getSiteUrl, formatDate } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Code Promo & Réductions — Économisez sur vos achats',
  description: 'Retrouvez les meilleurs codes promo et réductions pour 2000+ boutiques françaises.',
  alternates: { canonical: getSiteUrl() + '/' },
  openGraph: {
    title: 'Code Promo & Réductions | codepromoreduc.fr',
    description: 'Les meilleurs codes promo pour économiser sur vos achats en ligne.',
    url: getSiteUrl() + '/',
  },
}

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    featuredRes, popularStoresRes, topCatsRes, couponsRes, allStoresCountRes,
    slidesRes, statsRes,
  ] = await Promise.all([
    supabase.from('stores').select('*').eq('is_active', true).eq('is_featured', true).order('name').limit(12),
    supabase.from('stores').select('id,name,slug,logo_url,coupon_count').eq('is_active', true).order('coupon_count', { ascending: false }).limit(8),
    supabase.from('categories').select('*').order('store_count', { ascending: false }).limit(6),
    supabase.from('coupons').select('*, store:stores(*)').eq('is_active', true)
      .or(`expiry_date.is.null,expiry_date.gte.${today}`)
      .order('created_at', { ascending: false }).limit(9),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
    listHeroSlides(),
    listSiteStats(),
  ])

  const featured = (featuredRes.data ?? []) as Store[]
  const coupons  = ((couponsRes.data ?? []) as unknown) as (Coupon & { store: Store })[]
  const slides   = slidesRes.data
  const stats    = statsRes.data
  const totalStores = allStoresCountRes.count ?? 0
  const popularStores = (popularStoresRes.data ?? []) as Store[]

  const displayFeatured = featured.length >= 4 ? featured.slice(0, 8) : popularStores.slice(0, 8)

  const topCats = topCatsRes.data ?? []
  const categoryTabsData = await Promise.all(
    topCats.map(async cat => {
      // Step 1: get store_ids for this category
      const { data: junctionRows } = await supabase
        .from('store_categories')
        .select('store_id')
        .eq('category_id', cat.id)
      const ids = (junctionRows ?? []).map((r: { store_id: string }) => r.store_id).filter(Boolean)
      if (ids.length === 0) return []

      // Step 2: fetch those stores directly
      const { data: storeRows } = await supabase
        .from('stores')
        .select('id,name,slug,logo_url,coupon_count')
        .in('id', ids)
        .eq('is_active', true)
        .order('coupon_count', { ascending: false })
        .limit(12)
      return (storeRows ?? []) as DirectoryTab['stores']
    })
  )

  const directoryTabs: DirectoryTab[] = [
    {
      key: 'popular',
      label: 'Populaire',
      stores: (popularStoresRes.data ?? []) as DirectoryTab['stores'],
    },
    ...topCats.map((cat, i) => ({
      key: cat.slug,
      label: cat.name,
      stores: categoryTabsData[i] as DirectoryTab['stores'],
    })),
  ]

  // Coupons per category for LatestCoupons filter tabs
  const COUPON_CATS = [
    { key: 'beaute',             label: 'Beauté' },
    { key: 'clothing',           label: 'Mode' },
    { key: 'home-decoration',    label: 'Maison' },
    { key: 'chaussures',         label: 'Chaussures' },
    { key: 'health',             label: 'Santé' },
  ]
  const couponCatData = await Promise.all(
    COUPON_CATS.map(async ({ key }) => {
      const catRow = (topCatsRes.data ?? []).find((c: { slug: string }) => c.slug === key)
        ?? (await supabase.from('categories').select('id').eq('slug', key).single()).data
      if (!catRow) return []
      const { data: jRows } = await supabase.from('store_categories').select('store_id').eq('category_id', catRow.id)
      const ids = (jRows ?? []).map((r: { store_id: string }) => r.store_id)
      if (ids.length === 0) return []
      const { data: catCoupons } = await supabase
        .from('coupons').select('*, store:stores(*)')
        .eq('is_active', true)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`)
        .in('store_id', ids)
        .order('created_at', { ascending: false })
        .limit(9)
      return (catCoupons ?? []) as (Coupon & { store: Store })[]
    })
  )
  const couponsByCategory: Record<string, (Coupon & { store: Store })[]> = { 'tous': coupons }
  COUPON_CATS.forEach(({ key }, i) => { couponsByCategory[key] = couponCatData[i] as (Coupon & { store: Store })[] })

  const feedEntries = coupons.slice(0, 8).map(c => ({
    id: c.id,
    storeName: c.store?.name ?? 'Boutique',
    title: c.title,
    timeLabel: formatDate(c.created_at),
  }))

  const siteUrl = getSiteUrl()
  const homeBreadcrumb = breadcrumbJsonLd([{ label: 'Accueil', href: '/' }], siteUrl)

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'codepromoreduc.fr',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/recherche?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeBreadcrumb) }} />

      {/* ── HERO ── */}
      <section className="relative z-10 pt-8 sm:pt-14 text-center flex flex-col items-center px-4">

        {/* Badge */}
        <a href="#" className="inline-flex items-center gap-2 sm:gap-3 mb-8 sm:mb-11 no-underline" style={{ padding:'5px 14px 5px 6px', border:'1px solid rgba(56,189,248,.32)', background:'rgba(56,189,248,.10)', borderRadius:'999px' }}>
          <span className="hidden sm:inline" style={{ background:'#38bdf8', color:'#060810', fontSize:'9.5px', fontWeight:800, padding:'4px 11px', borderRadius:'999px', textTransform:'uppercase', letterSpacing:'.12em' }}>Nouveau</span>
          <span style={{ fontSize:'11px', color:'rgba(255,255,255,.92)', fontWeight:600 }}>Découvrez l&apos;application mobile CodePromoReduc</span>
          <ChevronRight style={{ width:'11px', height:'11px', color:'rgba(255,255,255,.5)', flexShrink:0 }} />
        </a>

        {/* 3D Carousel */}
        <HeroCarousel slides={slides} />

        {/* Tagline */}
        <p className="text-sm sm:text-base md:text-lg px-2 sm:px-0 max-w-xl sm:max-w-2xl mx-auto leading-relaxed mb-0" style={{ color:'rgba(255,255,255,.62)', fontWeight:500 }}>
          Les autres devinent. Nous vérifions. Chaque code testé par machine, confirmé par humain — avant d&apos;être publié.
        </p>

        {/* Search bar */}
        <HomeStoreSearch stores={popularStores} />

        {/* Trust strip */}
        <div className="trust-strip flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 mt-8 sm:mt-11 mb-0 px-4 sm:px-9 py-4 sm:py-5 w-full max-w-2xl" style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:'999px', boxSizing:'border-box' }}>
          <div className="flex items-center gap-2.5 text-xs font-semibold" style={{ color:'rgba(255,255,255,.6)' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:'#10b981', boxShadow:'0 0 8px #10b981', animation:'live-pulse 1.8s ease-in-out infinite', display:'inline-block' }} />
            <span><strong style={{ color:'#fff' }}>8 432</strong> codes vérifiés ces dernières 24h</span>
          </div>
          <div className="hidden sm:block w-px h-4" style={{ background:'rgba(255,255,255,.08)' }} />
          <div className="text-xs font-semibold" style={{ color:'rgba(255,255,255,.6)' }}>
            <span style={{ color:'#38bdf8', fontWeight:900 }}>98,2%</span> de taux de réussite moyen
          </div>
          <div className="hidden sm:block w-px h-4" style={{ background:'rgba(255,255,255,.08)' }} />
          <div className="text-xs font-semibold" style={{ color:'rgba(255,255,255,.6)' }}>
            <span style={{ color:'#fff', fontWeight:900 }}>{totalStores.toLocaleString('fr-FR')}</span> boutiques partenaires
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <SiteStatsBar stats={stats} />

      {/* ── VERIFICATION ENGINE ── */}
      <VerificationEngine entries={feedEntries} />

      {/* ── LATEST COUPONS ── */}
      <LatestCoupons coupons={coupons} couponsByCategory={couponsByCategory} />

      {/* ── MARQUEE ── */}
      <BrandMarquee stores={popularStores} />

      {/* ── FEATURED STORES ── */}
      <div className="max-w-7xl mx-auto mt-16 sm:mt-20 px-4 sm:px-7">
        <FeaturedStores stores={displayFeatured.length ? displayFeatured : popularStores.slice(0,4) as Store[]} />
      </div>

      {/* ── FULL DIRECTORY ── */}
      <StoreDirectory tabs={directoryTabs} totalStores={totalStores} />

      {/* ── EXTENSION CTA ── */}
      <ExtensionPromo />
    </>
  )
}
