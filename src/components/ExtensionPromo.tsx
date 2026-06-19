export function ExtensionPromo() {
  return (
    <section className="relative z-10 px-4 sm:px-7 py-16 sm:py-20">
      <div className="max-w-7xl mx-auto rounded-3xl relative overflow-hidden" style={{ padding:'clamp(32px,5vw,72px) clamp(20px,6vw,80px)', background:'linear-gradient(135deg, rgba(56,189,248,.08), rgba(139,92,246,.06))', border:'1px solid rgba(56,189,248,.18)' }}>

        {/* Glow */}
        <div className="absolute pointer-events-none" style={{ top:'-200px', left:'-200px', width:'600px', height:'600px', background:'radial-gradient(circle, rgba(56,189,248,.12), transparent 60%)' }} />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 lg:gap-12">
          {/* Content */}
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-5">
              <div style={{ width:'6px', height:'6px', background:'#38bdf8', borderRadius:'999px' }} />
              <span className="text-[9.5px] font-extrabold uppercase tracking-[.2em]" style={{ color:'#38bdf8' }}>Extension gratuite</span>
            </div>
            <h2 className="font-black tracking-tight leading-tight mb-4" style={{ fontSize:'clamp(26px,3.5vw,44px)', letterSpacing:'-.04em' }}>
              Codes automatiques.<br />Économies garanties.
            </h2>
            <p className="mb-8 leading-relaxed" style={{ fontSize:'clamp(13px,1.5vw,15px)', color:'rgba(255,255,255,.55)' }}>
              Notre extension applique automatiquement le meilleur code au moment du paiement. Zéro effort, économies maximales.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                className="inline-flex items-center gap-2 font-extrabold rounded-full"
                style={{ padding:'13px 26px', background:'rgba(56,189,248,.12)', color:'#e0f7ff', border:'1px solid rgba(56,189,248,.38)', fontSize:'clamp(12px,1.5vw,14px)', backdropFilter:'blur(20px)', boxShadow:'inset 0 1.5px 2px rgba(255,255,255,.25), 0 10px 35px rgba(0,0,0,.37)', cursor:'pointer' }}
              >
                <svg viewBox="0 0 24 24" fill="#38bdf8" style={{ width:'15px', height:'15px', flexShrink:0 }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Ajouter à mon navigateur
              </button>
              <button
                className="inline-flex items-center gap-2 font-bold rounded-full"
                style={{ padding:'13px 22px', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.8)', border:'1px solid rgba(255,255,255,.14)', fontSize:'13px', backdropFilter:'blur(16px)', cursor:'pointer' }}
              >
                En savoir plus
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-row lg:flex-col gap-8 lg:gap-5 flex-shrink-0 flex-wrap">
            {[
              { num: '4,8M+', label: 'Utilisateurs actifs' },
              { num: '€847',  label: 'Économies moyennes / an' },
              { num: '0,8s',  label: 'Délai moyen d\'application' },
            ].map(s => (
              <div key={s.label}>
                <div className="font-black tracking-tight" style={{ fontSize:'clamp(24px,3vw,36px)', color:'#38bdf8', letterSpacing:'-.04em' }}>{s.num}</div>
                <div className="text-[10px] font-bold uppercase tracking-[.18em] mt-0.5" style={{ color:'rgba(255,255,255,.4)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
