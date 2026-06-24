'use client'
import { ChevronRight, Zap } from 'lucide-react'

interface Props {
  couponId: string
  couponCode: string | null
  couponTitle: string
  discountValue: string
  couponType: 'code' | 'deal' | 'free_shipping'
  storeLogoUrl: string | null
  storeName: string
  storeSlug?: string
  popupBannerUrl?: string | null
  affiliateUrl: string
  expiryDate?: string | null
  terms?: string | null
  featured?: boolean
  variant?: 'homepage' | 'storepage'
}

export function CouponRevealButton({
  couponId, couponCode, couponTitle, discountValue, couponType,
  storeLogoUrl, storeName, storeSlug, popupBannerUrl, affiliateUrl, expiryDate,
  featured = false, variant = 'homepage',
}: Props) {
  const hasCode = couponType === 'code' && !!couponCode

  const handleActivate = () => {
    const params = new URLSearchParams({
      code:      couponCode  ?? '',
      title:     couponTitle ?? '',
      discount:  discountValue ?? '',
      store:     storeName ?? '',
      slug:      storeSlug ?? '',
      logo:      storeLogoUrl ?? '',
      banner:    popupBannerUrl ?? '',
      expiry:    expiryDate ?? '',
      affiliate: affiliateUrl ?? '',
      type:      couponType,
      from:      window.location.pathname,
    })

    // 1 — Open popup page in new tab and focus it (unique name = always a fresh tab)
    const popup = window.open(
      `/fr/coupon-reveal?${params.toString()}`,
      `coupon_reveal_${couponId}_${Date.now()}`
    )
    if (popup) popup.focus()

    // 2 — Current tab navigates to affiliate (becomes merchant tab in background)
    window.location.href = affiliateUrl
  }

  const label = hasCode
    ? (variant === 'storepage' ? 'Voir le code' : 'Obtenir le code')
    : (variant === 'storepage' ? "Voir l'offre"  : "Voir l'offre")

  /* ── Store-page variant ─────────────────────────────────────────────── */
  if (variant === 'storepage') {
    const base = {
      background: featured
        ? 'linear-gradient(135deg,rgba(245,158,11,.18),rgba(234,179,8,.12))'
        : 'linear-gradient(135deg,rgba(56,189,248,.14),rgba(14,165,233,.10))',
      border:    featured ? '1.5px solid rgba(245,158,11,.45)' : '1.5px solid rgba(56,189,248,.35)',
      color:     featured ? '#fcd34d' : '#7dd3fc',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14)',
      transform: '',
    }
    return (
      <button
        onClick={handleActivate}
        className="coupon-cta"
        style={base}
        onMouseEnter={e => {
          const b = e.currentTarget
          if (featured) {
            b.style.background  = 'rgba(245,158,11,.65)'
            b.style.borderColor = 'rgba(245,158,11,1)'
            b.style.color       = '#fff'
            b.style.boxShadow   = 'inset 0 2px 3px rgba(255,255,255,.3),0 0 0 3px rgba(245,158,11,.55),0 16px 40px rgba(245,158,11,.55)'
            b.style.transform   = 'translateY(-3px) scale(1.03)'
          } else {
            b.style.background  = 'rgba(56,189,248,.6)'
            b.style.borderColor = 'rgba(56,189,248,1)'
            b.style.color       = '#fff'
            b.style.boxShadow   = 'inset 0 2px 3px rgba(255,255,255,.3),0 0 0 3px rgba(56,189,248,.55),0 16px 40px rgba(56,189,248,.5)'
            b.style.transform   = 'translateY(-3px) scale(1.03)'
          }
        }}
        onMouseLeave={e => {
          const b = e.currentTarget
          b.style.background  = base.background
          b.style.borderColor = featured ? 'rgba(245,158,11,.45)' : 'rgba(56,189,248,.35)'
          b.style.color       = base.color
          b.style.boxShadow   = base.boxShadow
          b.style.transform   = ''
        }}
      >
        {featured ? <Zap size={13} /> : <ChevronRight size={13} />}
        {label}
      </button>
    )
  }

  /* ── Homepage variant ───────────────────────────────────────────────── */
  const glassBase = {
    background:    featured ? 'rgba(245,158,11,.13)' : 'rgba(255,255,255,.07)',
    border:        featured ? '1px solid rgba(245,158,11,.35)' : '1px solid rgba(255,255,255,.18)',
    color:         featured ? '#fde68a' : 'rgba(255,255,255,.9)',
    boxShadow:     'inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.12)',
    backdropFilter:'blur(22px) saturate(180%)',
    WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  }
  return (
    <button
      onClick={handleActivate}
      className="w-full flex items-center justify-center gap-2 rounded-2xl font-extrabold text-xs uppercase tracking-wider"
      style={{ padding: '12px 14px', cursor: 'pointer', transition: 'transform 130ms ease, box-shadow 130ms ease, background 130ms ease, border-color 130ms ease', ...glassBase }}
      onMouseEnter={e => {
        const b = e.currentTarget
        if (featured) {
          b.style.background = 'rgba(245,158,11,.45)'
          b.style.borderColor = 'rgba(245,158,11,.8)'
          b.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.3), 0 0 0 3px rgba(245,158,11,.35), 0 12px 36px rgba(245,158,11,.45)'
        } else {
          b.style.background = 'rgba(56,189,248,.25)'
          b.style.borderColor = 'rgba(56,189,248,.7)'
          b.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.3), 0 0 0 3px rgba(56,189,248,.3), 0 12px 36px rgba(56,189,248,.45)'
        }
        b.style.transform = 'translateY(-3px) scale(1.04)'
        b.style.color = '#fff'
      }}
      onMouseLeave={e => {
        const b = e.currentTarget
        b.style.background = glassBase.background
        b.style.borderColor = featured ? 'rgba(245,158,11,.35)' : 'rgba(255,255,255,.18)'
        b.style.boxShadow = glassBase.boxShadow
        b.style.transform = ''
        b.style.color = glassBase.color
      }}
    >
      <ChevronRight size={12} />
      {label}
    </button>
  )
}
