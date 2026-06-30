'use client'
import { useEffect, useState } from 'react'
import { X, Smartphone, Share } from 'lucide-react'

type Platform = 'android' | 'ios' | 'other'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

export function StoreInstallBanner() {
  const [visible,  setVisible]  = useState(false)
  const [platform, setPlatform] = useState<Platform>('android')
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt(): void } | null>(null)

  useEffect(() => {
    // Desktop: never show
    if (!window.matchMedia('(max-width: 767px)').matches) return
    // Already in standalone (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Dismissed within last 3 days
    const dismissed = localStorage.getItem('store-install-dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 3 * 86400000) return

    setPlatform(detectPlatform())

    // Capture Chrome install prompt if available
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as { prompt(): void })
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Show banner after 1.5 s regardless of install prompt
    const t = setTimeout(() => setVisible(true), 1500)
    return () => {
      clearTimeout(t)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
    }
    // For iOS: banner stays open showing the instructions
    if (platform !== 'ios') setVisible(false)
  }

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem('store-install-dismissed', String(Date.now()))
  }

  if (!visible) return null

  const isIos = platform === 'ios'

  return (
    <div
      role="dialog"
      aria-label="Installer l'application"
      style={{
        position: 'fixed',
        bottom: 72,
        left: 12,
        right: 12,
        zIndex: 9998,
        background: 'linear-gradient(160deg, rgba(10,14,35,.97) 0%, rgba(4,6,18,.98) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(56,189,248,.3)',
        borderRadius: 18,
        padding: '14px 16px',
        boxShadow: '0 8px 40px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.1), 0 0 0 1px rgba(56,189,248,.08)',
        animation: 'sbSlideUp .38s cubic-bezier(.22,.61,.36,1)',
        maxWidth: 500,
        margin: '0 auto',
      }}
    >
      <style>{`
        @keyframes sbSlideUp {
          from { opacity: 0; transform: translateY(24px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>

      {/* Close */}
      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        style={{
          position: 'absolute', top: 10, right: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,.35)', padding: 4, lineHeight: 0,
        }}
      >
        <X size={15} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,rgba(56,189,248,.2),rgba(129,140,248,.15))',
          border: '1px solid rgba(56,189,248,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Smartphone size={22} color="#38bdf8" />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: '0 0 2px', lineHeight: 1.3 }}>
            Codes promo en un tap
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', margin: 0, lineHeight: 1.4 }}>
            {isIos
              ? 'Appuyez sur  puis « Sur l\'écran d\'accueil »'
              : 'Installez l\'app gratuitement — accès instantané'}
          </p>
        </div>

        {/* CTA */}
        {isIos ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 12px', borderRadius: 10, flexShrink: 0,
            background: 'rgba(56,189,248,.12)', border: '1px solid rgba(56,189,248,.25)',
          }}>
            <Share size={14} color="#38bdf8" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', whiteSpace: 'nowrap' }}>Partager</span>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            style={{
              padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: 'linear-gradient(135deg,#38bdf8,#818cf8)',
              color: '#fff', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
            }}
          >
            Installer
          </button>
        )}
      </div>
    </div>
  )
}
