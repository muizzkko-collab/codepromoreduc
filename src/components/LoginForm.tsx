'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function LoginForm() {
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const router    = useRouter()
  const params    = useSearchParams()
  const redirectTo = params.get('redirectTo') ?? '/admin/'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password: pass }),
        credentials: 'same-origin',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erreur de connexion.')
        setLoading(false)
        return
      }

      // Success — navigate to admin
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setLoading(false)
    }
  }

  const reason = params.get('reason')

  return (
    <form onSubmit={submit} className="space-y-4">
      {reason === 'not_authorized' && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Accès refusé. Votre compte n&apos;est pas autorisé.
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email" required autoComplete="username"
          value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="admin@codepromoreduc.fr"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
        <input
          type="password" required autoComplete="current-password"
          value={pass} onChange={e => setPass(e.target.value)}
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
