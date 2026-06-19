/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'auto_add')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const q       = req.nextUrl.searchParams.get('q') ?? ''
  const apiKey  = process.env.AWIN_API_KEY
  const pubId   = process.env.AWIN_PUBLISHER_ID

  if (!apiKey || !pubId) {
    return NextResponse.json({ error: 'AWIN_API_KEY and AWIN_PUBLISHER_ID not configured' }, { status: 500 })
  }

  try {
    const advertiserRes = await fetch(
      `https://api.awin.com/publishers/${pubId}/programmes?relationship=joined&countryCode=FR`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!advertiserRes.ok) return NextResponse.json({ store: null }, { status: 200 })
    const advertisers: any[] = await advertiserRes.json()

    const match = advertisers.find((a: any) =>
      a.name?.toLowerCase().includes(q.toLowerCase()) ||
      q.toLowerCase().includes(a.name?.toLowerCase())
    )
    if (!match) return NextResponse.json({ store: null }, { status: 200 })

    const promoRes = await fetch(
      `https://api.awin.com/publishers/${pubId}/promotions?advertiserId=${match.id}&countryCode=FR&promotionType=code`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    const promos: any[] = promoRes.ok ? await promoRes.json() : []

    return NextResponse.json({
      store: {
        id:           String(match.id),
        name:         match.name,
        logoUrl:      match.logoUrl ?? null,
        affiliateUrl: match.clickThroughUrl ?? null,
        coupons: promos.slice(0, 50).map((p: any) => ({
          title:    p.description ?? p.title ?? 'Offre',
          code:     p.code ?? null,
          discount: p.discountAmount ? `${p.discountAmount}${p.discountType === 'percent' ? '%' : '€'}` : null,
        })),
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
