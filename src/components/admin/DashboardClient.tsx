'use client'
import Link from 'next/link'
import { useLang } from './LangContext'
import { StoreLogo } from '@/components/StoreLogo'
import { Store, Tag, Clock, Flag, MousePointerClick } from 'lucide-react'

interface Stats {
  totalStores: number
  totalCoupons: number
  expiringSoon: number
  flaggedCount: number
  clicksThisMonth: number
}
interface DayClick { date: string; clicks: number }
interface TopStore {
  id: string; name: string; slug: string
  logo_url: string | null; click_count: number; coupon_count: number
}
interface RecentFlag {
  id: string; reason: string; created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coupon: any
}
interface Props { stats: Stats; topStores: TopStore[]; dailyClicks: DayClick[]; recentFlags: RecentFlag[] }

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.07)',
  borderRadius: 16,
}

function StatCard({ icon: Icon, label, value, href, accent }: {
  icon: React.ElementType; label: string; value: number; href?: string; accent: string
}) {
  const inner = (
    <div style={{ ...glass, padding:'20px 22px', display:'flex', alignItems:'center', gap:16, cursor: href ? 'pointer' : 'default', transition:'all 250ms ease' }}
      onMouseEnter={e => { if (href) (e.currentTarget as HTMLDivElement).style.border = `1px solid rgba(56,189,248,.2)` }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,.07)' }}
    >
      <div style={{ width:44, height:44, borderRadius:12, background:accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon style={{ width:20, height:20, color:'#fff' }} />
      </div>
      <div>
        <p style={{ fontSize:22, fontWeight:900, color:'#fff', margin:0, letterSpacing:'-.03em', lineHeight:1 }}>{value.toLocaleString('fr-FR')}</p>
        <p style={{ fontSize:11, color:'rgba(255,255,255,.45)', margin:'4px 0 0', fontWeight:600, textTransform:'uppercase', letterSpacing:'.1em' }}>{label}</p>
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration:'none' }}>{inner}</Link> : inner
}

function BarChart({ data }: { data: DayClick[] }) {
  const max = Math.max(...data.map(d => d.clicks), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:120, width:'100%' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, position:'relative', height:'100%', justifyContent:'flex-end' }}
          title={`${d.date.slice(5)}: ${d.clicks}`}
        >
          <div style={{
            width:'100%',
            height: `${Math.max((d.clicks / max) * 100, 3)}%`,
            background: d.clicks === max ? 'linear-gradient(180deg,#38bdf8,#0ea5e9)' : 'rgba(56,189,248,.3)',
            borderRadius:'3px 3px 0 0',
            transition:'all 200ms ease',
          }} />
        </div>
      ))}
    </div>
  )
}

export function DashboardClient({ stats, topStores, dailyClicks, recentFlags }: Props) {
  const { tr } = useLang()

  const statCards = [
    { icon: Store,             label: tr.totalStores,     value: stats.totalStores,     accent:'rgba(56,189,248,.2)' },
    { icon: Tag,               label: tr.totalCoupons,    value: stats.totalCoupons,    accent:'rgba(16,185,129,.2)' },
    { icon: Clock,             label: tr.expiringSoon,    value: stats.expiringSoon,    href:'/admin/coupons/?filter=expiring', accent:'rgba(245,158,11,.2)' },
    { icon: Flag,              label: tr.flaggedCoupons,  value: stats.flaggedCount,    href:'/admin/signalements/', accent:'rgba(239,68,68,.2)' },
    { icon: MousePointerClick, label: tr.clicksThisMonth, value: stats.clicksThisMonth, accent:'rgba(168,85,247,.2)' },
  ]

  return (
    <div style={{ padding:'32px 28px', maxWidth:1280, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:'#fff', margin:'0 0 4px', letterSpacing:'-.02em' }}>{tr.dashboard}</h1>
        <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', margin:0, fontWeight:600, textTransform:'uppercase', letterSpacing:'.15em' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:28 }}>
        {statCards.map(c => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} href={c.href} accent={c.accent} />
        ))}
      </div>

      {/* Chart + flags row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, marginBottom:20 }}>

        {/* Daily clicks chart */}
        <div style={{ ...glass, padding:'22px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h2 style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-.01em' }}>{tr.dailyClicks}</h2>
            <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.15em' }}>{tr.last30Days}</span>
          </div>
          <BarChart data={dailyClicks} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{dailyClicks[0]?.date.slice(5)}</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{dailyClicks[dailyClicks.length-1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Recent flags */}
        <div style={{ ...glass, padding:'22px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0 }}>{tr.flaggedCoupons}</h2>
            <Link href="/admin/signalements/" style={{ fontSize:11, color:'#38bdf8', textDecoration:'none', fontWeight:600 }}>{tr.seeAll}</Link>
          </div>
          {recentFlags.length === 0 ? (
            <p style={{ fontSize:12, color:'rgba(255,255,255,.3)', margin:0 }}>{tr.noData}</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {recentFlags.map(f => (
                <div key={f.id} style={{ paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.8)', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.coupon?.title ?? '—'}</p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.35)', margin:0 }}>{f.coupon?.store?.name} · {f.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top stores table */}
      <div style={{ ...glass, overflow:'hidden' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0 }}>{tr.topStores}</h2>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'rgba(255,255,255,.02)' }}>
              <th style={{ padding:'10px 20px', textAlign:'left', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.15em' }}>{tr.logo}</th>
              <th style={{ padding:'10px 20px', textAlign:'left', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.15em' }}>{tr.name}</th>
              <th style={{ padding:'10px 20px', textAlign:'right', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.15em' }}>{tr.clicks}</th>
              <th style={{ padding:'10px 20px', textAlign:'right', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.15em' }}>{tr.couponCount}</th>
            </tr>
          </thead>
          <tbody>
            {topStores.map((s, i) => (
              <tr key={s.id} style={{ borderTop:'1px solid rgba(255,255,255,.04)', transition:'background 150ms' }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background='rgba(255,255,255,.03)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background='transparent'}
              >
                <td style={{ padding:'12px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,.25)', width:18, fontWeight:700, fontFamily:'monospace' }}>{i+1}</span>
                    <StoreLogo src={s.logo_url} name={s.name} size="sm" />
                  </div>
                </td>
                <td style={{ padding:'12px 20px' }}>
                  <Link href={`/admin/boutiques/?search=${encodeURIComponent(s.name)}`}
                    style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.85)', textDecoration:'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color='#38bdf8'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color='rgba(255,255,255,.85)'}
                  >
                    {s.name}
                  </Link>
                </td>
                <td style={{ padding:'12px 20px', textAlign:'right', fontWeight:700, color:'#38bdf8', fontFamily:'monospace', fontSize:12 }}>{(s.click_count ?? 0).toLocaleString('fr-FR')}</td>
                <td style={{ padding:'12px 20px', textAlign:'right', color:'rgba(255,255,255,.4)', fontSize:12 }}>{s.coupon_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
