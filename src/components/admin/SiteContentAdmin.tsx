'use client'
import { useState, useRef } from 'react'
import { useLang } from './LangContext'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react'
import type { HeroSlide, SiteStat } from '@/app/actions/site-content'
import {
  upsertHeroSlide, deleteHeroSlide, uploadHeroImage, updateSiteStat,
} from '@/app/actions/site-content'

const EMPTY_SLIDE: Partial<HeroSlide> = {
  title: '', subtitle: '', description: '', tag: '', discount_label: '',
  button_label: 'Voir l\'offre', link_url: '/', color_theme: 'sky',
  sort_order: 0, is_active: true,
}

export function SiteContentAdmin({ initialSlides, initialStats }: { initialSlides: HeroSlide[]; initialStats: SiteStat[] }) {
  const { tr } = useLang()
  const [tab, setTab] = useState<'slides' | 'stats'>('slides')
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides)
  const [stats, setStats]   = useState<SiteStat[]>(initialStats)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy">{tr.siteContent}</h1>

      <div className="flex border-b border-gray-200">
        <button onClick={() => setTab('slides')} className={`px-5 py-3 text-sm font-medium border-b-2 ${tab === 'slides' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
          {tr.heroSlides}
        </button>
        <button onClick={() => setTab('stats')} className={`px-5 py-3 text-sm font-medium border-b-2 ${tab === 'stats' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
          {tr.siteStats}
        </button>
      </div>

      {tab === 'slides' ? <SlidesTab slides={slides} setSlides={setSlides} /> : <StatsTab stats={stats} setStats={setStats} />}
    </div>
  )
}

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
