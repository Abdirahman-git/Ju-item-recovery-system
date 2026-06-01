-- Run once in Supabase → SQL Editor if item_matches stays empty (0 rows)
-- Fixes: "new row violates row-level security policy for table item_matches"

ALTER TABLE public.item_matches DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.item_matches TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.item_matches_id_seq TO anon, authenticated, service_role;
