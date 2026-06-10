-- Optional columns for direct "This is mine" claims (no lost/found pair required)
-- Run in Supabase SQL Editor after item_claims.sql

ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('lost', 'found'));

ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS item_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_item_claims_item ON public.item_claims(item_type, item_id);
