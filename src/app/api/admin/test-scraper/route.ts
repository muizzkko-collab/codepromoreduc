import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const FC = () => process.env.FIRECRAWL_API_KEY ?? ''

async function fcSearch(storeName: string, domain: string) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FC()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `"${storeName}" code promo réduction site:${domain}`, limit: 2 }),
    signal: AbortSignal.timeout(20000),
  })
  const json = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, urls: ((json?.data ?? []) as any[]).map((r: any) => r.url) }
}

async function fcScrape(url: string) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FC()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'] }),
    signal: AbortSignal.timeout(25000),
  })
  const json = await res.json()
  const md: string = json?.data?.markdown ?? ''
  return { status: res.status, markdownLength: md.length, preview: md.slice(0, 300) }
}

export async function GET(request: NextRequest) {
  const storeName = request.nextUrl.searchParams.get('store') ?? 'About You'
  const domains = ['radins.com', 'reduc.fr', 'ma-reduc.com', 'ouest-france.fr']

  // Step 1: search each domain
  const searchResults = await Promise.all(domains.map(d => fcSearch(storeName, d).catch(e => ({ status: 0, urls: [], error: String(e) }))))

  // Step 2: scrape first URL found per domain
  const scrapeResults = await Promise.all(
    searchResults.map(async (sr, i) => {
      const url = sr.urls?.[0]
      if (!url) return { domain: domains[i], url: null, markdownLength: 0, preview: '' }
      const scraped = await fcScrape(url).catch(() => ({ status: 0, markdownLength: 0, preview: '' }))
      return { domain: domains[i], url, ...scraped }
    })
  )

  // Step 3: run Claude on combined content
  const combined = scrapeResults.filter(r => r.markdownLength > 400).map(r => `[${r.domain}]\n${r.preview}`).join('\n---\n')
  let claudeOutput = 'no content to send to Claude'
  if (combined) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: `Extract coupon codes for "${storeName}" from this content. Return JSON array with title, code, type fields.\n\n${combined.slice(0, 4000)}` }],
    })
    claudeOutput = msg.content[0].type === 'text' ? msg.content[0].text : 'no text'
  }

  return NextResponse.json({ storeName, searchResults: searchResults.map((r, i) => ({ domain: domains[i], ...r })), scrapeResults, claudeOutput })
}
