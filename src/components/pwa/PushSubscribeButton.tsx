'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

interface Props {
  storeId: string
  storeName: string
}

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

export function PushSubscribeButton({ storeId, storeName }: Props) {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [supported, setSupported]   = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true)
      // Check current subscription
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription()
      ).then(sub => {
        if (sub) {
          const prefs: string[] = JSON.parse(localStorage.getItem('push-store-prefs') ?? '[]')
          setSubscribed(prefs.includes(storeId))
        }
      }).catch(() => {})
    }
  }, [storeId])

  async function toggle() {
    if (loading || !supported) return
    setLoading(true)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Veuillez autoriser les notifications pour recevoir des alertes.')
        setLoading(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        })
      }

      const prefs: string[] = JSON.parse(localStorage.getItem('push-store-prefs') ?? '[]')
      let newPrefs: string[]

      if (subscribed) {
        // Unsubscribe from this store
        newPrefs = prefs.filter(id => id !== storeId)
        if (newPrefs.length === 0) {
          // No more preferences — unsubscribe completely
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        } else {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub.toJSON(), storeIds: newPrefs }),
          })
        }
        setSubscribed(false)
      } else {
        // Subscribe to this store
        newPrefs = [...prefs.filter(id => id !== storeId), storeId]
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), storeIds: newPrefs }),
        })
        setSubscribed(true)
      }

      localStorage.setItem('push-store-prefs', JSON.stringify(newPrefs))
    } catch (e) {
      console.error('Push subscription error', e)
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={subscribed ? `Désactiver les alertes pour ${storeName}` : `Recevoir les alertes pour ${storeName}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
        border: subscribed ? '1px solid rgba(56,189,248,.5)' : '1px solid rgba(255,255,255,.15)',
        background: subscribed ? 'rgba(56,189,248,.12)' : 'rgba(255,255,255,.05)',
        color: subscribed ? '#38bdf8' : 'rgba(255,255,255,.55)',
        fontSize: 13, fontWeight: 600, transition: 'all 150ms ease',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {subscribed ? <Bell size={14} fill="#38bdf8" /> : <BellOff size={14} />}
      {subscribed ? 'Alertes activées' : 'Recevoir les alertes'}
    </button>
  )
}
