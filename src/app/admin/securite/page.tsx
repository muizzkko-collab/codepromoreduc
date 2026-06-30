import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sécurité — Admin' }

function formatDate(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ACTION_COLORS: Record<string, string> = {
  login_success:             '#34d399',
  login_failure:             '#f87171',
  account_locked:            '#f59e0b',
  unauthorized_admin_access: '#f87171',
  ip_rate_limited:           '#fb923c',
}

export default async function SecuritePage() {
  const supabase = createAdminClient()

  const [
    { data: activityLogs },
    { data: recentAttempts },
    { count: lockedAccounts },
  ] = await Promise.all([
    supabase
      .from('admin_activity_log')
      .select('*, admin_profiles(email)')
      .order('performed_at', { ascending: false })
      .limit(50),
    supabase
      .from('login_attempts')
      .select('*')
      .order('attempted_at', { ascending: false })
      .limit(30),
    supabase
      .from('admin_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false),
  ])

  const failedAttempts = (recentAttempts ?? []).filter(a => !a.success).length
  const successAttempts = (recentAttempts ?? []).filter(a => a.success).length

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>Sécurité & Activité</h1>
      <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, marginBottom: 28 }}>
        Surveillance des accès et actions administratives
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 36 }}>
        {[
          { label: 'Tentatives récentes',   value: recentAttempts?.length ?? 0, color: '#38bdf8' },
          { label: 'Connexions réussies',    value: successAttempts,             color: '#34d399' },
          { label: 'Tentatives échouées',    value: failedAttempts,              color: '#f87171' },
          { label: 'Comptes verrouillés',    value: lockedAccounts ?? 0,         color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Activity log */}
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Journal d&apos;activité (50 dernières)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
            {(activityLogs ?? []).length === 0 && (
              <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>Aucune activité enregistrée.</p>
            )}
            {(activityLogs ?? []).map((log) => (
              <div key={log.id} style={{ borderLeft: `3px solid ${ACTION_COLORS[log.action] ?? 'rgba(255,255,255,.2)'}`, paddingLeft: 10, paddingBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ACTION_COLORS[log.action] ?? '#fff' }}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' }}>
                    {formatDate(log.performed_at)}
                  </span>
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(log as any).admin_profiles?.email && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(log as any).admin_profiles.email}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', display: 'flex', gap: 8, marginTop: 2 }}>
                  {log.target_table && <span>table: {log.target_table}</span>}
                  {log.ip_address && <span>IP: {log.ip_address}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Login attempts */}
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Tentatives de connexion récentes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
            {(recentAttempts ?? []).length === 0 && (
              <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>Aucune tentative enregistrée.</p>
            )}
            {(recentAttempts ?? []).map(attempt => (
              <div key={attempt.id} style={{
                borderLeft: `3px solid ${attempt.success ? '#34d399' : '#f87171'}`,
                paddingLeft: 10, paddingBottom: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: attempt.success ? '#34d399' : '#f87171' }}>
                    {attempt.success ? '✓ Succès' : '✗ Échec'}
                    {attempt.reason && ` — ${attempt.reason.replace(/_/g, ' ')}`}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' }}>
                    {formatDate(attempt.attempted_at)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
                  {attempt.email && <span style={{ marginRight: 8 }}>{attempt.email}</span>}
                  IP: {attempt.ip_address}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
