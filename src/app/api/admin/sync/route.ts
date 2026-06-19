import { NextRequest, NextResponse }            from 'next/server'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { syncAllNetworks }                       from '@/lib/sync-orchestrator'

// POST /api/admin/sync?network=awin  (or no param = all networks)
export async function POST(req: NextRequest) {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'automation')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const networksParam = req.nextUrl.searchParams.get('network')
  const networks = networksParam
    ? (networksParam.split(',').filter(n =>
        ['awin', 'tradedoubler', 'kwanko', 'effiliation'].includes(n)) as
        ('awin' | 'tradedoubler' | 'kwanko' | 'effiliation')[])
    : undefined

  try {
    const results = await syncAllNetworks(networks)
    return NextResponse.json({ results })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
