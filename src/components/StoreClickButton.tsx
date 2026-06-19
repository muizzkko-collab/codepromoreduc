'use client'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink } from 'lucide-react'

interface Props { storeId: string; affiliateUrl: string; storeName: string }

export function StoreClickButton({ storeId, affiliateUrl, storeName }: Props) {
  async function handle() {
    const supabase = createClient()
    // Increment click count via raw SQL increment
    supabase.from('stores').select('click_count').eq('id', storeId).single().then(({ data }) => {
      if (data) supabase.from('stores').update({ click_count: (data.click_count || 0) + 1 }).eq('id', storeId).then(() => {})
    })
    window.open(affiliateUrl, '_blank', 'noopener')
  }
  return (
    <button onClick={handle}
      className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 shrink-0">
      Visiter {storeName} <ExternalLink className="h-4 w-4" />
    </button>
  )
}
