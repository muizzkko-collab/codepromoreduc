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

interface Props {
  stats: Stats
  topStores: TopStore[]
  dailyClicks: DayClick[]
  recentFlags: RecentFlag[]
}

function StatCard({ icon: Icon, label, value, href, color }: {
  icon: React.ElementType; label: string; value: number; href?: string; color: string
}) {
  const inner = (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-navy">{value.toLocaleString('fr-FR')}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function BarChart({ data }: { data: DayClick[] }) {
  const max = Math.max(...data.map(d => d.clicks), 1)
  return (
    <div className="flex items-end gap-0.5 h-32 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className="w-full bg-primary/70 hover:bg-primary rounded-t transition-all"
            style={{ height: `${Math.max((d.clicks / max) * 100, 2)}%` }}
          />
          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-navy text-white text-xs rounded px-2 py-0.5 whitespace-nowrap z-10">
            {d.date.slice(5)}: {d.clicks}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardClient({ stats, topStores, dailyClicks, recentFlags }: Props) {
  const { tr } = useLang()

  const statCards = [
    { icon: Store,             label: tr.totalStores,      value: stats.totalStores,     color: 'bg-blue-100 text-blue-600' },
    { icon: Tag,               label: tr.totalCoupons,     value: stats.totalCoupons,    color: 'bg-green-100 text-green-600' },
    { icon: Clock,             label: tr.expiringSoon,     value: stats.expiringSoon,    href: '/admin/coupons/?filter=expiring', color: 'bg-orange-100 text-orange-600' },
    { icon: Flag,              label: tr.flaggedCoupons,   value: stats.flaggedCount,    href: '/admin/signalements/', color: 'bg-red-100 text-red-600' },
    { icon: MousePointerClick, label: tr.clicksThisMonth,  value: stats.clicksThisMonth, color: 'bg-purple-100 text-purple-600' },
  ]

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-navy">{tr.dashboard}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(c => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} href={c.href} color={c.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily clicks chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-navy mb-4">{tr.dailyClicks}</h2>
          <BarChart data={dailyClicks} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{dailyClicks[0]?.date.slice(5)}</span>
            <span>{dailyClicks[dailyClicks.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Recent flags */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-navy">{tr.flaggedCoupons}</h2>
            <Link href="/admin/signalements/" className="text-xs text-primary hover:underline">Voir tout →</Link>
          </div>
          {recentFlags.length === 0 ? (
            <p className="text-sm text-gray-400">{tr.noData}</p>
          ) : (
            <ul className="space-y-3">
              {recentFlags.map(f => (
                <li key={f.id} className="text-sm border-b border-gray-100 pb-2">
                  <p className="font-medium text-navy line-clamp-1">{f.coupon?.title ?? '—'}</p>
                  <p className="text-gray-500 text-xs">{f.coupon?.store?.name} · {f.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Top stores table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-navy">{tr.topStores}</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3 text-left">{tr.logo}</th>
              <th className="px-5 py-3 text-left">{tr.name}</th>
              <th className="px-5 py-3 text-right">{tr.clicks}</th>
              <th className="px-5 py-3 text-right">{tr.couponCount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topStores.map((s, i) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                    <StoreLogo src={s.logo_url} name={s.name} size="sm" />
                  </div>
                </td>
                <td className="px-5 py-3 font-medium text-navy">
                  <Link href={`/admin/boutiques/?search=${encodeURIComponent(s.name)}`} className="hover:text-primary">
                    {s.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-right font-semibold">{(s.click_count ?? 0).toLocaleString('fr-FR')}</td>
                <td className="px-5 py-3 text-right text-gray-500">{s.coupon_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
