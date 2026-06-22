const EFF_KEY = 'FSw2YqsaWcFum6Gkqjk8UPl0Wz3f2gWb'

async function main() {
  const res = await fetch(`https://apiv2.effiliation.com/apiv2/programs.json?key=${EFF_KEY}&filter=mines&nb=500`)
  const data = await res.json()
  console.log('Is array:', Array.isArray(data))
  if (Array.isArray(data)) {
    console.log('First item keys:', Object.keys(data[0] ?? {}))
    console.log('First 5:', JSON.stringify(data.slice(0,5), null, 2))
  } else {
    console.log('Top keys:', Object.keys(data))
    const first = Object.values(data)[0]
    if (Array.isArray(first)) {
      console.log('Nested first item keys:', Object.keys((first as any[])[0] ?? {}))
      console.log('First 5:', JSON.stringify((first as any[]).slice(0,5), null, 2))
    }
  }
}
main()
