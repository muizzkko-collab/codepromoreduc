import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Allowed origins for WebSocket / CORS origin validation ───────────────────
const ALLOWED_ORIGINS = [
  'https://codepromoreduc.fr',
  'https://www.codepromoreduc.fr',
]

function isValidOrigin(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.includes(origin)
}

// ── In-memory admin route rate limiter (lightweight, resets on restart) ───────
const adminRateMap = new Map<string, { count: number; resetAt: number }>()
const ADMIN_RATE_LIMIT  = 100   // requests
const ADMIN_RATE_WINDOW = 60000 // 1 minute ms

function checkAdminRateLimit(ip: string): boolean {
  const now  = Date.now()
  const entry = adminRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    adminRateMap.set(ip, { count: 1, resetAt: now + ADMIN_RATE_WINDOW })
    return true
  }
  entry.count++
  if (entry.count > ADMIN_RATE_LIMIT) return false
  return true
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function redirectToLogin(request: NextRequest, reason?: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = '/connexion/'
  url.searchParams.set('redirectTo', request.nextUrl.pathname)
  if (reason) url.searchParams.set('reason', reason)
  return NextResponse.redirect(url)
}

function badRequest(msg: string): NextResponse {
  return new NextResponse(msg, { status: 400 })
}

// ── Main middleware ───────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { method } = request
  const contentLength   = request.headers.get('content-length')
  const transferEncoding = request.headers.get('transfer-encoding')

  // ── Request smuggling mitigation (application-layer, no proxy access) ──────
  //
  // 1. Reject requests carrying both Content-Length and Transfer-Encoding —
  //    this combination is the classic CL.TE / TE.CL smuggling vector.
  if (contentLength && transferEncoding) {
    return badRequest('Bad Request')
  }

  // 2. DELETE and OPTIONS must not carry a body or chunked encoding in this app.
  if (['DELETE', 'OPTIONS'].includes(method)) {
    if (transferEncoding || contentLength) {
      return badRequest('Bad Request')
    }
  }

  // 3. The only valid Transfer-Encoding value we accept is exactly "chunked".
  //    Obfuscated variants (e.g. "chunked, identity", "Chunked", "chunk ed")
  //    are known smuggling techniques — reject all of them.
  if (transferEncoding && transferEncoding.trim().toLowerCase() !== 'chunked') {
    return badRequest('Bad Request')
  }

  // ── WebSocket upgrade origin validation ────────────────────────────────────
  // Next.js production builds do NOT expose a WebSocket server.
  // (The HMR WebSocket is dev-only and not built into production.)
  // This guard defends against any future WebSocket upgrade path added
  // to the app, and against SSRF-via-upgrade attempts at the app layer.
  const upgradeHeader = request.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() === 'websocket') {
    const origin = request.headers.get('origin')
    if (!isValidOrigin(origin)) {
      return new NextResponse('Forbidden', {
        status: 403,
        headers: { 'Connection': 'close' },
      })
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  // Strip external x-nextjs-data header to prevent cache poisoning
  requestHeaders.delete('x-nextjs-data')

  let response = NextResponse.next({ request: { headers: requestHeaders } })
  const pathname = request.nextUrl.pathname

  // ── Only gate /admin/* routes ─────────────────────────────────────────────
  if (!pathname.startsWith('/admin')) {
    return response
  }

  // Layer 0 — Block empty User-Agent (bots/scrapers)
  const ua = request.headers.get('user-agent') ?? ''
  if (!ua.trim()) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Layer 0 — In-memory rate limit (100 req/min per IP)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  if (!checkAdminRateLimit(ip)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  // Layer 1 — Valid Supabase session (anon key, Edge-compatible)
  const anonSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await anonSupabase.auth.getUser()
  if (!user) {
    return redirectToLogin(request)
  }

  // Layer 2 — User must exist in admin_profiles with is_active = true
  // Use service-role client so RLS cannot be bypassed by a crafted token
  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() { /* read-only in middleware */ },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  const { data: profile } = await adminSupabase
    .from('admin_profiles')
    .select('id, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    void adminSupabase.from('admin_activity_log').insert({
      admin_id:     null,
      action:       'unauthorized_admin_access',
      target_table: null,
      details:      { user_id: user.id, email: user.email, ip, pathname },
      ip_address:   ip,
    })

    return redirectToLogin(request, 'not_authorized')
  }

  // Inject admin id into headers for downstream use
  requestHeaders.set('x-admin-id', profile.id)
  response = NextResponse.next({ request: { headers: requestHeaders } })

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
}
