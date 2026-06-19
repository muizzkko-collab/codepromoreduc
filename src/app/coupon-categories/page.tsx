import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Category } from '@/lib/types'
import { getSiteUrl } from '@/lib/utils'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Tag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Toutes les catégories — Codes Promo par Catégorie',
  description: 'Retrouvez tous les codes promo classés par catégorie sur codepromoreduc.fr. Mode, High-Tech, Beauté, Voyages et bien plus.',
  alternates: { canonical: `${getSiteUrl()}/coupon-categories/` },
}

export default async function CouponCategoriesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('*').order('name')
  const categories = (data ?? []) as Category[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Catégories' }]} />

      <div className="mt-6 mb-8">
        <h1 className="text-3xl font-bold text-navy">Toutes les catégories</h1>
        <p className="text-gray-500 mt-2">{categories.length} catégories de codes promo</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {categories.map(cat => (
          <Link
            key={cat.id}
            href={`/coupon-category/${cat.slug}/`}
            className="group bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3 hover:shadow-md hover:border-primary/40 transition-all text-center"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-navy group-hover:text-primary transition-colors line-clamp-2">
              {cat.name}
            </p>
            {cat.store_count > 0 && (
              <p className="text-xs text-gray-400">{cat.store_count} boutique{cat.store_count !== 1 ? 's' : ''}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
