import { cookies }          from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient }  from '@/lib/supabase/admin'

export interface AdminVerification {
  authorized: boolean
  userId?: string
  email?: string
}

/**
 * Verifies that the incoming request has:
 *  1. A valid Supabase session (auth cookie)
 *  2. A matching admin_profiles row with is_active = true
 *
 * Use at the top of every admin API route handler.
 */
export async function verifyAdminRequest(): Promise<AdminVerification> {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* read-only */ },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { authorized: false }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('admin_profiles')
      .select('id, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_active) return { authorized: false }

    return { authorized: true, userId: user.id, email: user.email }
  } catch {
    return { authorized: false }
  }
}

/** Convenience: throws a 401 NextResponse if not authorized. */
export function unauthorizedResponse() {
  return Response.json({ error: 'Non autorisé' }, { status: 401 })
}
