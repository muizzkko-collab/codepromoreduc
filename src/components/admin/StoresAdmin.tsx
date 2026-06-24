'use client'
import { useState, useMemo, useRef, useTransition, useEffect } from 'react'
import { useLang } from './LangContext'
import { StoreLogo } from '@/components/StoreLogo'
import { Plus, Pencil, Trash2, X, Search, ChevronLeft, ChevronRight, Link, RefreshCw, ExternalLink } from 'lucide-react'
import { upsertStore, deleteStore, toggleStoreField, uploadStoreLogo } from '@/app/actions/stores'
import { updateStore } from '@/app/actions/update-store'

interface Store {
  id: string; name: string; slug: string; logo_url: string | null
  affiliate_url: string | null; meta_title: string | null; meta_description: string | null
  coupon_count: number; is_featured: boolean; is_active: boolean; click_count: number
  popup_banner_url: string | null; awin_merchant_id?: number | null
}

interface AwinResult {
  awin_id: number; name: string; logo_url: string | null
  affiliate_url: string | null; display_url: string | null
}

interface Props { initialStores: Store[] }

const PAGE_SIZE = 50

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const EMPTY: Partial<Store> = { name: '', slug: '', affiliate_url: '', meta_title: '', meta_description: '', is_featured: false, is_active: true, popup_banner_url: '', awin_merchant_id: null }

export function StoresAdmin({ initialStores }: Props) {
  const { tr } = useLang()
  const [isPending, startTransition] = useTransition()

  const [stores, setStores]             = useState<Store[]>(initialStores)
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(0)
  const [panelOpen, setPanelOpen]       = useState(false)
  const [editing, setEditing]           = useState<Partial<Store> & { id?: string }>(EMPTY)
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)
  const [logoFile, setLogoFile]         = useState<File | null>(null)
  const fileRef                         = useRef<HTMLInputElement>(null)
  const [updatingId, setUpdatingId]     = useState<string | null>(null)
  const [updateToast, setUpdateToast]   = useState<{ msg: string; ok: boolean } | null>(null)

  // Awin search state (for new stores)
  const [awinQuery, setAwinQuery]       = useState('')
  const [awinResults, setAwinResults]   = useState<AwinResult[]>([])
  const [awinLoading, setAwinLoading]   = useState(false)
  const [awinConfirmed, setAwinConfirmed] = useState<AwinResult | null>(null)
  const awinTimer                       = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!awinQuery || awinQuery.length < 2) { setAwinResults([]); return }
    if (awinTimer.current) clearTimeout(awinTimer.current)
    awinTimer.current = setTimeout(async () => {
      setAwinLoading(true)
      try {
        const res = await fetch('/api/admin/awin-search?q=' + encodeURIComponent(awinQuery))
        const json = await res.json()
        setAwinResults(json.results ?? [])
      } catch { setAwinResults([]) }
      finally { setAwinLoading(false) }
    }, 400)
  }, [awinQuery])

  function confirmAwin(r: AwinResult) {
    setAwinConfirmed(r)
    setAwinResults([])
    setAwinQuery(r.name)
    // Pre-fill affiliate URL and logo if empty
    setEditing(p => ({
      ...p,
      awin_merchant_id: r.awin_id,
      affiliate_url: p.affiliate_url || r.affiliate_url || '',
      logo_url: p.logo_url || r.logo_url || null,
    }))
  }

  function clearAwin() {
    setAwinConfirmed(null)
    setAwinQuery('')
    setAwinResults([])
    setEditing(p => ({ ...p, awin_merchant_id: null }))
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? stores.filter(s => s.name.toLowerCase().includes(q) || s.slug.includes(q))
      : stores
  }, [stores, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageStores = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function openNew()    { setEditing(EMPTY); setLogoFile(null); setSaveError(null); setAwinQuery(''); setAwinConfirmed(null); setAwinResults([]); setPanelOpen(true) }
  function openEdit(s: Store) { setEditing({ ...s }); setLogoFile(null); setSaveError(null); setAwinQuery(s.awin_merchant_id ? '(lié — ID '+s.awin_merchant_id+')' : ''); setAwinConfirmed(null); setAwinResults([]); setPanelOpen(true) }
  function closePanel() { setPanelOpen(false); setEditing(EMPTY); setSaveError(null); setAwinQuery(''); setAwinConfirmed(null); setAwinResults([]) }

  function handleSearch(q: string) { setSearch(q); setPage(0) }

  async function handleSave() {
    if (!editing.name || !editing.slug) return
    setSaving(true); setSaveError(null)
    try {
      const payload = {
        id:                editing.id,
        name:              editing.name!,
        slug:              editing.slug!,
        affiliate_url:     editing.affiliate_url || null,
        meta_title:        editing.meta_title    || null,
        meta_description:  editing.meta_description || null,
        is_featured:       editing.is_featured ?? false,
        is_active:         editing.is_active    ?? true,
        logo_url:          editing.logo_url ?? null,
        popup_banner_url:  editing.popup_banner_url || null,
        awin_merchant_id:  editing.awin_merchant_id ?? null,
      }

      // Upload logo first if a new file was chosen
      if (logoFile) {
        const storeId = editing.id ?? 'temp-' + Date.now()
        const formData = new FormData()
        formData.append('logo', logoFile)
        const { url, error: uploadErr } = await uploadStoreLogo(storeId, formData)
        if (uploadErr) { setSaveError(`Logo upload failed: ${uploadErr}`); return }
        payload.logo_url = url
      }

      const { data, error } = await upsertStore(payload)
      if (error) { setSaveError(error); return }
      if (data) {
        setStores(prev =>
          editing.id
            ? prev.map(s => s.id === data.id ? (data as Store) : s)
            : [...prev, data as Store]
        )
      }
      closePanel()
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(store: Store) {
    setUpdatingId(store.id)
    setUpdateToast(null)
    try {
      const { data, error } = await updateStore(store.id)
      if (error) {
        setUpdateToast({ msg: `Error: ${error}`, ok: false })
      } else if (data) {
        setUpdateToast({ msg: `${store.name}: ${data.message} (via ${data.method})`, ok: true })
        // Update local coupon count
        if (data.added > 0) {
          setStores(prev => prev.map(s => s.id === store.id ? { ...s, coupon_count: s.coupon_count + data.added } : s))
        }
      }
    } catch (e: unknown) {
      setUpdateToast({ msg: `Error: ${(e as Error).message}`, ok: false })
    } finally {
      setUpdatingId(null)
      setTimeout(() => setUpdateToast(null), 6000)
    }
  }

  function handleDelete(id: string) {
    if (!confirm(tr.deleteConfirm)) return
    startTransition(async () => {
      const { error } = await deleteStore(id)
      if (!error) setStores(prev => prev.filter(s => s.id !== id))
    })
  }

  function handleToggle(s: Store, field: 'is_active' | 'is_featured') {
    const newVal = !s[field]
    setStores(prev => prev.map(x => x.id === s.id ? { ...x, [field]: newVal } : x))
    startTransition(async () => {
      const { error } = await toggleStoreField(s.id, field, newVal)
      if (error) setStores(prev => prev.map(x => x.id === s.id ? { ...x, [field]: !newVal } : x))
    })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">{tr.stores}</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> {tr.add}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder={tr.search}
          className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 mb-2">
        {filtered.length} {tr.storesFound} {search && `"${search}"`} — {tr.storesPage} {page + 1}/{Math.max(totalPages, 1)}
      </p>

      {/* Update toast */}
      {updateToast && (
        <div className={`text-sm px-4 py-2.5 rounded-lg font-medium ${updateToast.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {updateToast.msg}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">{tr.logo}</th>
              <th className="px-4 py-3 text-left">{tr.name}</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">{tr.slug}</th>
              <th className="px-4 py-3 text-center">{tr.couponCount}</th>
              <th className="px-4 py-3 text-center hidden lg:table-cell">{tr.featured}</th>
              <th className="px-4 py-3 text-center">{tr.active}</th>
              <th className="px-4 py-3 text-right">{tr.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageStores.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <StoreLogo src={s.logo_url} name={s.name} size="sm" />
                </td>
                <td className="px-4 py-2 font-medium text-navy">{s.name}</td>
                <td className="px-4 py-2 text-gray-400 text-xs hidden md:table-cell">{s.slug}</td>
                <td className="px-4 py-2 text-center">{s.coupon_count}</td>
                <td className="px-4 py-2 text-center hidden lg:table-cell">
                  <Toggle value={s.is_featured} onChange={() => handleToggle(s, 'is_featured')} />
                </td>
                <td className="px-4 py-2 text-center">
                  <Toggle value={s.is_active} onChange={() => handleToggle(s, 'is_active')} />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <a
                      href={`/store/${s.slug}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50"
                      title="View store page"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleUpdate(s)}
                      disabled={updatingId === s.id || isPending}
                      className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 disabled:opacity-40"
                      title="Update coupons"
                    >
                      <RefreshCw className={`h-4 w-4 ${updatingId === s.id ? 'animate-spin text-green-600' : ''}`} />
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100"
                      title={tr.edit}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={isPending}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"
                      title={tr.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageStores.length === 0 && <p className="text-center text-gray-400 py-8">{tr.noData}</p>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Side panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
          <div className="flex-1 bg-black/40" onClick={closePanel} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-navy">{editing.id ? tr.editStore : tr.addStore}</h2>
              <button onClick={closePanel} className="p-1 rounded hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                  {saveError}
                </div>
              )}

              {/* Awin advertiser link (new store only, or show existing link) */}
              {!editing.id ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold uppercase tracking-wide">
                    <Link className="h-3.5 w-3.5" />
                    {tr.linkAwin}
                  </div>

                  {awinConfirmed ? (
                    <div className="flex items-center gap-3 bg-white border border-green-200 rounded-lg px-3 py-2">
                      {awinConfirmed.logo_url && (
                        <img src={awinConfirmed.logo_url} alt="" className="h-6 w-6 object-contain" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-green-700">{awinConfirmed.name}</p>
                        <p className="text-xs text-gray-400">ID Awin: {awinConfirmed.awin_id}</p>
                      </div>
                      <button onClick={clearAwin} className="text-gray-400 hover:text-red-500 text-xs">{tr.remove}</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        value={awinQuery}
                        onChange={e => setAwinQuery(e.target.value)}
                        placeholder={tr.searchAwin}
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      {awinLoading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-400">…</span>
                      )}
                      {awinResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-blue-100 rounded-xl shadow-xl mt-1 max-h-56 overflow-y-auto">
                          {awinResults.map(r => (
                            <button
                              key={r.awin_id}
                              onClick={() => confirmAwin(r)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left border-b border-gray-100 last:border-0"
                            >
                              {r.logo_url
                                ? <img src={r.logo_url} alt="" className="h-5 w-5 object-contain flex-shrink-0" />
                                : <div className="h-5 w-5 bg-blue-100 rounded flex-shrink-0" />
                              }
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-navy truncate">{r.name}</p>
                                <p className="text-xs text-gray-400">{r.display_url ?? ''} · ID {r.awin_id}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-blue-500">{tr.linkAwinDesc}</p>
                </div>
              ) : editing.awin_merchant_id ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                  <Link className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 font-medium">{tr.linkedToAwin}</span>
                  <span className="text-gray-400 text-xs">(ID {editing.awin_merchant_id})</span>
                </div>
              ) : null}

              <Field label={tr.name} required>
                <input
                  value={editing.name ?? ''}
                  onChange={e => setEditing(p => ({ ...p, name: e.target.value, slug: editing.id ? p.slug : slugify(e.target.value) }))}
                  className="input-base"
                  autoFocus
                />
              </Field>
              <Field label={tr.slug} required>
                <input
                  value={editing.slug ?? ''}
                  onChange={e => setEditing(p => ({ ...p, slug: e.target.value }))}
                  className="input-base font-mono text-xs"
                />
              </Field>
              <Field label={tr.logo}>
                <div className="flex items-center gap-3">
                  {(editing.logo_url || logoFile) && (
                    <StoreLogo
                      src={logoFile ? URL.createObjectURL(logoFile) : (editing.logo_url ?? null)}
                      name={editing.name ?? ''}
                      size="sm"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  >
                    {logoFile ? logoFile.name : tr.chooseFile}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setLogoFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </Field>
              <Field label={tr.affiliateUrl}>
                <input
                  value={editing.affiliate_url ?? ''}
                  onChange={e => setEditing(p => ({ ...p, affiliate_url: e.target.value }))}
                  className="input-base"
                />
              </Field>
              <Field label={tr.metaTitle}>
                <input
                  value={editing.meta_title ?? ''}
                  onChange={e => setEditing(p => ({ ...p, meta_title: e.target.value }))}
                  className="input-base"
                />
              </Field>
              <Field label={tr.metaDesc}>
                <textarea
                  value={editing.meta_description ?? ''}
                  onChange={e => setEditing(p => ({ ...p, meta_description: e.target.value }))}
                  rows={3}
                  className="input-base resize-none"
                />
              </Field>
              <Field label={tr.bannerUrl}>
                <input
                  value={editing.popup_banner_url ?? ''}
                  onChange={e => setEditing(p => ({ ...p, popup_banner_url: e.target.value }))}
                  className="input-base"
                  placeholder={tr.bannerPlaceholder}
                />
                {editing.popup_banner_url && (
                  <img
                    src={editing.popup_banner_url}
                    alt={tr.bannerPreview}
                    className="mt-2 rounded-lg w-full object-cover"
                    style={{ maxHeight: 80 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </Field>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_featured ?? false}
                    onChange={e => setEditing(p => ({ ...p, is_featured: e.target.checked }))}
                    className="rounded"
                  />
                  {tr.featured}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? true}
                    onChange={e => setEditing(p => ({ ...p, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  {tr.active}
                </label>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closePanel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">
                {tr.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.name || !editing.slug}
                className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? tr.saving : tr.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-green-500' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}
