import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'
import { createHash } from 'crypto'

export const maxDuration = 60

const BUCKET       = 'logos'
const STORAGE_PATH = 'stores'
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY!

async function fetchImage(url: string, timeout = 12000): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LogoBot/1.0)' },
      signal: AbortSignal.timeout(timeout),
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.startsWith('image/') && !ct.includes('octet-stream')) return null
    return Buffer.from(await res.arrayBuffer())
  } catch { return null }
}

async function processImage(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .webp({ quality: 85 })
    .toBuffer()
}

function extractDomains(store: { slug: string; affiliate_url: string | null; name: string }): string[] {
  const candidates: string[] = []
  if (store.affiliate_url) {
    try {
      const u = new URL(store.affiliate_url)
      const host = u.hostname.replace(/^www\./, '')
      const isTracker = /awin|kwanko|effili|tradedoubler|zanox|cj\.com|linksynergy/i.test(host)
      if (!isTracker) candidates.push(host)
    } catch {}
  }
  const slugBase = store.slug.replace(/^code-promo-/, '')
  const slugNoHyphen = slugBase.replace(/-/g, '')
  candidates.push(`${slugBase}.fr`, `${slugBase}.com`, `${slugNoHyphen}.fr`, `${slugNoHyphen}.com`)
  const nameDomain = store.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
  if (nameDomain) candidates.push(`${nameDomain}.fr`, `${nameDomain}.com`)
  return [...new Set(candidates)].slice(0, 8)
}

async function tryGoogleFavicon(domain: string): Promise<Buffer | null> {
  const buf = await fetchImage(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`, 10000)
  if (!buf || buf.length < 800) return null
  // Get generic globe hash for comparison
  const globeBuf = await fetchImage('https://www.google.com/s2/favicons?domain=this-domain-does-not-exist-xyz.invalid&sz=128', 8000)
  if (globeBuf) {
    const globeHash = createHash('md5').update(globeBuf).digest('hex')
    const thisHash  = createHash('md5').update(buf).digest('hex')
    if (thisHash === globeHash) return null
  }
  return buf
}

async function tryClearbit(domain: string): Promise<Buffer | null> {
  return fetchImage(`https://logo.clearbit.com/${domain}`, 12000)
}

async function tryDuckDuckGo(domain: string): Promise<Buffer | null> {
  const buf = await fetchImage(`https://icons.duckduckgo.com/ip3/${domain}.ico`, 10000)
  return buf && buf.length > 500 ? buf : null
}

async function tryFirecrawl(domain: string): Promise<Buffer | null> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `https://${domain}`, formats: ['html'] }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const html: string = json?.data?.html ?? ''
    if (!html) return null

    const candidates: string[] = []
    const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
    if (ogImg) candidates.push(ogImg)

    const touchIcon = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)?.[1]
    if (touchIcon) candidates.push(touchIcon.startsWith('http') ? touchIcon : `https://${domain}${touchIcon}`)

    for (const imgUrl of candidates) {
      const buf = await fetchImage(imgUrl, 15000)
      if (buf && buf.length > 500) {
        try {
          const meta = await sharp(buf).metadata()
          if (meta.width && meta.height && !(meta.width > 500 && meta.height < 200)) return buf
        } catch {}
      }
    }
  } catch {}
  return null
}

function generateSVGPlaceholder(name: string): Buffer {
  const initials = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    || name.slice(0, 2).toUpperCase()
  const COLORS: Record<string, { bg: string; text: string }> = {
    abcde: { bg: '#E63946', text: '#ffffff' },
    fghij: { bg: '#457B9D', text: '#ffffff' },
    klmno: { bg: '#2A9D8F', text: '#ffffff' },
    pqrst: { bg: '#E9C46A', text: '#1a1a1a' },
    uvwxyz: { bg: '#6A0572', text: '#ffffff' },
  }
  const first = (name[0] ?? '').toLowerCase()
  const { bg, text } = Object.entries(COLORS).find(([k]) => k.includes(first))?.[1] ?? { bg: '#264653', text: '#ffffff' }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" ry="24" fill="${bg}"/><text x="100" y="118" font-family="system-ui,sans-serif" font-size="72" font-weight="900" text-anchor="middle" fill="${text}">${initials}</text></svg>`
  return Buffer.from(svg)
}

async function autoImport(storeId: string): Promise<{ logoUrl: string; source: string }> {
  const supabase = createAdminClient()
  const { data: store } = await supabase.from('stores').select('id,name,slug,affiliate_url').eq('id', storeId).single()
  if (!store) throw new Error('Store not found')

  const domains = extractDomains(store)
  let rawBuf: Buffer | null = null
  let source = 'placeholder'

  for (const domain of domains.slice(0, 3)) {
    rawBuf = await tryGoogleFavicon(domain)
    if (rawBuf) { source = 'google_favicon'; break }
  }
  if (!rawBuf) {
    for (const domain of domains.slice(0, 3)) {
      rawBuf = await tryClearbit(domain)
      if (rawBuf) { source = 'clearbit'; break }
    }
  }
  if (!rawBuf) {
    for (const domain of domains.slice(0, 3)) {
      rawBuf = await tryDuckDuckGo(domain)
      if (rawBuf) { source = 'duckduckgo'; break }
    }
  }
  if (!rawBuf) {
    for (const domain of domains.slice(0, 2)) {
      rawBuf = await tryFirecrawl(domain)
      if (rawBuf) { source = 'firecrawl'; break }
    }
  }

  let uploadBuf: Buffer
  let ext = 'webp'

  if (rawBuf) {
    uploadBuf = await processImage(rawBuf)
  } else {
    uploadBuf = generateSVGPlaceholder(store.name)
    ext = 'svg'
    source = 'placeholder'
  }

  const path = `${STORAGE_PATH}/${store.slug}.${ext}`
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, uploadBuf, {
    contentType: ext === 'svg' ? 'image/svg+xml' : 'image/webp',
    upsert: true,
  })
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const logoUrl = data.publicUrl

  await supabase.from('stores').update({ logo_url: logoUrl, logo_source: source, logo_imported_at: new Date().toISOString() }).eq('id', storeId)
  return { logoUrl, source }
}

async function manualUpload(storeId: string, base64: string, mimeType: string): Promise<{ logoUrl: string }> {
  const supabase = createAdminClient()
  const { data: store } = await supabase.from('stores').select('id,name,slug').eq('id', storeId).single()
  if (!store) throw new Error('Store not found')

  const rawBuf = Buffer.from(base64, 'base64')
  const processed = await processImage(rawBuf)
  const path = `${STORAGE_PATH}/${store.slug}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, processed, { contentType: 'image/webp', upsert: true })
  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const logoUrl = data.publicUrl
  await supabase.from('stores').update({ logo_url: logoUrl, logo_source: 'manual', logo_imported_at: new Date().toISOString() }).eq('id', storeId)
  return { logoUrl }
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'stores') && !hasPermission(profile, 'automation')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { storeId: string; method?: 'auto' | 'manual'; base64?: string; mimeType?: string }
  const { storeId, method = 'auto', base64, mimeType } = body

  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

  try {
    if (method === 'manual') {
      if (!base64) return NextResponse.json({ error: 'base64 required for manual upload' }, { status: 400 })
      const result = await manualUpload(storeId, base64, mimeType ?? 'image/png')
      return NextResponse.json({ ...result, source: 'manual' })
    }
    const result = await autoImport(storeId)
    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
