'use client'
import { useState, useMemo, useTransition } from 'react'
import { useLang } from './LangContext'
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { upsertCoupon, deleteCoupon, toggleCouponActive, bulkDeactivateCoupons, bulkDeleteCoupons } from '@/app/actions/coupons'

interface CouponRow {
  id: string; wp_post_id: number; store_id: string; title: string; slug: string | null
  code: string | null; type: string | null; discount_value: string | null
  destination_url: string | null; expiry_date: string | null
  is_free_shipping: boolean; is_active: boolean; is_featured: boolean; click_count: number; created_at: string
  store?: { id: string; name: string; slug: string; logo_url: string | null } | null
}
interface StoreOpt { id: string; name: string; slug: string }

const EMPTY_COUPON = {
  title: '', store_id: '', code: '', type: 'code', discount_value: '',
  destination_url: '', expiry_date: '', is_free_shipping: false, is_active: true, is_featured: false,
}

export function CouponsAdmin({ initialCoupons, stores }: { initialCoupons: CouponRow[]; stores: StoreOpt[] }) {
  const { tr } = useLang()
  const [isPending, startTransition] = useTransition()

  const [coupons, setCoupons]   = useState<CouponRow[]>(initialCoupons)
  const [search, setSearch]     = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterExpiry, setFilterExpiry] = useState('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing]   = useState<Partial<CouponRow> & { store_id?: string }>(EMPTY_COUPON)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [storeSearch, setStoreSearch] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const filtered = useMemo(() => {
    return coupons.filter(c => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
          !(c.code ?? '').toLowerCase().includes(search.toLowerCase())) return false
      if (filterStore && c.store_id !== filterStore) return false
      if (filterStatus === 'active' && !c.is_active) return false
      if (filterStatus === 'inactive' && c.is_active) return false
      if (filterStatus === 'flagged' && !(c as CouponRow & { is_flagged?: boolean }).is_flagged) return false
      if (filterExpiry === 'expired' && (!c.expiry_date || c.expiry_date >= today)) return false
      if (filterExpiry === 'valid' && c.expiry_date && c.expiry_date < today) return false
      return true
    })
  }, [coupons, search, filterStore, filterStatus, filterExpiry, today])

  const filteredStores = useMemo(() =>
    stores.filter(s => s.name.toLowerCase().includes(storeSearch.toLowerCase())),
    [stores, storeSearch]
  )

  function openNew()      { setEditing({ ...EMPTY_COUPON }); setSaveError(null); setPanelOpen(true) }
  function openEdit(c: CouponRow) { setEditing({ ...c, store_id: c.store_id }); setSaveError(null); setPanelOpen(true) }
  function closePanel()   { setPanelOpen(false); setEditing(EMPTY_COUPON); setSaveError(null) }

  async function handleSave() {
    if (!editing.title || !editing.store_id) return
    setSaving(true); setSaveError(null)
    try {
      const payload = {
        id:              editing.id,
        title:           editing.title!,
        store_id:        editing.store_id!,
        code:            editing.code            || null,
        type:            editing.type            || null,
        discount_value:  editing.discount_value  || null,
        destination_url: editing.destination_url || null,
        expiry_date:     editing.expiry_date     || null,
        is_free_shipping: editing.is_free_shipping ?? false,
        is_active:       editing.is_active       ?? true,
        is_featured:     (editing as Partial<CouponRow>).is_featured ?? false,
      }
      const { data, error } = await upsertCoupon(payload)
      if (error) { setSaveError(error); return }
      if (data) {
        setCoupons(prev =>
          editing.id ? prev.map(c => c.id === data.id ? (data as CouponRow) : c) : [data as CouponRow, ...prev]
        )
      }
      closePanel()
    } finally { setSaving(false) }
  }

  function handleDelete(id: string) {
    if (!confirm(tr.deleteConfirm)) return
    startTransition(async () => {
      const { error } = await deleteCoupon(id)
      if (!error) {
        setCoupons(prev => prev.filter(c => c.id !== id))
        setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
      }
    })
  }

  function handleToggleActive(c: CouponRow) {
    const newVal = !c.is_active
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_active: newVal } : x))
    startTransition(async () => {
      const { error } = await toggleCouponActive(c.id, newVal)
      if (error) setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !newVal } : x))
    })
  }

  function bulkDeactivate() {
    const ids = Array.from(selected)
    setCoupons(prev => prev.map(c => ids.includes(c.id) ? { ...c, is_active: false } : c))
    setSelected(new Set())
    startTransition(async () => { await bulkDeactivateCoupons(ids) })
  }

  function bulkDelete() {
    if (!confirm(tr.deleteConfirm)) return
    const ids = Array.from(selected)
    setCoupons(prev => prev.filter(c => !ids.includes(c.id)))
    setSelected(new Set())
    startTransition(async () => { await bulkDeleteCoupons(ids) })
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n })
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(c => c.id)))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">{tr.coupons}</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90">
          <Plus className="h-4 w-4" /> {tr.add}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr.search}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">{tr.allStatus} ({tr.store})</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="all">{tr.allStatus}</option>
          <option value="active">{tr.active}</option>
          <option value="inactive">{tr.inactive}</option>
          <option value="flagged">{tr.flaggedOnly}</option>
        </select>
        <select value={filterExpiry} onChange={e => setFilterExpiry(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="all">{tr.allStatus}</option>
          <option value="valid">{tr.notExpired}</option>
          <option value="expired">{tr.expired}</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 text-sm">
          <span className="text-blue-700 font-medium">{selected.size} sélectionné(s)</span>
          <button onClick={bulkDeactivate} className="text-orange-600 hover:underline">{tr.bulkDeactivate}</button>
          <button onClick={bulkDelete} className="text-red-600 hover:underline">{tr.bulkDelete}</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll} className="rounded" />
              </th>
              <th className="px-4 py-3 text-left">{tr.title}</th>
              <th className="px-4 py-3 text-left">{tr.store}</th>
              <th className="px-4 py-3 text-left">{tr.code}</th>
              <th className="px-4 py-3 text-left">{tr.type}</th>
              <th className="px-4 py-3 text-left">{tr.discount}</th>
              <th className="px-4 py-3 text-left">{tr.expiry}</th>
              <th className="px-4 py-3 text-center">{tr.active}</th>
              <th className="px-4 py-3 text-right">{tr.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.slice(0, 200).map(c => (
              <tr key={c.id} className={`hover:bg-gray-50 ${selected.has(c.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                </td>
                <td className="px-4 py-2 max-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    {c.is_featured && <span title="Coupon vedette" className="text-amber-500 text-xs">⭐</span>}
                    <p className="font-medium text-navy truncate">{c.title}</p>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">{(c.store as { name: string } | null)?.name ?? '—'}</td>
                <td className="px-4 py-2">
                  {c.code && <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.code}</span>}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{c.type}</td>
                <td className="px-4 py-2 text-xs font-semibold text-primary">{c.discount_value}</td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {c.expiry_date ? (
                    <span className={c.expiry_date < today ? 'text-red-500' : ''}>{formatDate(c.expiry_date)}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-2 text-center">
                  <Toggle value={c.is_active} onChange={() => handleToggleActive(c)} />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.id)} disabled={isPending} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">{tr.noData}</p>}
        {filtered.length > 200 && (
          <p className="text-center text-xs text-gray-400 py-3">Affichage des 200 premiers sur {filtered.length} résultats. Affinez les filtres.</p>
        )}
      </div>

      {/* Side panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closePanel} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-navy">{editing.id ? tr.edit : tr.add} coupon</h2>
              <button onClick={closePanel}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                  {saveError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{tr.title} *</label>
                <input value={editing.title ?? ''} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className="input-base" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{tr.store} *</label>
                <input value={storeSearch} onChange={e => setStoreSearch(e.target.value)} placeholder={tr.searchStore} className="input-base mb-1" />
                <select value={editing.store_id ?? ''} onChange={e => setEditing(p => ({ ...p, store_id: e.target.value }))}
                  className="input-base" size={4}>
                  {filteredStores.slice(0, 50).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{tr.code}</label>
                <input value={editing.code ?? ''} onChange={e => setEditing(p => ({ ...p, code: e.target.value }))} className="input-base font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{tr.type}</label>
                  <select value={editing.type ?? 'code'} onChange={e => setEditing(p => ({ ...p, type: e.target.value }))} className="input-base">
                    <option value="code">Code</option>
                    <option value="deal">Deal</option>
                    <option value="free_shipping">Livraison gratuite</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{tr.discount}</label>
                  <input value={editing.discount_value ?? ''} onChange={e => setEditing(p => ({ ...p, discount_value: e.target.value }))} placeholder="ex: 20%" className="input-base" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{tr.destinationUrl}</label>
                <input value={editing.destination_url ?? ''} onChange={e => setEditing(p => ({ ...p, destination_url: e.target.value }))} className="input-base" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{tr.expiry}</label>
                <input type="date" value={editing.expiry_date ?? ''} onChange={e => setEditing(p => ({ ...p, expiry_date: e.target.value }))} className="input-base" />
              </div>
              <div className="flex gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editing.is_free_shipping ?? false} onChange={e => setEditing(p => ({ ...p, is_free_shipping: e.target.checked }))} className="rounded" />
                  {tr.freeShipping}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
                  {tr.active}
                </label>
              </div>
              {/* Featured coupon — shown first on store page */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(editing as Partial<CouponRow>).is_featured ?? false}
                    onChange={e => setEditing(p => ({ ...p, is_featured: e.target.checked }))}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-semibold text-amber-800">⭐ Coupon vedette</span>
                    <p className="text-xs text-amber-600 mt-0.5">Ce coupon apparaîtra en première position sur la page de la boutique</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closePanel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">{tr.cancel}</button>
              <button onClick={handleSave} disabled={saving || !editing.title || !editing.store_id}
                className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                {saving ? '...' : tr.save}
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
    <button onClick={onChange} className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-green-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}
