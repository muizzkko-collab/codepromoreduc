'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { RefreshCw, CheckCircle, XCircle, Eye, AlertTriangle, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import type { ContentStatus, ContentTier, ContentBody, ContentH2Section, ContentFaq } from '@/lib/types'

interface StoreRow {
  id:                   string
  name:                 string
  slug:                 string
  coupon_count:         number
  click_count:          number
  content_status:       ContentStatus | null
  content_body:         ContentBody | null
  content_tier:         ContentTier | null
  content_generated_at: string | null
  content_approved_at:  string | null
  content_approved_by:  string | null
}

interface Stats {
  total: number; notGenerated: number
  draft: number; needsReview: number; approved: number
}

interface Props { stats: Stats; queue: StoreRow[] }

const TIER_COLORS: Record<ContentTier, string> = {
  premium:  'bg-amber-100 text-amber-800',
  standard: 'bg-blue-100 text-blue-700',
  light:    'bg-gray-100 text-gray-600',
}

const STATUS_COLORS: Record<ContentStatus, string> = {
  not_generated: 'bg-gray-100 text-gray-500',
  draft:         'bg-blue-100 text-blue-700',
  approved:      'bg-green-100 text-green-700',
  needs_review:  'bg-amber-100 text-amber-700',
}

// ─── Render content body with link markers ────────────────────────────────────
function renderWithLinks(text: string) {
  const parts = text.split(/(\[\[(?:store|category):[^\]]+\]\])/g)
  return parts.map((part, i) => {
    const m = part.match(/\[\[(store|category):([^|]+)\|([^\]]+)\]\]/)
    if (m) {
      const [, type, slug, name] = m
      const href = type === 'store' ? `/store/${slug}/` : `/coupon-category/${slug}/`
      return <Link key={i} href={href} target="_blank" className="text-primary underline hover:no-underline">{name}</Link>
    }
    return <span key={i}>{part}</span>
  })
}

// ─── Content Preview ──────────────────────────────────────────────────────────
function ContentPreview({
  body, editable = false, onChange,
}: {
  body: ContentBody; editable?: boolean
  onChange?: (b: ContentBody) => void
}) {
  if (!editable) {
    return (
      <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
        <p className="leading-relaxed">{renderWithLinks(body.description)}</p>
        {body.h2_sections.map((s, i) => (
          <div key={i}>
            <h2 className="text-base font-semibold text-navy mt-4 mb-1">{s.heading}</h2>
            <p className="leading-relaxed">{renderWithLinks(s.content)}</p>
          </div>
        ))}
        {body.faqs.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-navy">FAQ</h3>
            {body.faqs.map((f, i) => (
              <details key={i} className="border border-gray-200 rounded-lg p-3">
                <summary className="font-medium text-sm cursor-pointer">{f.question}</summary>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">{renderWithLinks(f.answer)}</p>
              </details>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Editable version
  function update(patch: Partial<ContentBody>) {
    onChange?.({ ...body, ...patch })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Description</label>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={5}
          value={body.description}
          onChange={e => update({ description: e.target.value })}
        />
      </div>
      {body.h2_sections.map((s, i) => (
        <div key={i} className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Section H2 {i + 1}</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={s.heading}
            onChange={e => {
              const sections = [...body.h2_sections]
              sections[i] = { ...sections[i], heading: e.target.value }
              update({ h2_sections: sections })
            }}
          />
          <textarea
            className="w-full border border-gray-200 rounded-lg p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={3}
            value={s.content}
            onChange={e => {
              const sections = [...body.h2_sections]
              sections[i] = { ...sections[i], content: e.target.value }
              update({ h2_sections: sections })
            }}
          />
        </div>
      ))}
      {body.faqs.map((f, i) => (
        <div key={i} className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">FAQ {i + 1}</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={f.question}
            onChange={e => {
              const faqs = [...body.faqs]
              faqs[i] = { ...faqs[i], question: e.target.value }
              update({ faqs })
            }}
          />
          <textarea
            className="w-full border border-gray-200 rounded-lg p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={2}
            value={f.answer}
            onChange={e => {
              const faqs = [...body.faqs]
              faqs[i] = { ...faqs[i], answer: e.target.value }
              update({ faqs })
            }}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Review Panel (per store) ─────────────────────────────────────────────────
function ReviewPanel({
  store, onDone,
}: {
  store: StoreRow
  onDone: (storeId: string, newStatus: ContentStatus) => void
}) {
  const [body, setBody]         = useState<ContentBody>(store.content_body!)
  const [editing, setEditing]   = useState(false)
  const [loading, setLoading]   = useState<'approve' | 'reject' | 'regen' | null>(null)
  const [msg, setMsg]           = useState<string | null>(null)
  const [confirmRegen, setConfirmRegen] = useState(false)

  async function approve() {
    setLoading('approve'); setMsg(null)
    const res  = await fetch('/api/seo/approve',  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store_id: store.id, content_body: body }) })
    const json = await res.json()
    if (res.ok) onDone(store.id, 'approved')
    else setMsg(`Erreur: ${json.error}`)
    setLoading(null)
  }

  async function reject() {
    setLoading('reject'); setMsg(null)
    const res  = await fetch('/api/seo/reject',   { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store_id: store.id }) })
    const json = await res.json()
    if (res.ok) onDone(store.id, 'not_generated')
    else setMsg(`Erreur: ${json.error}`)
    setLoading(null)
  }

  async function regenerate() {
    setLoading('regen'); setMsg(null); setConfirmRegen(false)
    const res  = await fetch('/api/seo/regenerate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store_id: store.id }) })
    const json = await res.json()
    if (res.ok) { setBody(json.content); setMsg('Contenu régénéré avec succès') }
    else setMsg(`Erreur: ${json.error}`)
    setLoading(null)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold text-navy">{store.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {store.content_tier && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[store.content_tier]}`}>
                  {store.content_tier}
                </span>
              )}
              {store.content_status && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[store.content_status]}`}>
                  {store.content_status === 'needs_review' ? '⚠ Similarité détectée' : store.content_status}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/store/${store.slug}/`} target="_blank" className="text-xs text-gray-500 hover:text-primary flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> Voir page
          </Link>
          <button
            onClick={() => setEditing(e => !e)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary hover:text-primary transition-colors"
          >
            {editing ? 'Aperçu' : 'Modifier'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {store.content_status === 'needs_review' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              Ce contenu ressemble à celui d&apos;une autre boutique de la même catégorie (similarité &gt;35%).
              Revoyez et modifiez avant d&apos;approuver.
            </p>
          </div>
        )}
        <ContentPreview body={body} editable={editing} onChange={setBody} />
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
        {msg && <p className={`text-xs ${msg.startsWith('Erreur') ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>}
        <div className="flex items-center gap-2 ml-auto">
          {confirmRegen ? (
            <>
              <span className="text-xs text-gray-500">Confirmer la régénération ?</span>
              <button onClick={() => setConfirmRegen(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">Annuler</button>
              <button onClick={regenerate} disabled={loading === 'regen'}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">
                {loading === 'regen' ? '…' : 'Régénérer'}
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmRegen(true)} disabled={!!loading}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-orange-400 hover:text-orange-500 disabled:opacity-40 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Régénérer
            </button>
          )}
          <button onClick={reject} disabled={!!loading}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Rejeter
          </button>
          <button onClick={approve} disabled={!!loading}
            className="text-xs px-4 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 font-medium">
            <CheckCircle className="h-3 w-3" />
            {loading === 'approve' ? '…' : 'Approuver et publier'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Quick-approve row (bulk view) ────────────────────────────────────────────
function QuickApproveRow({
  store, onDone,
}: {
  store: StoreRow
  onDone: (id: string, status: ContentStatus) => void
}) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState<string | null>(null)

  async function approve() {
    setLoading(true)
    const res  = await fetch('/api/seo/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store_id: store.id }) })
    const json = await res.json()
    if (res.ok) onDone(store.id, 'approved')
    else setMsg(json.error)
    setLoading(false)
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-navy truncate block">{store.name}</span>
          <span className="text-xs text-gray-500">{store.coupon_count} codes · {store.content_tier}</span>
        </div>
        {msg && <span className="text-xs text-red-500">{msg}</span>}
        <button
          onClick={e => { e.stopPropagation(); approve() }}
          disabled={loading}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium flex items-center gap-1"
        >
          <CheckCircle className="h-3 w-3" />
          {loading ? '…' : 'Approuver'}
        </button>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </div>
      {open && store.content_body && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <ContentPreview body={store.content_body} />
        </div>
      )}
    </div>
  )
}

// ─── Main ContentAdmin component ──────────────────────────────────────────────
export function ContentAdmin({ stats, queue }: Props) {
  const [tab, setTab] = useState<'review' | 'bulk'>('review')
  const [stores, setStores] = useState<StoreRow[]>(queue)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg]         = useState<string | null>(null)
  const [activeReview, setActiveReview] = useState<string | null>(null)

  const needsReviewStores = stores.filter(s => s.content_status === 'needs_review')
  const draftStores       = stores.filter(s => s.content_status === 'draft')
  const bulkStores        = stores.filter(s => s.content_status === 'draft' && !s.content_status?.includes('review'))

  const handleDone = useCallback((storeId: string, newStatus: ContentStatus) => {
    setStores(prev => prev.filter(s => s.id !== storeId))
    setActiveReview(null)
  }, [])

  async function triggerBatch(batchSize: number) {
    setGenerating(true); setGenMsg(null)
    try {
      const res  = await fetch('/api/seo/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-request': '1' },
        body: JSON.stringify({ batchSize }),
      })
      const json = await res.json()
      if (res.ok) {
        setGenMsg(`✓ ${json.succeeded} générés, ${json.needs_review} à réviser, ${json.failed} échecs`)
        window.location.reload()
      } else {
        setGenMsg(`Erreur: ${json.error ?? 'inconnue'}`)
      }
    } catch {
      setGenMsg('Erreur réseau')
    } finally {
      setGenerating(false)
    }
  }

  const activeStore = activeReview ? stores.find(s => s.id === activeReview) : null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Contenu SEO boutiques</h1>
        <div className="flex items-center gap-3">
          {genMsg && <span className={`text-xs ${genMsg.startsWith('Erreur') ? 'text-red-500' : 'text-green-600'}`}>{genMsg}</span>}
          <button
            onClick={() => triggerBatch(5)}
            disabled={generating}
            className="text-sm px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/5 disabled:opacity-50 flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {generating ? 'Génération…' : 'Générer 5 (test)'}
          </button>
          <button
            onClick={() => triggerBatch(75)}
            disabled={generating}
            className="text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'En cours…' : 'Générer 75 boutiques'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total boutiques',    value: stats.total,        color: 'bg-gray-100 text-gray-600' },
          { label: 'Non générées',       value: stats.notGenerated, color: 'bg-gray-100 text-gray-500' },
          { label: 'En attente review',  value: stats.draft,        color: 'bg-blue-100 text-blue-700' },
          { label: 'Similarité détectée',value: stats.needsReview,  color: 'bg-amber-100 text-amber-700' },
          { label: 'Approuvées & live',  value: stats.approved,     color: 'bg-green-100 text-green-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression globale</span>
          <span className="text-sm text-gray-500">{stats.approved} / {stats.total} approuvées</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${(stats.approved / stats.total) * 100}%` }} />
          <div className="bg-blue-400 h-full transition-all"  style={{ width: `${(stats.draft / stats.total) * 100}%` }} />
          <div className="bg-amber-400 h-full transition-all" style={{ width: `${(stats.needsReview / stats.total) * 100}%` }} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Approuvé</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Draft</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>À réviser</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['review', 'bulk'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-navy' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'review'
              ? `Révision détaillée (${needsReviewStores.length} à réviser + ${draftStores.length} draft)`
              : `Approbation rapide (${bulkStores.length})`}
          </button>
        ))}
      </div>

      {/* Review tab */}
      {tab === 'review' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Queue list */}
          <div className="xl:col-span-1 space-y-2">
            {needsReviewStores.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Similarité détectée ({needsReviewStores.length})
                </p>
                {needsReviewStores.map(s => (
                  <button key={s.id} onClick={() => setActiveReview(s.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${activeReview === s.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                    <p className="font-medium text-sm text-navy truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.content_tier} · {s.coupon_count} codes</p>
                  </button>
                ))}
              </div>
            )}
            {draftStores.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Drafts ({draftStores.length})</p>
                {draftStores.map(s => (
                  <button key={s.id} onClick={() => setActiveReview(s.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${activeReview === s.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                    <p className="font-medium text-sm text-navy truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.content_tier} · {s.coupon_count} codes</p>
                  </button>
                ))}
              </div>
            )}
            {stores.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Aucun contenu à réviser</p>
            )}
          </div>

          {/* Detail panel */}
          <div className="xl:col-span-2">
            {activeStore?.content_body ? (
              <ReviewPanel store={activeStore} onDone={handleDone} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <Eye className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sélectionnez une boutique pour afficher son contenu</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk approve tab */}
      {tab === 'bulk' && (
        <div className="space-y-2">
          {bulkStores.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun draft standard/light à approuver en masse</p>
          ) : (
            bulkStores.map(s => (
              <QuickApproveRow key={s.id} store={s} onDone={handleDone} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
