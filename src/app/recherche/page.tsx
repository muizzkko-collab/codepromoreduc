import { createClient } from '@/lib/supabase/server'
import { StoreCard } from '@/components/StoreCard'
import { CouponCard } from '@/components/CouponCard'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Store, Coupon } from '@/lib/types'
import { getSiteUrl } from '@/lib/utils'
import type { Metadata } from 'next'
import { Search } from 'lucide-react'

interface Props { searchParams: Promise<{ q?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" — Résultats de recherche` : 'Recherche',
    robots: 'noindex',
    alternates: { canonical: `${getSiteUrl()}/recherche/` },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = (q || '').trim()

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  let stores: Store[] = []
  let coupons: (Coupon & { store: Store })[] = []

  if (query.length >= 2) {
    const [storesRes, couponsRes] = await Promise.all([
      supabase.from('stores').select('*').eq('is_active', true).ilike('name', `%${query}%`).order('name').limit(24),
      supabase.from('coupons').select('*, store:stores(*)').eq('is_active', true)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`)
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false }).limit(24),
    ])
    stores  = (storesRes.data  ?? []) as Store[]
    coupons = ((couponsRes.data ?? []) as unknown) as (Coupon & { store: Store })[]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Recherche' }]} />

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-bold text-navy">
          {query ? <>Résultats pour &ldquo;<span className="text-primary">{query}</span>&rdquo;</> : 'Recherche'}
        </h1>
      </div>

      {query.length < 2 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Entrez au moins 2 caractères pour rechercher.</p>
        </div>
      ) : stores.length === 0 && coupons.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-600">Aucun résultat trouvé</p>
          <p className="mt-2">Essayez un autre terme de recherche.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Stores */}
          {stores.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-navy mb-4">
                {stores.length} boutique{stores.length > 1 ? 's' : ''} trouvée{stores.length > 1 ? 's' : ''}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {stores.map(s => <StoreCard key={s.id} store={s} />)}
              </div>
            </section>
          )}

          {/* Coupons */}
          {coupons.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-navy mb-4">
                {coupons.length} code{coupons.length > 1 ? 's' : ''} promo trouvé{coupons.length > 1 ? 's' : ''}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {coupons.map(c => (
                  <CouponCard
                    key={c.id}
                    couponId={c.id}
                    storeId={c.store_id}
                    couponCode={c.code ?? null}
                    couponTitle={c.title}
                    discountValue={c.discount_value ?? ''}
                    couponType={c.code ? 'code' : 'deal'}
                    storeLogoUrl={c.store?.logo_url ?? null}
                    storeName={c.store?.name ?? 'Boutique'}
                    affiliateUrl={(c as unknown as { destination_url?: string }).destination_url || c.store?.affiliate_url || '/'}
                    expiryDate={c.expiry_date ?? null}
                    variant="homepage"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
