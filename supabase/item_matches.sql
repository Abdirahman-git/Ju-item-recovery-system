-- JU Item Recovery: item_matches table + RLS fix
-- Run this entire script in Supabase Dashboard → SQL Editor → Run

CREATE TABLE IF NOT EXISTS public.item_matches (
  id BIGSERIAL PRIMARY KEY,
  lost_item_id BIGINT NOT NULL,
  found_item_id BIGINT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  breakdown JSONB,
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'linked', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lost_item_id, found_item_id)
);
n
-- Optional FK constraints (skip if your item ids use a different type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_matches_lost_item_id_fkey'
  ) THEN
    ALTER TABLE public.item_matches
      ADD CONSTRAINT item_matches_lost_item_id_fkey
      FOREIGN KEY (lost_item_id) REFERENCES public.lost_items(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_matches_found_item_id_fkey'
  ) THEN
    ALTER TABLE public.item_matches
      ADD CONSTRAINT item_matches_found_item_id_fkey
      FOREIGN KEY (found_item_id) REFERENCES public.found_items(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'FK constraints skipped: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_item_matches_lost ON public.item_matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_item_matches_found ON public.item_matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_item_matches_status ON public.item_matches(status);

-- This app uses the anon key from the mobile client (no Supabase Auth session).
-- Disable RLS on item_matches so inserts/updates from the app are allowed.
ALTER TABLE public.item_matches DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.item_matches TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.item_matches_id_seq TO anon, authenticated, service_role;
