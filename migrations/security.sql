-- Security tables migration
-- Run in Supabase SQL Editor

-- ── Ensure is_active column exists on admin_profiles FIRST ───────────────────
-- (must exist before the admin_activity_log policy references it)
ALTER TABLE admin_profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ── Login attempts tracking ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address   text        NOT NULL,
  email        text        NOT NULL DEFAULT '',
  success      boolean     NOT NULL DEFAULT false,
  reason       text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_ip_idx
  ON login_attempts (ip_address, attempted_at);

CREATE INDEX IF NOT EXISTS login_attempts_email_idx
  ON login_attempts (email, attempted_at);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_attempts"
  ON login_attempts FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-delete attempts older than 24 hours (keep table small)
-- (Optional: set up pg_cron if available on your Supabase plan)

-- ── Admin activity log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid        REFERENCES admin_profiles(id) ON DELETE SET NULL,
  action       text        NOT NULL,
  target_table text,
  target_id    text,
  details      jsonb,
  ip_address   text,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_activity_log_admin_idx
  ON admin_activity_log (admin_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS admin_activity_log_time_idx
  ON admin_activity_log (performed_at DESC);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can read the log; only service role can write
CREATE POLICY "admins_read_activity_log"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "service_role_write_activity_log"
  ON admin_activity_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── Ensure reason column exists on login_attempts ─────────────────────────────
ALTER TABLE login_attempts
  ADD COLUMN IF NOT EXISTS reason text;
