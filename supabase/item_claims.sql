-- Match ownership claims (user submits after "This is a Match" → admin approves)
-- Run in Supabase SQL Editor

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

CREATE INDEX IF NOT EXISTS idx_item_claims_status ON public.item_claims(status);
CREATE INDEX IF NOT EXISTS idx_item_claims_pending ON public.item_claims(status, created_at DESC);

ALTER TABLE public.item_claims DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.item_claims TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.item_claims_id_seq TO anon, authenticated, service_role;
