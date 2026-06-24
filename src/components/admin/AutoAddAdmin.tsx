'use client'
import { useState, useRef } from 'react'
import { useLang } from './LangContext'
import { Search, Upload, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { publishAwinStore, uploadAwinLogo } from '@/app/actions/auto-add'

interface AwinStore {
  id: string; name: string; logoUrl: string | null
  coupons: { title: string; code: string | null; discount: string | null }[]
  affiliateUrl: string | null
}

export function AutoAddAdmin() {
  const { tr } = useLang()

  const [storeName, setStoreName] = useState('')
  const [logoFile, setLogoFile]   = useState<File | null>(null)
  const [searching, setSearching] = useState(false)
  const [result, setResult]       = useState<AwinStore | null | 'not_found'>(null)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSearch() {
    if (!storeName.trim()) return
    setSearching(true); setResult(null); setPublished(null)
    try {
      const res = await fetch(`/api/admin/awin-search?q=${encodeURIComponent(storeName.trim())}`)
      const json = await res.json()
      setResult(json.store ?? 'not_found')
    } catch {
      setResult('not_found')
    } finally {
      setSearching(false)
    }
  }

  async function handlePublish() {
    if (!result || result === 'not_found') return
    setPublishing(true)
    try {
      let logoUrl: string | null = result.logoUrl
      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)
        const { url, error } = await uploadAwinLogo(result.id, formData)
        if (error) throw new Error(error)
        logoUrl = url
      }

      const { error } = await publishAwinStore({
        awinId: result.id,
        name: result.name,
        affiliateUrl: result.affiliateUrl,
        logoUrl,
        coupons: result.coupons,
      })
      if (error) throw new Error(error)

      setPublished(`/admin/boutiques/?search=${encodeURIComponent(result.name)}`)
    } catch (e: unknown) {
      alert(`${tr.errorPrefix}${(e as Error).message}`)
    } finally {
      setPublishing(false)
    }
  }

  if (published) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96 gap-4">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold text-navy">{tr.storePublished}</h2>
        <a href={published} className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary/90">
          {tr.seeMore} <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-navy mb-6">{tr.autoAdd}</h1>

      {/* Search form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">{tr.name} *</label>
          <input
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={tr.autoAddPlaceholder}
            className="input-base"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">{tr.logo} (optionnel)</label>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoFile && <img src={URL.createObjectURL(logoFile)} alt="" className="w-12 h-12 object-contain border border-gray-200 rounded-lg" />}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50">
              <Upload className="h-4 w-4" /> {logoFile ? logoFile.name : 'Uploader un logo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !storeName.trim()}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {tr.searchBtn}
        </button>
      </div>

      {/* Results */}
      {result === 'not_found' && (
        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-800">{tr.notFoundAwin}</p>
            <p className="text-sm text-orange-600 mt-1">
              Use <a href="/admin/boutiques/" className="underline">{tr.manualAdd}</a> to create this store.
            </p>
          </div>
        </div>
      )}

      {result && result !== 'not_found' && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Store preview */}
          <div className="p-5 border-b border-gray-100 flex items-center gap-4">
            {(logoFile ? URL.createObjectURL(logoFile) : result.logoUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoFile ? URL.createObjectURL(logoFile) : result.logoUrl!} alt={result.name}
                className="w-16 h-16 object-contain border border-gray-200 rounded-xl p-1" />
            )}
            <div>
              <h3 className="font-bold text-navy text-lg">{result.name}</h3>
              <p className="text-sm text-gray-500">{result.coupons.length} coupon(s) trouvé(s) sur Awin</p>
            </div>
          </div>

          {/* Sample coupons */}
          {result.coupons.slice(0, 3).map((c, i) => (
            <div key={i} className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-navy line-clamp-1">{c.title}</p>
                {c.discount && <p className="text-xs text-primary font-semibold">{c.discount}</p>}
              </div>
              {c.code && (
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="p-5 flex gap-3">
            <button onClick={() => setResult(null)}
              className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm hover:bg-gray-50">
              {tr.cancel}
            </button>
            <button onClick={handlePublish} disabled={publishing}
              className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {tr.publishConfirm}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
