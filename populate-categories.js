const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dnxrkszwybcpidceurgz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHJrc3p3eWJjcGlkY2V1cmd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyMzE4OCwiZXhwIjoyMDk3MDk5MTg4fQ.kz-ijM2-pUKiLRCnvfpZCiJB9LBH71smbfVMlBrps1c'
)

// Keywords per category slug — store name matched case-insensitively
const CATEGORY_KEYWORDS = {
  'clothing': ['vetement','vêtement','clothing','mode','fashion','robe','chemise','pull','jean','shirt','dress','wear','outfit','lingerie','pyjama','maillot','survêtement','sportswear','underwear','collection','manteau','veste','blazer','pantalon','short','jupe'],
  'accessoires': ['accessoire','montre','watch','bijou','jewel','sac','bag','ceinture','belt','lunette','glass','chapeau','hat','écharpe','scarf','portefeuille','wallet','bracelet','bague','ring','collier','necklace'],
  'accessoires-de-mode': ['accessoire de mode','maroquinerie','bonnet','gant','glove','casquette','cap','foulard'],
  'beaute': ['beauté','beauty','cosmetic','cosmétique','parfum','perfume','soin','skincare','makeup','maquillage','hair','cheveux','shampoo','shampooing','coiffure','salon','manucure','nail','vernis','sérum','crème','creme','lotion','dermato','sephora','nocibe','nocibé','yves rocher','marionnaud'],
  'health': ['santé','health','pharma','médical','medical','sport','fitness','nutrition','complément','supplement','vitamine','vitamin','yoga','pilates','musculation','running','course','gym','bio','organic','naturel','natural','herbal','herbe','bien-être','wellbeing','cbd','protéine','protein','régime','diet','minceur','slim'],
  'technologie-electronique': ['tech','technologie','electronic','électronique','informatique','ordinateur','computer','laptop','phone','smartphone','mobile','tablette','tablet','tv','television','télévision','camera','appareil','device','gaming','gamer','console','playstation','xbox','nintendo','apple','samsung','huawei','sony','lg','fnac','darty','boulanger','cdiscount'],
  'home-decoration': ['maison','home','décoration','decoration','meuble','furniture','cuisine','kitchen','jardin','garden','déco','deco','intérieur','interior','salon','chambre','bedroom','salle de bain','bathroom','luminaire','lampe','lamp','tapis','rug','rideaux','curtain','literie','bedding','coussin','cushion','tableau','art','bougie','candle','ikea','leroy','brico','castorama'],
  'chaussures': ['chaussure','shoe','basket','sneaker','boot','botte','sandale','sandal','mocassin','escarpin','talon','heel','running','trail','skecher','adidas','nike','puma','reebok','vans','converse','new balance','timberland','ugg','birkenstock'],
  'services': ['service','assurance','insurance','banque','bank','finance','crédit','credit','prêt','loan','voyage','travel','hôtel','hotel','location','rent','rental','abonnement','subscription','streaming','cloud','saas','agence','agency','formation','cours','course','learning','école','school','université','university','mutuelle','retraite'],
  'livraison-gratuite': ['livraison','shipping','delivery','express','rapide','fast','gratuit','free'],
}

async function run() {
  console.log('Fetching categories...')
  const { data: cats, error: catErr } = await supabase.from('categories').select('id,name,slug')
  if (catErr) { console.error('Categories error:', catErr); return }
  console.log(`Found ${cats.length} categories`)

  console.log('Fetching stores...')
  const { data: stores, error: storeErr } = await supabase
    .from('stores').select('id,name').eq('is_active', true)
  if (storeErr) { console.error('Stores error:', storeErr); return }
  console.log(`Found ${stores.length} stores`)

  // Clear existing junction data
  console.log('Clearing existing store_categories...')
  await supabase.from('store_categories').delete().neq('store_id', '00000000-0000-0000-0000-000000000000')

  const rows = []
  const assigned = new Map() // store_id -> [cat_ids]

  for (const store of stores) {
    const nameLower = store.name.toLowerCase()
    for (const cat of cats) {
      const keywords = CATEGORY_KEYWORDS[cat.slug] || []
      const matches = keywords.some(kw => nameLower.includes(kw))
      if (matches) {
        rows.push({ store_id: store.id, category_id: cat.id })
        if (!assigned.has(store.id)) assigned.set(store.id, [])
        assigned.get(store.id).push(cat.name)
      }
    }
  }

  console.log(`\nMatched ${rows.length} store-category links across ${assigned.size} stores`)
  console.log('Sample assignments:')
  let count = 0
  for (const [sid, cats] of assigned) {
    const store = stores.find(s => s.id === sid)
    console.log(`  ${store?.name} → ${cats.join(', ')}`)
    if (++count >= 20) break
  }

  if (rows.length === 0) {
    console.log('\nNo matches found — inserting fallback (all stores into Populaire/most popular category)')
    return
  }

  // Insert in chunks
  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from('store_categories').upsert(chunk, { onConflict: 'store_id,category_id' })
    if (error) console.error(`Chunk ${i} error:`, error)
    else console.log(`Inserted chunk ${i}–${i + chunk.length}`)
  }

  // Update store_count on categories
  console.log('\nUpdating category store_count...')
  for (const cat of cats) {
    const count = rows.filter(r => r.category_id === cat.id).length
    await supabase.from('categories').update({ store_count: count }).eq('id', cat.id)
  }

  console.log('\nDone! store_categories populated.')
}

run().catch(console.error)
