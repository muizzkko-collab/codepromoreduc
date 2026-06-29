'use client'
import { useEffect, useState } from 'react'
import { X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if dismissed within last 7 days
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 7 * 86400000) return

    // Track visits
    const visits = Number(localStorage.getItem('pwa-visit-count') ?? 0) + 1
    localStorage.setItem('pwa-visit-count', String(visits))

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show after 2nd visit
      if (visits >= 2) {
        setTimeout(() => setVisible(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        setVisible(false)
        localStorage.removeItem('pwa-visit-count')
      }
      setDeferredPrompt(null)
    })
  }

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Installer l'application"
      style={{
        position: 'fixed',
        bottom: 80,
        left: 12,
        right: 12,
        zIndex: 9999,
        background: 'rgba(4,11,30,.96)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(56,189,248,.35)',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12), 0 24px 64px rgba(0,0,0,.6), 0 0 0 1px rgba(56,189,248,.1)',
        animation: 'slideUp .35s cubic-bezier(.22,.61,.36,1)',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', padding: 4 }}
      >
        <X size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ background: 'rgba(56,189,248,.15)', borderRadius: 12, padding: 10, flexShrink: 0 }}>
          <Smartphone size={22} color="#38bdf8" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.4 }}>
            Installez CodePromo sur votre téléphone
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginBottom: 14, lineHeight: 1.5 }}>
            Accédez rapidement à tous vos codes promo et recevez des alertes pour vos boutiques préférées.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleInstall}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#38bdf8,#818cf8)',
                color: '#fff', fontSize: 13, fontWeight: 700,
              }}
            >
              Installer gratuitement
            </button>
            <button
              onClick={handleDismiss}
              style={{
                padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
                color: 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: 600,
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
