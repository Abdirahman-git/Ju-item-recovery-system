-- Ownership Challenge (admin-set MCQ per item)
-- Run in Supabase SQL Editor (safe to re-run).

-- ─── Challenges ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ownership_challenges (
  id BIGSERIAL PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('lost', 'found')),
  item_id BIGINT NOT NULL,
  created_by_email TEXT,
  created_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_type, item_id)
);

CREATE TABLE IF NOT EXISTS public.ownership_challenge_questions (
  id BIGSERIAL PRIMARY KEY,
  challenge_id BIGINT NOT NULL
    REFERENCES public.ownership_challenges(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0
    CHECK (correct_index >= 0 AND correct_index <= 9),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ownership_challenges_item
  ON public.ownership_challenges(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_ownership_challenge_questions_challenge
  ON public.ownership_challenge_questions(challenge_id, sort_order);

-- ─── Extend item_claims ─────────────────────────────────────
ALTER TABLE public.item_claims
  DROP CONSTRAINT IF EXISTS item_claims_status_check;

ALTER TABLE public.item_claims
  ADD CONSTRAINT item_claims_status_check
  CHECK (status IN ('pending', 'physical', 'approved', 'rejected'));

ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS challenge_id BIGINT
    REFERENCES public.ownership_challenges(id) ON DELETE SET NULL;

ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS challenge_score INTEGER DEFAULT 0;

ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS challenge_result TEXT
    CHECK (challenge_result IS NULL OR challenge_result IN (
      'auto_pass', 'physical', 'reject'
    ));

ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS challenge_answers JSONB;

-- description stays NOT NULL — app stores a challenge summary string

-- ─── Item status: awaiting_pickup (physical band) ───────────
ALTER TABLE public.lost_items DROP CONSTRAINT IF EXISTS lost_items_status_check;
ALTER TABLE public.lost_items
  ADD CONSTRAINT lost_items_status_check
  CHECK (status IN (
    'draft', 'pending_review', 'live', 'matched',
    'claim_pending', 'awaiting_pickup', 'returned'
  ));

ALTER TABLE public.found_items DROP CONSTRAINT IF EXISTS found_items_status_check;
ALTER TABLE public.found_items
  ADD CONSTRAINT found_items_status_check
  CHECK (status IN (
    'draft', 'pending_review', 'live', 'matched',
    'claim_pending', 'awaiting_pickup', 'returned'
  ));

-- ─── Permissions (match existing anon-key app pattern) ──────
ALTER TABLE public.ownership_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_challenge_questions DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.ownership_challenges TO anon, authenticated, service_role;
GRANT ALL ON public.ownership_challenge_questions TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ownership_challenges_id_seq TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ownership_challenge_questions_id_seq TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
