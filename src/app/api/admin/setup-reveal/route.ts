import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()

  // Create coupon_tokens via insert-if-not-exists trick isn't possible for DDL.
  // We use the Supabase admin client to run raw SQL through the query endpoint.
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const sql = `
    CREATE TABLE IF NOT EXISTS coupon_tokens (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      coupon_id  uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      store_id   uuid NOT NULL REFERENCES stores(id)  ON DELETE CASCADE,
      token      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      used_at    timestamptz
    );
    CREATE INDEX IF NOT EXISTS coupon_tokens_token_idx   ON coupon_tokens(token);
    CREATE INDEX IF NOT EXISTS coupon_tokens_created_idx ON coupon_tokens(created_at);

    CREATE TABLE IF NOT EXISTS coupon_clicks (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      coupon_id  uuid REFERENCES coupons(id) ON DELETE SET NULL,
      store_id   uuid REFERENCES stores(id)  ON DELETE SET NULL,
      clicked_at timestamptz NOT NULL DEFAULT now(),
      user_agent text,
      referrer   text
    );
    CREATE INDEX IF NOT EXISTS coupon_clicks_store_idx  ON coupon_clicks(store_id);
    CREATE INDEX IF NOT EXISTS coupon_clicks_coupon_idx ON coupon_clicks(coupon_id);

    ALTER TABLE coupon_tokens ENABLE ROW LEVEL SECURITY;
    ALTER TABLE coupon_clicks ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupon_tokens' AND policyname='Service full access tokens') THEN
        CREATE POLICY "Service full access tokens" ON coupon_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupon_clicks' AND policyname='Service full access clicks') THEN
        CREATE POLICY "Service full access clicks" ON coupon_clicks FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `

  const res = await fetch(`${url}/pg/query`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body:    JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    return NextResponse.json({
      ok: false,
      note: 'Run the SQL below manually in your Supabase SQL editor',
      sql,
    }, { status: 200 })
  }

  return NextResponse.json({ ok: true })
}
