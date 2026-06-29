import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// Paris time helpers
function isParisSilentHours(): boolean {
  const paris = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false })
  const hour = Number(paris)
  return hour >= 22 || hour < 8
}

export async function POST(req: NextRequest) {
  // Require CRON_SECRET auth
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isParisSilentHours()) {
    return NextResponse.json({ skipped: 'Silent hours (22:00–08:00 Paris)' })
  }

  try {
    const body = await req.json() as {
      title:    string
      message:  string
      url:      string
      storeId?: string  // if set, only send to subscribers of this store
      tag?:     string
      image?:   string
    }

    const supabase = createAdminClient()

    // Fetch matching subscribers
    let query = supabase.from('push_subscriptions').select('*')
    if (body.storeId) {
      query = query.contains('store_preferences', [body.storeId])
    }
    const { data: subs, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!subs?.length) return NextResponse.json({ sent: 0, skipped: 'No subscribers' })

    const payload = JSON.stringify({
      title: body.title,
      body:  body.message,
      url:   body.url,
      tag:   body.tag ?? 'codepromo',
      image: body.image,
    })

    let sent = 0, failed = 0
    const invalidEndpoints: string[] = []

    await Promise.allSettled(
      subs.map(async sub => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400 }
          )
          sent++
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 410 || statusCode === 404) {
            // Subscription expired — clean up
            invalidEndpoints.push(sub.endpoint)
          }
          failed++
        }
      })
    )

    // Remove expired subscriptions
    if (invalidEndpoints.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidEndpoints)
    }

    // Log notification to analytics
    await supabase.from('push_notifications_log').insert({
      title:        body.title,
      message:      body.message,
      url:          body.url,
      store_id:     body.storeId ?? null,
      sent_count:   sent,
      failed_count: failed,
    }).maybeSingle()

    return NextResponse.json({ sent, failed, total: subs.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
