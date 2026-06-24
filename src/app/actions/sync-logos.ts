'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllMerchants as getAwinMerchants } from '@/lib/awin'
import { getMerchants as getKwankoMerchants } from '@/lib/networks/kwanko'
import { getMerchants as getEffiliationMerchants } from '@/lib/networks/effiliation'

export interface LogoSyncResult {
  updated: number
  skipped: number
  errors:  number
  details: string[]
}

export async function syncStoreLogos(): Promise<{ data: LogoSyncResult | null; error: string | null }> {
  const supabase = createAdminClient()

  // Fetch all stores with their network IDs and current logo
  const { data: stores, error: storeErr } = await supabase
    .from('stores')
    .select('id,name,logo_url,awin_merchant_id,network_merchant_ids')
    .eq('is_active', true)

  if (storeErr) return { data: null, error: storeErr.message }
  if (!stores?.length) return { data: { updated: 0, skipped: 0, errors: 0, details: [] }, error: null }

  const result: LogoSyncResult = { updated: 0, skipped: 0, errors: 0, details: [] }

  // ── Fetch all merchant data from networks in parallel ──────────────────────
  const [awinMerchants, kwankoMerchants, effiliationMerchants] = await Promise.allSettled([
    getAwinMerchants(),
    getKwankoMerchants(),
    getEffiliationMerchants(),
  ])

  // Build lookup maps: merchantId → logo_url
  const awinLogoMap    = new Map<number, string>()
  const kwankoLogoMap  = new Map<string, string>()
  const effLogoMap     = new Map<string, string>()

  if (awinMerchants.status === 'fulfilled') {
    for (const m of awinMerchants.value) {
      if (m.id && m.logoUrl) awinLogoMap.set(m.id, m.logoUrl)
    }
    result.details.push(`Awin: ${awinLogoMap.size} merchants with logos`)
  } else {
    result.details.push(`Awin fetch failed: ${awinMerchants.reason}`)
  }

  if (kwankoMerchants.status === 'fulfilled') {
    for (const m of kwankoMerchants.value) {
      if (m.id && m.logo_url) kwankoLogoMap.set(m.id, m.logo_url)
    }
    result.details.push(`Kwanko: ${kwankoLogoMap.size} merchants with logos`)
  } else {
    result.details.push(`Kwanko fetch failed: ${kwankoMerchants.reason}`)
  }

  if (effiliationMerchants.status === 'fulfilled') {
    for (const m of effiliationMerchants.value) {
      if (m.id && m.logo_url) effLogoMap.set(m.id, m.logo_url)
    }
    result.details.push(`Effiliation: ${effLogoMap.size} merchants with logos`)
  } else {
    result.details.push(`Effiliation fetch failed: ${effiliationMerchants.reason}`)
  }

  // ── Match stores to logos (priority: Awin > Kwanko > Effiliation) ──────────
  for (const store of stores) {
    let newLogo: string | null = null

    // Try Awin first
    if (store.awin_merchant_id) {
      newLogo = awinLogoMap.get(store.awin_merchant_id) ?? null
    }

    // Try Kwanko
    if (!newLogo && store.network_merchant_ids?.kwanko) {
      newLogo = kwankoLogoMap.get(store.network_merchant_ids.kwanko) ?? null
    }

    // Try Effiliation
    if (!newLogo && store.network_merchant_ids?.effiliation) {
      newLogo = effLogoMap.get(store.network_merchant_ids.effiliation) ?? null
    }

    if (!newLogo) {
      result.skipped++
      continue
    }

    // Only update if no logo yet, or logo has changed
    if (store.logo_url === newLogo) {
      result.skipped++
      continue
    }

    const { error } = await supabase
      .from('stores')
      .update({ logo_url: newLogo })
      .eq('id', store.id)

    if (error) {
      result.errors++
      result.details.push(`Error updating ${store.name}: ${error.message}`)
    } else {
      result.updated++
    }
  }

  return { data: result, error: null }
}
