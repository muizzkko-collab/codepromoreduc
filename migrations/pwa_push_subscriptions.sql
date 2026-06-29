-- PWA Push Notification tables
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint          text        UNIQUE NOT NULL,
  p256dh            text        NOT NULL DEFAULT '',
  auth              text        NOT NULL DEFAULT '',
  store_preferences jsonb       NOT NULL DEFAULT '[]',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for store-specific sends
CREATE INDEX IF NOT EXISTS push_subscriptions_store_prefs_idx
  ON push_subscriptions USING gin (store_preferences);

-- Notification send log (for admin dashboard analytics)
CREATE TABLE IF NOT EXISTS push_notifications_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  message      text        NOT NULL DEFAULT '',
  url          text        NOT NULL DEFAULT '/',
  store_id     uuid        REFERENCES stores(id) ON DELETE SET NULL,
  sent_count   int         NOT NULL DEFAULT 0,
  failed_count int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service role can read/write these tables
ALTER TABLE push_subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications_log   ENABLE ROW LEVEL SECURITY;

-- No public access — all access via service role key (server-side)
CREATE POLICY "service_role_only_subs"
  ON push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only_log"
  ON push_notifications_log FOR ALL
  USING (auth.role() = 'service_role');

-- Helper function: top subscribed stores
CREATE OR REPLACE FUNCTION get_top_subscribed_stores()
RETURNS TABLE(store_id uuid, subscriber_count bigint) AS $$
  SELECT
    (elem::text)::uuid AS store_id,
    COUNT(*) AS subscriber_count
  FROM push_subscriptions,
       jsonb_array_elements_text(store_preferences) AS elem
  GROUP BY store_id
  ORDER BY subscriber_count DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;
