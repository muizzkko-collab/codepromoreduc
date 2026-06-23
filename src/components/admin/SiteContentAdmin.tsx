'use client'
import { useState, useRef } from 'react'
import { useLang } from './LangContext'
import { Plus, Pencil, Trash2, X, Save, ExternalLink } from 'lucide-react'
import type { HeroSlide, SiteStat, SidebarBanner } from '@/app/actions/site-content'
import {
  upsertHeroSlide, deleteHeroSlide, uploadHeroImage, updateSiteStat,
  upsertSidebarBanner, deleteSidebarBanner,
} from '@/app/actions/site-content'

const EMPTY_SLIDE: Partial<HeroSlide> = {
  title: '', subtitle: '', description: '', tag: '', discount_label: '',
  button_label: 'Voir l\'offre', link_url: '/', color_theme: 'sky',
  sort_order: 0, is_active: true,
}

const EMPTY_BANNER: Omit<SidebarBanner, 'id' | 'updated_at'> = {
  label: 'Offre exclusive',
  title: '',
  description: '',
  image_url: '',
  button_label: 'Voir l\'offre',
  button_code: '',
  link_url: '/',
  is_active: true,
  sort_order: 0,
}

export function SiteContentAdmin({
  initialSlides,
  initialStats,
  initialBanners,
}: {
  initialSlides:   HeroSlide[]
  initialStats:    SiteStat[]
  initialBanners:  SidebarBanner[]
}) {
  const { tr } = useLang()
  const [tab, setTab] = useState<'slides' | 'stats' | 'banner'>('slides')
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides)
  const [stats,  setStats]  = useState<SiteStat[]>(initialStats)

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'slides', label: tr.heroSlides },
    { key: 'stats',  label: tr.siteStats  },
    { key: 'banner', label: tr.sidebarBanner },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy">{tr.siteContent}</h1>

      <div className="flex border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'slides' && <SlidesTab slides={slides} setSlides={setSlides} />}
      {tab === 'stats'  && <StatsTab  stats={stats}   setStats={setStats}   />}
      {tab === 'banner' && <BannerTab initialBanners={initialBanners} />}
    </div>
  )
}

// ── Sidebar Banner Tab ────────────────────────────────────────────────────────

const MAX_BANNERS = 4

function BannerTab({ initialBanners }: { initialBanners: SidebarBanner[] }) {
  const [banners,    setBanners]    = useState<SidebarBanner[]>(initialBanners)
  const [panelOpen,  setPanelOpen]  = useState(false)
  const [editing,    setEditing]    = useState<Omit<SidebarBanner, 'updated_at'> & { id?: string }>({ ...EMPTY_BANNER })
  const [saving,     setSaving]     = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  function openNew() {
    setEditing({ ...EMPTY_BANNER, sort_order: banners.length })
    setErrorMsg(null)
    setPanelOpen(true)
  }

  function openEdit(b: SidebarBanner) {
    setEditing({ ...b })
    setErrorMsg(null)
    setPanelOpen(true)
  }

  function closePanel() { setPanelOpen(false) }

  async function handleSave() {
    if (!editing.title || !editing.link_url) return
    setSaving(true); setErrorMsg(null)
    try {
      const { data, error } = await upsertSidebarBanner({
        ...editing,
        image_url:   editing.image_url?.trim() || null,
        button_code: editing.button_code?.trim() || null,
        description: editing.description?.trim() || null,
      })
      if (error) { setErrorMsg(error); return }
      if (data) {
        setBanners(prev =>
          editing.id
            ? prev.map(b => b.id === data.id ? data as SidebarBanner : b)
            : [...prev, data as SidebarBanner].sort((a, b) => a.sort_order - b.sort_order)
        )
      }
      closePanel()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette bannière ?')) return
    const { error } = await deleteSidebarBanner(id)
    if (error) { alert(error); return }
    setBanners(prev => prev.filter(b => b.id !== id))
  }

  const previewCode = editing.button_code?.trim()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{banners.length}/{MAX_BANNERS} bannières · rotation automatique toutes les 7 secondes</p>
        </div>
        <button
          onClick={openNew}
          disabled={banners.length >= MAX_BANNERS}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" /> Ajouter une bannière
        </button>
      </div>

      {/* Banner list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {banners.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <p className="mb-3">Aucune bannière configurée.</p>
            <p>Le widget affichera une bannière par défaut sur les pages boutique.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {banners.map((b, i) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                {/* Position indicator */}
                <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">{b.label}</span>
                    {!b.is_active && <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">inactif</span>}
                  </div>
                  <p className="font-semibold text-navy text-sm truncate">{b.title}</p>
                  {b.description && <p className="text-xs text-gray-400 truncate mt-0.5">{b.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    {b.button_code && (
                      <span className="text-xs font-mono bg-teal-50 text-teal-700 border border-teal-200 rounded px-1.5 py-0.5">{b.button_code}</span>
                    )}
                    <span className="text-xs text-gray-400 truncate">{b.link_url}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">Les bannières actives s'affichent dans l'ordre ci-dessus. Le carrousel tourne automatiquement.</p>

      {/* Slide panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
          <div className="flex-1 bg-black/40" onClick={closePanel} />
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-navy">{editing.id ? 'Modifier la bannière' : 'Nouvelle bannière'}</h2>
              <button onClick={closePanel}><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
                {/* Form */}
                <div className="p-6 space-y-4 border-r border-gray-100">
                  {errorMsg && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{errorMsg}</div>}

                  <Field label="Image de la marque (URL) *">
                    <input value={editing.image_url ?? ''} onChange={e => setEditing(p => ({ ...p, image_url: e.target.value }))} className="input-base" placeholder="https://..." />
                    <p className="text-xs text-gray-400 mt-1">Image affichée dans le carrousel (ratio 16/9 recommandé). Laissez vide pour un style texte.</p>
                    {editing.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editing.image_url} alt="" className="mt-2 w-full rounded-lg border border-gray-200 object-cover" style={{ maxHeight:100 }} onError={e => (e.currentTarget.style.display='none')} />
                    )}
                  </Field>
                  <Field label="Badge (ex: Offre exclusive, Partenaire) *">
                    <input value={editing.label} onChange={e => setEditing(p => ({ ...p, label: e.target.value }))} className="input-base" placeholder="Offre exclusive" />
                  </Field>
                  <Field label="Titre affiché sous l'image *">
                    <input value={editing.title} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className="input-base" placeholder="Ex: Économisez 20% chez Nike" />
                  </Field>
                  <Field label="Description (optionnelle — affichée si pas d'image)">
                    <textarea value={editing.description ?? ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} rows={2} className="input-base resize-none" placeholder="Courte description de l'offre..." />
                  </Field>
                  <Field label="Texte du bouton *">
                    <input value={editing.button_label} onChange={e => setEditing(p => ({ ...p, button_label: e.target.value }))} className="input-base" placeholder="Voir l'offre" />
                  </Field>
                  <Field label="Code promo (optionnel — laisser vide si aucun)">
                    <input value={editing.button_code ?? ''} onChange={e => setEditing(p => ({ ...p, button_code: e.target.value }))} className="input-base font-mono uppercase" placeholder="PROMO20" />
                    <p className="text-xs text-gray-400 mt-1">Affiche le code avec un bouton "Copier".</p>
                  </Field>
                  <Field label="URL de destination *">
                    <div className="flex gap-2">
                      <input value={editing.link_url} onChange={e => setEditing(p => ({ ...p, link_url: e.target.value }))} className="input-base flex-1" placeholder="https://..." />
                      {editing.link_url && (
                        <a href={editing.link_url} target="_blank" rel="noopener noreferrer" className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-navy shrink-0">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </Field>
                  <Field label="Ordre d'affichage">
                    <input type="number" min={0} value={editing.sort_order} onChange={e => setEditing(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="input-base" />
                  </Field>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editing.is_active} onChange={e => setEditing(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
                    Afficher dans le carrousel
                  </label>
                </div>

                {/* Live preview */}
                <div className="p-6 bg-gray-950 flex flex-col gap-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Aperçu</p>
                  <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)', borderRadius:18, overflow:'hidden' }}>
                    {editing.image_url ? (
                      <div style={{ width:'100%', aspectRatio:'16/9', background:'#111', position:'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={editing.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onError={e => (e.currentTarget.style.display='none')} />
                        <span style={{ position:'absolute', top:8, left:8, padding:'3px 8px', fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.15em', color:'#fff', background:'rgba(0,0,0,.55)', backdropFilter:'blur(8px)', borderRadius:4 }}>
                          {editing.label || 'Badge'}
                        </span>
                      </div>
                    ) : (
                      <div style={{ padding:'14px 14px 0' }}>
                        <span style={{ padding:'3px 9px', fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.18em', color:'#5eead4', border:'1px solid rgba(20,184,166,.3)', background:'rgba(20,184,166,.1)', borderRadius:4, display:'inline-block', marginBottom:10 }}>
                          {editing.label || 'Badge'}
                        </span>
                        <h4 style={{ fontSize:14, fontWeight:900, color:'#fff', margin:'0 0 6px' }}>{editing.title || 'Titre'}</h4>
                        {editing.description && <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', margin:'0 0 4px', lineHeight:1.5 }}>{editing.description}</p>}
                      </div>
                    )}
                    <div style={{ padding:12 }}>
                      {editing.image_url && <p style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.8)', margin:'0 0 10px' }}>{editing.title || 'Titre'}</p>}
                      {previewCode ? (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, padding:'9px 10px', background:'rgba(20,184,166,.08)', border:'1px solid rgba(20,184,166,.25)', borderRadius:10, textAlign:'center' }}>
                            <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:2 }}>{editing.button_label}</div>
                            <div style={{ fontSize:13, fontWeight:900, color:'#5eead4', letterSpacing:'.08em', fontFamily:'monospace' }}>{previewCode.toUpperCase()}</div>
                          </div>
                          <div style={{ padding:'9px 12px', background:'rgba(20,184,166,.2)', border:'1px solid rgba(20,184,166,.4)', borderRadius:10, fontSize:10, fontWeight:800, color:'#5eead4', whiteSpace:'nowrap' }}>Copier</div>
                        </div>
                      ) : (
                        <div style={{ width:'100%', padding:'11px 12px', background:'linear-gradient(135deg,rgba(20,184,166,.15),rgba(59,130,246,.1))', border:'1px solid rgba(20,184,166,.3)', color:'#5eead4', fontWeight:800, fontSize:11, textTransform:'uppercase', letterSpacing:'.12em', borderRadius:11, textAlign:'center' }}>
                          {editing.button_label || 'Voir l\'offre'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closePanel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">Annuler</button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.title || !editing.link_url}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-dark disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Slides Tab ────────────────────────────────────────────────────────────────

function SlidesTab({ slides, setSlides }: { slides: HeroSlide[]; setSlides: (fn: (prev: HeroSlide[]) => HeroSlide[]) => void }) {
  const { tr } = useLang()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<HeroSlide>>(EMPTY_SLIDE)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function openNew()  { setEditing({ ...EMPTY_SLIDE }); setImageFile(null); setErrorMsg(null); setPanelOpen(true) }
  function openEdit(s: HeroSlide) { setEditing({ ...s }); setImageFile(null); setErrorMsg(null); setPanelOpen(true) }
  function closePanel() { setPanelOpen(false); setEditing(EMPTY_SLIDE) }

  async function handleSave() {
    if (!editing.title || !editing.subtitle) return
    setSaving(true); setErrorMsg(null)
    try {
      const payload = { ...editing }
      if (imageFile) {
        const slideId = editing.id ?? 'temp-' + Date.now()
        const formData = new FormData()
        formData.append('image', imageFile)
        const { url, error } = await uploadHeroImage(slideId, formData)
        if (error) { setErrorMsg(error); return }
        payload.image_url = url
      }
      const { data, error } = await upsertHeroSlide(payload)
      if (error) { setErrorMsg(error); return }
      if (data) {
        setSlides(prev => editing.id ? prev.map(s => s.id === data.id ? data : s) : [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
      }
      closePanel()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(tr.deleteConfirm)) return
    const { error } = await deleteHeroSlide(id)
    if (error) { alert(error); return }
    setSlides(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openNew} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark">
          <Plus className="h-4 w-4" /> {tr.add}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {slides.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">{tr.noData}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Titre</th>
                <th className="px-5 py-3 text-left">Sous-titre</th>
                <th className="px-5 py-3 text-center">Ordre</th>
                <th className="px-5 py-3 text-center">{tr.active}</th>
                <th className="px-5 py-3 text-right">{tr.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {slides.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-navy">{s.title}</td>
                  <td className="px-5 py-3 text-gray-500">{s.subtitle}</td>
                  <td className="px-5 py-3 text-center text-gray-400">{s.sort_order}</td>
                  <td className="px-5 py-3 text-center">{s.is_active ? '✓' : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
          <div className="flex-1 bg-black/40" onClick={closePanel} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-navy">{editing.id ? tr.edit : tr.add}</h2>
              <button onClick={closePanel}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{errorMsg}</div>}

              <Field label="Titre / tag (ex: NOUVEAU)">
                <input value={editing.tag ?? ''} onChange={e => setEditing(p => ({ ...p, tag: e.target.value }))} className="input-base" />
              </Field>
              <Field label="Titre principal *">
                <input value={editing.title ?? ''} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className="input-base" />
              </Field>
              <Field label="Sous-titre *">
                <input value={editing.subtitle ?? ''} onChange={e => setEditing(p => ({ ...p, subtitle: e.target.value }))} className="input-base" />
              </Field>
              <Field label="Description">
                <textarea value={editing.description ?? ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} rows={3} className="input-base resize-none" />
              </Field>
              <Field label="Image">
                <div className="flex items-center gap-3">
                  {(editing.image_url || imageFile) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageFile ? URL.createObjectURL(imageFile) : editing.image_url!} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                  )}
                  <button type="button" onClick={() => fileRef.current?.click()} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                    {imageFile ? imageFile.name : 'Choisir une image'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
                </div>
              </Field>
              <Field label="Badge réduction (ex: -50%)">
                <input value={editing.discount_label ?? ''} onChange={e => setEditing(p => ({ ...p, discount_label: e.target.value }))} className="input-base" />
              </Field>
              <Field label="Texte du bouton">
                <input value={editing.button_label ?? ''} onChange={e => setEditing(p => ({ ...p, button_label: e.target.value }))} className="input-base" />
              </Field>
              <Field label="Lien (ex: /store/nike/)">
                <input value={editing.link_url ?? ''} onChange={e => setEditing(p => ({ ...p, link_url: e.target.value }))} className="input-base" />
              </Field>
              <Field label="Ordre d'affichage">
                <input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="input-base" />
              </Field>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
                {tr.active}
              </label>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closePanel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">{tr.cancel}</button>
              <button onClick={handleSave} disabled={saving || !editing.title || !editing.subtitle} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
                {saving ? '...' : tr.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ stats, setStats }: { stats: SiteStat[]; setStats: (fn: (prev: SiteStat[]) => SiteStat[]) => void }) {
  const { tr } = useLang()
  const [savingKey, setSavingKey] = useState<string | null>(null)

  async function handleSave(stat: SiteStat) {
    setSavingKey(stat.key)
    const { error } = await updateSiteStat(stat.key, stat.label, stat.value)
    if (error) alert(error)
    setSavingKey(null)
  }

  function updateLocal(key: string, field: 'label' | 'value', val: string) {
    setStats(prev => prev.map(s => s.key === key ? { ...s, [field]: val } : s))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {stats.map(stat => (
        <div key={stat.key} className="p-5 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-gray-600">Libellé</label>
            <input value={stat.label} onChange={e => updateLocal(stat.key, 'label', e.target.value)} className="input-base" />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-gray-600">Valeur affichée</label>
            <input value={stat.value} onChange={e => updateLocal(stat.key, 'value', e.target.value)} className="input-base font-mono" />
          </div>
          <button onClick={() => handleSave(stat)} disabled={savingKey === stat.key} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 shrink-0">
            <Save className="h-4 w-4" /> {savingKey === stat.key ? '...' : tr.save}
          </button>
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}
