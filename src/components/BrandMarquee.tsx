import { Store } from '@/lib/types'

const FALLBACK_BRANDS = [
  { name: 'Nike',      bg: 'linear-gradient(135deg,#1a1a1a,#333)' },
  { name: 'Sephora',   bg: 'linear-gradient(135deg,#ec4899,#be185d)' },
  { name: 'Amazon',    bg: 'linear-gradient(135deg,#f59e0b,#b45309)' },
  { name: 'Apple',     bg: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
  { name: 'Adidas',    bg: 'linear-gradient(135deg,#10b981,#065f46)' },
  { name: 'Zara',      bg: 'linear-gradient(135deg,#8b5cf6,#4c1d95)' },
  { name: 'IKEA',      bg: 'linear-gradient(135deg,#fbbf24,#d97706)' },
  { name: 'Uber Eats', bg: 'linear-gradient(135deg,#f97316,#c2410c)' },
]

const PALETTES = [
  'linear-gradient(135deg,#f97316,#c2410c)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#f59e0b,#b45309)',
  'linear-gradient(135deg,#38bdf8,#0284c7)',
  'linear-gradient(135deg,#10b981,#065f46)',
  'linear-gradient(135deg,#8b5cf6,#4c1d95)',
  'linear-gradient(135deg,#ef4444,#991b1b)',
  'linear-gradient(135deg,#06b6d4,#0e7490)',
]

interface Props { stores?: Store[] }

export function BrandMarquee({ stores }: Props) {
  const brands = stores && stores.length >= 4
    ? stores.slice(0, 8).map((s, i) => ({ name: s.name, bg: PALETTES[i % PALETTES.length] }))
    : FALLBACK_BRANDS

  const doubled = [...brands, ...brands]

  return (
    <div style={{ position:'relative', zIndex:1, padding:'40px 0', overflow:'hidden', borderTop:'1px solid rgba(255,255,255,.04)', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
      <div style={{ display:'flex', gap:0, width:'max-content', animation:'marquee-scroll 30s linear infinite' }}>
        {doubled.map((b, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'0 32px', fontSize:'11px', fontWeight:800, textTransform:'uppercase', letterSpacing:'.16em', color:'rgba(255,255,255,.35)', whiteSpace:'nowrap' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:b.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:900, color:'#fff', flexShrink:0 }}>
              {b.name[0]}
            </div>
            {b.name}
          </div>
        ))}
      </div>
    </div>
  )
}
