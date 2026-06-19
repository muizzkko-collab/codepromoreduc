import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function runSQL(sql: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ query: sql }),
  })
  return res
}

export async function GET() {
  // Create both RPC functions via direct postgres using service role
  const sql1 = `
    CREATE OR REPLACE FUNCTION increment_coupon_clicks(coupon_id uuid)
    RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
      UPDATE coupons SET click_count = click_count + 1 WHERE id = coupon_id;
    $$;
    GRANT EXECUTE ON FUNCTION increment_coupon_clicks(uuid) TO anon, authenticated;
  `
  const sql2 = `
    CREATE OR REPLACE FUNCTION increment_store_clicks(store_id uuid)
    RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
      UPDATE stores SET click_count = click_count + 1 WHERE id = store_id;
    $$;
    GRANT EXECUTE ON FUNCTION increment_store_clicks(uuid) TO anon, authenticated;
  `

  // Try via Supabase's pg endpoint (available in some versions)
  const results = []
  for (const sql of [sql1, sql2]) {
    const r = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ query: sql }),
    })
    results.push({ status: r.status, ok: r.ok })
  }

  return NextResponse.json({ results, note: 'If failed, run the SQL manually in Supabase SQL editor' })
}
