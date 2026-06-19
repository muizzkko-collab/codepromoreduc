import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StoreCard } from '@/components/StoreCard'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/Breadcrumb'
import { Store, Category } from '@/lib/types'
import { getSiteUrl } from '@/lib/utils'
import type { Metadata } from 'next'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: cat } = await supabase.from('categories').select('name,slug').eq('slug', slug).single()
  if (!cat) return {}
  return {
    title: `${cat.name} — Codes Promo & Réductions`,
    description: `Tous les codes promo et réductions dans la catégorie ${cat.name}. Économisez avec codepromoreduc.fr`,
    alternates: { canonical: `${getSiteUrl()}/coupon-category/${slug}/` },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: cat } = await supabase.from('categories').select('*').eq('slug', slug).single()
  if (!cat) notFound()

  // Stores in this category via store_categories junction
  const { data: scData } = await supabase
    .from('store_categories')
    .select('store:stores(*)')
    .eq('category_id', cat.id)
    .limit(500)

  let stores: Store[] = []
  if (scData && scData.length > 0) {
    stores = scData.map((r: { store: unknown }) => r.store as Store).filter(s => s?.is_active)
  }

  const siteUrl = getSiteUrl()
  const crumbs = [
    { label: 'Accueil', href: '/' },
    { label: 'Catégories' },
    { label: (cat as Category).name },
  ]

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${(cat as Category).name} — Codes Promo`,
    itemListElement: stores.slice(0, 20).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      url: `${siteUrl}/store/${s.slug}/`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, siteUrl)) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb crumbs={crumbs} />
        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold text-navy">{(cat as Category).name}</h1>
          <p className="text-gray-500 mt-2">{stores.length} boutique{stores.length !== 1 ? 's' : ''} dans cette catégorie</p>
        </div>
        {stores.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Aucune boutique dans cette catégorie pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {stores.map(s => <StoreCard key={s.id} store={s} />)}
          </div>
        )}
      </div>
    </>
  )
}
