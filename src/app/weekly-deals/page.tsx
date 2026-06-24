import type { Metadata } from "next"
import Link from "next/link"
import { getSiteUrl, formatDate, hasCode } from "@/lib/utils"
import { getWeeklyDeals, getWeeklyStores } from "@/app/actions/deals"
import { getBlogPosts } from "@/app/actions/blog"
import { ExtensionPromo } from "@/components/ExtensionPromo"
import { CouponRevealButton } from "@/components/CouponRevealButton"
import { createClient } from "@/lib/supabase/server"
import type { Coupon, Store } from "@/lib/types"
import { ChevronRight, Tag, Store as StoreIcon, Calendar, Clock } from "lucide-react"

export const revalidate = 21600

export const metadata: Metadata = {
  title: "Offres de la Semaine — Codes Promo & Reductions | codepromoreduc.fr",
  description: "Decouvrez les meilleures offres et codes promo de la semaine. Economisez sur vos achats avec nos deals exclusifs selectionnes chaque semaine.",
  alternates: { canonical: getSiteUrl() + "/weekly-deals/" },
  openGraph: {
    title: "Offres de la Semaine | codepromoreduc.fr",
    description: "Les meilleures offres et codes promo selectionnes cette semaine.",
    url: getSiteUrl() + "/weekly-deals/",
  },
}

const OWN_DOMAINS = ["codepromoreduc.fr", "localhost"]

function resolveAffiliateUrl(destUrl: string | null | undefined, storeAffiliateUrl: string | null | undefined, storeSlug: string): string {
  if (destUrl) {
    try {
      const host = new URL(destUrl).hostname.replace(/^www\./, "")
      if (!OWN_DOMAINS.some(d => host === d || host.endsWith("." + d))) return destUrl
    } catch { /* ignore */ }
  }
  return storeAffiliateUrl?.trim() || `${getSiteUrl()}/store/${storeSlug}/`
}

function extractDiscount(discountValue: string | null | undefined, title: string, type: string): string | null {
  if (discountValue?.trim()) return discountValue.trim()
  const m = title.match(/(\d+[\s]?%|\d+[\s]?[Ee]ur(?:os?)?|\d+[\s]?€)/i)
  if (m) return m[0].replace(/\s/, "")
  if (type === "shipping") return "Livraison gratuite"
  if (type === "code") return "Code promo"
  return "Offre"
}

const hoverCSS = `
  .d-card{transition:transform 170ms ease,box-shadow 170ms ease,border-color 170ms ease;}
  .d-card:hover{transform:translateY(-5px) scale(1.018);box-shadow:0 20px 52px rgba(56,189,248,.22);border-color:rgba(56,189,248,.4)!important;}
  .d-deal-card{transition:transform 170ms ease,box-shadow 170ms ease,border-color 170ms ease;}
  .d-deal-card:hover{transform:translateY(-5px) scale(1.018);box-shadow:0 20px 52px rgba(16,185,129,.22);border-color:rgba(16,185,129,.4)!important;}
  .d-store-card{transition:transform 150ms ease,box-shadow 150ms ease,border-color 150ms ease;}
  .d-store-card:hover{transform:translateY(-4px) scale(1.06);box-shadow:0 12px 36px rgba(56,189,248,.18);border-color:rgba(56,189,248,.35)!important;}
  .d-banner-card{transition:transform 170ms ease,box-shadow 170ms ease;}
  .d-banner-card:hover{transform:translateY(-6px);box-shadow:0 24px 64px rgba(56,189,248,.28);}
  .d-btn{transition:transform 130ms ease,box-shadow 130ms ease,filter 130ms ease;}
  .d-btn:hover{transform:translateY(-3px) scale(1.06);box-shadow:0 10px 36px rgba(56,189,248,.55);filter:brightness(1.14);}
  .d-banner-btn{transition:transform 130ms ease,box-shadow 130ms ease,filter 130ms ease;}
  .d-banner-btn:hover{transform:scale(1.07);box-shadow:0 10px 40px rgba(56,189,248,.6);filter:brightness(1.12);}
  .d-nav-link{transition:transform 130ms ease,background 130ms ease,border-color 130ms ease;}
  .d-nav-link:hover{transform:translateY(-2px);background:rgba(56,189,248,.1)!important;border-color:rgba(56,189,248,.3)!important;}
`

export default async function WeeklyDealsPage() {
  const supabase = await createClient()

  const [dealsRes, storesRes, blogRes, topStoresRes, bannerStoresRes] = await Promise.all([
    getWeeklyDeals(), getWeeklyStores(), getBlogPosts(true),
    supabase.from("stores").select("id,name,slug,logo_url,coupon_count").eq("is_active", true).order("coupon_count", { ascending: false }).limit(8),
    supabase.from("stores").select("id,name,slug,logo_url,popup_banner_url,affiliate_url,coupon_count").eq("is_active", true).eq("show_on_weekly", true).limit(6),
  ])

  type CouponWithStore = Coupon & { store: Store & { affiliate_url?: string | null } }
  const allDeals = ((dealsRes.data ?? []) as unknown as CouponWithStore[])
  const coupons = allDeals.filter(c => hasCode(c))
  const deals = allDeals.filter(c => !hasCode(c))

  let stores = (storesRes.data ?? []) as Store[]
  if (stores.length === 0) stores = (topStoresRes.data ?? []) as Store[]

  type BannerStore = Store & { popup_banner_url?: string | null; affiliate_url?: string | null }
  let bannerStores = ((bannerStoresRes.data ?? []) as unknown as BannerStore[])
  if (bannerStores.length === 0) bannerStores = ((topStoresRes.data ?? []).slice(0, 4) as unknown as BannerStore[])

  const bannerCoupons = await Promise.all(
    bannerStores.map(s =>
      supabase.from("coupons").select("title,discount_value").eq("store_id", s.id).eq("is_active", true)
        .order("is_featured", { ascending: false }).limit(1).maybeSingle()
    )
  )

  const blogPosts = (blogRes.data ?? []).slice(0, 3)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: getSiteUrl() + "/" },
        { "@type": "ListItem", position: 2, name: "Offres de la Semaine", item: getSiteUrl() + "/weekly-deals/" },
      ]},
      { "@type": "ItemList", name: "Offres de la Semaine", numberOfItems: allDeals.length,
        itemListElement: allDeals.slice(0, 10).map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.title })) },
    ],
  }

  const Logo = ({ name, url, accent = "#38bdf8", bg = "rgba(56,189,248,.15)" }: { name: string; url?: string | null; accent?: string; bg?: string }) =>
    url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 8, background: "rgba(255,255,255,.08)", padding: 3, flexShrink: 0 }} />
    ) : (
      <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: accent, flexShrink: 0 }}>{(name || "?")[0]}</div>
    )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: hoverCSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ minHeight: "100vh", background: "#040612", color: "#fff" }}>

        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg,#0a0f2e 0%,#040612 50%,#0d1a3a 100%)", padding: "60px 24px 40px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.2)", borderRadius: 99, padding: "6px 16px", marginBottom: 20 }}>
              <Calendar style={{ width: 14, height: 14, color: "#38bdf8" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: ".1em" }}>Selection hebdomadaire</span>
            </div>
            <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 900, letterSpacing: "-.03em", marginBottom: 12, lineHeight: 1.1 }}>
              Meilleures Offres <span style={{ color: "#38bdf8" }}>de la Semaine</span>
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,.6)", marginBottom: 24 }}>Les deals incontournables selectionnes cette semaine</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.2)", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>
                <StoreIcon style={{ width: 14, height: 14, display: "inline", marginRight: 6 }} />{stores.length} boutiques
              </div>
              <div style={{ background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.2)", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>
                <Tag style={{ width: 14, height: 14, display: "inline", marginRight: 6 }} />{allDeals.length} offres
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

          <nav style={{ display: "flex", alignItems: "center", gap: 6, padding: "16px 0", fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,.4)", textDecoration: "none" }}>Accueil</Link>
            <ChevronRight style={{ width: 12, height: 12 }} />
            <span style={{ color: "#38bdf8" }}>Offres de la Semaine</span>
          </nav>

          {/* Store banners */}
          {bannerStores.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, letterSpacing: "-.02em" }}>Boutiques en Vedette</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
                {bannerStores.map((store, idx) => {
                  const best = bannerCoupons[idx]?.data
                  const storeUrl = store.affiliate_url?.trim() || `${getSiteUrl()}/store/${store.slug}/`
                  const bestDiscount = best ? extractDiscount(best.discount_value, best.title, "deal") : null
                  return (
                    <div key={store.id} className="d-banner-card" style={{ position: "relative", borderRadius: 18, overflow: "hidden",
                      background: store.popup_banner_url ? `url(${store.popup_banner_url}) center/cover` : "linear-gradient(135deg,#0d1e35,#0a2a4a)",
                      border: "1px solid rgba(255,255,255,.1)", minHeight: 180 }}>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(4,6,18,.25),rgba(4,6,18,.9))" }} />
                      <div style={{ position: "relative", zIndex: 1, padding: 20, display: "flex", flexDirection: "column", minHeight: 180, boxSizing: "border-box" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                          {store.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={store.logo_url} alt={store.name} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8, background: "rgba(255,255,255,.12)", padding: 4 }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(56,189,248,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#38bdf8" }}>{store.name[0]}</div>
                          )}
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{store.name}</span>
                        </div>
                        {best && (
                          <div style={{ marginBottom: 14, flex: 1 }}>
                            {bestDiscount && <div style={{ display: "inline-block", background: "rgba(56,189,248,.25)", border: "1px solid rgba(56,189,248,.5)", color: "#38bdf8", fontSize: 13, fontWeight: 900, borderRadius: 8, padding: "3px 10px", marginBottom: 6 }}>{bestDiscount}</div>}
                            <p style={{ fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.4 }}>{best.title}</p>
                          </div>
                        )}
                        <a href={storeUrl} target="_blank" rel="noopener noreferrer sponsored" className="d-banner-btn"
                          style={{ display: "block", textAlign: "center", background: "linear-gradient(90deg,#38bdf8,#818cf8)", color: "#fff", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
                          Voir les offres &#8594;
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Store grid */}
          {stores.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, letterSpacing: "-.02em" }}>Boutiques en Promotion</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 12 }}>
                {stores.map(store => (
                  <Link key={store.id} href={`/store/${store.slug}/`} style={{ textDecoration: "none" }}>
                    <div className="d-store-card" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, textAlign: "center", padding: "14px 10px" }}>
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={store.logo_url} alt={store.name} style={{ width: 44, height: 44, objectFit: "contain", margin: "0 auto 8px", borderRadius: 8, background: "rgba(255,255,255,.08)" }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(56,189,248,.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 16, fontWeight: 900, color: "#38bdf8" }}>{store.name[0]}</div>
                      )}
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{store.name}</p>
                      <p style={{ fontSize: 11, color: "#38bdf8" }}>{store.coupon_count} codes</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Code coupons */}
          {coupons.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, letterSpacing: "-.02em" }}>Codes Promo de la Semaine</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
                {coupons.map(coupon => {
                  const badge = extractDiscount(coupon.discount_value, coupon.title, coupon.type ?? "code")
                  return (
                    <div key={coupon.id} className="d-card" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "16px", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <Logo name={coupon.store?.name ?? ""} url={coupon.store?.logo_url} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 600, flex: 1 }}>{coupon.store?.name}</span>
                        {badge && <div style={{ background: "rgba(56,189,248,.22)", border: "1px solid rgba(56,189,248,.5)", color: "#38bdf8", fontSize: 12, fontWeight: 900, borderRadius: 8, padding: "3px 10px", whiteSpace: "nowrap" }}>{badge}</div>}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.4, flex: 1 }}>{coupon.title}</p>
                      {coupon.expiry_date && (
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock style={{ width: 11, height: 11 }} />Expire le {formatDate(coupon.expiry_date)}
                        </p>
                      )}
                      <div className="d-btn">
                        <CouponRevealButton
                          couponId={coupon.id} couponCode={coupon.code} couponTitle={coupon.title}
                          discountValue={coupon.discount_value ?? ""}
                          couponType={(coupon.type as "code" | "deal" | "free_shipping") ?? "code"}
                          storeLogoUrl={coupon.store?.logo_url ?? null} storeName={coupon.store?.name ?? ""} storeSlug={coupon.store?.slug}
                          affiliateUrl={resolveAffiliateUrl(coupon.destination_url, coupon.store?.affiliate_url, coupon.store?.slug ?? "")}
                          expiryDate={coupon.expiry_date}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* No-code deals */}
          {deals.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, letterSpacing: "-.02em" }}>Offres Sans Code</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
                {deals.map(deal => {
                  const badge = extractDiscount(deal.discount_value, deal.title, deal.type ?? "deal")
                  return (
                    <div key={deal.id} className="d-deal-card" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "16px", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <Logo name={deal.store?.name ?? ""} url={deal.store?.logo_url} accent="#10b981" bg="rgba(16,185,129,.15)" />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 600, flex: 1 }}>{deal.store?.name}</span>
                        {badge && <div style={{ background: "rgba(16,185,129,.22)", border: "1px solid rgba(16,185,129,.5)", color: "#10b981", fontSize: 12, fontWeight: 900, borderRadius: 8, padding: "3px 10px", whiteSpace: "nowrap" }}>{badge}</div>}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.4, flex: 1 }}>{deal.title}</p>
                      {deal.expiry_date && (
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock style={{ width: 11, height: 11 }} />Expire le {formatDate(deal.expiry_date)}
                        </p>
                      )}
                      <div className="d-btn">
                        <CouponRevealButton
                          couponId={deal.id} couponCode={null} couponTitle={deal.title}
                          discountValue={deal.discount_value ?? ""} couponType="deal"
                          storeLogoUrl={deal.store?.logo_url ?? null} storeName={deal.store?.name ?? ""} storeSlug={deal.store?.slug}
                          affiliateUrl={resolveAffiliateUrl(deal.destination_url, deal.store?.affiliate_url, deal.store?.slug ?? "")}
                          expiryDate={deal.expiry_date}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <div style={{ marginBottom: 48 }}><ExtensionPromo /></div>

          {blogPosts.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Conseils &amp; Bons Plans</h2>
                <Link href="/blog/" style={{ fontSize: 13, color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>Voir tout &#8594;</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                {blogPosts.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}/`} style={{ textDecoration: "none" }}>
                    <div className="d-store-card" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 20 }}>
                      {post.cover_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.cover_image_url} alt={post.title} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 10, marginBottom: 14 }} />
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: ".08em" }}>{post.category}</span>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "6px 0 8px", lineHeight: 1.4 }}>{post.title}</p>
                      {post.excerpt && <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>{post.excerpt}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
            <Link href="/daily-deals/" className="d-nav-link" style={{ padding: "10px 20px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Offres du Jour &#8594;</Link>
            <Link href="/all-stores/" className="d-nav-link" style={{ padding: "10px 20px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Toutes les Boutiques &#8594;</Link>
            <Link href="/blog/" className="d-nav-link" style={{ padding: "10px 20px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Notre Blog &#8594;</Link>
          </div>

        </div>
      </div>
    </>
  )
}
