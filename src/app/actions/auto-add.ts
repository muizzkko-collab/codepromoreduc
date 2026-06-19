'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/admin-auth'

interface AwinCoupon { title: string; code: string | null; discount: string | null }

export async function publishAwinStore(params: {
  awinId: string; name: string; affiliateUrl: string | null
  logoUrl: string | null; coupons: AwinCoupon[]
}) {
  try { await requirePermission('auto_add') } catch (e) { return { error: (e as Error).message } }

  const supabase = createAdminClient()
  const slug = params.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data: store, error: storeErr } = await supabase.from('stores').insert({
    name: params.name,
    slug: `code-promo-${slug}`,
    logo_url: params.logoUrl,
    affiliate_url: params.affiliateUrl,
    is_active: true,
    is_featured: false,
  }).select().single()

  if (storeErr || !store) return { error: storeErr?.message ?? 'Store creation failed' }

  if (params.coupons.length > 0) {
    const { error: couponErr } = await supabase.from('coupons').insert(params.coupons.map(c => ({
      store_id:         store.id,
      title:            c.title,
      code:             c.code,
      discount_value:   c.discount,
      type:             c.code ? 'code' : 'deal',
      is_active:        true,
      is_free_shipping: false,
    })))
    if (couponErr) return { error: couponErr.message, store }
  }

  return { error: null, store }
}

export async function uploadAwinLogo(awinId: string, formData: FormData) {
  try { await requirePermission('auto_add') } catch (e) { return { url: null, error: (e as Error).message } }

  const supabase = createAdminClient()
  const file = formData.get('logo') as File
  if (!file || file.size === 0) return { url: null, error: null }

  const ext  = file.name.split('.').pop()
  const path = `stores/awin-${awinId}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage.from('logos').upload(path, bytes, { contentType: file.type, upsert: true })
  if (error) return { url: null, error: error.message }
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
