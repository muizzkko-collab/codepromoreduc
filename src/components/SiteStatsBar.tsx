import type { SiteStat } from '@/app/actions/site-content'

const DEFAULT_STATS = [
  { key: 'stores',   value: '538 401', label: 'Boutiques vérifiées', cyan: false },
  { key: 'accuracy', value: '98%',     label: 'Taux de précision',   cyan: true  },
  { key: 'checks',   value: '5,4M+',   label: 'Vérifications / mois', cyan: false },
  { key: 'commerce', value: '1 Md€+',  label: 'Commerce vérifié',   cyan: false },
]

export function SiteStatsBar({ stats }: { stats: SiteStat[] }) {
  const items = stats.length >= 4
    ? stats.slice(0, 4).map((s, i) => ({ ...s, cyan: i === 1 }))
    : DEFAULT_STATS

  return (
    <div className="w-full py-10 sm:py-14" style={{ background:'rgba(255,255,255,.018)', borderTop:'1px solid rgba(255,255,255,.05)', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4">
        {items.map((stat, i) => (
          <div
            key={stat.key}
            className="flex flex-col items-center text-center px-3 sm:px-5 py-2 sm:py-0"
            style={{
              borderRight: i % 2 !== 1 || (i === 0) ? '1px solid rgba(255,255,255,.07)' : 'none',
              borderBottom: i < 2 ? '1px solid rgba(255,255,255,.07)' : 'none',
            }}
          >
            <span
              className="font-black tracking-tight leading-none"
              style={{
                fontSize: 'clamp(28px,6vw,58px)',
                color: stat.cyan ? '#38bdf8' : '#fff',
                textShadow: stat.cyan ? '0 0 40px rgba(56,189,248,.45)' : 'none',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {stat.value}
            </span>
            <span className="mt-2 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-[.18em]" style={{ color:'rgba(255,255,255,.38)' }}>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
