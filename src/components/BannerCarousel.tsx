"use client"
import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface BannerItem {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  popup_banner_url?: string | null
  affiliate_url?: string | null
  bestTitle?: string | null
  bestDiscount?: string | null
}

const hoverCSS = `
  .bc-btn:hover{transform:scale(1.08);box-shadow:0 10px 40px rgba(56,189,248,.6);filter:brightness(1.12);}
  .bc-arrow:hover{background:rgba(56,189,248,.25)!important;border-color:rgba(56,189,248,.5)!important;}
  .bc-dot:hover{background:rgba(56,189,248,.6)!important;}
`

export function BannerCarousel({ banners, siteUrl }: { banners: BannerItem[]; siteUrl: string }) {
  const perPage = 3
  const pageCount = Math.ceil(banners.length / perPage)
  const [page, setPage] = useState(0)

  const next = useCallback(() => setPage(p => (p + 1) % pageCount), [pageCount])
  const prev = () => setPage(p => (p - 1 + pageCount) % pageCount)

  useEffect(() => {
    if (pageCount <= 1) return
    const id = setTimeout(next, 7000)
    return () => clearTimeout(id)
  }, [page, pageCount, next])

  if (banners.length === 0) return null

  const visible = banners.slice(page * perPage, page * perPage + perPage)

  return (
    <section style={{ marginBottom: 48 }}>
      <style dangerouslySetInnerHTML={{ __html: hoverCSS }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", color: "#fff", margin: 0 }}>Boutiques en Vedette</h2>
        {pageCount > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={prev} className="bc-arrow" aria-label="Précédent"
              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 150ms,border-color 150ms" }}>
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            <button onClick={next} className="bc-arrow" aria-label="Suivant"
              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 150ms,border-color 150ms" }}>
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(visible.length, 3)},1fr)`, gap: 14 }}>
        {visible.map(store => {
          const storeUrl = store.affiliate_url?.trim() || `${siteUrl}/store/${store.slug}/`
          return (
            <div key={store.id} style={{ position: "relative", borderRadius: 16, overflow: "hidden",
              background: store.popup_banner_url ? `url(${store.popup_banner_url}) center/cover no-repeat` : "linear-gradient(135deg,#0d1e35,#0a2a4a)",
              border: "1px solid rgba(255,255,255,.1)", minHeight: 160,
              transition: "transform 170ms ease,box-shadow 170ms ease",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-5px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 52px rgba(56,189,248,.24)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "" }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(4,6,18,.2),rgba(4,6,18,.92))" }} />
              <div style={{ position: "relative", zIndex: 1, padding: "16px", display: "flex", flexDirection: "column", minHeight: 160, boxSizing: "border-box" }}>
                {/* Store header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  {store.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logo_url} alt={store.name} style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 7, background: "rgba(255,255,255,.12)", padding: 3, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: 7, background: "rgba(56,189,248,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#38bdf8", flexShrink: 0 }}>{store.name[0]}</div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{store.name}</span>
                </div>
                {/* Best offer */}
                <div style={{ flex: 1, marginBottom: 12 }}>
                  {store.bestDiscount && (
                    <div style={{ display: "inline-block", background: "rgba(56,189,248,.22)", border: "1px solid rgba(56,189,248,.45)", color: "#38bdf8", fontSize: 12, fontWeight: 900, borderRadius: 7, padding: "2px 8px", marginBottom: 5 }}>
                      {store.bestDiscount}
                    </div>
                  )}
                  {store.bestTitle && (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,.8)", lineHeight: 1.35, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {store.bestTitle}
                    </p>
                  )}
                </div>
                {/* CTA */}
                <a href={storeUrl} target="_blank" rel="noopener noreferrer sponsored" className="bc-btn"
                  style={{ display: "block", textAlign: "center", background: "linear-gradient(90deg,#38bdf8,#818cf8)", color: "#fff", borderRadius: 9, padding: "8px 12px", fontSize: 12, fontWeight: 800, textDecoration: "none", transition: "transform 130ms ease,box-shadow 130ms ease,filter 130ms ease" }}>
                  Voir les offres &#8594;
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dots */}
      {pageCount > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 16 }}>
          {Array.from({ length: pageCount }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)} className="bc-dot" aria-label={`Page ${i + 1}`}
              style={{ width: i === page ? 22 : 8, height: 8, borderRadius: 99, border: "none", cursor: "pointer", padding: 0,
                background: i === page ? "#38bdf8" : "rgba(255,255,255,.2)",
                transition: "width 300ms ease,background 200ms ease" }} />
          ))}
        </div>
      )}
    </section>
  )
}
