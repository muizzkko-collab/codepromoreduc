import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const storeName = request.nextUrl.searchParams.get('store') ?? 'About You'
  const storeSlug = request.nextUrl.searchParams.get('slug') ?? 'about-you'

  const FC_KEY = process.env.FIRECRAWL_API_KEY

  const testUrl = `https://www.radins.com/codes-promo/${storeSlug}/`

  // Test 1: plain scrape
  const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FC_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: testUrl, formats: ['markdown'] }),
    signal: AbortSignal.timeout(20000),
  })

  const scrapeRaw = await scrapeRes.text()
  let scrapeParsed: unknown = null
  try { scrapeParsed = JSON.parse(scrapeRaw) } catch { scrapeParsed = scrapeRaw }

  // Test 2: search
  const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FC_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `${storeName} code promo site:radins.com`, limit: 3 }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => ({ ok: false, status: 0, text: async () => '' }))

  const searchRaw = await searchRes.text()
  let searchParsed: unknown = null
  try { searchParsed = JSON.parse(searchRaw) } catch { searchParsed = searchRaw }

  // Test 3: plain fetch (no Firecrawl)
  const plainRes = await fetch(testUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)

  const plainHtml = plainRes ? await plainRes.text() : ''

  return NextResponse.json({
    storeName, storeSlug, testUrl,
    scrape: {
      status: scrapeRes.status,
      keys: scrapeParsed && typeof scrapeParsed === 'object' ? Object.keys(scrapeParsed as object) : [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dataKeys: (scrapeParsed as any)?.data ? Object.keys((scrapeParsed as any).data) : [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markdownLength: ((scrapeParsed as any)?.data?.markdown ?? '').length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markdownPreview: ((scrapeParsed as any)?.data?.markdown ?? '').slice(0, 300),
      raw: typeof scrapeParsed === 'string' ? scrapeParsed.slice(0, 500) : scrapeParsed,
    },
    search: {
      status: searchRes.status ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      keys: searchParsed && typeof searchParsed === 'object' ? Object.keys(searchParsed as object) : [],
      raw: typeof searchParsed === 'string' ? searchParsed.slice(0, 500) : searchParsed,
    },
    plainFetch: {
      status: plainRes?.status ?? 0,
      htmlLength: plainHtml.length,
      htmlPreview: plainHtml.slice(0, 500),
    },
  })
}
