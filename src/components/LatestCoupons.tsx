'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Coupon, Store } from '@/lib/types'
import { CouponRevealButton } from './CouponRevealButton'

const FILTERS = [
  { key: 'tous',            label: 'Tous' },
  { key: 'beaute',          label: 'Beauté' },
  { key: 'clothing',        label: 'Mode' },
  { key: 'home-decoration', label: 'Maison' },
  { key: 'chaussures',      label: 'Chaussures' },
  { key: 'health',          label: 'Santé' },
]

function storeGradient(name: string) {
  const hash = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0)
  const palettes = [
    'linear-gradient(135deg,#f97316,#c2410c)',
    'linear-gradient(135deg,#ec4899,#be185d)',
    'linear-gradient(135deg,#f59e0b,#b45309)',
    'linear-gradient(135deg,#38bdf8,#0284c7)',
    'linear-gradient(135deg,#10b981,#065f46)',
    'linear-gradient(135deg,#8b5cf6,#4c1d95)',
    'linear-gradient(135deg,#ef4444,#991b1b)',
    'linear-gradient(135deg,#06b6d4,#0e7490)',
  ]
  return palettes[hash % palettes.length]
}

function extractDiscount(coupon: Coupon): string {
  if (coupon.discount_value?.trim()) return coupon.discount_value.trim()
  const title = coupon.title ?? ''
  const pct = title.match(/(\d+(?:[.,]\d+)?\s*%)/i)
  if (pct) return pct[1].replace(',', '.').replace(/\s+/, '')
  const eur = title.match(/(\d+(?:[.,]\d+)?\s*€)/i)
  if (eur) return eur[1].replace(',', '.').replace(/\s+/, '')
  const off = title.match(/(-\d+(?:[.,]\d+)?)/i)
  if (off) return off[1]
  return coupon.code ? '••••••' : 'Offre'
}

function getAffiliateUrl(coupon: Coupon & { store: Store }): string {
  return (coupon as unknown as { destination_url?: string }).destination_url
    || coupon.store?.affiliate_url
    || `https://codepromoreduc.fr/store/${coupon.store?.slug}/`
}

interface CouponType extends Coupon { store: Store }

interface Props {
  coupons: CouponType[]
  couponsByCategory: Record<string, CouponType[]>
}

export function LatestCoupons({ coupons, couponsByCategory }: Props) {
  const [activeFilter, setActiveFilter] = useState('tous')
  const displayed = (couponsByCategory[activeFilter] ?? coupons).slice(0, 3)

  return (
    <>

      <section className="relative z-10 px-4 sm:px-7 py-12 sm:py-20 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Les dernières réductions vérifiées</h2>
          <Link href="/all-stores/" className="text-xs font-extrabold uppercase tracking-widest flex items-center gap-1 flex-shrink-0" style={{ color:'#38bdf8' }}>
            <span className="hidden sm:inline">Voir tout</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 sm:mb-7 scrollbar-hide" style={{ scrollbarWidth:'none', msOverflowStyle:'none' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="flex-shrink-0 rounded-full text-xs font-bold transition-all"
              style={{
                padding:'7px 14px',
                border: activeFilter === f.key ? '1px solid rgba(56,189,248,.55)' : '1px solid rgba(255,255,255,.1)',
                background: activeFilter === f.key ? 'rgba(56,189,248,.18)' : 'rgba(255,255,255,.04)',
                color: activeFilter === f.key ? '#38bdf8' : 'rgba(255,255,255,.6)',
                cursor:'pointer',
              }}
            >
              {f.label}{f.key === 'tous' ? ` · ${coupons.length}` : ''}
            </button>
          ))}
        </div>

        {/* Cards */}
        {displayed.length === 0 ? (
          <p className="text-center text-white/30 font-mono py-12">Aucun coupon disponible pour cette catégorie.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((coupon, i) => {
              const store    = coupon.store
              const featured = i === 0
              const hasCode  = !!coupon.code
              const discount = extractDiscount(coupon)

              return (
                <div
                  key={coupon.id}
                  className="relative rounded-3xl overflow-hidden"
                  style={{
                    padding:'20px 22px',
                    background: featured ? 'linear-gradient(135deg,rgba(245,158,11,.06),rgba(255,255,255,.01))' : 'rgba(255,255,255,.02)',
                    border: featured ? '1px solid rgba(245,158,11,.35)' : '1px solid rgba(255,255,255,.06)',
                    boxShadow: featured ? '0 12px 40px rgba(245,158,11,.1)' : 'none',
                  }}
                >
                  {featured && (
                    <div className="absolute top-0 right-0 pointer-events-none" style={{ width:'160px', height:'160px', background:'radial-gradient(circle,rgba(245,158,11,.12),transparent 60%)' }} />
                  )}

                  {/* Top row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center text-lg font-black text-white" style={{ width:'42px', height:'42px', borderRadius:'11px', background:storeGradient(store?.name ?? 'S') }}>
                        {(store?.name ?? 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-white leading-tight">{store?.name ?? 'Boutique'}</div>
                        <div className="text-[10px] mt-0.5" style={{ color:'rgba(255,255,255,.4)' }}>Vérifié récemment</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide" style={{ background: hasCode ? 'rgba(56,189,248,.15)' : 'rgba(245,158,11,.15)', color: hasCode ? '#38bdf8' : '#fbbf24', border: hasCode ? '1px solid rgba(56,189,248,.25)' : '1px solid rgba(245,158,11,.25)' }}>
                        {hasCode ? 'Code' : 'Deal'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide flex items-center gap-1" style={{ background:'rgba(16,185,129,.12)', color:'#34d399', border:'1px solid rgba(16,185,129,.22)' }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background:'#34d399' }} />
                        Vérifié
                      </span>
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="font-black tracking-tighter leading-none mb-2" style={{ fontSize:'clamp(28px,5vw,42px)', color: featured ? '#f59e0b' : '#fff', textShadow: featured ? '0 0 30px rgba(245,158,11,.3)' : 'none' }}>
                    {discount}
                  </div>

                  {/* Description */}
                  <p className="text-xs leading-relaxed mb-5 line-clamp-2" style={{ color:'rgba(255,255,255,.55)' }}>
                    {coupon.title}
                  </p>

                  {/* Masked pill */}
                  {hasCode && (
                    <div className="flex items-center justify-between rounded-xl mb-4" style={{ padding:'9px 13px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
                      <span className="font-mono font-bold text-sm" style={{ color:'rgba(255,255,255,.3)', letterSpacing:'.2em' }}>••••••••</span>
                      <span className="text-[9px] font-extrabold uppercase tracking-wide" style={{ color:'rgba(255,255,255,.3)' }}>Cliquez pour révéler</span>
                    </div>
                  )}

                  {/* CTA via CouponCard */}
                  <CouponRevealButton
                    couponId={coupon.id}
                    couponCode={coupon.code ?? null}
                    couponTitle={coupon.title}
                    discountValue={discount}
                    couponType={hasCode ? 'code' : 'deal'}
                    storeLogoUrl={store?.logo_url ?? null}
                    storeName={store?.name ?? 'Boutique'}
                    storeSlug={store?.slug}
                    popupBannerUrl={store?.popup_banner_url ?? null}
                    affiliateUrl={getAffiliateUrl(coupon)}
                    expiryDate={coupon.expiry_date ?? null}
                    featured={featured}
                    variant="homepage"
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
