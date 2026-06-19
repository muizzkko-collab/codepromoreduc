import { LoginForm } from '@/components/LoginForm'
import { Suspense } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion Administration',
  robots: 'noindex,nofollow',
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-section">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy">Administration</h1>
          <p className="text-gray-500 text-sm mt-2">Accès réservé aux administrateurs</p>
        </div>
        <Suspense><LoginForm /></Suspense>
      </div>
    </div>
  )
}
