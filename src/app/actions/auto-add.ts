'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/admin-auth'
import type { ContentBody } from '@/lib/types'

interface StoreCoupon {
  title: string
  code: string | null
  discount: string | null
  type: string
}

export async function publishStore(params: {
  name: string
  source: string | null
  awinId: string | null
  networkMerchantIds: Record<string, string>
  affiliateUrl: string | null
  logoUrl: string | null
  metaDescription: string | null
  contentBody: ContentBody | null
  coupons: StoreCoupon[]
}) {
  try { await requirePermission('auto_add') } catch (e) { return { error: (e as Error).message } }

  const supabase = createAdminClient()
  const slug = params.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .insert({
      name:                  params.name,
      slug:                  `code-promo-${slug}`,
      logo_url:              params.logoUrl,
      affiliate_url:         params.affiliateUrl,
      meta_description:      params.metaDescription,
      content_body:          params.contentBody,
      content_status:        params.contentBody ? 'draft' : 'not_generated',
      is_active:             true,
      is_featured:           false,
      awin_merchant_id:      params.awinId ? parseInt(params.awinId) : null,
      network_merchant_ids:  Object.keys(params.networkMerchantIds).length > 0 ? params.networkMerchantIds : null,
    })
    .select()
    .single()

  if (storeErr || !store) return { error: storeErr?.message ?? 'Store creation failed' }

  if (params.coupons.length > 0) {
    const network = params.source ?? 'scraper'
    const { error: couponErr } = await supabase.from('coupons').insert(
      params.coupons.map(c => ({
        store_id:         store.id,
        title:            c.title,
        code:             c.code ?? null,
        discount_value:   c.discount ?? null,
        type:             c.type === 'shipping' ? 'deal' : (c.type ?? 'deal'),
        is_active:        true,
        is_free_shipping: c.type === 'shipping',
        network:          params.awinId ? 'awin' : network,
        scraper_source:   !params.source ? 'firecrawl+claude' : null,
      }))
    )
    if (couponErr) return { error: couponErr.message }
  }

  // Write accurate coupon_count
  const { count } = await supabase
    .from('coupons')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', store.id)
    .eq('is_active', true)
  if (count !== null) {
    await supabase.from('stores').update({ coupon_count: count }).eq('id', store.id)
  }

  return { error: null, store }
}

// Legacy — kept for backward compat; delegates to publishStore
export async function publishAwinStore(params: {
  awinId: string; name: string; affiliateUrl: string | null
  logoUrl: string | null; coupons: { title: string; code: string | null; discount: string | null }[]
}) {
  return publishStore({
    name: params.name,
    source: 'awin',
    awinId: params.awinId,
    networkMerchantIds: {},
    affiliateUrl: params.affiliateUrl,
    logoUrl: params.logoUrl,
    metaDescription: null,
    contentBody: null,
    coupons: params.coupons.map(c => ({ ...c, type: c.code ? 'code' : 'deal' })),
  })
}

export async function uploadStoreLogo(storeId: string, formData: FormData) {
  try { await requirePermission('auto_add') } catch (e) { return { url: null, error: (e as Error).message } }

  const supabase = createAdminClient()
  const file = formData.get('logo') as File
  if (!file || file.size === 0) return { url: null, error: null }

  const ext  = file.name.split('.').pop()
  const path = `stores/manual-${storeId}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('logos')
    .upload(path, bytes, { contentType: file.type, upsert: true })
  if (error) return { url: null, error: error.message }

  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

// Keep old export name for any existing callers
export const uploadAwinLogo = uploadStoreLogo
