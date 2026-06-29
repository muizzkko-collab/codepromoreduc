import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { subscription, storeIds = [] } = await req.json() as {
      subscription: PushSubscription
      storeIds?: string[]
    }

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: subscription.endpoint,
      p256dh:   (subscription as unknown as { keys: Record<string, string> }).keys?.p256dh ?? '',
      auth:     (subscription as unknown as { keys: Record<string, string> }).keys?.auth ?? '',
      store_preferences: storeIds,
    }, { onConflict: 'endpoint' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
