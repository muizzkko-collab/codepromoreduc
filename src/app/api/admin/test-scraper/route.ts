import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const FC_KEY = () => process.env.FIRECRAWL_API_KEY ?? ''

async function fcScrape(url: string) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FC_KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'] }),
    signal: AbortSignal.timeout(25000),
  })
  const json = await res.json()
  return { status: res.status, markdownLength: (json?.data?.markdown ?? '').length, preview: (json?.data?.markdown ?? '').slice(0, 400), raw: json }
}

async function fcSearch(query: string) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FC_KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: 3 }),
    signal: AbortSignal.timeout(20000),
  })
  const json = await res.json()
  return { status: res.status, raw: json }
}

export async function GET(request: NextRequest) {
  const storeName = request.nextUrl.searchParams.get('store') ?? 'About You'

  // Test scraping the exact real URLs provided by the user
  const realUrls = [
    `https://www.lareduction.fr/s/aboutyou.fr`,
    `https://www.radins.com/code-promo/about-you/`,
    `https://www.reduc.fr/codes-promo/aboutyou`,
    `https://www.ma-reduc.com/reductions-pour-about-you.php`,
    `https://www.ouest-france.fr/shopping/code-promo/about-you-162`,
  ]

  const [r1, r2, r3, r4, r5] = await Promise.all(realUrls.map(url => fcScrape(url).catch(e => ({ error: String(e) }))))

  // Test search approach
  const searchTest = await fcSearch(`"${storeName}" code promo site:radins.com`).catch(e => ({ error: String(e) }))

  return NextResponse.json({
    storeName,
    scrapeRealUrls: { lareduction: r1, radins: r2, reduc: r3, maReduc: r4, ouestFrance: r5 },
    searchTest,
  })
}
