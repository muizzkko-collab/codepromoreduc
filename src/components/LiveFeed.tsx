'use client'
import { useEffect, useState } from 'react'

interface FeedEntry { id: string; storeName: string; title: string; timeLabel: string }

const DEMO_CODES = ['WELCOME', 'SAVE20', 'PRIME15', 'SUMMER10', 'BOOST30', 'FLASH25', 'VIP15', 'CODE20']

export function LiveFeed({ entries }: { entries: FeedEntry[] }) {
  const [visible, setVisible] = useState(entries.slice(0, 5))
  const [cursor, setCursor]   = useState(5 % Math.max(entries.length, 1))
  const [dots, setDots]       = useState(3)

  useEffect(() => {
    const t = setInterval(() => setDots(d => (d % 3) + 1), 500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (entries.length <= 5) return
    const t = setInterval(() => {
      setVisible(prev => [entries[cursor % entries.length], ...prev].slice(0, 5))
      setCursor(c => c + 1)
    }, 4000)
    return () => clearInterval(t)
  }, [entries, cursor])

  return (
    <div style={{ position:'relative' }}>
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'500px', height:'500px', background:'radial-gradient(circle, rgba(56,189,248,.10), transparent 65%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'relative', zIndex:1, background:'#0b0d12', border:'1px solid rgba(255,255,255,.08)', borderRadius:'20px', overflow:'hidden', boxShadow:'0 40px 80px -20px rgba(0,0,0,.7)' }}>
        {/* Title bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.02)' }}>
          <div style={{ display:'flex', gap:'7px' }}>
            {[0,1,2].map(i => <div key={i} style={{ width:'11px', height:'11px', borderRadius:'999px', background:'rgba(255,255,255,.12)' }} />)}
          </div>
          <span style={{ fontFamily:'var(--font-jetbrains),monospace', fontSize:'9.5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.18em', color:'rgba(255,255,255,.4)' }}>Flux de vérification en direct</span>
          <span style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'9.5px', fontWeight:800, color:'#10b981', letterSpacing:'.1em' }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'999px', background:'#10b981', boxShadow:'0 0 8px #10b981', display:'inline-block', animation:'live-pulse 1.6s ease-in-out infinite' }} />
            Live
          </span>
        </div>

        {/* Entries */}
        {visible.length === 0 ? (
          <div style={{ padding:'40px 20px', textAlign:'center', color:'rgba(255,255,255,.3)', fontFamily:'var(--font-jetbrains),monospace', fontSize:'11px' }}>Aucune activité récente.</div>
        ) : (
          visible.map((entry, i) => (
            <div key={`${entry.id}-${i}`} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'6px' }}>
                <span style={{ fontSize:'13px', fontWeight:800, color:'#fff' }}>{entry.storeName}</span>
                <span style={{ fontFamily:'var(--font-jetbrains),monospace', fontSize:'9px', color:'rgba(255,255,255,.3)' }}>{entry.timeLabel}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'5px' }}>
                <span style={{ fontFamily:'var(--font-jetbrains),monospace', fontSize:'11px', color:'rgba(255,255,255,.55)' }}>Code vérifié :</span>
                <span style={{ fontFamily:'var(--font-jetbrains),monospace', fontSize:'11px', fontWeight:700, color:'#38bdf8', letterSpacing:'.06em' }}>
                  {DEMO_CODES[i % DEMO_CODES.length]}
                </span>
                <span style={{ padding:'2px 8px', fontSize:'8.5px', fontWeight:900, textTransform:'uppercase', letterSpacing:'.15em', borderRadius:'4px', background:'rgba(16,185,129,.15)', color:'#34d399', border:'1px solid rgba(16,185,129,.25)' }}>Vérifié</span>
              </div>
              <span style={{ fontFamily:'var(--font-jetbrains),monospace', fontSize:'10px', color:'rgba(255,255,255,.22)' }}>user_save_pro</span>
            </div>
          ))
        )}

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', gap:'8px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:'13px', height:'13px', flexShrink:0 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span style={{ fontFamily:'var(--font-jetbrains),monospace', fontSize:'10px', color:'rgba(255,255,255,.3)', letterSpacing:'.05em' }}>
            streaming verification events{'.' .repeat(dots)}
          </span>
        </div>
      </div>
    </div>
  )
}
