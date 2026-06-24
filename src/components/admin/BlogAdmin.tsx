'use client'
import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react'
import { upsertBlogPost, deleteBlogPost } from '@/app/actions/blog'
import type { BlogPost } from '@/app/actions/blog'
import { formatDate } from '@/lib/utils'

interface Props { initialPosts: BlogPost[] }

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const EMPTY: Partial<BlogPost> = {
  title: '', slug: '', excerpt: '', content: '', cover_image_url: '',
  author: 'Admin', category: 'Conseils', tags: [], is_published: false, published_at: null,
}

export function BlogAdmin({ initialPosts }: Props) {
  const [isPending, startTransition] = useTransition()
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<BlogPost>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [tagsInput, setTagsInput] = useState('')

  function openNew() {
    setEditing(EMPTY); setTagsInput(''); setSaveError(null); setPanelOpen(true)
  }
  function openEdit(p: BlogPost) {
    setEditing({ ...p }); setTagsInput((p.tags ?? []).join(', ')); setSaveError(null); setPanelOpen(true)
  }
  function closePanel() {
    setPanelOpen(false); setEditing(EMPTY); setSaveError(null)
  }

  async function handleSave() {
    if (!editing.title || !editing.slug) return
    setSaving(true); setSaveError(null)
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      const payload = {
        ...editing,
        title: editing.title!,
        slug: editing.slug!,
        tags,
        published_at: editing.is_published && !editing.published_at ? new Date().toISOString() : editing.published_at ?? null,
      }
      const { data, error } = await upsertBlogPost(payload as Parameters<typeof upsertBlogPost>[0])
      if (error) { setSaveError(error); return }
      if (data) {
        setPosts(prev => editing.id
          ? prev.map(p => p.id === data.id ? data : p)
          : [data, ...prev]
        )
      }
      closePanel()
    } finally { setSaving(false) }
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cet article ?')) return
    startTransition(async () => {
      const { error } = await deleteBlogPost(id)
      if (!error) setPosts(prev => prev.filter(p => p.id !== id))
    })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Blog</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nouvel article
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Titre</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Catégorie</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.map(post => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-navy max-w-[260px] truncate">{post.title}</td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{post.category}</td>
                <td className="px-4 py-3 text-center">
                  {post.is_published
                    ? <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full"><Eye className="h-3 w-3" />Publié</span>
                    : <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full"><EyeOff className="h-3 w-3" />Brouillon</span>
                  }
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                  {formatDate(post.published_at ?? post.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(post)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(post.id)} disabled={isPending} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && <p className="text-center text-gray-400 py-8">Aucun article. Créez le premier !</p>}
      </div>

      {/* Side panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <div className="flex-1 bg-black/40" onClick={closePanel} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-navy">{editing.id ? 'Modifier l\'article' : 'Nouvel article'}</h2>
              <button onClick={closePanel}><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{saveError}</div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Titre *</label>
                <input
                  value={editing.title ?? ''}
                  onChange={e => setEditing(p => ({ ...p, title: e.target.value, slug: editing.id ? p.slug : slugify(e.target.value) }))}
                  className="input-base" autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Slug *</label>
                <input
                  value={editing.slug ?? ''}
                  onChange={e => setEditing(p => ({ ...p, slug: e.target.value }))}
                  className="input-base font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Extrait</label>
                <textarea
                  value={editing.excerpt ?? ''}
                  onChange={e => setEditing(p => ({ ...p, excerpt: e.target.value }))}
                  rows={2}
                  className="input-base resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Contenu</label>
                <textarea
                  value={editing.content ?? ''}
                  onChange={e => setEditing(p => ({ ...p, content: e.target.value }))}
                  rows={10}
                  className="input-base resize-y"
                  placeholder="Texte ou HTML..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Image de couverture (URL)</label>
                <input
                  value={editing.cover_image_url ?? ''}
                  onChange={e => setEditing(p => ({ ...p, cover_image_url: e.target.value }))}
                  className="input-base"
                  placeholder="https://..."
                />
                {editing.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editing.cover_image_url} alt="" className="mt-2 rounded-lg w-full object-cover" style={{ maxHeight: 100 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Auteur</label>
                  <input value={editing.author ?? ''} onChange={e => setEditing(p => ({ ...p, author: e.target.value }))} className="input-base" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Catégorie</label>
                  <select value={editing.category ?? 'Conseils'} onChange={e => setEditing(p => ({ ...p, category: e.target.value }))} className="input-base">
                    <option>Conseils</option>
                    <option>Bons Plans</option>
                    <option>Guides</option>
                    <option>Actualités</option>
                    <option>Boutiques</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Tags (séparés par des virgules)</label>
                <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="input-base" placeholder="promo, réduction, économie" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Date de publication</label>
                <input
                  type="datetime-local"
                  value={editing.published_at ? editing.published_at.slice(0, 16) : ''}
                  onChange={e => setEditing(p => ({ ...p, published_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                  className="input-base"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={editing.is_published ?? false}
                  onChange={e => setEditing(p => ({ ...p, is_published: e.target.checked }))}
                  className="rounded accent-green-600 w-4 h-4"
                />
                <div>
                  <span className="text-sm font-semibold text-green-800">Publier l&apos;article</span>
                  <p className="text-xs text-green-600 mt-0.5">L&apos;article sera visible sur le blog</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closePanel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">Annuler</button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.title || !editing.slug}
                className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
