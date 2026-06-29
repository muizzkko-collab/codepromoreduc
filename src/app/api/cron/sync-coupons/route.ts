import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/admin'
import { syncAllNetworks }           from '@/lib/sync-orchestrator'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional ?network=awin,tradedoubler to run specific networks only
  const networksParam = request.nextUrl.searchParams.get('network')
  const networks = networksParam
    ? (networksParam.split(',').filter(n =>
        ['awin', 'tradedoubler', 'kwanko', 'effiliation'].includes(n)) as ('awin' | 'tradedoubler' | 'kwanko' | 'effiliation')[])
    : undefined

  const supabase = createAdminClient()
  const start    = Date.now()

  const { data: logRow } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', sync_type: networks?.join(',') ?? 'all' })
    .select().single()
  const logId = logRow?.id

  try {
    const results = await syncAllNetworks(networks)

    const totals = results.reduce(
      (acc, r) => ({
        added:       acc.added       + r.added,
        updated:     acc.updated     + r.updated,
        deactivated: acc.deactivated + r.deactivated,
        stores:      acc.stores      + r.stores,
        errors:      acc.errors      + r.errors,
      }),
      { added: 0, updated: 0, deactivated: 0, stores: 0, errors: 0 }
    )

    await supabase.from('sync_logs').update({
      status:          'success',
      coupons_added:   totals.added,
      coupons_removed: totals.deactivated,
      coupons_updated: totals.updated,
      stores_synced:   totals.stores,
      stores_failed:   totals.errors,
      duration_ms:     Date.now() - start,
    }).eq('id', logId ?? '')

    return NextResponse.json({
      networks: results.map(r => ({
        network:     r.network,
        added:       r.added,
        updated:     r.updated,
        deactivated: r.deactivated,
        stores:      r.stores,
        errors:      r.errors,
        duration_s:  (r.duration_ms / 1000).toFixed(1),
        error:       r.error ?? null,
      })),
      totals,
      duration_s: ((Date.now() - start) / 1000).toFixed(1),
    })
  } catch (e: unknown) {
    await supabase.from('sync_logs').update({
      status:        'error',
      error_message: (e as Error).message,
      duration_ms:   Date.now() - start,
    }).eq('id', logId ?? '')
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
