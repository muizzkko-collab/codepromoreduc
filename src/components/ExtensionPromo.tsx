'use client'

function CheckoutMockup() {
  return (
    <div style={{ position:'relative', width:340, flexShrink:0 }}>

      {/* Floating tab icons */}
      <div style={{ position:'absolute', top:-24, right:60, zIndex:10 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:'#1a1a1a', border:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
          <span style={{ fontSize:18, fontWeight:900, color:'#f97316' }}>N</span>
        </div>
      </div>
      <div style={{ position:'absolute', top:20, right:10, zIndex:10 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#1a1a1a', border:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
          <span style={{ fontSize:16, fontWeight:900, color:'#a855f7' }}>S</span>
        </div>
      </div>

      {/* Main checkout card */}
      <div style={{ background:'#0d1117', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.7)', marginTop:32, position:'relative', zIndex:5 }}>

        {/* Browser chrome top bar */}
        <div style={{ background:'#111827', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          {/* Store icon */}
          <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#00d4ff,#0ea5e9)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:11, fontWeight:900, color:'#060810' }}>S</span>
          </div>
          <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.8)', flex:1 }}>Checkout</span>
          {/* Testing badge */}
          <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)', borderRadius:999, padding:'3px 10px' }}>
            <svg viewBox="0 0 24 24" style={{ width:9, height:9, color:'#10b981' }} fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span style={{ fontSize:9, fontWeight:800, color:'#10b981', letterSpacing:'.15em', textTransform:'uppercase' }}>Actif</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:'rgba(255,255,255,.04)' }}>
          <div style={{ height:'100%', width:'65%', background:'linear-gradient(90deg,#00d4ff,#a855f7)', borderRadius:999, animation:'ext-progress 2s ease-in-out infinite alternate' }} />
        </div>

        {/* Checkout rows */}
        <div style={{ padding:'20px 20px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <span style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:500 }}>Sous-total</span>
            <span style={{ fontSize:13, color:'rgba(255,255,255,.6)', fontWeight:600 }}>180,00 €</span>
          </div>

          {/* Applied coupon row */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(0,212,255,.06)', border:'1px solid rgba(0,212,255,.2)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:18, height:18, borderRadius:999, background:'rgba(0,212,255,.15)', border:'1px solid rgba(0,212,255,.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg viewBox="0 0 24 24" style={{ width:10, height:10 }} fill="none" stroke="#00d4ff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:'#00d4ff', letterSpacing:'.06em' }}>SAVE20</span>
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:'#10b981' }}>-36,00 €</span>
          </div>

          {/* Total */}
          <div style={{ display:'flex', justifyContent:'space-between', paddingBottom:18, borderBottom:'1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize:14, fontWeight:800, color:'#fff' }}>Total</span>
            <span style={{ fontSize:14, fontWeight:900, color:'#fff' }}>144,00 €</span>
          </div>
        </div>

        {/* CTA button */}
        <div style={{ padding:'14px 20px 20px' }}>
          <div style={{ background:'rgba(0,212,255,.1)', border:'1px solid rgba(0,212,255,.25)', borderRadius:10, padding:'12px', textAlign:'center' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#00d4ff', letterSpacing:'.05em' }}>
              Application du meilleur code…
            </span>
          </div>
        </div>

      </div>

      {/* Glow under card */}
      <div style={{ position:'absolute', bottom:-40, left:'50%', transform:'translateX(-50%)', width:200, height:60, background:'radial-gradient(ellipse, rgba(0,212,255,.25), transparent 70%)', filter:'blur(12px)', pointerEvents:'none' }} />

      <style>{`
        @keyframes ext-progress {
          0%   { width: 40% }
          100% { width: 85% }
        }
      `}</style>
    </div>
  )
}

export function ExtensionPromo() {
  return (
    <section style={{ position:'relative', padding:'80px 28px', overflow:'hidden', background:'transparent' }}>

      {/* Background glow */}
      <div style={{ position:'absolute', top:'50%', left:'-10%', transform:'translateY(-50%)', width:600, height:600, background:'radial-gradient(circle, rgba(0,212,255,.09) 0%, transparent 65%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'absolute', top:'30%', right:'5%', width:400, height:400, background:'radial-gradient(circle, rgba(168,85,247,.06) 0%, transparent 65%)', pointerEvents:'none', zIndex:0 }} />

      <div style={{ maxWidth:1160, margin:'0 auto', position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'space-between', gap:64, flexWrap:'wrap' }}>

        {/* Left — text */}
        <div style={{ flex:1, minWidth:320, maxWidth:520 }}>

          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:28, border:'1px solid rgba(0,212,255,.35)', background:'rgba(0,212,255,.07)', borderRadius:999, padding:'6px 14px 6px 8px' }}>
            <div style={{ width:22, height:22, borderRadius:999, background:'#00d4ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 24 24" fill="#060810" style={{ width:11, height:11 }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span style={{ fontSize:10, fontWeight:800, color:'#00d4ff', letterSpacing:'.2em', textTransform:'uppercase' }}>L&apos;extension Codepromoreduc</span>
          </div>

          {/* Headline */}
          <h2 style={{ fontSize:'clamp(32px,4vw,52px)', fontWeight:900, lineHeight:1.08, letterSpacing:'-.04em', color:'#fff', margin:'0 0 20px' }}>
            Codes en pilote<br />automatique.
          </h2>

          {/* Description */}
          <p style={{ fontSize:15, color:'rgba(255,255,255,.5)', lineHeight:1.7, margin:'0 0 36px', maxWidth:420 }}>
            Notre extension se glisse dans votre navigateur et teste automatiquement toutes les combinaisons de codes possibles — en injectant la remise la plus élevée directement à la caisse.
          </p>

          {/* CTA */}
          <button
            style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.9)', border:'1px solid rgba(255,255,255,.14)', borderRadius:999, padding:'14px 28px', fontSize:14, fontWeight:700, cursor:'pointer', backdropFilter:'blur(20px)', transition:'all 250ms ease', boxShadow:'0 8px 32px rgba(0,0,0,.3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(0,212,255,.12)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(0,212,255,.4)'; (e.currentTarget as HTMLButtonElement).style.color='#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.14)'; (e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.9)' }}
          >
            Ajouter à mon navigateur
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width:14, height:14 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>

        {/* Right — mockup */}
        <CheckoutMockup />

      </div>
    </section>
  )
}
