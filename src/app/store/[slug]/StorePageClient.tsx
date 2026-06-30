'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Store, Coupon } from '@/lib/types'
import { getCurrentMonthYear } from '@/lib/utils'
import { CouponRevealButton } from '@/components/CouponRevealButton'
import type { SidebarBanner } from '@/app/actions/site-content'

interface SimilarCoupon {
  id: string; title: string; code: string | null; discount_value: string | null
  expiry_date: string | null; store_id: string; is_featured: boolean | null
  store: { name: string; slug: string; logo_url: string | null; affiliate_url: string | null } | null
}

interface Props {
  store: Store
  coupons: Coupon[]
  similarCoupons: SimilarCoupon[]
  sidebarBanners: SidebarBanner[]
  storeAffiliateUrl: string
}

type Filter = 'ALL' | 'CODES' | 'DEALS'

const PALETTES = [
  'linear-gradient(135deg,#f97316,#c2410c)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#f59e0b,#b45309)',
  'linear-gradient(135deg,#38bdf8,#0284c7)',
  'linear-gradient(135deg,#10b981,#065f46)',
  'linear-gradient(135deg,#8b5cf6,#4c1d95)',
  'linear-gradient(135deg,#ef4444,#991b1b)',
  'linear-gradient(135deg,#06b6d4,#0e7490)',
]
function hashGradient(name: string) {
  const h = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0)
  return PALETTES[h % PALETTES.length]
}
function storeLetter(name: string) { return name[0]?.toUpperCase() ?? '?' }
function extractDiscount(coupon: Coupon): string {
  if (coupon.discount_value?.trim()) return coupon.discount_value.trim()
  const title = coupon.title ?? ''
  const pct = title.match(/(\d+(?:[.,]\d+)?\s*%)/i)
  if (pct) return pct[1].replace(',', '.').replace(/\s+/, '')
  const eur = title.match(/(\d+(?:[.,]\d+)?\s*€)/i)
  if (eur) return eur[1].replace(',', '.').replace(/\s+/, '')
  const off = title.match(/(-\d+(?:[.,]\d+)?)/i)
  if (off) return off[1]
  return coupon.code ? coupon.code : 'DEAL'
}

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconChevRight = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width:size, height:size, flexShrink:0 }}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
)
const IconChevDown = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ width:14, height:14, flexShrink:0, transition:'transform 300ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
)
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:18, height:18, flexShrink:0, marginTop:1 }}>
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
)
const IconHelpCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:15, height:15, flexShrink:0 }}>
    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
  </svg>
)
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width:16, height:16 }}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
)
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:10, height:10 }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconTrendUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:16, height:16, flexShrink:0 }}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
)

const CHART_BARS = [
  { name:'Avr', codes:19, isHighest:false },
  { name:'Mai', codes:18, isHighest:false },
  { name:'Jui', codes:20, isHighest:true  },
  { name:'Jul', codes:17, isHighest:false },
  { name:'Aoû', codes:18, isHighest:false },
  { name:'Sep', codes:16, isHighest:false },
  { name:'Oct', codes:17, isHighest:false },
  { name:'Nov', codes:16, isHighest:false },
  { name:'Déc', codes:16, isHighest:false },
  { name:'Jan', codes:22, isHighest:false },
  { name:'Fév', codes:12, isHighest:false },
  { name:'Mar', codes:13, isHighest:false },
  { name:'Avr', codes:12, isHighest:false },
]

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,.02)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,.06)',
}

// ── StoreLogo ──────────────────────────────────────────────────────────────
function StoreLogo({ store, size }: { store: Store; size: number }) {
  return (
    <div style={{ width:size, height:size, borderRadius: size > 60 ? 20 : 14, background: store.logo_url ? '#fff' : hashGradient(store.name), display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,.3)' }}>
      {store.logo_url
        ? <img src={store.logo_url} alt={store.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding: size > 60 ? 8 : 6 }} />
        : <>
            <span style={{ fontSize: size > 60 ? 34 : 20, fontWeight:900, color:'#fff', lineHeight:1 }}>{storeLetter(store.name)}</span>
            {size > 60 && <span style={{ fontSize:7.5, fontWeight:900, color:'rgba(255,255,255,.75)', letterSpacing:'.18em', textTransform:'uppercase', marginTop:4 }}>{store.name.slice(0,8)}</span>}
          </>
      }
    </div>
  )
}

const OWN_DOMAINS = ['codepromoreduc.fr', 'localhost']

/** Use coupon's deep-link only when it points to an external site, otherwise use the store affiliate URL */
function couponUrl(coupon: { destination_url?: string | null }, storeAffiliateUrl: string): string {
  const dest = coupon.destination_url
  if (dest) {
    try {
      const host = new URL(dest).hostname.replace(/^www\./, '')
      if (!OWN_DOMAINS.some(d => host === d || host.endsWith('.' + d))) return dest
    } catch { /* invalid URL, ignore */ }
  }
  return storeAffiliateUrl
}

export function StorePageClient({ store, coupons, similarCoupons, sidebarBanners, storeAffiliateUrl }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({})
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({})
  const [descExpanded, setDescExpanded] = useState(false)

  const monthYear = getCurrentMonthYear()
  const sortFeaturedFirst = (arr: Coupon[]) => {
    const feat = arr.filter(c => (c as Coupon & { is_featured?: boolean }).is_featured)
    const rest  = arr.filter(c => !(c as Coupon & { is_featured?: boolean }).is_featured)
    return [...feat, ...rest]
  }
  const codes = sortFeaturedFirst(coupons.filter(c => !!c.code))
  const deals = sortFeaturedFirst(coupons.filter(c => !c.code))
  const filtered = sortFeaturedFirst(filter === 'CODES' ? codes : filter === 'DEALS' ? deals : coupons)

  const toggleDetails = useCallback((id: string) => setOpenDetails(prev => ({ ...prev, [id]: !prev[id] })), [])
  const toggleFaq = useCallback((i: number) => setOpenFaqs(prev => ({ ...prev, [i]: !prev[i] })), [])

  return (
    <>
      <div style={{ minHeight:'100vh', position:'relative', overflowX:'hidden' }}>
        <div className="store-main">

          {/* Breadcrumbs — hidden on mobile */}
          <div className="hide-mobile" style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'rgba(255,255,255,.4)', marginBottom:28 }}>
            <Link href="/" style={{ color:'rgba(255,255,255,.4)', textDecoration:'none' }}>accueil</Link>
            <IconChevRight size={11} color="rgba(255,255,255,.2)" />
            <Link href="/all-stores/" style={{ color:'rgba(255,255,255,.4)', textDecoration:'none' }}>boutiques</Link>
            <IconChevRight size={11} color="rgba(255,255,255,.2)" />
            <span style={{ color:'#38bdf8' }}>{store.name.toLowerCase()}</span>
          </div>

          {/* STORE HEADER BANNER */}
          <div className="store-header-banner" style={{ ...glassCard, borderRadius:28, padding:'36px 40px', marginBottom:20, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, right:0, width:480, height:480, background:'radial-gradient(circle at top right,rgba(56,189,248,.07),transparent 60%)', pointerEvents:'none' }} />

            <div className="store-header-grid" style={{ position:'relative', zIndex:1 }}>
              {/* Logo + info */}
              <div>
                {/* Mobile: horizontal logo+title row */}
                <div className="store-header-logo-row" style={{ display:'flex', alignItems:'flex-start', gap:24 }}>
                  <StoreLogo store={store} size={88} />
                  <div style={{ minWidth:0, flex:1 }}>
                    <h1 className="store-header-title" style={{ fontSize:30, fontWeight:900, letterSpacing:'-.03em', margin:'0 0 6px', lineHeight:1.08, color:'#fff' }}>
                      Codes Promo {store.name}
                    </h1>
                    <p className="store-header-subtitle" style={{ fontSize:10.5, fontWeight:800, textTransform:'uppercase', letterSpacing:'.18em', color:'#38bdf8', margin:'0 0 14px' }}>
                      Bons de réduction &amp; codes promo • {monthYear}
                    </p>
                    {/* Description — hidden on mobile */}
                    {store.description && (
                      <div className="hide-mobile" style={{ maxWidth:540 }}>
                        <p style={{ fontSize:13, color:'rgba(255,255,255,.6)', margin:0, lineHeight:1.6, overflow:'hidden', display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp: descExpanded ? 'unset' as unknown as number : 3 }}>
                          {store.description}
                        </p>
                        <button
                          onClick={() => setDescExpanded(p => !p)}
                          style={{ marginTop:6, fontSize:12, fontWeight:700, color:'#38bdf8', background:'none', border:'none', padding:0, cursor:'pointer', letterSpacing:'.01em' }}
                        >
                          {descExpanded ? 'Voir moins ↑' : 'Lire la suite ↓'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats — hidden on mobile via CSS */}
              <div className="store-header-stats">
                <div style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.06)', borderRadius:18, padding:'18px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:30, fontWeight:900, color:'#38bdf8', letterSpacing:'-.04em', lineHeight:1 }}>{coupons.length}</div>
                  <div style={{ fontSize:8.5, fontWeight:800, textTransform:'uppercase', letterSpacing:'.18em', color:'rgba(255,255,255,.4)', marginTop:6 }}>Offres Totales</div>
                </div>
                <div style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.06)', borderRadius:18, padding:'18px 20px', textAlign:'center' }}>
                  <div style={{ fontSize: codes.length > 0 ? 22 : 30, fontWeight:900, color:'#34d399', letterSpacing:'-.03em', lineHeight:1 }}>
                    {codes.length > 0 ? `${codes.length} code${codes.length !== 1 ? 's' : ''}` : deals.length > 0 ? `${deals.length} deal${deals.length !== 1 ? 's' : ''}` : '0'}
                  </div>
                  <div style={{ fontSize:8.5, fontWeight:800, textTransform:'uppercase', letterSpacing:'.18em', color:'rgba(255,255,255,.4)', marginTop:6 }}>Meilleure offre</div>
                </div>
                <div style={{ gridColumn:'span 2', background:'rgba(56,189,248,.06)', border:'1px solid rgba(56,189,248,.18)', borderRadius:18, padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                  <span style={{ width:8, height:8, borderRadius:999, background:'#10b981', boxShadow:'0 0 8px #10b981', animation:'cpr-pulse 1.6s ease-in-out infinite', display:'inline-block', flexShrink:0 }} />
                  <span style={{ fontSize:12, fontWeight:700, color:'#7dd3fc' }}>Vient d&apos;être vérifié</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info alert — hidden on mobile */}
          <div className="info-alert hide-mobile" style={{ display:'flex', alignItems:'flex-start', gap:12, background:'rgba(56,189,248,.06)', border:'1px solid rgba(56,189,248,.2)', borderRadius:18, padding:'16px 22px', marginBottom:36 }}>
            <IconInfo />
            <p style={{ fontSize:13, color:'#7dd3fc', margin:0, lineHeight:1.6, fontWeight:500 }}>
              {store.name} est actif en {monthYear}. Nous listons actuellement {coupons.length} offre{coupons.length !== 1 ? 's' : ''} vérifiée{coupons.length !== 1 ? 's' : ''} — codes promo et bons de réduction pour économiser sur vos achats.
            </p>
          </div>

          {/* 2-col layout */}
          <div className="store-two-col">

            {/* LEFT COLUMN */}
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Filter pills — hidden on mobile */}
              <div className="hide-mobile" style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                {([['ALL','TOUS',coupons.length],['CODES','CODES',codes.length],['DEALS','OFFRES',deals.length]] as [Filter,string,number][]).map(([key,label,count]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    style={{
                      padding:'10px 22px', borderRadius:12, fontWeight:800, fontSize:11, textTransform:'uppercase', letterSpacing:'.12em', cursor:'pointer', transition:'all 300ms cubic-bezier(.4,0,.2,1)',
                      background: filter === key ? 'rgba(56,189,248,.18)' : 'rgba(255,255,255,.04)',
                      color: filter === key ? '#7dd3fc' : 'rgba(255,255,255,.65)',
                      border: filter === key ? '1px solid rgba(56,189,248,.38)' : '1px solid rgba(255,255,255,.08)',
                      backdropFilter: filter === key ? 'blur(12px)' : 'none',
                      boxShadow:'inset 0 1.5px 2px rgba(255,255,255,.25),0 10px 35px rgba(0,0,0,.37)',
                    }}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              {/* COUPON CARDS */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {filtered.length === 0 ? (
                  <div style={{ ...glassCard, borderRadius:18, padding:24, textAlign:'center', color:'rgba(255,255,255,.4)', fontSize:13 }}>
                    Aucune offre dans cette catégorie.
                  </div>
                ) : filtered.map((coupon, idx) => {
                  const isTop = idx === 0 && coupon.is_active
                  const hasCode = !!coupon.code
                  const isOpen = !!openDetails[coupon.id]

                  return (
                    <div
                      key={coupon.id}
                      className={`coupon-card cpr-card-hover${isTop ? ' cpr-featured' : ''}`}
                      style={{
                        position:'relative', padding:'24px 28px', borderRadius:22, overflow:'hidden',
                        border: isTop ? '1px solid rgba(245,158,11,.35)' : '1px solid rgba(255,255,255,.06)',
                        background: isTop ? 'linear-gradient(135deg,rgba(245,158,11,.06),rgba(255,255,255,.01))' : 'rgba(255,255,255,.02)',
                        boxShadow: isTop ? '0 12px 40px rgba(245,158,11,.1)' : 'none',
                        transition:'all 300ms cubic-bezier(.4,0,.2,1)',
                      }}
                    >
                      {isTop && (
                        <>
                          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b)', borderRadius:'22px 22px 0 0' }} />
                          <div style={{ position:'absolute', top:-40, right:'15%', width:260, height:260, background:'rgba(245,158,11,.09)', borderRadius:'50%', filter:'blur(60px)', pointerEvents:'none' }} />
                        </>
                      )}

                      {/* Card body — desktop: row, mobile: column via CSS */}
                      <div className="coupon-card-body" style={{ position:'relative', zIndex:1 }}>

                        {/* Left: badge + info */}
                        <div className="coupon-left">
                          <div
                            className="coupon-badge"
                            style={{
                              background: isTop ? 'linear-gradient(135deg,rgba(245,158,11,.22),rgba(245,158,11,.05))' : 'linear-gradient(135deg,rgba(2,132,199,.2),rgba(56,189,248,.08))',
                              border: isTop ? '1px solid rgba(245,158,11,.35)' : '1px solid rgba(56,189,248,.22)',
                            }}
                          >
                            <span style={{ fontSize: (extractDiscount(coupon).length) > 8 ? '1.125rem' : '1.125rem', fontWeight:900, color: isTop ? '#fcd34d' : '#fff', letterSpacing:'-.03em', lineHeight:1 }}>
                              {extractDiscount(coupon)}
                            </span>
                            <span style={{ fontSize:8, fontWeight:800, letterSpacing:'.15em', color:'rgba(255,255,255,.5)', marginTop:4, textTransform:'uppercase' }}>
                              {hasCode ? 'CODE' : 'OFFRE'}
                            </span>
                          </div>

                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                              {isTop && (
                                <span style={{ padding:'3px 7px', fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.12em', borderRadius:4, background:'linear-gradient(90deg,#f59e0b,#fbbf24)', color:'#000' }}>⭐ TOP PICK</span>
                              )}
                              <span style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', fontSize:9, fontWeight:700, borderRadius:999, border:'1px solid rgba(16,185,129,.25)', background:'rgba(16,185,129,.06)', color:'#34d399' }}>
                                <span style={{ width:5, height:5, borderRadius:999, background:'#10b981', animation:'cpr-pulse 1.6s ease-in-out infinite', display:'inline-block', flexShrink:0 }} />
                                Vérifié
                              </span>
                            </div>
                            <h3 style={{ fontSize:'1.125rem', fontWeight:800, color:'#fff', margin:0, lineHeight:1.35, letterSpacing:'-.01em', wordBreak:'break-word' }}>
                              {coupon.title}
                            </h3>
                          </div>
                        </div>

                        {/* Right: CTA */}
                        <div className="coupon-right">
                          <CouponRevealButton
                            couponId={coupon.id}
                            publicId={coupon.wp_post_id ?? null}
                            couponCode={coupon.code ?? null}
                            couponTitle={coupon.title}
                            discountValue={extractDiscount(coupon)}
                            couponType={hasCode ? 'code' : 'deal'}
                            storeLogoUrl={store.logo_url ?? null}
                            storeName={store.name}
                            storeSlug={store.slug}
                            popupBannerUrl={store.popup_banner_url ?? null}
                            affiliateUrl={couponUrl(coupon as { destination_url?: string | null }, storeAffiliateUrl)}
                            expiryDate={coupon.expiry_date ?? null}
                            featured={isTop}
                            variant="storepage"
                          />
                          <div className="coupon-expiry">
                            {coupon.expiry_date ? <span>Expire : {coupon.expiry_date}</span> : <span>Validité illimitée</span>}
                          </div>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.05)', position:'relative', zIndex:1, flexWrap:'wrap', gap:8 }}>
                        <span style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", textTransform:'uppercase', letterSpacing:'.2em', color:'rgba(255,255,255,.28)' }}>VALIDITÉ</span>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <button
                            onClick={() => toggleDetails(coupon.id)}
                            className="coupon-details-btn"
                          >
                            Détails <IconChevDown open={isOpen} />
                          </button>
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, fontWeight:700, color:'#34d399', padding:'4px 9px', borderRadius:999, border:'1px solid rgba(16,185,129,.2)', background:'rgba(16,185,129,.06)' }}>
                            <IconShield /> 99% succès
                          </div>
                        </div>
                      </div>

                      {/* Expandable details */}
                      <div style={{ maxHeight: isOpen ? 400 : 0, overflow:'hidden', transition:'max-height 350ms ease, opacity 350ms ease', opacity: isOpen ? 1 : 0 }}>
                        <div style={{ paddingTop:16, paddingBottom:4, paddingLeft:16, borderLeft: isTop ? '2px solid rgba(245,158,11,.3)' : '2px solid rgba(56,189,248,.2)', marginTop:12 }}>
                          <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:'#38bdf8', marginBottom:12, fontFamily:"'JetBrains Mono',monospace" }}>CONDITIONS</div>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12, color:'rgba(255,255,255,.58)', marginBottom:8, lineHeight:1.5 }}>
                            <span style={{ width:5, height:5, borderRadius:999, background:'#38bdf8', flexShrink:0, marginTop:5, display:'inline-block' }} />
                            <span>Offre valable sur les produits éligibles</span>
                          </div>
                          {hasCode && (
                            <div style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12, color:'rgba(255,255,255,.58)', marginBottom:8, lineHeight:1.5 }}>
                              <span style={{ width:5, height:5, borderRadius:999, background:'#38bdf8', flexShrink:0, marginTop:5, display:'inline-block' }} />
                              <span>Entrez le code au moment du paiement pour bénéficier de la remise</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* VERIFICATION PIPELINE */}
              <div className="glass-section" style={{ ...glassCard, borderRadius:24, padding:'32px 36px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, gap:12, flexWrap:'wrap' }}>
                  <div>
                    <h3 style={{ fontSize:17, fontWeight:900, letterSpacing:'-.02em', margin:'0 0 6px', color:'#fff' }}>Comment CodePromoReduc vérifie les codes ?</h3>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,.45)', margin:0 }}>Notre système en 3 étapes garantit des réductions actives et fiables.</p>
                  </div>
                  <span style={{ padding:'5px 10px', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.15em', color:'#38bdf8', border:'1px solid rgba(56,189,248,.25)', background:'rgba(56,189,248,.08)', borderRadius:6, whiteSpace:'nowrap', boxShadow:'none', alignSelf:'flex-start' }}>SECURE VESSEL</span>
                </div>
                <div className="verify-grid">
                  {[
                    { bg:'rgba(56,189,248,.10)', br:'1px solid rgba(56,189,248,.22)', stroke:'#38bdf8', icon:<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>, title:'ACT Checkout Bot', body:'Des navigateurs headless testent les codes deux fois par jour automatiquement.' },
                    { bg:'rgba(168,85,247,.10)', br:'1px solid rgba(168,85,247,.22)', stroke:'#c084fc', icon:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>, title:'Consensus Communauté', body:'100K+ acheteurs votent et partagent des captures d\'écran des réductions.' },
                    { bg:'rgba(16,185,129,.10)', br:'1px solid rgba(16,185,129,.22)', stroke:'#34d399', icon:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>, title:'Audit Éditorial', body:'Une équipe humaine vérifie les signalements pour maintenir la précision.' },
                  ].map((step, i) => (
                    <div key={i} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:13, background:step.bg, border:step.br, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={step.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:20, height:20 }}>{step.icon}</svg>
                      </div>
                      <h4 style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.15em', color:'rgba(255,255,255,.9)', margin:0 }}>{step.title}</h4>
                      <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', margin:0, lineHeight:1.55 }}>{step.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* BAR CHART */}
              <div className="glass-section" style={{ ...glassCard, borderRadius:24, padding:'32px 36px' }}>
                <div style={{ marginBottom:20 }}>
                  <h3 style={{ fontSize:17, fontWeight:900, letterSpacing:'-.02em', margin:'0 0 6px', color:'#fff' }}>Tendances des économies</h3>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,.45)', margin:0 }}>Suivi des métriques de remises actives sur notre réseau</p>
                </div>
                <div style={{ background:'rgba(255,255,255,.01)', border:'1px solid rgba(255,255,255,.05)', borderRadius:14, padding:'16px 12px 8px', overflowX:'auto' }}>
                  <svg viewBox="0 0 750 200" style={{ width:'100%', minWidth:320, height:220 }} xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="blueGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(56,189,248,0.95)"/>
                        <stop offset="100%" stopColor="rgba(2,132,199,0.28)"/>
                      </linearGradient>
                      <linearGradient id="greenGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(16,185,129,0.95)"/>
                        <stop offset="100%" stopColor="rgba(5,150,105,0.28)"/>
                      </linearGradient>
                    </defs>
                    {[25,61,97,134].map(y => <line key={y} x1="45" y1={y} x2="740" y2={y} stroke="rgba(255,255,255,.04)" strokeDasharray="3 3"/>)}
                    <line x1="45" y1="170" x2="740" y2="170" stroke="rgba(255,255,255,.07)"/>
                    {['24%','18%','12%','6%','0%'].map((lbl, i) => <text key={lbl} x={i < 2 ? 5 : 9} y={[29,65,101,138,174][i]} fill="rgba(255,255,255,.38)" fontSize="9" fontFamily="monospace">{lbl}</text>)}
                    {CHART_BARS.map((bar, i) => {
                      const h = Math.round(bar.codes * (145/24))
                      const x = 45 + i * 53 + 9
                      const y = 170 - h
                      const cx = x + 17
                      return (
                        <g key={i}>
                          <rect x={x} y={y} width="34" height={h} rx="5" fill={bar.isHighest ? 'url(#greenGrad2)' : 'url(#blueGrad2)'} opacity="0.85"/>
                          <text x={cx} y="187" fill="rgba(255,255,255,.42)" fontSize="8.5" textAnchor="middle" fontFamily="sans-serif">{bar.name}</text>
                          <text x={cx} y={y - 6} fill={bar.isHighest ? '#10b981' : 'rgba(56,189,248,.85)'} fontSize="8.5" textAnchor="middle" fontWeight="bold">{bar.codes}%</text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
                <div style={{ marginTop:14, padding:'12px 16px', background:'rgba(8,10,15,.65)', border:'1px solid rgba(255,255,255,.05)', borderRadius:12, display:'flex', alignItems:'center', gap:10 }}>
                  <IconTrendUp />
                  <p style={{ fontSize:12, color:'rgba(255,255,255,.65)', margin:0, lineHeight:1.55 }}><strong style={{ color:'#d1fae5' }}>Meilleur moment :</strong> Les achats pendant le mois de remise maximale génèrent les plus grandes économies.</p>
                </div>
              </div>

              {/* SIMILAR STORE COUPONS */}
              {similarCoupons.length > 0 && (
                <div className="glass-section" style={{ ...glassCard, borderRadius:24, padding:'28px 32px' }}>
                  <h3 style={{ fontSize:17, fontWeight:900, letterSpacing:'-.02em', margin:'0 0 20px', color:'#fff' }}>
                    Codes promo de boutiques similaires
                  </h3>
                  <div className="similar-store-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                    {similarCoupons.slice(0,8).map(c => {
                      const sStore = c.store
                      const affUrl = couponUrl(
                        c as { destination_url?: string | null },
                        sStore?.affiliate_url || `https://codepromoreduc.fr/store/${sStore?.slug}/`
                      )
                      const hasCode = !!c.code
                      return (
                        <div
                          key={c.id}
                          className="cpr-card-hover"
                          style={{ background: c.is_featured ? 'linear-gradient(135deg,rgba(245,158,11,.06),rgba(255,255,255,.01))' : 'rgba(255,255,255,.03)', border: c.is_featured ? '1px solid rgba(245,158,11,.3)' : '1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'16px 14px', display:'flex', flexDirection:'column', gap:10, transition:'all 300ms cubic-bezier(.4,0,.2,1)', position:'relative', overflow:'hidden' }}
                        >
                          {c.is_featured && (
                            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b)', borderRadius:'16px 16px 0 0' }} />
                          )}

                          {/* Store logo + name */}
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:36, height:36, borderRadius:9, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, padding:3, boxShadow:'0 2px 8px rgba(0,0,0,.25)' }}>
                              {sStore?.logo_url
                                ? <img src={sStore.logo_url} alt={sStore.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                                : <span style={{ fontSize:14, fontWeight:900, color:'#1e1b4b' }}>{storeLetter(sStore?.name ?? '?')}</span>
                              }
                            </div>
                            <Link href={`/store/${sStore?.slug}/`} style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.6)', textDecoration:'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {sStore?.name}
                            </Link>
                          </div>

                          {/* Badges + discount */}
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                            {c.is_featured && (
                              <span style={{ padding:'2px 6px', fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', borderRadius:4, background:'linear-gradient(90deg,#f59e0b,#fbbf24)', color:'#000' }}>⭐ TOP</span>
                            )}
                            <span style={{ padding:'2px 7px', fontSize:8, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', borderRadius:4, background: hasCode ? 'rgba(56,189,248,.1)' : 'rgba(16,185,129,.1)', color: hasCode ? '#7dd3fc' : '#34d399', border:`1px solid ${hasCode ? 'rgba(56,189,248,.2)' : 'rgba(16,185,129,.2)'}` }}>
                              {hasCode ? 'Code' : 'Offre'}
                            </span>
                            {c.discount_value && (
                              <span style={{ fontSize:16, fontWeight:900, color: c.is_featured ? '#fcd34d' : '#fff', letterSpacing:'-.02em', lineHeight:1 }}>{c.discount_value}</span>
                            )}
                          </div>

                          <p style={{ fontSize:11, color:'rgba(255,255,255,.5)', margin:0, lineHeight:1.45, flexGrow:1, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                            {c.title}
                          </p>

                          {/* CTA */}
                          <CouponRevealButton
                            couponId={c.id}
                            publicId={(c as { wp_post_id?: number | null }).wp_post_id ?? null}
                            couponCode={c.code ?? null}
                            couponTitle={c.title}
                            discountValue={c.discount_value ?? ''}
                            couponType={hasCode ? 'code' : 'deal'}
                            storeLogoUrl={sStore?.logo_url ?? null}
                            storeName={sStore?.name ?? ''}
                            storeSlug={sStore?.slug}
                            affiliateUrl={affUrl}
                            expiryDate={c.expiry_date ?? null}
                            featured={!!c.is_featured}
                            variant="storepage"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* EXPERT GUIDE */}
              <div className="glass-section" style={{ ...glassCard, borderRadius:24, padding:'32px 36px' }}>
                <h2 style={{ fontSize:18, fontWeight:900, letterSpacing:'-.02em', margin:'0 0 8px', color:'#fff' }}>Conseils pour économiser chez {store.name}</h2>
                <p style={{ fontSize:13, color:'rgba(255,255,255,.55)', margin:'0 0 20px', lineHeight:1.6 }}>Obtenez les meilleures économies grâce à notre guide éditorial.</p>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    { title:'Inscrivez-vous à la newsletter', body:`En vous abonnant à la newsletter de ${store.name}, vous recevez souvent un code de bienvenue exclusif de 10% à 15% sur votre première commande.` },
                    { title:'Vérifiez les offres saisonnières', body:`${store.name} propose régulièrement des promotions lors des grandes périodes de soldes (Black Friday, French Days, Noël). Activez les alertes sur CodePromoReduc pour ne manquer aucune offre flash.` },
                  ].map((section, i) => (
                    <div key={i} style={{ padding:'18px 20px', borderRadius:14, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                        <span style={{ width:26, height:26, borderRadius:999, background:'rgba(56,189,248,.12)', color:'#38bdf8', fontWeight:900, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</span>
                        <div>
                          <h4 style={{ fontSize:13, fontWeight:800, color:'#fff', margin:'0 0 8px', letterSpacing:'-.01em' }}>{section.title}</h4>
                          <p style={{ fontSize:12, color:'rgba(255,255,255,.55)', margin:0, lineHeight:1.65 }}>{section.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ ACCORDION */}
              <div className="glass-section" style={{ ...glassCard, borderRadius:24, padding:'32px 36px' }}>
                <h3 style={{ fontSize:17, fontWeight:900, letterSpacing:'-.02em', margin:'0 0 18px', color:'#fff' }}>Questions fréquentes (FAQ)</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { q:`Pourquoi mon code promo ${store.name} ne fonctionne-t-il pas ?`, a:`Vérifiez que le montant minimum de commande requis est atteint et que le code ne s'applique pas aux articles déjà en promotion. Toutes les conditions sont accessibles en cliquant sur "Détails".` },
                    { q:`Puis-je cumuler plusieurs codes promo ${store.name} ?`, a:`En général, seul un code promo est accepté par commande. La combinaison de plusieurs codes est généralement exclue, sauf mention contraire dans les conditions de l'offre.` },
                    { q:`Les codes promo ${store.name} sont-ils vérifiés ?`, a:`Oui ! Chaque code est vérifié automatiquement par nos bots et validé par notre communauté. Le taux de succès est affiché sur chaque offre.` },
                  ].map((faq, i) => {
                    const isOpen = !!openFaqs[i]
                    return (
                      <div key={i} onClick={() => toggleFaq(i)} className="cpr-faq-hover" style={{ padding:'14px 16px', borderRadius:14, background:'rgba(255,255,255,.01)', border:'1px solid rgba(255,255,255,.05)', cursor:'pointer', transition:'all 300ms cubic-bezier(.4,0,.2,1)' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:9, flex:1 }}>
                            <IconHelpCircle />
                            <span style={{ fontSize:12.5, fontWeight:700, color:'#fff', lineHeight:1.4 }}>{faq.q}</span>
                          </div>
                          <div style={{ flexShrink:0, marginTop:2 }}><IconChevDown open={isOpen} /></div>
                        </div>
                        <div style={{ maxHeight: isOpen ? 300 : 0, overflow:'hidden', transition:'max-height 300ms ease' }}>
                          <p style={{ fontSize:12, color:'rgba(255,255,255,.55)', margin:'12px 0 0 24px', lineHeight:1.65 }}>{faq.a}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* STORE ABOUT */}
              <div className="glass-section" style={{ ...glassCard, borderRadius:24, padding:'32px 36px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
                  <StoreLogo store={store} size={48} />
                  <div>
                    <h3 style={{ fontSize:17, fontWeight:900, letterSpacing:'-.02em', margin:'0 0 4px', color:'#fff' }}>À propos de {store.name}</h3>
                    <p style={{ fontSize:10.5, color:'#38bdf8', margin:0, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em' }}>Marque vérifiée · CodePromoReduc</p>
                  </div>
                </div>
                {store.description && (
                  <div style={{ marginBottom:20 }}>
                    <p style={{ fontSize:13, color:'rgba(255,255,255,.62)', margin:0, lineHeight:1.7, overflow:'hidden', display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp: descExpanded ? 'unset' as unknown as number : 3 }}>
                      {store.description}
                    </p>
                    <button
                      onClick={() => setDescExpanded(p => !p)}
                      style={{ marginTop:6, fontSize:12, fontWeight:700, color:'#38bdf8', background:'none', border:'none', padding:0, cursor:'pointer', letterSpacing:'.01em' }}
                    >
                      {descExpanded ? 'Voir moins ↑' : 'Lire la suite ↓'}
                    </button>
                  </div>
                )}
                <div className="store-about-grid" style={{ marginBottom:0 }}>
                  {[
                    { label:'Offres actives', value:`${coupons.length} offre${coupons.length !== 1 ? 's' : ''}` },
                    { label:'Codes promo', value:`${codes.length} code${codes.length !== 1 ? 's' : ''}`, color:'#38bdf8' },
                    { label:'Site Web', value: store.affiliate_url ? store.affiliate_url.replace(/^https?:\/\//, '').split('/')[0] : store.name.toLowerCase().replace(/\s/g,'')+'.com', color:'#38bdf8' },
                    { label:'Note CodePromo', value:'★★★★★ 4,9/5', color:'#fbbf24' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding:'13px 15px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:12 }}>
                      <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.18em', color:'rgba(255,255,255,.3)', marginBottom:5 }}>{item.label}</div>
                      <div style={{ fontSize:13, fontWeight:700, color: item.color ?? '#fff', wordBreak:'break-word' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR */}
            <div className="store-sidebar" style={{ display:'flex', flexDirection:'column', gap:18 }}>

              {/* Sidebar banner carousel — managed via admin panel */}
              <SidebarBannerCarousel banners={sidebarBanners.length > 0 ? sidebarBanners : [FALLBACK_BANNER]} />

              {/* Tips */}
              <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:18, padding:18 }}>
                <h4 style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.2em', color:'#38bdf8', margin:'0 0 14px' }}>Astuces pour économiser</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    { emoji:'⚡', text:`Newsletter ${store.name} : obtenez 10% de réduction de bienvenue` },
                    { emoji:'📦', text:'Livraison gratuite souvent disponible dès un seuil de commande' },
                    { emoji:'🛡️', text:'Tous nos codes sont vérifiés et testés avant publication' },
                  ].map((h, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{h.emoji}</span>
                      <p style={{ fontSize:12, color:'rgba(255,255,255,.65)', margin:0, lineHeight:1.5 }}>{h.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar stores quick links */}
              {similarCoupons.length > 0 && (
                <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:18, padding:18 }}>
                  <h4 style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.2em', color:'#38bdf8', margin:'0 0 14px' }}>Boutiques similaires</h4>
                  <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                    {Array.from(new Map(similarCoupons.map(c => [c.store?.slug, c.store])).values()).filter(Boolean).slice(0,4).map(s => (
                      <Link key={s!.slug} href={`/store/${s!.slug}/`} className="cpr-brand-hover" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:11, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', fontSize:12.5, fontWeight:700, color:'rgba(255,255,255,.8)', transition:'all 300ms cubic-bezier(.4,0,.2,1)', textDecoration:'none' }}>
                        <span>{s!.name}</span>
                        <IconChevRight size={14} color="#38bdf8" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEO CONTENT SECTION — only rendered when content_status === 'approved' */}
          {store.content_status === 'approved' && store.content_body && (
            <StoreContentSection store={store} />
          )}

        </div>

      </div>
    </>
  )
}

// ─── SEO content section (bottom of page) ────────────────────────────────────
function StoreContentSection({ store }: { store: Store }) {
  const body = store.content_body!
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({})

  function renderWithLinks(text: string) {
    const parts = text.split(/(\[\[(?:store|category):[^\]]+\]\])/g)
    return parts.map((part, i) => {
      const m = part.match(/\[\[(store|category):([^|]+)\|([^\]]+)\]\]/)
      if (m) {
        const [, type, slug, name] = m
        const href = type === 'store' ? `/store/${slug}/` : `/coupon-category/${slug}/`
        return <Link key={i} href={href} style={{ color:'#38bdf8', textDecoration:'underline' }}>{name}</Link>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div style={{ marginTop:40, borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:36 }}>
      {/* Intro description */}
      {body.description && (
        <p style={{ fontSize:14, color:'rgba(255,255,255,.65)', lineHeight:1.75, marginBottom:28, maxWidth:760 }}>
          {renderWithLinks(body.description)}
        </p>
      )}

      {/* H2 sections */}
      {body.h2_sections?.map((s, i) => (
        <div key={i} style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-.02em', marginBottom:10 }}>
            {s.heading}
          </h2>
          <p style={{ fontSize:13.5, color:'rgba(255,255,255,.6)', lineHeight:1.75 }}>
            {renderWithLinks(s.content)}
          </p>
        </div>
      ))}

      {/* FAQ accordion */}
      {body.faqs?.length > 0 && (
        <div style={{ marginTop:8 }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-.01em', marginBottom:14 }}>
            Questions fréquentes — {store.name}
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {body.faqs.map((f, i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, overflow:'hidden' }}>
                <button
                  onClick={() => setOpenFaq(prev => ({ ...prev, [i]: !prev[i] }))}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}
                >
                  <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.85)' }}>{f.question}</span>
                  <IconChevDown open={!!openFaq[i]} />
                </button>
                {openFaq[i] && (
                  <div style={{ padding:'0 18px 14px', fontSize:13, color:'rgba(255,255,255,.55)', lineHeight:1.7 }}>
                    {renderWithLinks(f.answer)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ── Sidebar Banner Carousel ───────────────────────────────────────────────────
const FALLBACK_BANNER: SidebarBanner = {
  id: 'fallback',
  label: 'Partenaire officiel',
  title: 'Économisez jusqu\'à 70%',
  description: null,
  image_url: null,
  button_label: 'Voir toutes les offres',
  button_code: null,
  link_url: '/all-stores/',
  is_active: true,
  sort_order: 0,
  updated_at: '',
}

function SidebarBannerCarousel({ banners }: { banners: SidebarBanner[] }) {
  const [idx, setIdx]   = useState(0)
  const [anim, setAnim] = useState(true)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)

  function goTo(next: number) {
    setAnim(false)
    setTimeout(() => { setIdx(next); setAnim(true) }, 200)
  }

  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setInterval(() => goTo((idx + 1) % banners.length), 7000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [idx, banners.length])

  function handleDotClick(i: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    goTo(i)
  }

  const banner = banners[idx]

  return (
    <div>
      <div style={{ opacity: anim ? 1 : 0, transition: 'opacity 200ms ease' }}>
        <BannerCard banner={banner} />
      </div>
      {banners.length > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:10 }}>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              aria-label={`Bannière ${i + 1}`}
              style={{ width: i === idx ? 18 : 6, height:6, borderRadius:999, background: i === idx ? '#5eead4' : 'rgba(255,255,255,.18)', border:'none', padding:0, cursor:'pointer', transition:'all 300ms ease' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BannerCard({ banner }: { banner: SidebarBanner }) {
  const [copied, setCopied] = useState(false)
  const code = banner.button_code?.trim()

  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)', borderRadius:18, overflow:'hidden' }}>
      {/* Brand image */}
      {banner.image_url ? (
        <div style={{ width:'100%', aspectRatio:'16/9', overflow:'hidden', background:'#fff', position:'relative' }}>
          <img
            src={banner.image_url}
            alt={banner.title}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
          />
          {/* Label badge over image */}
          <span style={{ position:'absolute', top:10, left:10, padding:'3px 9px', fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.18em', color:'#fff', background:'rgba(0,0,0,.55)', backdropFilter:'blur(8px)', borderRadius:4 }}>
            {banner.label}
          </span>
        </div>
      ) : (
        /* No image — text-only fallback */
        <div style={{ padding:'16px 16px 0' }}>
          <span style={{ padding:'3px 9px', fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.18em', color:'#5eead4', border:'1px solid rgba(20,184,166,.3)', background:'rgba(20,184,166,.1)', borderRadius:4, display:'inline-block', marginBottom:10 }}>
            {banner.label}
          </span>
          <h4 style={{ fontSize:14, fontWeight:900, color:'#fff', margin:'0 0 6px' }}>{banner.title}</h4>
          {banner.description && (
            <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', margin:'0 0 4px', lineHeight:1.5 }}>{banner.description}</p>
          )}
        </div>
      )}

      {/* CTA area */}
      <div style={{ padding:12 }}>
        {banner.image_url && (
          <p style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.8)', margin:'0 0 10px', lineHeight:1.4 }}>{banner.title}</p>
        )}
        {code ? (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <a
              href={banner.link_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              style={{ flex:1, padding:'9px 10px', background:'rgba(20,184,166,.08)', border:'1px solid rgba(20,184,166,.25)', borderRadius:10, textAlign:'center', textDecoration:'none', display:'block' }}
            >
              <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:2 }}>{banner.button_label}</div>
              <div style={{ fontSize:13, fontWeight:900, color:'#5eead4', letterSpacing:'.08em', fontFamily:'monospace' }}>{code.toUpperCase()}</div>
            </a>
            <button
              onClick={copyCode}
              style={{ padding:'9px 12px', background: copied ? 'rgba(20,184,166,.3)' : 'rgba(20,184,166,.2)', border:'1px solid rgba(20,184,166,.4)', borderRadius:10, fontSize:10, fontWeight:800, color:'#5eead4', cursor:'pointer', whiteSpace:'nowrap', transition:'background .15s' }}
            >
              {copied ? 'Copié ✓' : 'Copier'}
            </button>
          </div>
        ) : (
          <a
            href={banner.link_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{ display:'block', width:'100%', padding:'11px 12px', background:'linear-gradient(135deg,rgba(20,184,166,.15),rgba(59,130,246,.1))', border:'1px solid rgba(20,184,166,.3)', color:'#5eead4', fontWeight:800, fontSize:11, textTransform:'uppercase', letterSpacing:'.12em', borderRadius:11, textAlign:'center', textDecoration:'none', boxSizing:'border-box' }}
          >
            {banner.button_label}
          </a>
        )}
      </div>
    </div>
  )
}
