import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Store } from '@/lib/types'

const PALETTES = [
  'linear-gradient(135deg,#f97316,#c2410c)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#f59e0b,#b45309)',
  'linear-gradient(135deg,#38bdf8,#0284c7)',
  'linear-gradient(135deg,#10b981,#065f46)',
  'linear-gradient(135deg,#8b5cf6,#4c1d95)',
]

interface Props { stores: Store[] }

export function FeaturedStores({ stores }: Props) {
  if (stores.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">Boutiques recommandées</h2>
        <Link href="/all-stores/" className="text-xs font-extrabold uppercase tracking-widest flex items-center gap-1 flex-shrink-0" style={{ color:'#38bdf8' }}>
          <span className="hidden sm:inline">Voir tout</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stores.slice(0, 8).map((store, i) => (
          <div
            key={store.id}
            className="hp-store-card flex flex-col rounded-2xl"
            style={{ padding:'20px', background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.05)' }}
          >
            {/* Logo */}
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logo_url} alt={store.name} className="mb-3 object-contain rounded-xl bg-white p-1" style={{ width:'48px', height:'48px' }} />
            ) : (
              <div className="flex items-center justify-center font-black text-white text-xl mb-3 flex-shrink-0" style={{ width:'48px', height:'48px', borderRadius:'12px', background:PALETTES[i % PALETTES.length] }}>
                {store.name[0]}
              </div>
            )}

            <div className="text-sm font-extrabold text-white mb-1 leading-tight">{store.name}</div>
            <div className="text-xs font-bold mb-2" style={{ color:'#38bdf8' }}>
              {(store.coupon_count ?? 0)} codes actifs
            </div>
            <div className="text-xs mb-4" style={{ color:'rgba(255,255,255,.5)' }}>★★★★★ 4.8</div>

            <Link
              href={`/store/${store.slug}/`}
              className="hp-btn mt-auto w-full flex items-center justify-center gap-1.5 rounded-xl font-extrabold text-xs text-white"
              style={{ padding:'10px 12px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.14)', backdropFilter:'blur(18px)', boxShadow:'inset 0 1px 0 rgba(255,255,255,.1)' }}
            >
              Voir les offres <ChevronRight className="w-3 h-3 flex-shrink-0" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
