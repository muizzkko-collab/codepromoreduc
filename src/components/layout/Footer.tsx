import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function Footer() {
  const year = new Date().getFullYear()
  const supabase = await createClient()
  const { data: featuredStores } = await supabase
    .from('stores')
    .select('name,slug,logo_url')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('name')
    .limit(21)

  const popularStores = (featuredStores && featuredStores.length > 0)
    ? featuredStores
    : (await supabase
        .from('stores')
        .select('name,slug,logo_url')
        .eq('is_active', true)
        .order('coupon_count', { ascending: false })
        .limit(21)
      ).data ?? []

  return (
    <footer className="border-t border-white/10 mt-16">
      {/* Popular brands grid */}
      {popularStores && popularStores.length > 0 && (
        <div className="bg-white/[0.02] border-b border-white/5 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-sm font-bold tracking-tight text-white/80 whitespace-nowrap uppercase">Marques populaires</h3>
              <div className="h-px bg-white/10 flex-1" />
            </div>
            <div className="grid grid-cols-7 gap-3">
              {popularStores.map(store => (
                <Link
                  key={store.slug}
                  href={`/store/${store.slug}/`}
                  title={store.name}
                  className="transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '12px' }}
                >
                  {store.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', fontWeight: 800, fontSize: '12px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      {store.name.slice(0, 3)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-1 mb-3 font-extrabold text-lg tracking-tight">
              <span className="text-white">codepromo</span>
              <span className="text-primary">reduc</span>
            </div>
            <p className="text-sm leading-relaxed text-white/50">
              CodePromoReduc.fr est un annuaire de coupons indépendant. Nous participons à des réseaux d&apos;affiliation : nous pouvons percevoir une commission lorsque vous effectuez un achat via nos liens marchands.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Navigation</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/" className="hover:text-primary transition-colors">Accueil</Link></li>
              <li><Link href="/all-stores/" className="hover:text-primary transition-colors">Toutes les boutiques</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Informations</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/connexion/" className="hover:text-primary transition-colors">Administration</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-8 text-center text-xs text-white/40">
          <p>© {year} codepromoreduc.fr — Tous droits réservés</p>
        </div>
      </div>
    </footer>
  )
}
