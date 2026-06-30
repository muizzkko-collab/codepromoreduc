'use client'
import { useState, useRef } from 'react'
import { useLang } from './LangContext'
import {
  Search, Upload, CheckCircle, AlertCircle, Loader2,
  ExternalLink, Sparkles, Globe, Tag, Truck,
} from 'lucide-react'
import { publishStore, uploadStoreLogo } from '@/app/actions/auto-add'
import type { NetworkStoreResult } from '@/app/api/admin/store-search/route'
import type { GenerateResult } from '@/app/api/admin/store-generate/route'
import type { ContentBody } from '@/lib/types'

// ── Network badge ─────────────────────────────────────────────────────────────
const NETWORK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  awin:         { bg: '#dbeafe', text: '#1d4ed8', label: 'Awin' },
  kwanko:       { bg: '#ede9fe', text: '#6d28d9', label: 'Kwanko' },
  effiliation:  { bg: '#dcfce7', text: '#15803d', label: 'Effiliation' },
  tradedoubler: { bg: '#ffedd5', text: '#c2410c', label: 'Tradedoubler' },
}

function NetworkBadge({ source }: { source: string }) {
  const c = NETWORK_COLORS[source] ?? { bg: '#f3f4f6', text: '#374151', label: source }
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '.3px' }}>
      {c.label}
    </span>
  )
}

function CouponTypeIcon({ type }: { type: string }) {
  if (type === 'shipping') return <Truck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
  if (type === 'code')     return <Tag   className="h-3.5 w-3.5 text-purple-500 shrink-0" />
  return <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
}

// ── Steps ─────────────────────────────────────────────────────────────────────
type Step = 'idle' | 'searching' | 'found' | 'generating' | 'preview' | 'publishing' | 'done'

export function AutoAddAdmin() {
  const { tr } = useLang()

  const [storeName, setStoreName]     = useState('')
  const [logoFile,  setLogoFile]      = useState<File | null>(null)
  const [step,      setStep]          = useState<Step>('idle')
  const [error,     setError]         = useState<string | null>(null)
  const [published, setPublished]     = useState<string | null>(null)

  const [networkStore, setNetworkStore] = useState<NetworkStoreResult | null>(null)
  const [generated,    setGenerated]    = useState<GenerateResult | null>(null)

  // Editable fields
  const [editMeta, setEditMeta]     = useState('')
  const [editDesc, setEditDesc]     = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  // ── Step 1: search all networks ──────────────────────────────────────────────
  async function handleSearch() {
    if (!storeName.trim()) return
    setStep('searching'); setError(null); setNetworkStore(null); setGenerated(null)
    try {
      const res  = await fetch(`/api/admin/store-search?q=${encodeURIComponent(storeName.trim())}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const store: NetworkStoreResult = json.store
      setNetworkStore(store)
      setStep('found')

      // Auto-trigger content generation
      await handleGenerate(store)
    } catch (e: unknown) {
      setError((e as Error).message)
      setStep('idle')
    }
  }

  // ── Step 2: generate AI content ──────────────────────────────────────────────
  async function handleGenerate(store: NetworkStoreResult) {
    setStep('generating')
    try {
      const res  = await fetch('/api/admin/store-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName:  store.name,
          source:     store.source,
          hasCoupons: store.coupons.length > 0,
        }),
      })
      const data: GenerateResult & { error?: string } = await res.json()
      if (data.error) throw new Error(data.error)
      setGenerated(data)
      setEditMeta(data.meta_description)
      setEditDesc(data.content_body.description)
      setStep('preview')
    } catch (e: unknown) {
      setError(`Content generation failed: ${(e as Error).message}`)
      setStep('found') // fall back to found step — user can still publish without AI content
    }
  }

  // ── Step 3: publish ──────────────────────────────────────────────────────────
  async function handlePublish() {
    if (!networkStore) return
    setStep('publishing'); setError(null)
    try {
      let logoUrl = networkStore.logo_url
      if (logoFile) {
        const fd = new FormData()
        fd.append('logo', logoFile)
        const { url, error: uploadErr } = await uploadStoreLogo('new-' + Date.now(), fd)
        if (uploadErr) throw new Error(uploadErr)
        logoUrl = url
      }

      const contentBody: ContentBody | null = generated ? {
        description:            editDesc || generated.content_body.description,
        h2_sections:            generated.content_body.h2_sections,
        faqs:                   generated.content_body.faqs,
        internal_link_mentions: generated.content_body.internal_link_mentions,
      } : null

      // Merge coupons: network coupons take priority, then AI-generated ones
      const allCoupons = [
        ...networkStore.coupons,
        ...(generated && !networkStore.coupons.length ? generated.coupons : []),
      ]

      const { error: pubErr } = await publishStore({
        name:               networkStore.name,
        source:             networkStore.source,
        awinId:             networkStore.awin_id,
        networkMerchantIds: networkStore.network_merchant_ids,
        affiliateUrl:       networkStore.affiliate_url,
        logoUrl,
        metaDescription:    editMeta || generated?.meta_description || null,
        contentBody,
        coupons:            allCoupons,
      })
      if (pubErr) throw new Error(pubErr)
      setPublished(`/admin/boutiques/?search=${encodeURIComponent(networkStore.name)}`)
      setStep('done')
    } catch (e: unknown) {
      setError((e as Error).message)
      setStep('preview')
    }
  }

  // ── Published ────────────────────────────────────────────────────────────────
  if (step === 'done' && published) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96 gap-4">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold text-navy">Boutique publiée !</h2>
        <p className="text-sm text-gray-500 text-center">
          Contenu IA enregistré en statut <strong>Draft</strong> — vous pouvez le réviser depuis la fiche boutique.
        </p>
        <div className="flex gap-3">
          <a href={published} className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary/90">
            {tr.seeMore} <ExternalLink className="h-4 w-4" />
          </a>
          <button onClick={() => { setStep('idle'); setStoreName(''); setNetworkStore(null); setGenerated(null); setPublished(null) }}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            Ajouter une autre
          </button>
        </div>
      </div>
    )
  }

  const isBusy = step === 'searching' || step === 'generating' || step === 'publishing'

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-navy">{tr.autoAdd}</h1>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <p className="text-xs text-gray-500">
          Recherche sur <strong>tous les réseaux</strong> : Awin, Kwanko, Effiliation, Tradedoubler.
          Si introuvable, le crawler IA collecte les codes promo et rédige le contenu automatiquement.
        </p>

        <div className="flex gap-3">
          <input
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isBusy && handleSearch()}
            placeholder="Nom de la boutique (ex: Nike, Sephora…)"
            className="input-base flex-1"
            disabled={isBusy}
          />
          <button
            onClick={handleSearch}
            disabled={isBusy || !storeName.trim()}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          >
            {step === 'searching' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {tr.searchBtn}
          </button>
        </div>

        {/* Logo override */}
        <div className="flex items-center gap-3">
          {logoFile && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={URL.createObjectURL(logoFile)} alt="" className="w-10 h-10 object-contain border border-gray-200 rounded-lg" />
          )}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 text-gray-600">
            <Upload className="h-3.5 w-3.5" />
            {logoFile ? logoFile.name : 'Logo personnalisé (optionnel)'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Status steps ───────────────────────────────────────────────────── */}
      {step === 'searching' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Recherche sur tous les réseaux affiliés…</p>
            <p className="text-xs text-blue-600 mt-0.5">Awin · Kwanko · Effiliation · Tradedoubler</p>
          </div>
        </div>
      )}

      {step === 'generating' && networkStore && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-500 animate-pulse shrink-0" />
          <div>
            <p className="font-semibold text-purple-800 text-sm">
              {networkStore.found
                ? `Génération du contenu IA pour ${networkStore.name}…`
                : `Boutique introuvable dans les réseaux — crawl des sites concurrents en cours…`}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">
              {networkStore.found
                ? 'Rédaction SEO, FAQ, liens internes…'
                : 'Firecrawl · Claude · Rédaction contenu (30-90 s)'}
            </p>
          </div>
        </div>
      )}

      {/* ── Network result card ─────────────────────────────────────────────── */}
      {networkStore && (step === 'found' || step === 'generating' || step === 'preview' || step === 'publishing') && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-4">
            {(logoFile ? URL.createObjectURL(logoFile) : networkStore.logo_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoFile ? URL.createObjectURL(logoFile) : networkStore.logo_url!}
                alt={networkStore.name}
                className="w-14 h-14 object-contain border border-gray-200 rounded-xl p-1"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-2xl font-black">
                {networkStore.name[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-navy text-lg">{networkStore.name}</h3>
                {networkStore.source
                  ? <NetworkBadge source={networkStore.source} />
                  : <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">Crawler IA</span>
                }
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {networkStore.found
                  ? `${networkStore.coupons.length} offre(s) récupérée(s) depuis ${networkStore.source}`
                  : 'Non trouvé dans les réseaux — contenu généré par crawler IA'}
              </p>
              {networkStore.website_url && (
                <a href={networkStore.website_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                  {networkStore.website_url} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Coupons preview */}
          {networkStore.coupons.length > 0 && (
            <div className="border-b border-gray-100">
              <p className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                Codes & Offres ({networkStore.coupons.length})
              </p>
              {networkStore.coupons.slice(0, 5).map((c, i) => (
                <div key={i} className="px-5 py-2.5 border-b border-gray-50 flex items-center gap-3">
                  <CouponTypeIcon type={c.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy line-clamp-1">{c.title}</p>
                    {c.discount && <p className="text-xs text-primary font-semibold">{c.discount}</p>}
                  </div>
                  {c.code && (
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded shrink-0">{c.code}</span>
                  )}
                </div>
              ))}
              {networkStore.coupons.length > 5 && (
                <p className="px-5 py-2 text-xs text-gray-400">+{networkStore.coupons.length - 5} autres offres</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── AI content preview ──────────────────────────────────────────────── */}
      {step === 'preview' && generated && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-800">Contenu généré par Claude</span>
            <span className="text-xs text-purple-500 ml-auto">Modifiable avant publication</span>
          </div>

          {/* AI-generated coupons (scraper mode only) */}
          {!networkStore?.found && generated.coupons.length > 0 && (
            <div className="border-b border-gray-100">
              <p className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                Offres extraites par IA ({generated.coupons.length})
              </p>
              {generated.coupons.slice(0, 5).map((c, i) => (
                <div key={i} className="px-5 py-2.5 border-b border-gray-50 flex items-center gap-3">
                  <CouponTypeIcon type={c.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy line-clamp-1">{c.title}</p>
                    {c.discount && <p className="text-xs text-primary font-semibold">{c.discount}</p>}
                  </div>
                  {c.code && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded shrink-0">{c.code}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="p-5 space-y-4">
            {/* Meta description */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Meta Description</label>
              <textarea
                value={editMeta}
                onChange={e => setEditMeta(e.target.value)}
                rows={2}
                maxLength={160}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-xs text-gray-400 mt-1">{editMeta.length}/155 caractères</p>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description principale</label>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={6}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* H2 sections preview */}
            {generated.content_body.h2_sections.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Sections H2 ({generated.content_body.h2_sections.length})</p>
                <div className="space-y-2">
                  {generated.content_body.h2_sections.map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs font-bold text-navy">{s.heading}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ preview */}
            {generated.content_body.faqs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">FAQ ({generated.content_body.faqs.length})</p>
                <div className="space-y-2">
                  {generated.content_body.faqs.map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs font-bold text-navy">Q: {f.question}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{f.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internal links */}
            {generated.content_body.internal_link_mentions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Liens internes générés</p>
                <div className="flex flex-wrap gap-1.5">
                  {generated.content_body.internal_link_mentions.map((l, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      {(step === 'preview' || step === 'found' || step === 'publishing') && networkStore && (
        <div className="flex gap-3">
          <button
            onClick={() => { setStep('idle'); setNetworkStore(null); setGenerated(null) }}
            disabled={step === 'publishing'}
            className="border border-gray-200 rounded-lg px-5 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            {tr.cancel}
          </button>
          {step === 'found' && (
            <button
              onClick={() => handleGenerate(networkStore)}
              className="flex items-center gap-2 border border-purple-300 text-purple-700 rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-purple-50"
            >
              <Sparkles className="h-4 w-4" /> Générer le contenu IA
            </button>
          )}
          <button
            onClick={handlePublish}
            disabled={step === 'publishing'}
            className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {step === 'publishing'
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Publication…</>
              : <><CheckCircle className="h-4 w-4" /> {tr.publishConfirm}</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
