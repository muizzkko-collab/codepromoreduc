import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import type { ContentBody } from '@/lib/types'

export const maxDuration = 300

const TARGET_DOMAINS = ['radins.com', 'reduc.fr', 'ma-reduc.com', 'ouest-france.fr']

async function firecrawlScrape(url: string): Promise<string> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) return ''
    const json = await res.json()
    const md = (json?.data?.markdown as string) ?? ''
    const lower = md.toLowerCase().slice(0, 300)
    const isError = ['page introuvable', 'erreur 404', 'page not found', '404 not found'].some(p => lower.includes(p))
    return isError ? '' : md
  } catch { return '' }
}

async function searchStoreUrl(storeName: string, domain: string): Promise<string> {
  const tryQuery = async (q: string): Promise<string> => {
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: q, limit: 3 }),
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) return ''
      const json = await res.json()
      const results = (json?.data ?? []) as { url?: string }[]
      const hit = results.find(r => {
        const u = r.url ?? ''
        return u.includes(domain) && u.length > `https://www.${domain}`.length + 5
      })
      return hit?.url ?? ''
    } catch { return '' }
  }

  let url = await tryQuery(`"${storeName}" code promo site:${domain}`)
  if (!url) url = await tryQuery(`${storeName} code promo réduction site:${domain}`)
  if (!url) url = await tryQuery(`${storeName} site:${domain}`)
  return url
}

async function scrapeCompetitors(storeName: string): Promise<string> {
  const results = await Promise.allSettled(
    TARGET_DOMAINS.map(async domain => {
      const url = await searchStoreUrl(storeName, domain)
      if (!url) return ''
      const md = await firecrawlScrape(url)
      return md.length > 200 ? `[${domain}]\n${md.slice(500, 4500)}` : ''
    })
  )
  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value.length > 50)
    .map(r => r.value)
    .join('\n\n---\n\n')
    .slice(0, 14000)
}

export interface GenerateResult {
  coupons: Array<{ title: string; code: string | null; discount: string | null; type: string }>
  content_body: ContentBody
  meta_description: string
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'auto_add') && !hasPermission(profile, 'stores')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  const { storeName, source, hasCoupons } = (await req.json()) as {
    storeName: string
    source: string | null
    hasCoupons: boolean
  }

  if (!storeName?.trim()) return NextResponse.json({ error: 'storeName required' }, { status: 400 })

  // For scraper mode (not in any network) — crawl competitor sites first
  let scraperContent = ''
  if (!source) {
    scraperContent = await scrapeCompetitors(storeName)
  }

  // Fetch top stores from DB for interlinking
  const supabase = createAdminClient()
  const { data: topStores } = await supabase
    .from('stores')
    .select('name, slug')
    .eq('is_active', true)
    .order('coupon_count', { ascending: false })
    .limit(20)

  const interlinks = (topStores ?? [])
    .slice(0, 12)
    .map(s => `${s.name}: /store/${s.slug}/`)
    .join('\n')

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const couponSection = hasCoupons
    ? `Les codes promo et offres ont déjà été récupérés depuis le réseau affilié ${source}. Ne génère pas de coupons fictifs dans le champ "coupons".`
    : `Extrais TOUS les codes promo et offres réels trouvés dans le contenu des sites concurrents. Si aucune info disponible, génère 3-5 offres génériques plausibles pour ce type de boutique.`

  const prompt = `Tu es un expert SEO et rédacteur web français. Crée le contenu complet pour la page boutique "${storeName}" sur codepromoreduc.fr, un comparateur de codes promo.

${scraperContent ? `## Contenu collecté sur des sites concurrents\n${scraperContent}\n\n` : source ? `La boutique est disponible sur le réseau affilié: ${source}.\n\n` : ''}

${couponSection}

## Instructions

Génère un JSON avec cette structure EXACTE (respecte tous les champs):

{
  "coupons": [
    { "title": "Description de l'offre en français", "code": "CODE123 ou null", "discount": "20% ou 10€ ou null", "type": "code|deal|shipping" }
  ],
  "content": {
    "description": "3-4 paragraphes (280-380 mots) en français présentant ${storeName}: historique, catégories de produits, avantages clients, pourquoi faire ses achats là-bas. Intègre naturellement 2-3 liens internes vers des boutiques similaires au format [Nom](/store/slug/).",
    "h2_sections": [
      {
        "heading": "Comment utiliser un code promo ${storeName} ?",
        "content": "Guide étape par étape (150-200 mots): trouver le code sur codepromoreduc.fr, le copier, aller sur le site, l'appliquer au panier, valider la commande."
      },
      {
        "heading": "Les meilleures offres et promotions ${storeName}",
        "content": "Description des types d'offres habituelles (soldes, ventes privées, codes exclusifs, livraison gratuite). 120-180 mots."
      },
      {
        "heading": "Boutiques similaires à ${storeName}",
        "content": "Présentation de 3-4 boutiques similaires avec liens internes au format [Nom](/store/slug/). 100-150 mots."
      }
    ],
    "faqs": [
      { "question": "Comment avoir un code promo ${storeName} valide ?", "answer": "Réponse détaillée 60-80 mots." },
      { "question": "${storeName} offre-t-il la livraison gratuite ?", "answer": "Réponse 40-60 mots." },
      { "question": "Quand ${storeName} fait-il ses soldes ?", "answer": "Réponse 40-60 mots." },
      { "question": "Peut-on cumuler plusieurs codes promo chez ${storeName} ?", "answer": "Réponse 40-60 mots." }
    ],
    "internal_link_mentions": ["/store/slug1/", "/store/slug2/", "/store/slug3/"]
  },
  "meta_description": "Code promo ${storeName} : économisez avec nos offres vérifiées et mises à jour. [max 155 caractères au total]"
}

## Boutiques disponibles pour les liens internes (choisir 3-5 pertinentes)
${interlinks}

## Règles impératives
- Tout en français, ton professionnel et accrocheur
- Coupons: max 15, vrais codes si disponibles, types corrects
- Liens internes uniquement depuis la liste fournie ci-dessus
- meta_description: EXACTEMENT 130-155 caractères, inclure "code promo ${storeName}"
- Réponds UNIQUEMENT avec le JSON valide, aucun texte avant ou après`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 5000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    return NextResponse.json({ error: 'AI generation failed — invalid JSON response' }, { status: 500 })
  }

  let parsed: {
    coupons?: GenerateResult['coupons']
    content?: {
      description?: string
      h2_sections?: ContentBody['h2_sections']
      faqs?: ContentBody['faqs']
      internal_link_mentions?: string[]
    }
    meta_description?: string
  }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI response JSON parse error' }, { status: 500 })
  }

  const result: GenerateResult = {
    coupons: hasCoupons ? [] : (parsed.coupons ?? []).slice(0, 15),
    content_body: {
      description:              parsed.content?.description ?? '',
      h2_sections:              parsed.content?.h2_sections ?? [],
      faqs:                     parsed.content?.faqs ?? [],
      internal_link_mentions:   parsed.content?.internal_link_mentions ?? [],
    },
    meta_description: parsed.meta_description ?? '',
  }

  return NextResponse.json(result)
}
