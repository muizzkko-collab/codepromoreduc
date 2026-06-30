-- Coupon public_id migration
-- Run in Supabase SQL Editor BEFORE deploying the code changes
-- Safe to run multiple times (all statements are idempotent)

-- 1. Add public_id column
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS public_id BIGINT;

-- 2. Populate from wp_post_id for the 13,347 coupons that have it
UPDATE coupons SET public_id = wp_post_id WHERE wp_post_id IS NOT NULL AND public_id IS NULL;

-- 3. For the 66 coupons with no wp_post_id (Awin-synced), assign new IDs
--    starting at 100,000 (safely above max wp_post_id of 96,432)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'coupon_public_id_seq') THEN
    CREATE SEQUENCE coupon_public_id_seq START 100000;
  END IF;
END $$;

UPDATE coupons
SET public_id = nextval('coupon_public_id_seq')
WHERE public_id IS NULL;

-- 4. Enforce NOT NULL and uniqueness
ALTER TABLE coupons ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coupons_public_id_idx ON coupons(public_id);

-- Verify: should show 0 nulls and 0 duplicates
-- SELECT COUNT(*) FILTER (WHERE public_id IS NULL) AS nulls,
--        COUNT(*) - COUNT(DISTINCT public_id)        AS duplicates
-- FROM coupons;
