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
  question_type TEXT NOT NULL DEFAULT 'mcq'
    CHECK (question_type IN ('mcq', 'direct', 'ask')),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0
    CHECK (correct_index >= 0 AND correct_index <= 9),
  correct_answer TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe upgrades if table already existed without these columns
ALTER TABLE public.ownership_challenge_questions
  ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'mcq';

ALTER TABLE public.ownership_challenge_questions
  ADD COLUMN IF NOT EXISTS correct_answer TEXT DEFAULT '';

-- Allow Ask mode (admin question only — no expected answer)
-- Drop any existing question_type CHECK (name may vary)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'ownership_challenge_questions'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%question_type%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.ownership_challenge_questions DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.ownership_challenge_questions
  ADD CONSTRAINT ownership_challenge_questions_question_type_check
  CHECK (question_type IN ('mcq', 'direct', 'ask'));

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

-- ─── Permissions (anon-key app — must allow insert/select) ───
-- If Save still shows 42501 / RLS, re-run THIS whole block in SQL Editor.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ownership_challenges'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ownership_challenges', r.policyname);
  END LOOP;
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ownership_challenge_questions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ownership_challenge_questions', r.policyname);
  END LOOP;
END $$;

-- Turn off forced RLS (Supabase UI can leave FORCE on)
ALTER TABLE public.ownership_challenges NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_challenge_questions NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ownership_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_challenge_questions DISABLE ROW LEVEL SECURITY;

-- If someone re-enables RLS in the dashboard later, these keep Save working
CREATE POLICY ownership_challenges_allow_all
  ON public.ownership_challenges
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY ownership_challenge_questions_allow_all
  ON public.ownership_challenge_questions
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.ownership_challenges TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ownership_challenge_questions TO anon, authenticated, service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.ownership_challenges_id_seq TO anon, authenticated, service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.ownership_challenge_questions_id_seq TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
