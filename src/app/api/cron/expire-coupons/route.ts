import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or manually with the secret)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]

  // Deactivate expired coupons
  // Count first, then update
  const { count } = await supabase
    .from('coupons')
    .select('*', { count: 'exact', head: true })
    .lt('expiry_date', today)
    .eq('is_active', true)

  const { error } = await supabase
    .from('coupons')
    .update({ is_active: false })
    .lt('expiry_date', today)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log the run
  await supabase.from('sync_logs').insert({
    status:          'success',
    coupons_removed: count ?? 0,
    coupons_added:   0,
    error_message:   null,
  })

  return NextResponse.json({
    deactivated: count ?? 0,
    timestamp:   new Date().toISOString(),
  })
}
