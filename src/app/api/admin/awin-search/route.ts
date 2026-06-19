import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { searchProgrammes } from '@/lib/awin'

export async function GET(req: NextRequest) {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'auto_add') && !hasPermission(profile, 'stores')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  try {
    const results = await searchProgrammes(q)
    return NextResponse.json({
      results: results.map(p => ({
        awin_id:        p.id,
        name:           p.name,
        logo_url:       p.logoUrl ?? null,
        affiliate_url:  p.clickThroughUrl ?? null,
        display_url:    p.displayUrl ?? null,
      }))
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
