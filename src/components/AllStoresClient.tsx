'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Store, Category } from '@/lib/types'
import { StoreLogo } from './StoreLogo'
import { Tag } from 'lucide-react'

interface Props {
  stores: Store[]
  categories: Category[]
  alphabet: string[]
}

export function AllStoresClient({ stores, categories, alphabet }: Props) {
  const [filter, setFilter] = useState('')
  const [catFilter, setCatFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter && !catFilter) return stores
    return stores.filter(s => {
      const matchName = !filter || s.name.toLowerCase().includes(filter.toLowerCase())
      return matchName
    })
  }, [stores, filter, catFilter])

  const filteredByLetter = useMemo(() => {
    const map: Record<string, Store[]> = {}
    for (const s of filtered) {
      const l = s.name[0]?.toUpperCase() || '#'
      ;(map[l] = map[l] || []).push(s)
    }
    return map
  }, [filtered])

  return (
    <>
      {/* Filter bar */}
      <div className="bg-section rounded-xl p-4 flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filtrer par nom de boutique..."
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm flex-1 outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Letter nav */}
      <div className="flex flex-wrap gap-1 mb-6">
        {alphabet.map(l => (
          <a key={l} href={`#az-${l}`}
            className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${filteredByLetter[l] ? 'bg-navy text-white hover:bg-primary' : 'bg-gray-100 text-gray-400 cursor-default'}`}>
            {l}
          </a>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Aucune boutique trouvée.</p>
      ) : (
        <div className="space-y-8">
          {alphabet.filter(l => filteredByLetter[l]).map(l => (
            <div key={l} id={`az-${l}`}>
              <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">{l}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredByLetter[l].map(s => (
                  <Link key={s.id} href={`/store/${s.slug}/`}
                    className="group bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-2 hover:shadow-md hover:border-primary/40 transition-all">
                    <StoreLogo src={s.logo_url} name={s.name} size="sm" />
                    <p className="text-xs font-semibold text-navy text-center group-hover:text-primary transition-colors line-clamp-2">{s.name}</p>
                    {s.coupon_count > 0 && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Tag className="h-3 w-3" />{s.coupon_count}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
