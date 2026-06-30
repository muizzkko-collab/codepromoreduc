import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Fetch store
  const storeRes = await fetch(
    `${supabaseUrl}/rest/v1/stores?slug=eq.${slug}&select=id,name,logo_url,coupon_count&limit=1`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  )
  const stores = await storeRes.json()
  const store = stores[0]
  if (!store) return new Response('Not found', { status: 404 })

  // Fetch best discount
  const couponRes = await fetch(
    `${supabaseUrl}/rest/v1/coupons?store_id=eq.${store.id}&is_active=eq.true&discount_value=not.is.null&order=created_at.desc&limit=1&select=discount_value`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  )
  const coupons = await couponRes.json()
  const bestDiscount: string | null = coupons[0]?.discount_value ?? null

  // Try to load logo as base64
  let logoData: string | null = null
  if (store.logo_url) {
    try {
      const r = await fetch(store.logo_url)
      if (r.ok) {
        const buf  = await r.arrayBuffer()
        const mime = r.headers.get('content-type') ?? 'image/png'
        logoData   = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
      }
    } catch { /* skip logo if unreachable */ }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          background: 'linear-gradient(135deg, #1D3557 0%, #0f2340 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif', position: 'relative',
          padding: '60px',
        }}
      >
        {/* Top left branding */}
        <div style={{
          position: 'absolute', top: '36px', left: '48px',
          color: 'rgba(255,255,255,0.5)', fontSize: '22px', letterSpacing: '0.05em',
        }}>
          codepromoreduc.fr
        </div>

        {/* Logo */}
        {logoData && (
          <div style={{
            width: '140px', height: '140px', background: 'white',
            borderRadius: '20px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            padding: '16px', marginBottom: '28px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoData} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        )}

        {/* Store name */}
        <div style={{
          color: 'white', fontSize: store.name.length > 20 ? '52px' : '68px',
          fontWeight: 800, textAlign: 'center', lineHeight: 1.1,
          maxWidth: '900px', marginBottom: '24px',
        }}>
          {store.name}
        </div>

        {/* Discount badge */}
        {bestDiscount && (
          <div style={{
            background: '#E63946', color: 'white',
            fontSize: '32px', fontWeight: 700,
            padding: '12px 36px', borderRadius: '999px',
            marginBottom: '16px',
          }}>
            Jusqu&apos;à {bestDiscount} de réduction
          </div>
        )}

        {/* Coupon count */}
        <div style={{
          color: 'rgba(255,255,255,0.7)', fontSize: '24px',
          marginTop: bestDiscount ? '0' : '8px',
        }}>
          {store.coupon_count} codes promo &amp; réductions valides
        </div>

        {/* Bottom badge */}
        <div style={{
          position: 'absolute', bottom: '36px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px', padding: '10px 28px',
          color: 'rgba(255,255,255,0.8)', fontSize: '20px',
        }}>
          Codes Promo &amp; Réductions — codepromoreduc.fr
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
