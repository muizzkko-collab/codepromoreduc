import { createAdminClient }                              from '@/lib/supabase/admin'
import type { StoreFacts, RelatedStore, RelatedCategory } from './gather-store-facts'
import type { ContentBody, ContentTier } from '@/lib/types'

// ─── Tier word targets ────────────────────────────────────────────────────────
const TIER_SPEC: Record<ContentTier, {
  descWords:   string
  h2Count:     string
  faqCount:    string
  linkCount:   number
}> = {
  premium:  { descWords: '350-500', h2Count: '2 à 3', faqCount: '4 à 5', linkCount: 4 },
  standard: { descWords: '150-200', h2Count: '1 à 2', faqCount: '2 à 3', linkCount: 3 },
  light:    { descWords: '60-100',  h2Count: '0 à 1', faqCount: '0 à 1', linkCount: 2 },
}

function buildSystemPrompt(): string {
  return `Tu es un rédacteur SEO expert en français pour un site de codes promo français (codepromoreduc.fr).

Tu rédiges la section de description qui apparaît EN BAS de la page boutique, SOUS les listings de codes promo. Ce contenu sert à aider l'utilisateur à comprendre la boutique, pas à vendre des offres — les offres sont déjà affichées au-dessus.

Règles impératives :
- Utilise UNIQUEMENT les faits réels fournis dans le contexte. Ne jamais inventer de délais de livraison, politiques de retour, ou détails non fournis.
- Évite les formules génériques comme "découvrez des économies incroyables" qui pourraient s'appliquer à n'importe quelle boutique.
- Varie la structure de tes phrases et ton ton d'une boutique à l'autre — ne suis pas un modèle identique.
- Les mentions de liens internes : écris le nom de la boutique ou catégorie naturellement dans le texte (ex: "similaire à [Nom Boutique]" ou "nos bons plans [Catégorie]") — ces mentions seront converties en vrais liens ensuite.
- N'utilise PAS de balises HTML dans ta réponse, seulement du texte brut.
- Retourne UNIQUEMENT du JSON valide, rien d'autre.`
}

function buildUserPrompt(facts: StoreFacts): string {
  const spec = TIER_SPEC[facts.tier]

  const scraped = facts.scraped
  const scrapedSection = scraped ? `
DONNÉES SCRAPÉES DU SITE RÉEL :
- Titre de la page : ${scraped.pageTitle ?? 'non disponible'}
- Description officielle : ${scraped.brandPositioning ?? 'non disponible'}
- Catégories de produits détectées : ${scraped.productCategories.join(', ') || 'non détectées'}
- Extrait du contenu de la page :
${scraped.mainText.slice(0, 600)}
` : `SCRAPING DU SITE : Échec (${facts.scrapeError ?? 'inconnu'}) — base-toi uniquement sur les données Supabase.`

  const discountInfo = facts.discountRange.max
    ? `Réductions disponibles : ${facts.discountRange.min ?? '?'}% à ${facts.discountRange.max}%`
    : 'Aucune réduction chiffrée disponible'

  const relatedLinks = [...facts.relatedStores, ...facts.categories]
    .slice(0, spec.linkCount)
    .map(item => 'name' in item && 'slug' in item
      ? ('id' in item ? `Boutique: ${(item as RelatedStore).name}` : `Catégorie: ${(item as RelatedCategory).name}`)
      : '')
    .filter(Boolean)
    .join(', ')

  return `Boutique : ${facts.name}
Tier : ${facts.tier.toUpperCase()} (${spec.descWords} mots pour la description)
Catégories : ${facts.categories.map(c => c.name).join(', ') || 'non renseignées'}
Nombre de codes promo actifs : ${facts.coupon_count}
Types de promotions : ${facts.activeCouponTypes.join(', ') || 'non renseignés'}
${discountInfo}

Exemples de codes actuels :
${facts.sampleCoupons.map(c => `- "${c.title}"${c.code ? ` (code: ${c.code})` : ''}${c.discount_value ? ` — ${c.discount_value}` : ''}`).join('\n') || '- Aucun exemple disponible'}

${scrapedSection}

Liens internes disponibles (mentionne ${spec.linkCount} d'entre eux naturellement dans le texte) :
${relatedLinks || 'Aucun lien interne disponible'}

CONSIGNE : Génère ${spec.h2Count} sections H2 et ${spec.faqCount} FAQ basées UNIQUEMENT sur des faits réels.
${facts.tier === 'light' ? "Pour un store LIGHT : sois concis et honnête. Pas de section H2 si tu n'as pas de fait spécifique à y mettre. Pas de FAQ sans un vrai fait à développer." : ''}

Retourne ce JSON exact (sans markdown, sans explication) :
{
  "description": "...",
  "h2_sections": [{"heading": "...", "content": "..."}],
  "faqs": [{"question": "...", "answer": "..."}],
  "internal_link_mentions": ["nom tel qu'écrit dans le texte", ...]
}`
}

// ─── Call Anthropic API ───────────────────────────────────────────────────────
export async function generateContent(facts: StoreFacts): Promise<ContentBody> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: facts.tier === 'premium' ? 2000 : facts.tier === 'standard' ? 1200 : 600,
      system:     buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(facts) }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const raw  = data.content?.[0]?.text ?? ''

  // Parse JSON — strip any accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  let parsed: ContentBody
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Invalid JSON from Claude: ${cleaned.slice(0, 200)}`)
  }

  // Guarantee shape
  return {
    description:             parsed.description          ?? '',
    h2_sections:             Array.isArray(parsed.h2_sections)            ? parsed.h2_sections            : [],
    faqs:                    Array.isArray(parsed.faqs)                   ? parsed.faqs                   : [],
    internal_link_mentions:  Array.isArray(parsed.internal_link_mentions) ? parsed.internal_link_mentions : [],
  }
}

// ─── Convert mentions to link markers ────────────────────────────────────────
export function resolveInternalLinks(
  content: ContentBody,
  relatedStores:     { name: string; slug: string }[],
  relatedCategories: { name: string; slug: string }[],
): ContentBody {
  function replaceInText(text: string): string {
    let out = text
    for (const store of relatedStores) {
      if (out.includes(store.name)) {
        out = out.replace(
          new RegExp(store.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          `[[store:${store.slug}|${store.name}]]`
        )
      }
    }
    for (const cat of relatedCategories) {
      if (out.includes(cat.name)) {
        out = out.replace(
          new RegExp(cat.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          `[[category:${cat.slug}|${cat.name}]]`
        )
      }
    }
    return out
  }

  return {
    description:  replaceInText(content.description),
    h2_sections:  content.h2_sections.map(s => ({
      heading: s.heading,
      content: replaceInText(s.content),
    })),
    faqs: content.faqs.map(f => ({
      question: f.question,
      answer:   replaceInText(f.answer),
    })),
    internal_link_mentions: content.internal_link_mentions,
  }
}

// ─── Similarity check ─────────────────────────────────────────────────────────
function tokenise(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = Array.from(a).filter(w => b.has(w)).length
  const union = new Set([...Array.from(a), ...Array.from(b)]).size
  return union === 0 ? 0 : intersection / union
}

export async function checkSimilarity(
  newDescription: string,
  storeId:        string,
  categorySlug:   string | null,
): Promise<{ isSimilar: boolean; conflictingStoreId: string | null }> {
  const supabase = createAdminClient()

  // Get last 30 approved/draft stores in same category
  let storeIds: string[] = []
  if (categorySlug) {
    const { data: catRow } = await supabase
      .from('categories').select('id').eq('slug', categorySlug).single()
    if (catRow) {
      const { data: catStores } = await supabase
        .from('store_categories').select('store_id').eq('category_id', catRow.id).limit(50)
      storeIds = (catStores ?? []).map(r => r.store_id).filter(id => id !== storeId)
    }
  }

  if (storeIds.length === 0) return { isSimilar: false, conflictingStoreId: null }

  const { data: recentStores } = await supabase
    .from('stores')
    .select('id,content_body')
    .in('id', storeIds.slice(0, 30))
    .in('content_status', ['draft', 'approved'])
    .not('content_body', 'is', null)

  const newTokens = tokenise(newDescription)

  for (const s of recentStores ?? []) {
    const body = s.content_body as { description?: string } | null
    if (!body?.description) continue
    const existingTokens = tokenise(body.description)
    const sim = jaccardSimilarity(newTokens, existingTokens)
    if (sim > 0.35) {
      return { isSimilar: true, conflictingStoreId: String(s.id) }
    }
  }

  return { isSimilar: false, conflictingStoreId: null }
}
