'use client'
import { useState } from 'react'
import { Send, Clock, Users } from 'lucide-react'

interface Log {
  id: string; title: string; message: string; url: string;
  sent_count: number; failed_count: number; created_at: string;
}

interface Props { logs: Log[] }

export function PwaAdminClient({ logs }: Props) {
  const [title,   setTitle]   = useState('')
  const [message, setMessage] = useState('')
  const [url,     setUrl]     = useState('https://codepromoreduc.fr/')
  const [storeId, setStoreId] = useState('')
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState<string | null>(null)

  async function handleSend() {
    if (!title || !message) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ title, message, url, storeId: storeId || undefined }),
      })
      const data = await res.json()
      if (data.error) setResult(`Erreur: ${data.error}`)
      else if (data.skipped) setResult(`Ignoré: ${data.skipped}`)
      else setResult(`Envoyé à ${data.sent} abonnés (${data.failed} échecs)`)
    } catch (e) {
      setResult(`Erreur réseau: ${e}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Send form */}
      <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Send size={16} color="#38bdf8" /> Envoyer une notification manuelle
        </h2>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>Titre *</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nouveau code promo Amazon!"
            style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
        </label>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>Message *</span>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
            placeholder="20% de réduction — Code: PROMO20"
            style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
        </label>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>URL de destination</span>
          <input value={url} onChange={e => setUrl(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
        </label>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>
            <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
            Store ID (laisser vide pour tous les abonnés)
          </span>
          <input value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="uuid de la boutique"
            style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
        </label>

        <button onClick={handleSend} disabled={sending || !title || !message}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: sending ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', fontSize: 14, fontWeight: 700,
            opacity: (!title || !message) ? 0.5 : 1 }}>
          {sending ? 'Envoi...' : 'Envoyer la notification'}
        </button>

        {result && (
          <p style={{ marginTop: 12, fontSize: 13, color: result.startsWith('Erreur') ? '#f87171' : '#34d399', textAlign: 'center' }}>
            {result}
          </p>
        )}
      </div>

      {/* Recent notifications log */}
      <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color="#818cf8" /> Historique récent
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
          {logs.length === 0 && <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>Aucune notification envoyée.</p>}
          {logs.map(log => (
            <div key={log.id} style={{ borderLeft: '3px solid rgba(56,189,248,.4)', paddingLeft: 12, paddingBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{log.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>{log.message}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', display: 'flex', gap: 10 }}>
                <span>{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                <span style={{ color: '#34d399' }}>{log.sent_count} envoyés</span>
                {log.failed_count > 0 && <span style={{ color: '#f87171' }}>{log.failed_count} échecs</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
