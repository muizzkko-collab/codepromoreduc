'use client'
import { Suspense, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Copy, CheckCheck, ExternalLink, X, Tag, Sparkles } from 'lucide-react'

interface SimilarStore { name: string; slug: string; logo_url: string | null }

function RevealContent() {
  const sp = useSearchParams()

  const code         = sp.get('code')      ?? ''
  const title        = sp.get('title')     ?? ''
  const discount     = sp.get('discount')  ?? ''
  const storeName    = sp.get('store')     ?? ''
  const storeSlug    = sp.get('slug')      ?? ''
  const logoUrl      = sp.get('logo')      ?? ''
  const bannerUrl    = sp.get('banner')    ?? ''
  const expiryRaw    = sp.get('expiry')    ?? ''
  const affiliateUrl = sp.get('affiliate') ?? ''
  const type         = (sp.get('type') ?? 'code') as 'code' | 'deal' | 'free_shipping'
  const from         = sp.get('from')      ?? '/'

  const hasCode = type === 'code' && !!code
  const [copied,  setCopied]  = useState(false)
  const [visible, setVisible] = useState(false)
  const [similar, setSimilar] = useState<SimilarStore[]>([])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!storeSlug) return
    fetch(`/api/similar-stores?slug=${storeSlug}`)
      .then(r => r.json())
      .then(setSimilar)
      .catch(() => {})
  }, [storeSlug])

  const closePopup = useCallback(() => { window.location.href = from }, [from])

  const handleCopyAndGo = useCallback(() => {
    const openAffiliate = () => window.open(affiliateUrl, '_blank')
    if (hasCode && code) {
      navigator.clipboard.writeText(code)
        .then(() => {
          setCopied(true)
          setTimeout(() => { openAffiliate(); setCopied(false) }, 900)
        })
        .catch(openAffiliate)
    } else {
      openAffiliate()
    }
  }, [code, hasCode, affiliateUrl])

  return (
    <>
      {/* ── Blurred background iframe ──────────────────────────────── */}
      <iframe
        src={from}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed', top: 64, left: 0, right: 0, bottom: 0,
          width: '100%', height: 'calc(100% - 64px)',
          border: 'none', pointerEvents: 'none',
          filter: 'blur(8px) brightness(0.35) saturate(0.6)',
          transform: 'scale(1.06)',
        }}
      />

      {/* ── Overlay ────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, background: 'rgba(4,6,18,.65)', backdropFilter: 'blur(2px)' }} />

      {/* ── Scrollable centering container ─────────────────────────── */}
      <div style={{
        position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, overflowY: 'auto',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px 48px', zIndex: 10,
      }}>

        {/* ── Modal card ───────────────────────────────────────────── */}
        <div style={{
          width: '100%', maxWidth: 600,
          background: 'linear-gradient(160deg,rgba(17,24,51,.97) 0%,rgba(10,14,35,.98) 100%)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 28,
          boxShadow: '0 50px 140px rgba(0,0,0,.9), 0 0 0 1px rgba(99,102,241,.15)',
          overflow: 'hidden',
          position: 'relative',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(36px) scale(.95)',
          opacity: visible ? 1 : 0,
          transition: 'transform .42s cubic-bezier(.22,1,.36,1), opacity .32s ease',
        }}>

          {/* Close */}
          <button
            onClick={closePopup}
            title="Fermer"
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 3,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.13)',
              color: 'rgba(255,255,255,.55)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s, color .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.3)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.55)' }}
          >
            <X size={15} />
          </button>

          {/* ── Optional banner image ───────────────────────────────── */}
          {bannerUrl && (
            <div style={{ position: 'relative', width: '100%', height: 140, overflow: 'hidden' }}>
              <img
                src={bannerUrl}
                alt={`Offre ${storeName}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.1), rgba(10,14,35,.85))' }} />
            </div>
          )}

          {/* ── Green status bar ────────────────────────────────────── */}
          <div style={{
            background: 'rgba(16,185,129,.1)', borderBottom: '1px solid rgba(16,185,129,.18)',
            padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0, display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>
              La boutique <strong>{storeName}</strong> s&apos;est ouverte dans l&apos;onglet précédent
            </span>
          </div>

          {/* ── Store hero section ──────────────────────────────────── */}
          <div style={{ padding: '32px 36px 24px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.06)' }}>

            {/* Logo */}
            <div style={{
              margin: '0 auto 18px', width: 88, height: 88, borderRadius: 22,
              overflow: 'hidden', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,.45), 0 0 0 3px rgba(99,102,241,.2)',
            }}>
              {logoUrl
                ? <img src={logoUrl} alt={storeName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                : <span style={{ fontSize: 32, fontWeight: 900, color: '#6366f1' }}>{storeName[0]?.toUpperCase()}</span>
              }
            </div>

            {/* Store name */}
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 10px', letterSpacing: '-.03em', lineHeight: 1.1 }}>
              {storeName}
            </h2>

            {/* Discount badge */}
            {discount && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '6px 18px', borderRadius: 999,
                background: 'linear-gradient(135deg, rgba(99,102,241,.25), rgba(139,92,246,.2))',
                border: '1px solid rgba(99,102,241,.45)',
                marginBottom: 14, backdropFilter: 'blur(8px)',
              }}>
                <Tag size={13} color="#a5b4fc" />
                <span style={{ fontSize: 18, fontWeight: 900, color: '#c4b5fd', letterSpacing: '-.01em' }}>{discount}</span>
                <Sparkles size={12} color="#a5b4fc" />
              </div>
            )}

            {/* Coupon title */}
            {title && (
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,.65)', lineHeight: 1.6, margin: 0, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
                {title}
              </p>
            )}
          </div>

          {/* ── Code / CTA section ──────────────────────────────────── */}
          <div style={{ padding: '26px 36px 28px' }}>
            {hasCode ? (
              <>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.18em', marginBottom: 12, textAlign: 'center' }}>
                  Votre code promo
                </div>

                {/* Dashed code box */}
                <div
                  onClick={handleCopyAndGo}
                  title="Cliquer pour copier"
                  style={{
                    border: '2px dashed rgba(99,102,241,.5)', borderRadius: 18,
                    padding: '18px 24px', marginBottom: 18, cursor: 'pointer',
                    background: 'rgba(99,102,241,.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'border-color .2s, background .2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,.85)'; (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,.13)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,.07)' }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '.16em' }}>
                    {code}
                  </span>
                  {copied
                    ? <CheckCheck size={24} color="#22c55e" />
                    : <Copy size={24} color="rgba(165,180,252,.7)" />
                  }
                </div>

                {/* ── Liquid glass copy button ─────────────────────── */}
                <button
                  onClick={handleCopyAndGo}
                  style={{
                    width: '100%', padding: '17px 24px',
                    borderRadius: 18, cursor: 'pointer',
                    fontSize: 15, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '.08em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    position: 'relative', overflow: 'hidden', border: 'none',
                    marginBottom: 14,
                    // Liquid glass effect
                    background: copied
                      ? 'linear-gradient(135deg, rgba(16,185,129,.55) 0%, rgba(5,150,105,.45) 100%)'
                      : 'linear-gradient(135deg, rgba(99,102,241,.55) 0%, rgba(139,92,246,.45) 50%, rgba(168,85,247,.4) 100%)',
                    backdropFilter: 'blur(24px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                    boxShadow: copied
                      ? '0 8px 32px rgba(16,185,129,.4), inset 0 1px 0 rgba(255,255,255,.25), inset 0 -1px 0 rgba(0,0,0,.2)'
                      : '0 8px 32px rgba(99,102,241,.45), inset 0 1px 0 rgba(255,255,255,.25), inset 0 -1px 0 rgba(0,0,0,.2)',
                    color: '#fff',
                    transition: 'all .3s ease',
                  }}
                  onMouseEnter={e => {
                    const b = e.currentTarget
                    if (!copied) {
                      b.style.background = 'linear-gradient(135deg, rgba(99,102,241,.75) 0%, rgba(139,92,246,.65) 50%, rgba(168,85,247,.6) 100%)'
                      b.style.boxShadow  = '0 12px 40px rgba(99,102,241,.6), inset 0 1px 0 rgba(255,255,255,.3), inset 0 -1px 0 rgba(0,0,0,.2)'
                      b.style.transform  = 'translateY(-2px)'
                    }
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget
                    b.style.transform = 'translateY(0)'
                    if (!copied) {
                      b.style.background = 'linear-gradient(135deg, rgba(99,102,241,.55) 0%, rgba(139,92,246,.45) 50%, rgba(168,85,247,.4) 100%)'
                      b.style.boxShadow  = '0 8px 32px rgba(99,102,241,.45), inset 0 1px 0 rgba(255,255,255,.25), inset 0 -1px 0 rgba(0,0,0,.2)'
                    }
                  }}
                >
                  {/* glass sheen overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,.15) 0%, rgba(255,255,255,0) 60%)', pointerEvents: 'none', borderRadius: 18 }} />
                  {copied
                    ? <><CheckCheck size={18} /> Code copié — ouverture de la boutique…</>
                    : <><Copy size={18} /> Copier &amp; Aller à la boutique</>
                  }
                </button>

                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textAlign: 'center', lineHeight: 1.5, margin: '0 0 6px' }}>
                  Collez ce code à la caisse pour bénéficier de votre réduction
                </p>
              </>
            ) : (
              <>
                <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '18px 24px', marginBottom: 18, textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', margin: 0, lineHeight: 1.6 }}>
                    Aucun code requis — La réduction est appliquée automatiquement
                  </p>
                </div>
                <button
                  onClick={handleCopyAndGo}
                  style={{
                    width: '100%', padding: '17px 24px', borderRadius: 18, border: 'none', cursor: 'pointer',
                    fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    position: 'relative', overflow: 'hidden', marginBottom: 14,
                    background: 'linear-gradient(135deg, rgba(99,102,241,.55) 0%, rgba(139,92,246,.45) 100%)',
                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 8px 32px rgba(99,102,241,.4), inset 0 1px 0 rgba(255,255,255,.25)',
                    color: '#fff',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,.15) 0%, transparent 60%)', pointerEvents: 'none', borderRadius: 18 }} />
                  <ExternalLink size={18} />
                  Voir l&apos;offre sur {storeName}
                </button>
              </>
            )}

            {expiryRaw && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', textAlign: 'center', marginBottom: 0 }}>
                Expire le {new Date(expiryRaw).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>

          {/* ── Similar stores section ──────────────────────────────── */}
          {similar.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '20px 36px 28px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.18em', marginBottom: 16 }}>
                Boutiques similaires
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {similar.map(s => (
                  <a
                    key={s.slug}
                    href={`/store/${s.slug}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', borderRadius: 12,
                      background: 'rgba(255,255,255,.05)',
                      border: '1px solid rgba(255,255,255,.09)',
                      textDecoration: 'none',
                      transition: 'background .2s, border-color .2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,.15)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,.35)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.09)' }}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: s.logo_url ? '#fff' : 'rgba(99,102,241,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {s.logo_url
                        ? <img src={s.logo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} />
                        : <span style={{ fontSize: 11, fontWeight: 900, color: '#fff' }}>{s.name[0]?.toUpperCase()}</span>
                      }
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.7)', whiteSpace: 'nowrap' }}>{s.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default function CouponRevealPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0e23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 14 }}>Chargement…</div>
      </div>
    }>
      <RevealContent />
    </Suspense>
  )
}
