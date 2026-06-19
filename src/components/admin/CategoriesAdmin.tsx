'use client'
import { useState } from 'react'
import { useLang } from './LangContext'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { addCategory, renameCategory, deleteCategory } from '@/app/actions/categories'

interface Category { id: string; name: string; slug: string; store_count: number }

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function CategoriesAdmin({ initialCategories }: { initialCategories: Category[] }) {
  const { tr } = useLang()

  const [cats, setCats]         = useState<Category[]>(initialCategories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName]   = useState('')
  const [adding, setAdding]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true); setErrorMsg(null)
    const { data, error } = await addCategory(newName.trim(), slugify(newName.trim()))
    if (error) { setErrorMsg(error); setSaving(false); return }
    if (data) setCats(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName(''); setAdding(false); setSaving(false)
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    setSaving(true); setErrorMsg(null)
    const { error } = await renameCategory(id, editName.trim(), slugify(editName.trim()))
    if (error) { setErrorMsg(error); setSaving(false); return }
    setCats(prev => prev.map(c => c.id === id ? { ...c, name: editName.trim(), slug: slugify(editName.trim()) } : c))
    setEditingId(null); setSaving(false)
  }

  async function handleDelete(cat: Category) {
    if (cat.store_count > 0) {
      alert(`Impossible : ${cat.store_count} boutique(s) utilisent cette catégorie.`)
      return
    }
    if (!confirm(tr.deleteConfirm)) return
    const { error } = await deleteCategory(cat.id)
    if (error) { setErrorMsg(error); return }
    setCats(prev => prev.filter(c => c.id !== cat.id))
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">{tr.categories}</h1>
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90">
          <Plus className="h-4 w-4" /> {tr.add}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}

      {adding && (
        <div className="flex gap-2 mb-4">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Nom de la catégorie" className="input-base flex-1" />
          <button onClick={handleAdd} disabled={saving} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => { setAdding(false); setNewName('') }} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {cats.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
            {editingId === cat.id ? (
              <>
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(cat.id); if (e.key === 'Escape') setEditingId(null) }}
                  className="input-base flex-1" />
                <button onClick={() => handleRename(cat.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="font-medium text-navy text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-400">{cat.slug} · {cat.store_count} boutique{cat.store_count !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                  className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(cat)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ))}
        {cats.length === 0 && <p className="text-center text-gray-400 py-8">{tr.noData}</p>}
      </div>
    </div>
  )
}
