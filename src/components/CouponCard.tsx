'use client'
import { useRef, useState, useCallback } from 'react'
import { ChevronRight, Zap } from 'lucide-react'
import { CouponPopup } from './CouponPopup'

export interface CouponCardProps {
  couponId: string
  storeId: string
  publicId?: number | null
  storeSlug?: string | null
  couponCode: string | null
  couponTitle: string
  discountValue: string
  couponType: 'code' | 'deal' | 'free_shipping'
  storeLogoUrl: string | null
  storeName: string
  affiliateUrl: string
  expiryDate: string | null
  terms?: string | null
  featured?: boolean
  variant?: 'homepage' | 'storepage'
}

function trackClick(couponId: string, storeId: string) {
  fetch('/api/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ couponId, storeId }),
  }).catch(() => {})
}

export function CouponCard({
  couponId, storeId, publicId, storeSlug, couponCode, couponTitle, discountValue, couponType,
  storeLogoUrl, storeName, affiliateUrl, expiryDate, terms,
  featured = false, variant = 'homepage',
}: CouponCardProps) {
  const [popupOpen, setPopupOpen] = useState(false)
  const bgTabRef  = useRef<Window | null>(null)
  const origPath  = useRef<string>('')
  const hasCode   = couponType === 'code' && !!couponCode

  const handleActivate = useCallback(() => {
    // 1 — Show popup on current tab immediately
    origPath.current = window.location.pathname
    setPopupOpen(true)

    // 2 — Push shareable coupon URL so back/share works
    if (publicId && storeSlug) {
      window.history.pushState({}, '', `/store/${storeSlug}/${publicId}/`)
    }

    // 3 — Open affiliate in background: open then instantly steal focus back
    bgTabRef.current = window.open(affiliateUrl, '_blank')
    if (bgTabRef.current) bgTabRef.current.blur()
    window.focus()

    // 4 — Track async, never blocks UI
    trackClick(couponId, storeId)
  }, [couponId, storeId, publicId, storeSlug, affiliateUrl])

  const handleClose = useCallback(() => {
    setPopupOpen(false)
    // Restore original URL if we pushed the coupon URL
    if (origPath.current && window.location.pathname !== origPath.current) {
      window.history.replaceState({}, '', origPath.current)
    }
  }, [])

  const popup = (
    <CouponPopup
      isOpen={popupOpen} onClose={handleClose}
      couponCode={couponCode} couponTitle={couponTitle}
      discountValue={discountValue} couponType={couponType}
      storeLogoUrl={storeLogoUrl} storeName={storeName}
      affiliateUrl={affiliateUrl} expiryDate={expiryDate} terms={terms ?? null}
    />
  )

  if (variant === 'storepage') {
    const baseStyle = {
      background: featured
        ? 'linear-gradient(135deg,rgba(245,158,11,.18),rgba(234,179,8,.12))'
        : 'linear-gradient(135deg,rgba(56,189,248,.14),rgba(14,165,233,.10))',
      border: featured ? '1.5px solid rgba(245,158,11,.45)' : '1.5px solid rgba(56,189,248,.35)',
      color: featured ? '#fcd34d' : '#7dd3fc',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14)',
      transform: '',
    }
    return (
      <>
        {popup}
        <button
          onClick={handleActivate}
          className="coupon-cta"
          style={baseStyle}
          onMouseEnter={e => {
            const b = e.currentTarget
            if (featured) {
              b.style.background = 'rgba(245,158,11,.65)'
              b.style.borderColor = 'rgba(245,158,11,1)'
              b.style.color = '#fff'
              b.style.boxShadow = 'inset 0 2px 3px rgba(255,255,255,.3),0 0 0 3px rgba(245,158,11,.55),0 16px 40px rgba(245,158,11,.55)'
              b.style.transform = 'translateY(-3px) scale(1.03)'
            } else {
              b.style.background = 'rgba(56,189,248,.6)'
              b.style.borderColor = 'rgba(56,189,248,1)'
              b.style.color = '#fff'
              b.style.boxShadow = 'inset 0 2px 3px rgba(255,255,255,.3),0 0 0 3px rgba(56,189,248,.55),0 16px 40px rgba(56,189,248,.5)'
              b.style.transform = 'translateY(-3px) scale(1.03)'
            }
          }}
          onMouseLeave={e => {
            const b = e.currentTarget
            b.style.background = baseStyle.background
            b.style.borderColor = featured ? 'rgba(245,158,11,.45)' : 'rgba(56,189,248,.35)'
            b.style.color = baseStyle.color
            b.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.14)'
            b.style.transform = ''
          }}
        >
          {featured ? <Zap size={13} /> : <ChevronRight size={13} />}
          {hasCode ? 'Voir le code' : "Voir l'offre"}
        </button>
      </>
    )
  }

  return (
    <>
      {popup}
      <button
        onClick={handleActivate}
        className="hp-btn w-full flex items-center justify-center gap-2 rounded-2xl font-extrabold text-xs uppercase tracking-wider"
        style={{
          padding: '12px 14px', backdropFilter: 'blur(18px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14)',
          background: featured ? 'rgba(245,158,11,.1)' : 'rgba(255,255,255,.05)',
          border: featured ? '1px solid rgba(245,158,11,.38)' : '1px solid rgba(255,255,255,.14)',
          color: featured ? '#fde68a' : '#fff', cursor: 'pointer',
        }}
      >
        {hasCode ? `Révéler le code ${storeName}` : `Voir l'offre ${storeName}`}
        <ChevronRight size={12} />
      </button>
    </>
  )
}
