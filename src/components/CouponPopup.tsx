'use client'
import { useState } from 'react'
import { X, Copy, Check, ExternalLink, Tag } from 'lucide-react'

export interface CouponPopupProps {
  isOpen: boolean
  onClose: () => void
  couponCode: string | null
  couponTitle: string
  discountValue: string
  couponType: 'code' | 'deal' | 'free_shipping'
  storeLogoUrl: string | null
  storeName: string
  affiliateUrl: string
  expiryDate: string | null
  terms: string | null
}

export function CouponPopup({
  isOpen, onClose,
  couponCode, couponTitle, discountValue, couponType,
  storeLogoUrl, storeName, affiliateUrl,
  expiryDate, terms,
}: CouponPopupProps) {
  const [copied, setCopied] = useState(false)
  const hasCode = couponType === 'code' && !!couponCode

  function handleCopy() {
    if (couponCode) navigator.clipboard.writeText(couponCode).catch(() => {})
    setCopied(true)
    // Open affiliate in a new foreground tab, then close popup
    setTimeout(() => {
      window.open(affiliateUrl, '_blank')
      setCopied(false)
      onClose()
    }, 900)
  }

  function handleViewDeal() {
    window.open(affiliateUrl, '_blank')
    setTimeout(() => onClose(), 500)
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: 9999, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', overflow: 'hidden',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '460px', borderRadius: '24px',
          background: '#0d1117', border: '1px solid rgba(255,255,255,.1)',
          boxShadow: '0 40px 100px rgba(0,0,0,.8)', overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* X close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14, width: 32, height: 32,
            borderRadius: '50%', background: 'rgba(255,255,255,.07)',
            border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 2, transition: 'all .2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.14)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.07)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.6)' }}
        >
          <X size={14} />
        </button>

        {/* Green info bar */}
        <div style={{ background: 'rgba(16,185,129,.12)', borderBottom: '1px solid rgba(16,185,129,.2)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>
            La boutique <strong>{storeName}</strong> s&apos;est ouverte en arrière-plan
          </span>
        </div>

        {/* Store header */}
        <div style={{ padding: '24px 28px 20px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          {/* Logo */}
          <div style={{ margin: '0 auto 12px', width: 72, height: 72, borderRadius: 18, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.3)' }}>
            {storeLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storeLogoUrl} alt={storeName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 900, color: '#0ea5e9' }}>{storeName[0]?.toUpperCase()}</span>
            )}
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>{storeName}</div>

          {/* Discount badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 999, background: 'rgba(56,189,248,.12)', border: '1px solid rgba(56,189,248,.3)', marginBottom: 10 }}>
            <Tag size={11} color="#38bdf8" />
            <span style={{ fontSize: 13, fontWeight: 900, color: '#38bdf8' }}>{discountValue}</span>
          </div>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.5, margin: 0 }}>{couponTitle}</p>
        </div>

        {/* Code / deal area */}
        <div style={{ padding: '20px 28px 24px' }}>
          {hasCode ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>
                Votre code promo
              </div>

              {/* Dashed code box */}
              <div style={{
                border: '2px dashed rgba(56,189,248,.45)', borderRadius: 14,
                padding: '16px 20px', marginBottom: 14, textAlign: 'center',
                background: 'rgba(56,189,248,.05)',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 900, color: '#38bdf8', letterSpacing: '.14em' }}>
                  {couponCode}
                </span>
              </div>

              {/* Copy button */}
              <button
                onClick={handleCopy}
                style={{
                  width: '100%', padding: '15px', borderRadius: 14, border: 'none',
                  background: copied ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
                  color: copied ? '#fff' : '#060810', fontWeight: 900, fontSize: 14,
                  textTransform: 'uppercase', letterSpacing: '.06em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all .25s', boxShadow: copied ? '0 8px 24px rgba(16,185,129,.35)' : '0 8px 24px rgba(56,189,248,.3)',
                  marginBottom: 12,
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? '✓ Code copié !' : 'Copier &amp; Aller à la boutique'}
              </button>

              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textAlign: 'center', lineHeight: 1.5, margin: '0 0 12px' }}>
                Collez ce code à la caisse pour économiser sur votre commande
              </p>
            </>
          ) : (
            <>
              <div style={{
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 14, padding: '16px 20px', marginBottom: 16, textAlign: 'center',
              }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', margin: 0, lineHeight: 1.5 }}>
                  Aucun code requis — La réduction est appliquée automatiquement
                </p>
              </div>

              <button
                onClick={handleViewDeal}
                style={{
                  width: '100%', padding: '15px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
                  color: '#060810', fontWeight: 900, fontSize: 14,
                  textTransform: 'uppercase', letterSpacing: '.06em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all .25s', boxShadow: '0 8px 24px rgba(56,189,248,.3)',
                  marginBottom: 12,
                }}
              >
                <ExternalLink size={16} />
                Voir l&apos;offre
              </button>
            </>
          )}

          {/* Expiry */}
          {expiryDate && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textAlign: 'center', marginBottom: 6 }}>
              Expire le {new Date(expiryDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}

          {/* Terms */}
          {terms && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.22)', textAlign: 'center', lineHeight: 1.4 }}>
              {terms}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
