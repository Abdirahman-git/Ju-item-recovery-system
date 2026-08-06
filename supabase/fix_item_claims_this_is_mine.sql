-- Fix "This is mine" ownership requests.
-- Run this in Supabase SQL Editor when the app says:
-- new row violates row-level security policy for table "item_claims"

CREATE TABLE IF NOT EXISTS public.item_claims (
  id BIGSERIAL PRIMARY KEY,
  lost_item_id BIGINT NOT NULL,
  found_item_id BIGINT NOT NULL,
  claimer_name TEXT NOT NULL,
  claimer_email TEXT,
  claimer_student_id TEXT,
  description TEXT NOT NULL,
  match_score INTEGER NOT NULL DEFAULT 0,
  match_breakdown JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('lost', 'found'));

ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS item_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_item_claims_status ON public.item_claims(status);
CREATE INDEX IF NOT EXISTS idx_item_claims_pending ON public.item_claims(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_claims_item ON public.item_claims(item_type, item_id);

-- This project currently uses the anon key from the mobile app and web admin.
-- Keep this table unrestricted so students can submit claims and admins can review them.
ALTER TABLE public.item_claims DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.item_claims TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.item_claims_id_seq TO anon, authenticated, service_role;
