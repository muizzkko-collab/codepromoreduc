'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router      = useRouter()
  const params      = useSearchParams()
  const supabase    = createClient()
  const redirectTo  = params.get('redirectTo') ?? '/admin/'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (err) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
    router.push(redirectTo)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="admin@codepromoreduc.fr"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
        <input
          type="password" required value={pass} onChange={e => setPass(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60">
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  )
}
