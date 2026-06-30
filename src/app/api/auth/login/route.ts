import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { createAdminClient }         from '@/lib/supabase/admin'
import { cookies }                   from 'next/headers'

const RATE_LIMIT_WINDOW_MS    = 15 * 60 * 1000  // 15 minutes
const MAX_ATTEMPTS_PER_IP     = 5
const EMAIL_LOCKOUT_WINDOW_MS = 60 * 60 * 1000  // 1 hour
const MAX_ATTEMPTS_PER_EMAIL  = 10

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)

  let email = '', password = ''
  try {
    const body = await request.json()
    email    = (body.email    ?? '').toLowerCase().trim()
    password = body.password ?? ''
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const since15min = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const since1h    = new Date(Date.now() - EMAIL_LOCKOUT_WINDOW_MS).toISOString()

  // ── Step 1: Check IP rate limit ───────────────────────────────────────────
  const { count: ipCount } = await admin
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('success', false)
    .gte('attempted_at', since15min)

  if ((ipCount ?? 0) >= MAX_ATTEMPTS_PER_IP) {
    await logAttempt(admin, ip, email, false, 'ip_rate_limited')
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429 }
    )
  }

  // ── Step 2: Check email rate limit / lockout ──────────────────────────────
  const { count: emailCount } = await admin
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('success', false)
    .gte('attempted_at', since1h)

  if ((emailCount ?? 0) >= MAX_ATTEMPTS_PER_EMAIL) {
    // Lock the account
    await admin
      .from('admin_profiles')
      .update({ is_active: false })
      .eq('email', email)

    await logAttempt(admin, ip, email, false, 'account_locked')
    await admin.from('admin_activity_log').insert({
      action:      'account_locked',
      target_table: 'admin_profiles',
      details:     { email, ip, reason: 'too_many_failed_attempts' },
      ip_address:  ip,
    })

    return NextResponse.json(
      { error: 'Compte verrouillé après trop de tentatives. Contactez l\'administrateur.' },
      { status: 423 }
    )
  }

  // ── Step 3: Attempt login via Supabase ────────────────────────────────────
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list) {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // ── Step 4: Login failed ──────────────────────────────────────────────────
  if (authError || !authData.user) {
    await logAttempt(admin, ip, email, false, authError?.message ?? 'invalid_credentials')
    return NextResponse.json(
      { error: 'Email ou mot de passe incorrect.' },
      { status: 401 }
    )
  }

  // ── Step 5: Verify admin_profiles membership ──────────────────────────────
  const { data: profile } = await admin
    .from('admin_profiles')
    .select('id, is_active')
    .eq('id', authData.user.id)
    .single()

  if (!profile || !profile.is_active) {
    // Valid Supabase credentials but not an admin — sign out immediately
    await supabase.auth.signOut()
    await logAttempt(admin, ip, email, false, 'not_in_admin_profiles')
    return NextResponse.json(
      { error: 'Accès non autorisé.' },
      { status: 403 }
    )
  }

  // ── Step 6: Success — clear failed attempts, log success ──────────────────
  await admin
    .from('login_attempts')
    .delete()
    .eq('email', email)
    .eq('success', false)

  await logAttempt(admin, ip, email, true, 'success')
  await admin.from('admin_activity_log').insert({
    admin_id:    profile.id,
    action:      'login_success',
    details:     { ip },
    ip_address:  ip,
  })

  return NextResponse.json({ ok: true })
}

async function logAttempt(
  admin: ReturnType<typeof createAdminClient>,
  ip: string,
  email: string,
  success: boolean,
  reason: string
) {
  await admin.from('login_attempts').insert({
    ip_address: ip,
    email,
    success,
    reason,
  }).maybeSingle()
}
