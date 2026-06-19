'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function HeroSearch() {
  const [q, setQ] = useState('')
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) router.push(`/recherche?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <form onSubmit={submit} className="flex items-center bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto">
      <Search className="ml-5 h-5 w-5 text-gray-400 shrink-0" />
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Rechercher une boutique ou un code promo..."
        className="flex-1 px-4 py-4 text-gray-800 placeholder-gray-400 outline-none text-base bg-transparent"
      />
      <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-4 transition-colors shrink-0">
        Rechercher
      </button>
    </form>
  )
}
