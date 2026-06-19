'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Search, Menu, X, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CategoryLink { name: string; slug: string }
interface TopStore { name: string; slug: string; coupon_count: number }

interface Props {
  categories: CategoryLink[]
  topStores: TopStore[]
}

export function Header({ categories, topStores }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/recherche?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="bg-navy/85 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-1 shrink-0 font-extrabold text-xl tracking-tight">
              <span className="text-white">codepromo</span>
              <span className="text-primary">reduc</span>
            </Link>

            {/* Mega menu */}
            <nav className="hidden md:flex items-center gap-6 text-xs tracking-wide uppercase font-bold text-white/70">
              <div className="relative group py-2">
                <button className="flex items-center gap-1.5 hover:text-white transition-colors text-white">
                  Trouver des offres <ChevronDown className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute top-full left-0 pt-3 hidden group-hover:block z-50">
                  <div className="w-[480px] bg-navy border border-white/10 rounded-2xl shadow-2xl p-6 flex gap-6 backdrop-blur-2xl">
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-primary mb-3">Catégories</h4>
                      <ul className="space-y-2 text-xs text-white/60 font-semibold normal-case">
                        {categories.map(c => (
                          <li key={c.slug}>
                            <Link href={`/coupon-category/${c.slug}/`} className="hover:text-primary transition-colors block py-0.5">{c.name}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex-1 border-l border-white/10 pl-6">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-success mb-3">Boutiques populaires</h4>
                      <ul className="space-y-2 text-xs text-white/60 font-semibold normal-case">
                        {topStores.map(s => (
                          <li key={s.slug}>
                            <Link href={`/store/${s.slug}/`} className="hover:text-primary transition-colors block py-0.5 flex items-center justify-between">
                              <span>{s.name}</span>
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{s.coupon_count} codes</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <Link href="/all-stores/" className="hover:text-white transition-colors">Toutes les boutiques</Link>
            </nav>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full overflow-hidden w-64 focus-within:border-primary/40 transition-colors">
            <Search className="h-4 w-4 text-white/40 ml-4 shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="bg-transparent text-white placeholder-white/30 px-3 py-2 text-sm flex-1 outline-none"
            />
          </form>

          {/* Mobile menu button */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 space-y-3">
            <form onSubmit={handleSearch} className="flex items-center bg-white/5 border border-white/10 rounded-full overflow-hidden">
              <Search className="h-4 w-4 text-white/40 ml-4 shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher une boutique..."
                className="bg-transparent text-white placeholder-white/30 px-3 py-2 text-sm flex-1 outline-none"
              />
            </form>
            <div className="flex flex-col gap-2 text-sm text-white/70">
              <Link href="/all-stores/" onClick={() => setOpen(false)} className="py-2 hover:text-primary">Boutiques</Link>
              <Link href="/#categories" onClick={() => setOpen(false)} className="py-2 hover:text-primary">Catégories</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
