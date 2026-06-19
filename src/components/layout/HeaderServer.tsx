import { createClient } from '@/lib/supabase/server'
import { Header } from './Header'

export async function HeaderServer() {
  const supabase = await createClient()
  const [{ data: cats }, { data: topStores }] = await Promise.all([
    supabase.from('categories').select('name,slug').order('store_count', { ascending: false }).limit(6),
    supabase.from('stores').select('name,slug,coupon_count').eq('is_active', true).order('coupon_count', { ascending: false }).limit(4),
  ])

  return <Header categories={cats ?? []} topStores={topStores ?? []} />
}
