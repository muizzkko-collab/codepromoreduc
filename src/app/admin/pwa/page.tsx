import { createAdminClient } from '@/lib/supabase/admin'
import { PwaAdminClient } from './PwaAdminClient'

async function getStats() {
  const supabase = createAdminClient()

  const [{ count: totalSubs }, { data: logs }, { data: topStores }] = await Promise.all([
    supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }),
    supabase.from('push_notifications_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
    // Count subscribers per store across all store_preferences arrays
    supabase.rpc('get_top_subscribed_stores').limit(20).maybeSingle().then(() =>
      // Fallback: just return empty — the RPC may not exist yet
      ({ data: [] as { store_id: string; store_name: string; subscriber_count: number }[] })
    ),
  ])

  return {
    totalSubs: totalSubs ?? 0,
    logs: (logs ?? []) as {
      id: string; title: string; message: string; url: string;
      sent_count: number; failed_count: number; created_at: string;
    }[],
    topStores: topStores ?? [],
  }
}

export default async function PwaAdminPage() {
  const { totalSubs, logs } = await getStats()

  const today = new Date().toISOString().split('T')[0]
  const sentToday = logs.filter(l => l.created_at.startsWith(today))
    .reduce((sum, l) => sum + l.sent_count, 0)
  const sentWeek  = logs.reduce((sum, l) => sum + l.sent_count, 0)

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>PWA & Notifications Push</h1>
      <p style={{ color: 'rgba(255,255,255,.5)', marginBottom: 32, fontSize: 14 }}>
        Gérez les abonnés push et envoyez des notifications manuelles.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Abonnés total', value: totalSubs, color: '#38bdf8' },
          { label: 'Envois aujourd\'hui', value: sentToday, color: '#10b981' },
          { label: 'Envois cette semaine', value: sentWeek, color: '#818cf8' },
          { label: 'Notifications récentes', value: logs.length, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Manual send form + notification log — client component */}
      <PwaAdminClient logs={logs} />
    </div>
  )
}
