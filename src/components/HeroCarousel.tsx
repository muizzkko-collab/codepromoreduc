'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HeroSlide } from '@/app/actions/site-content'

const FALLBACK_SLIDES: HeroSlide[] = [
  { id:'f1', title:'Nike', subtitle:'Collection Premium', description:null, image_url:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1400&auto=format&fit=crop', tag:'Nouveau', discount_label:'-25%', button_label:'Voir le code Nike', link_url:'/all-stores/', color_theme:'cyan', sort_order:0, is_active:true },
  { id:'f2', title:'Apple', subtitle:'Dernières offres', description:null, image_url:'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1400&auto=format&fit=crop', tag:'Exclusif', discount_label:'-15%', button_label:'Voir le code Apple', link_url:'/all-stores/', color_theme:'cyan', sort_order:1, is_active:true },
  { id:'f3', title:'Sephora', subtitle:'Beauté & Soins', description:null, image_url:'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1400&auto=format&fit=crop', tag:'Promo', discount_label:'-20%', button_label:'Voir le code Sephora', link_url:'/all-stores/', color_theme:'cyan', sort_order:2, is_active:true },
  { id:'f4', title:'Amazon', subtitle:'Deals du jour', description:null, image_url:'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?q=80&w=1400&auto=format&fit=crop', tag:'Flash', discount_label:'-30%', button_label:'Voir les deals Amazon', link_url:'/all-stores/', color_theme:'cyan', sort_order:3, is_active:true },
  { id:'f5', title:'Adidas', subtitle:'Sport & Style', description:null, image_url:'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=1400&auto=format&fit=crop', tag:'Top', discount_label:'-20%', button_label:'Voir le code Adidas', link_url:'/all-stores/', color_theme:'cyan', sort_order:4, is_active:true },
]

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const dbActive = slides.filter(s => s.is_active)
  const active   = dbActive.length > 0 ? dbActive : FALLBACK_SLIDES
  const [current, setCurrent] = useState(0)

  const goTo = useCallback((i: number) => setCurrent(i), [])
  const prev = useCallback(() => setCurrent(c => (c - 1 + active.length) % active.length), [active.length])
  const next = useCallback(() => setCurrent(c => (c + 1) % active.length), [active.length])

  useEffect(() => {
    if (active.length < 2) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [active.length, next])

  function getOffset(i: number) {
    const n = active.length
    let offset = i - current
    if (offset > Math.floor(n / 2)) offset -= n
    if (offset < -Math.floor(n / 2)) offset += n
    return offset
  }

  return (
    <>
      {/* Inject responsive carousel CSS */}
      <style>{`
        .carousel-stage {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .carousel-card {
          position: absolute;
          border-radius: 18px;
          overflow: hidden;
          transition: transform .7s cubic-bezier(.25,.46,.45,.94), opacity .65s ease;
          width: 88vw;
          max-width: 360px;
          height: 240px;
        }
        /* Desktop: 3D effect, show side cards */
        @media (min-width: 768px) {
          .carousel-stage {
            overflow: visible;
            height: 430px;
            perspective: 1800px;
          }
          .carousel-card {
            width: 680px;
            max-width: 680px;
            height: 400px;
            border-radius: 22px;
          }
        }
        /* Mobile: only the active card, others hidden */
        @media (max-width: 767px) {
          .carousel-stage { height: 250px; }
          .carousel-card-side { opacity: 0 !important; pointer-events: none !important; transform: none !important; }
        }
      `}</style>

      <div className="relative w-full flex flex-col items-center mb-6 md:mb-10">
        {/* Stage */}
        <div className="carousel-stage">
          {active.map((slide, i) => {
            const offset = getOffset(i)
            const abs    = Math.min(Math.abs(offset), 2)
            const sign   = offset >= 0 ? 1 : -1
            const isSide = abs !== 0

            // Desktop 3D transform values
            const xPx   = [0, 420, 680]
            const ryDeg = [0, 18, 32]
            const scale = [1, 0.83, 0.66]
            const opac  = [1, 0.72, 0.38]

            return (
              <div
                key={slide.id}
                className={`carousel-card${isSide ? ' carousel-card-side' : ''}`}
                style={{
                  zIndex: [5, 3, 1][abs],
                  opacity: opac[abs],
                  transform: `translateX(${sign * xPx[abs]}px) rotateY(${-sign * ryDeg[abs]}deg) scale(${scale[abs]})`,
                  boxShadow: abs === 0 ? '0 30px 80px -15px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.08)' : 'none',
                  cursor: isSide ? 'pointer' : 'default',
                }}
                onClick={isSide ? () => goTo(i) : undefined}
              >
                {slide.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.image_url} alt={slide.title} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                )}
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.65) 0%, rgba(0,0,0,.1) 45%, transparent 70%)' }} />
                <div className="absolute bottom-3 left-3 md:bottom-7 md:left-7" style={{ zIndex:2 }}>
                  <Link
                    href={slide.link_url}
                    className="inline-flex items-center gap-1.5 font-black rounded-full"
                    style={{ padding:'8px 14px', fontSize:'11px', background:'rgba(56,189,248,.14)', color:'#e0f7ff', border:'1px solid rgba(56,189,248,.38)', backdropFilter:'blur(20px)', boxShadow:'inset 0 1.5px 2px rgba(255,255,255,.2)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {slide.button_label}
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Dots + arrows */}
        {active.length > 1 && (
          <div className="flex items-center gap-4 mt-4 md:mt-3">
            <button onClick={prev} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.14)', color:'rgba(255,255,255,.7)' }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2">
              {active.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: i === current ? '28px' : '8px', background: i === current ? '#38bdf8' : 'rgba(255,255,255,.22)', boxShadow: i === current ? '0 0 10px rgba(56,189,248,.65)' : 'none' }}
                />
              ))}
            </div>
            <button onClick={next} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.14)', color:'rgba(255,255,255,.7)' }}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
