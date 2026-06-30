'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Store } from '@/lib/types'

const GRADIENTS = [
  'linear-gradient(135deg,#1a1a1a,#333)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#f59e0b,#b45309)',
  'linear-gradient(135deg,#38bdf8,#0284c7)',
  'linear-gradient(135deg,#10b981,#065f46)',
  'linear-gradient(135deg,#8b5cf6,#4c1d95)',
  'linear-gradient(135deg,#fbbf24,#d97706)',
  'linear-gradient(135deg,#f97316,#c2410c)',
]

const FALLBACK_BRANDS = [
  { name: 'Nike',      slug: 'nike',      logo_url: null },
  { name: 'Sephora',   slug: 'sephora',   logo_url: null },
  { name: 'Amazon',    slug: 'amazon',    logo_url: null },
  { name: 'Apple',     slug: 'apple',     logo_url: null },
  { name: 'Adidas',    slug: 'adidas',    logo_url: null },
  { name: 'Zara',      slug: 'zara',      logo_url: null },
  { name: 'IKEA',      slug: 'ikea',      logo_url: null },
  { name: 'Uber Eats', slug: 'uber-eats', logo_url: null },
]

interface Brand { name: string; slug: string; logo_url: string | null }
interface Props { stores?: Store[] }

function LogoCard({ brand, idx }: { brand: Brand; idx: number }) {
  const [imgFailed, setImgFailed] = useState(false)
  const gradient = GRADIENTS[idx % GRADIENTS.length]
  const showLogo = brand.logo_url && !imgFailed

  return (
    <div
      style={{
        width: 82, height: 82, borderRadius: 18,
        border: '1px solid rgba(255,255,255,.08)',
        background: showLogo ? '#fff' : gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: showLogo ? 10 : 0,
        overflow: 'hidden',
        transition: 'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
      }}
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
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logo_url!}
          alt={brand.name}
          title={brand.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', userSelect: 'none' }}>
          {brand.name[0]?.toUpperCase()}
        </span>
      )}
    </div>
  )
}

export function BrandMarquee({ stores }: Props) {
  const brands: Brand[] = stores && stores.length >= 4
    ? stores.slice(0, 12).map(s => ({ name: s.name, slug: s.slug, logo_url: s.logo_url ?? null }))
    : FALLBACK_BRANDS

  // Repeat 4× for seamless infinite loop on any viewport
  const repeated = [...brands, ...brands, ...brands, ...brands]

  return (
    <div style={{
      position: 'relative', zIndex: 1, padding: '28px 0',
      overflow: 'hidden',
      borderTop: '1px solid rgba(255,255,255,.04)',
      borderBottom: '1px solid rgba(255,255,255,.04)',
    }}>
      {/* Edge fade masks */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 100, background: 'linear-gradient(90deg,#080e1a 40%,transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 100, background: 'linear-gradient(270deg,#080e1a 40%,transparent)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Scrolling track */}
      <div style={{
        display: 'flex', gap: 0,
        width: 'max-content',
        animation: 'marquee-x 30s linear infinite',
        willChange: 'transform',
      }}>
        {repeated.map((b, i) => (
          <Link
            key={i}
            href={`/store/${b.slug}/`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px', textDecoration: 'none', flexShrink: 0 }}
          >
            <LogoCard brand={b} idx={i % brands.length} />
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes marquee-x {
          0%   { transform: translateX(0) }
          100% { transform: translateX(-50%) }
        }
        @media (max-width: 767px) {
          [style*="marquee-x"] { animation-duration: 12s !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="marquee-x"] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
