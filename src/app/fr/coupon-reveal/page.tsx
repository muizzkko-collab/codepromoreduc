import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

// Redirect legacy /fr/coupon-reveal?code=X&slug=Y to /store/[slug]/[public_id]/
// Keep this redirect for at least 90 days after the new URL architecture is deployed.
export default async function CouponRevealRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp   = await searchParams
  const code = sp.code  ?? ''
  const slug = sp.slug  ?? ''

  if (code && slug) {
    const supabase = await createClient()
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .single()

    if (store) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('public_id')
        .eq('code', code)
        .eq('store_id', store.id)
        .single()

      if (coupon?.public_id) {
        redirect(`/store/${slug}/${coupon.public_id}/`)
      }
    }
  }

  // Fallback: send to store page if we can't resolve
  if (slug) redirect(`/store/${slug}/`)
  redirect('/')
}
