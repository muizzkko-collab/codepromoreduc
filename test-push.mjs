/**
 * Quick CLI test for the push /api/push/send route.
 * Run: node test-push.mjs
 * Requires the prod server to be running on port 3000.
 */
import { readFileSync } from 'fs'

// Read CRON_SECRET from .env.local
const env = readFileSync('.env.local', 'utf8')
const secret = env.match(/CRON_SECRET=(.+)/)?.[1]?.trim()

if (!secret) { console.error('CRON_SECRET not found in .env.local'); process.exit(1) }

const res = await fetch('http://localhost:3000/api/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${secret}`,
  },
  body: JSON.stringify({
    title:   '🎉 Test CodePromoReduc',
    message: '20% de réduction sur Amazon — Code: TEST20',
    url:     'http://localhost:3000/',
    tag:     'test',
  }),
})

const data = await res.json()
console.log('Status:', res.status)
console.log('Response:', JSON.stringify(data, null, 2))
