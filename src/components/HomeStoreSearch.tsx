'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store } from '@/lib/types'

interface Props { stores: Store[] }

export function HomeStoreSearch({ stores }: Props) {
  const [q, setQ] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) router.push(`/recherche?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="w-full max-w-xl px-4 mt-5 sm:mt-6">
      <form
        onSubmit={handleSubmit}
        className="w-full flex items-center"
        style={{ padding:'6px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.14)', borderRadius:'999px', boxShadow:'0 24px 60px -20px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-[17px] sm:h-[17px] mx-2 sm:mx-3 flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Rechercher une boutique…"
          className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-white/40 font-medium py-2.5"
        />
        <button
          type="submit"
          className="flex-shrink-0 font-black text-xs rounded-full"
          style={{ padding:'9px 14px', background:'rgba(56,189,248,.12)', color:'#e0f7ff', border:'1px solid rgba(56,189,248,.38)', backdropFilter:'blur(20px)', cursor:'pointer', transition:'all 300ms', whiteSpace:'nowrap' }}
        >
          <span className="hidden sm:inline">Trouver les offres</span>
          <span className="sm:hidden">Chercher</span>
        </button>
      </form>

      {/* Popular links */}
      {stores.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs font-semibold" style={{ color:'rgba(255,255,255,.45)' }}>
          <span style={{ color:'rgba(255,255,255,.3)' }}>Populaire :</span>
          {stores.slice(0, 5).map(s => (
            <Link key={s.id} href={`/store/${s.slug}/`} className="hover:text-cyan-300 transition-colors" style={{ color:'rgba(255,255,255,.55)' }}>
              {s.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
