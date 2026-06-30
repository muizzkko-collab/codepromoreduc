-- Set public_id default to nextval so new coupon inserts don't need to supply it
-- Run in Supabase SQL Editor

ALTER TABLE coupons
  ALTER COLUMN public_id SET DEFAULT nextval('coupon_public_id_seq');
