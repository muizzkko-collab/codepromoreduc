'use client'
import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Menu, X, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LogoNav } from '@/components/Logo'

interface CategoryLink { name: string; slug: string }
interface TopStore { name: string; slug: string; coupon_count: number }
interface StoreResult { name: string; slug: string; logo_url: string | null; coupon_count: number }

interface Props {
  categories: CategoryLink[]
  topStores: TopStore[]
}

function SearchBar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<StoreResult[]>([])
  const [open, setOpen]       = useState(false)
  const [active, setActive]   = useState(-1)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const router                = useRouter()
  const timer                 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef               = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const updatePos = useCallback(() => {
    if (!wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: r.width })
  }, [])

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current)
    if (q.length < 1) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/store-search?q=${encodeURIComponent(q)}`)
        const data: StoreResult[] = await res.json()
        setResults(data)
        if (data.length > 0) { updatePos(); setOpen(true) } else { setOpen(false) }
        setActive(-1)
      } catch { /* ignore */ }
    }, 180)
  }, [updatePos])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    search(e.target.value)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOpen(false)
    if (active >= 0 && results[active]) {
      router.push(`/store/${results[active].slug}/`)
      setQuery('')
    } else if (query.trim()) {
      router.push(`/recherche?q=${encodeURIComponent(query.trim())}`)
    }
    onNavigate?.()
  }

  function pickStore(slug: string) {
    setOpen(false)
    setQuery('')
    router.push(`/store/${slug}/`)
    onNavigate?.()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, -1)) }
    if (e.key === 'Escape')    { setOpen(false); setActive(-1) }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const dropdown = mounted && open && results.length > 0 && dropPos ? createPortal(
    <div
      style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
      className="bg-[#0d1e35] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
    >
      {results.map((store, i) => (
        <button
          key={store.slug}
          onMouseDown={e => { e.preventDefault(); pickStore(store.slug) }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo_url} alt="" className="w-7 h-7 object-contain rounded bg-white/10 p-0.5 shrink-0" />
          ) : (
            <span className="w-7 h-7 rounded bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center shrink-0">
              {store.name[0].toUpperCase()}
            </span>
          )}
          <span className="flex-1 text-sm text-white font-medium truncate">{store.name}</span>
          {store.coupon_count > 0 && (
            <span className="text-[10px] text-sky-400/70 shrink-0">{store.coupon_count} codes</span>
          )}
        </button>
      ))}
      <div className="border-t border-white/5 px-4 py-2">
        <button
          onMouseDown={e => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent) }}
          className="text-xs text-white/40 hover:text-sky-400 transition-colors"
        >
          Voir tous les résultats pour &ldquo;{query}&rdquo; →
        </button>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div ref={wrapRef} className={`relative ${className ?? ''}`}>
      <form onSubmit={handleSubmit} className="flex items-center bg-white/5 border border-white/10 rounded-full focus-within:border-sky-400/40 transition-colors" style={{ overflow: 'visible' }}>
        <Search className="h-4 w-4 text-white/40 ml-4 shrink-0" />
        <input
          value={query}
          onChange={handleChange}
          onKeyDown={handleKey}
          onFocus={() => { if (query && results.length) { updatePos(); setOpen(true) } }}
          placeholder="Rechercher une boutique..."
          autoComplete="off"
          className="bg-transparent text-white placeholder-white/30 px-3 py-2 text-sm flex-1 outline-none"
        />
      </form>
      {dropdown}
    </div>
  )
}

export function Header({ categories, topStores }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-navy/85 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="shrink-0 flex items-center" aria-label="Codepromoreduc — Accueil">
              <LogoNav width={220} />
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

          {/* Desktop search */}
          <SearchBar className="hidden md:block w-72" />

          {/* Mobile menu button */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 space-y-3">
            <SearchBar onNavigate={() => setOpen(false)} />
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
