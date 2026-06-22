import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dnxrkszwybcpidceurgz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHJrc3p3eWJjcGlkY2V1cmd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyMzE4OCwiZXhwIjoyMDk3MDk5MTg4fQ.kz-ijM2-pUKiLRCnvfpZCiJB9LBH71smbfVMlBrps1c'
const EFF_KEY = 'FSw2YqsaWcFum6Gkqjk8UPl0Wz3f2gWb'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function normalise(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface EffRow {
  id_affilieur?: string | number
  id_programme?: string | number
  siteannonceur?: string
  name?: string
}

function extractPrograms(data: unknown): { id: string | number; name: string }[] {
  let arr: EffRow[] = []
  if (Array.isArray(data)) arr = data as EffRow[]
  else if (data && typeof data === 'object') {
    for (const key of Object.keys(data as object)) {
      const val = (data as Record<string, unknown>)[key]
      if (Array.isArray(val)) { arr = val as EffRow[]; break }
    }
  }
  return arr
    .map(r => ({
      id:   String(r.id_programme ?? r.id_affilieur ?? ''),
      name: String(r.siteannonceur ?? r.name ?? ''),
    }))
    .filter(r => r.id && r.name)
}

async function main() {
  // 1. Fetch Effiliation programs
  console.log('Fetching Effiliation programs...')
  const res = await fetch(`https://apiv2.effiliation.com/apiv2/programs.json?key=${EFF_KEY}&filter=mines&nb=500`)
  const text = await res.text()

  if (!res.ok) {
    throw new Error(`Effiliation API ${res.status}: ${text.slice(0, 300)}`)
  }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 300)}`)
  }

  const programs = extractPrograms(data)
  console.log(`Fetched ${programs.length} programs`)
  console.log('Response shape keys:', Array.isArray(data) ? '[array]' : Object.keys(data as object))
  if (programs.length > 0) {
    console.log('Sample program keys:', Object.keys(programs[0]))
    console.log('First 5:', JSON.stringify(programs.slice(0, 5), null, 2))
  } else {
    console.log('Raw snippet:', JSON.stringify(data).slice(0, 500))
    return
  }

  // 2. Fetch all stores
  console.log('\nFetching stores from Supabase...')
  const allStores: { id: string; name: string; network_merchant_ids: Record<string, string> | null }[] = []
  let from = 0
  while (true) {
    const { data: chunk, error } = await supabase
      .from('stores')
      .select('id,name,network_merchant_ids')
      .eq('is_active', true)
      .range(from, from + 999)
    if (error) throw error
    if (!chunk || chunk.length === 0) break
    allStores.push(...chunk)
    if (chunk.length < 1000) break
    from += 1000
  }
  console.log(`Fetched ${allStores.length} stores`)

  // 3. Build normalised index
  const storeIndex = new Map<string, typeof allStores[0]>()
  for (const s of allStores) {
    storeIndex.set(normalise(s.name), s)
  }

  // Debug: show what normalised program names look like vs store index samples
  console.log('\nSample normalised program names:')
  programs.slice(0, 10).forEach(p => console.log(`  "${p.name}" → "${normalise(String(p.name))}"` ))

  console.log('\nSample normalised store names:')
  Array.from(storeIndex.keys()).slice(0, 10).forEach(k => console.log(`  "${k}"`))

  // 4. Match
  let matched = 0
  let skipped = 0
  const updates: { id: string; network_merchant_ids: Record<string, string> }[] = []

  for (const prog of programs) {
    const normProg = normalise(String(prog.name))
    const store = storeIndex.get(normProg)
    if (!store) { skipped++; continue }

    const existing = store.network_merchant_ids ?? {}
    if (existing.effiliation) { skipped++; continue }

    updates.push({
      id: store.id,
      network_merchant_ids: { ...existing, effiliation: String(prog.id) },
    })
    matched++
    console.log(`  MATCH: "${prog.name}" (${prog.id}) → "${store.name}"`)
  }

  console.log(`\nMatched: ${matched}, Unmatched: ${skipped}`)

  if (updates.length === 0) {
    console.log('No updates to write.')
    return
  }

  console.log(`Writing ${updates.length} updates...`)
  for (const u of updates) {
    const { error } = await supabase
      .from('stores')
      .update({ network_merchant_ids: u.network_merchant_ids })
      .eq('id', u.id)
    if (error) console.error(`  Error updating ${u.id}: ${error.message}`)
  }
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
