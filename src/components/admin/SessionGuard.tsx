'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter }    from 'next/navigation'

const TIMEOUT_MS  = 60 * 60 * 1000  // 60 minutes
const WARNING_MS  = 55 * 60 * 1000  // warn at 55 minutes
const EVENTS      = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

export function SessionGuard() {
  const router        = useRouter()
  const lastActivity  = useRef(Date.now())
  const [showWarning, setShowWarning] = useState(false)

  const resetActivity = useCallback(() => {
    lastActivity.current = Date.now()
    setShowWarning(false)
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/connexion/?reason=session_expired')
  }, [router])

  useEffect(() => {
    EVENTS.forEach(ev => window.addEventListener(ev, resetActivity, { passive: true }))

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivity.current
      if (idle >= TIMEOUT_MS) {
        signOut()
      } else if (idle >= WARNING_MS) {
        setShowWarning(true)
      }
    }, 30000) // check every 30 seconds

    return () => {
      EVENTS.forEach(ev => window.removeEventListener(ev, resetActivity))
      clearInterval(interval)
    }
  }, [resetActivity, signOut])

  if (!showWarning) return null

  const remaining = Math.max(0, Math.round((TIMEOUT_MS - (Date.now() - lastActivity.current)) / 60000))

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: 'rgba(245,158,11,.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(245,158,11,.5)',
      borderRadius: 12, padding: '14px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,.35)',
      display: 'flex', alignItems: 'center', gap: 14,
      color: '#fff', fontSize: 14, fontWeight: 600,
      animation: 'slideUp .3s ease',
      maxWidth: 360,
    }}>
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div>Votre session expire dans {remaining} minute{remaining !== 1 ? 's' : ''}.</div>
        <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>Bougez la souris pour rester connecté.</div>
      </div>
      <button
        onClick={signOut}
        style={{ background: 'rgba(0,0,0,.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
      >
        Se déconnecter
      </button>
    </div>
  )
}
