'use client'
import Link from 'next/link'
import { Store } from '@/lib/types'

const FALLBACK_BRANDS = [
  { name: 'Nike',      slug: 'nike',      logo_url: null, bg: 'linear-gradient(135deg,#1a1a1a,#333)' },
  { name: 'Sephora',   slug: 'sephora',   logo_url: null, bg: 'linear-gradient(135deg,#ec4899,#be185d)' },
  { name: 'Amazon',    slug: 'amazon',    logo_url: null, bg: 'linear-gradient(135deg,#f59e0b,#b45309)' },
  { name: 'Apple',     slug: 'apple',     logo_url: null, bg: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
  { name: 'Adidas',    slug: 'adidas',    logo_url: null, bg: 'linear-gradient(135deg,#10b981,#065f46)' },
  { name: 'Zara',      slug: 'zara',      logo_url: null, bg: 'linear-gradient(135deg,#8b5cf6,#4c1d95)' },
  { name: 'IKEA',      slug: 'ikea',      logo_url: null, bg: 'linear-gradient(135deg,#fbbf24,#d97706)' },
  { name: 'Uber Eats', slug: 'uber-eats', logo_url: null, bg: 'linear-gradient(135deg,#f97316,#c2410c)' },
]

interface Brand { name: string; slug: string; logo_url: string | null; bg: string }
interface Props { stores?: Store[] }

export function BrandMarquee({ stores }: Props) {
  const brands: Brand[] = stores && stores.length >= 4
    ? stores.slice(0, 12).map(s => ({ name: s.name, slug: s.slug, logo_url: s.logo_url ?? null, bg: '#fff' }))
    : FALLBACK_BRANDS

  // Repeat enough times to fill any viewport width seamlessly
  const repeated = [...brands, ...brands, ...brands, ...brands]

  return (
    <div style={{ position:'relative', zIndex:1, padding:'32px 0', overflow:'hidden', borderTop:'1px solid rgba(255,255,255,.04)', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
      {/* Edge fade masks */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:140, background:'linear-gradient(90deg,#080e1a 40%,transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:140, background:'linear-gradient(270deg,#080e1a 40%,transparent)', zIndex:2, pointerEvents:'none' }} />

      {/* The track: animate translateX by -50% (one full set width) for seamless loop */}
      <div style={{ display:'flex', gap:0, animation:'marquee-x 32s linear infinite', willChange:'transform' }}>
        {repeated.map((b, i) => (
          <Link
            key={i}
            href={`/store/${b.slug}/`}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px', textDecoration:'none', flexShrink:0 }}
          >
            <div
              style={{ width:88, height:88, borderRadius:18, border:'1px solid rgba(255,255,255,.08)', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:12, transition:'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease', overflow:'hidden' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(-4px) scale(1.07)'
                el.style.boxShadow = '0 14px 36px rgba(0,0,0,.55)'
                el.style.borderColor = 'rgba(0,212,255,.4)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'none'
                el.style.boxShadow = 'none'
                el.style.borderColor = 'rgba(255,255,255,.08)'
              }}
            >
              {b.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.logo_url}
                  alt={b.name}
                  title={b.name}
                  style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}
                />
              ) : (
                <div style={{ width:'100%', height:'100%', borderRadius:10, background:b.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:900, color:'#fff' }}>
                  {b.name[0]}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes marquee-x {
          0%   { transform: translateX(0) }
          100% { transform: translateX(-50%) }
        }
      `}</style>
    </div>
  )
}
