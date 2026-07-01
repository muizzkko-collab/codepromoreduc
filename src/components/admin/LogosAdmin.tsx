'use client'
import { useState, useRef } from 'react'
import { RefreshCw, Upload, X, CheckCircle, Loader2, ImageOff, AlertCircle } from 'lucide-react'

interface StoreRow {
  id: string
  name: string
  slug: string
  logo_url: string | null
  logo_source: string | null
  coupon_count: number
  affiliate_url: string | null
}

interface Stats {
  total: number
  hasLogo: number
  missing: number
  placeholder: number
  sources: Record<string, number>
}

interface Props {
  stats: Stats
  placeholderStores: StoreRow[]
  noLogoStores: StoreRow[]
}

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  awin:           { label: 'AWIN',        color: '#1d4ed8' },
  google_favicon: { label: 'FAVICON',     color: '#15803d' },
  clearbit:       { label: 'CLEARBIT',    color: '#6d28d9' },
  firecrawl:      { label: 'FIRECRAWL',   color: '#c2410c' },
  duckduckgo:     { label: 'DUCKDUCKGO',  color: '#0369a1' },
  placeholder:    { label: 'PLACEHOLDER', color: '#9a3412' },
  manual:         { label: 'MANUAL',      color: '#065f46' },
  unknown:        { label: 'UNKNOWN',     color: '#6b7280' },
}

function SourceBadge({ source }: { source: string | null }) {
  const s = SOURCE_BADGE[source ?? 'unknown'] ?? SOURCE_BADGE.unknown
  return (
    <span style={{
      background: `${s.color}18`, color: s.color,
      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
      border: `1px solid ${s.color}30`, letterSpacing: '.4px',
    }}>
      {s.label}
    </span>
  )
}

function LogoCell({ store, onUpdated }: { store: StoreRow; onUpdated: (id: string, url: string, source: string) => void }) {
  const [loading, setLoading]   = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [status, setStatus]     = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleAutoImport() {
    setLoading(true); setStatus(null)
    try {
      const res  = await fetch('/api/admin/import-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, method: 'auto' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpdated(store.id, data.logoUrl, data.source)
      setStatus(`✓ ${data.source}`)
      setPanelOpen(false)
    } catch (e: unknown) {
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(file: File) {
    setLoading(true); setStatus(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/admin/import-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, method: 'manual', base64, mimeType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpdated(store.id, data.logoUrl, 'manual')
      setStatus('✓ Uploaded')
      setPanelOpen(false)
    } catch (e: unknown) {
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Logo thumbnail */}
      <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
        {store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logo_url} alt={store.name} className="w-full h-full object-contain" />
        ) : (
          <ImageOff className="h-4 w-4 text-gray-300" />
        )}
      </div>

      <SourceBadge source={store.logo_source} />

      <button
        onClick={() => setPanelOpen(true)}
        className="text-xs border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50 text-gray-600 shrink-0"
      >
        Change
      </button>

      {/* Inline action panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPanelOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy">{store.name}</h3>
              <button onClick={() => setPanelOpen(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>

            {store.logo_url && (
              <div className="flex justify-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={store.logo_url} alt={store.name} className="w-20 h-20 object-contain border border-gray-100 rounded-lg" />
              </div>
            )}

            {status && (
              <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${status.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {status}
              </p>
            )}

            <div className="space-y-2">
              <button
                onClick={handleAutoImport}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Auto-import logo
              </button>

              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" /> Upload image
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function LogosAdmin({ stats, placeholderStores, noLogoStores }: Props) {
  const [tab, setTab] = useState<'placeholder' | 'missing'>('missing')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const [placeholders, setPlaceholders] = useState(placeholderStores)
  const [noLogos, setNoLogos]           = useState(noLogoStores)
  const [liveStats, setLiveStats]       = useState(stats)

  function handleUpdated(id: string, url: string, source: string) {
    const update = (rows: StoreRow[]) => rows.map(r => r.id === id ? { ...r, logo_url: url, logo_source: source } : r)
    setPlaceholders(update)
    setNoLogos(prev => prev.filter(r => r.id !== id))
    setLiveStats(s => ({ ...s, missing: Math.max(0, s.missing - 1) }))
  }

  async function handleBulkImport() {
    setImporting(true); setImportMsg(null)
    const targets = tab === 'missing' ? noLogos.slice(0, 20) : placeholders.slice(0, 20)
    let done = 0
    for (const store of targets) {
      try {
        const res = await fetch('/api/admin/import-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: store.id, method: 'auto' }),
        })
        const data = await res.json()
        if (res.ok) {
          handleUpdated(store.id, data.logoUrl, data.source)
          done++
        }
      } catch {}
    }
    setImportMsg(`Done: ${done} / ${targets.length} logos imported`)
    setImporting(false)
  }

  const allRows = tab === 'missing' ? noLogos : placeholders

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-navy">Logo Management</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total stores',    value: liveStats.total,       color: 'text-navy' },
          { label: 'Have logo',       value: liveStats.hasLogo,     color: 'text-green-600' },
          { label: 'Missing logo',    value: liveStats.missing,     color: 'text-red-500' },
          { label: 'Placeholders',    value: liveStats.placeholder, color: 'text-orange-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className={`text-2xl font-black ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Source breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Logo sources</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(liveStats.sources).map(([src, cnt]) => (
            <div key={src} className="flex items-center gap-1.5">
              <SourceBadge source={src} />
              <span className="text-sm font-semibold text-gray-700">{cnt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'missing',     label: `No logo (${noLogos.length})` },
              { key: 'placeholder', label: `Placeholder (${placeholders.length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as 'missing' | 'placeholder')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab === t.key ? 'bg-white shadow text-navy' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {importMsg && (
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle className="h-3.5 w-3.5" /> {importMsg}
              </div>
            )}
            <button
              onClick={handleBulkImport}
              disabled={importing || allRows.length === 0}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Auto-import top 20
            </button>
          </div>
        </div>

        {allRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <CheckCircle className="h-10 w-10 text-green-400" />
            <p className="text-sm text-gray-500">All stores in this category have logos!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Store</th>
                  <th className="px-4 py-3 text-center">Coupons</th>
                  <th className="px-4 py-3 text-left">Logo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allRows.map(store => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-navy">{store.name}</p>
                      <p className="text-xs text-gray-400">{store.slug}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-semibold text-gray-600">{store.coupon_count}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <LogoCell store={store} onUpdated={handleUpdated} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {allRows.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              Showing top 200 stores by coupon count. Run <code className="bg-amber-100 px-1 rounded">node scripts/import-logos.mjs</code> to batch-process all {liveStats.missing + liveStats.placeholder} stores.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
