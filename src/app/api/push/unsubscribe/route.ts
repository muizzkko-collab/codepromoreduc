import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json() as { endpoint: string }
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

    const supabase = createAdminClient()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
