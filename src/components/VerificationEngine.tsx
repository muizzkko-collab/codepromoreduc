import { LiveFeed } from './LiveFeed'

interface FeedEntry { id: string; storeName: string; title: string; timeLabel: string }

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'17px',height:'17px'}}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
    ),
    title: 'Tests automatisés',
    desc: 'Des navigateurs headless simulent de vraies commandes sur l\'ensemble de notre réseau marchands.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'17px',height:'17px'}}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    title: 'Consensus communautaire',
    desc: 'Des dizaines de milliers de vérificateurs formés, chacun doté d\'un score de confiance.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'17px',height:'17px'}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    ),
    title: 'Signal de flotte',
    desc: 'Données de paiement en direct issues des utilisateurs de l\'extension. La vérité terrain.',
  },
]

export function VerificationEngine({ entries }: { entries: FeedEntry[] }) {
  return (
    <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-7 max-w-7xl mx-auto">
      <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-center">
        {/* Left */}
        <div>
          <div className="flex items-center gap-2 mb-5 sm:mb-6">
            <div style={{ width:'6px', height:'6px', background:'#38bdf8', borderRadius:'999px' }} />
            <span className="text-[9.5px] font-extrabold uppercase tracking-[.2em]" style={{ color:'#38bdf8' }}>Moteur de vérification</span>
          </div>
          <h2 className="font-black tracking-tight leading-tight mb-5 sm:mb-6" style={{ fontSize:'clamp(28px,4vw,52px)', letterSpacing:'-.04em', lineHeight:1.05 }}>
            Nous ne listons<br />pas les codes.<br />
            <span style={{ color:'rgba(255,255,255,.55)' }}>Nous les vérifions.</span>
          </h2>
          <p className="mb-8 sm:mb-9 max-w-lg" style={{ fontSize:'clamp(13px,1.5vw,14.5px)', color:'rgba(255,255,255,.5)', lineHeight:1.65, fontWeight:500 }}>
            La plupart des sites scrappent des codes et espèrent qu&apos;ils fonctionnent. 40 à 60 % des codes publics sont périmés, restreints ou faux. Nous utilisons un système de vérification en trois couches qui teste chaque code avant que vous le voyiez.
          </p>

          <div className="flex flex-col gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-center gap-4 rounded-2xl" style={{ padding:'16px 20px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)' }}>
                <div className="flex-shrink-0 flex items-center justify-center" style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#38bdf8' }}>
                  {f.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-extrabold text-white" style={{ letterSpacing:'-.01em' }}>{f.title}</span>
                    <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[.15em]" style={{ color:'#10b981' }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:'#10b981', boxShadow:'0 0 6px #10b981', display:'inline-block', animation:'live-pulse 1.6s ease-in-out infinite' }} />
                      Actif
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed m-0" style={{ color:'rgba(255,255,255,.45)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — terminal feed */}
        <LiveFeed entries={entries} />
      </div>
    </section>
  )
}
