import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 90

const FC = () => process.env.FIRECRAWL_API_KEY ?? ''
const TARGET_DOMAINS = ['radins.com', 'reduc.fr', 'ma-reduc.com', 'ouest-france.fr']

async function findAndScrape(storeName: string, domain: string): Promise<{ url: string; markdownLength: number; md: string }> {
  const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FC()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `"${storeName}" code promo réduction site:${domain}`, limit: 1 }),
    signal: AbortSignal.timeout(20000),
  })
  const sj = await searchRes.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const url: string = (sj?.data?.[0] as any)?.url ?? ''
  if (!url) return { url: '', markdownLength: 0, md: '' }

  const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FC()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'] }),
    signal: AbortSignal.timeout(25000),
  })
  const scrapeJson = await scrapeRes.json()
  const md: string = scrapeJson?.data?.markdown ?? ''
  return { url, markdownLength: md.length, md }
}

import { verifyAdminRequest, unauthorizedResponse } from '@/lib/security/verify-admin'

export async function GET(request: NextRequest) {
  const { authorized } = await verifyAdminRequest()
  if (!authorized) return unauthorizedResponse()

  const storeName = request.nextUrl.searchParams.get('store') ?? 'About You'

  const results = await Promise.all(
    TARGET_DOMAINS.map(d => findAndScrape(storeName, d).catch(e => ({ url: '', markdownLength: 0, md: '', error: String(e) })))
  )

  const chunks = results.map((r, i) => {
    const content = r.md.length > 500 ? r.md.slice(500, 5500) : r.md.slice(0, 5000)
    return { domain: TARGET_DOMAINS[i], url: r.url, markdownLength: r.markdownLength, contentSent: content.length }
  })

  const combinedContent = results
    .map((r, i) => {
      if (r.markdownLength < 400) return null
      const c = r.md.length > 500 ? r.md.slice(500, 5500) : r.md.slice(0, 5000)
      return `[source: ${TARGET_DOMAINS[i]}]\n${c}`
    })
    .filter(Boolean)
    .join('\n\n---\n\n')
    .slice(0, 14000)

  let claudeOutput = 'no content'
  let claudeRaw = ''
  if (combinedContent) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Extract ALL coupon codes and deals for "${storeName}" from this French coupon site content. Return ONLY a JSON array.\n\nEach item: {"title": string, "code": string|null, "discount": string|null, "type": "code"|"deal"|"shipping", "expiry": string|null}\n\nContent:\n${combinedContent}`,
      }],
    })
    claudeRaw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    claudeOutput = claudeRaw.slice(0, 2000)
  }

  return NextResponse.json({ storeName, chunks, totalContentLength: combinedContent.length, claudeOutput })
}
