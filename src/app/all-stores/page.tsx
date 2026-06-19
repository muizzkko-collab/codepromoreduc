import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/Breadcrumb'
import { AllStoresClient } from '@/components/AllStoresClient'
import { Store, Category } from '@/lib/types'
import { getSiteUrl } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Toutes les boutiques — Codes Promo A à Z',
  description: 'Retrouvez tous les codes promo classés par boutique de A à Z. Plus de 2000 boutiques sur codepromoreduc.fr',
  alternates: { canonical: `${getSiteUrl()}/all-stores/` },
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default async function AllStoresPage() {
  const supabase = await createClient()
  const [storesRes, catsRes] = await Promise.all([
    supabase.from('stores').select('*').eq('is_active', true).order('name').limit(5000),
    supabase.from('categories').select('*').order('name'),
  ])
  const stores    = (storesRes.data ?? []) as Store[]
  const cats      = (catsRes.data  ?? []) as Category[]



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Toutes les boutiques' }]} />

      <div className="mt-6 mb-8">
        <h1 className="text-3xl font-bold text-navy">Toutes les boutiques</h1>
        <p className="text-gray-500 mt-2">{stores.length} boutiques référencées</p>
      </div>

      <AllStoresClient stores={stores} categories={cats} alphabet={ALPHABET} />
    </div>
  )
}
