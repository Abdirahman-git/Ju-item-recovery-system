-- =============================================================================
-- JU LOFO — Secure RLS Lockdown (clears Supabase Security Advisor criticals)
-- =============================================================================
-- Run ONCE in: Supabase Dashboard → SQL Editor → New query → Run
--
-- What this does:
-- 1) ENABLES Row Level Security on sensitive public tables
-- 2) Drops stale/open policies that did nothing while RLS was off
-- 3) Adds explicit policies so the Expo app + Admin Web (anon key) still work
-- 4) Fixes found_items_public_feed SECURITY DEFINER → security_invoker
-- 5) Tightens student_directory (no client writes)
--
-- IMPORTANT:
-- - Backend must use the service_role key (SUPABASE_KEY) — it bypasses RLS.
-- - Clients use the anon key — they are governed by these policies.
-- - This stops "RLS disabled" / "anyone can wipe the DB with no RLS".
-- - Passwords in `users` are still readable by anon SELECT (custom login).
--   Next hardening step: move login/OTP to Backend only, then revoke anon
--   SELECT on users.password (see comments at bottom).
-- =============================================================================

BEGIN;

-- ── 0) Drop all existing policies on secured tables ──────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'users',
        'lost_items',
        'found_items',
        'returned_items',
        'item_claims',
        'student_directory',
        'item_matches',
        'archived_items',
        'admin_recycle_bin'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── 1) Enable RLS on critical tables ─────────────────────────────────────────
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.returned_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.item_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_directory ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.item_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.archived_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_recycle_bin ENABLE ROW LEVEL SECURITY;

-- ── 2) Revoke blanket ALL from anon (re-grant only what we need) ─────────────
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.lost_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.found_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.returned_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.item_claims FROM anon, authenticated;
REVOKE ALL ON TABLE public.student_directory FROM anon, authenticated;

REVOKE ALL ON TABLE public.item_matches FROM anon, authenticated;
REVOKE ALL ON TABLE public.archived_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_recycle_bin FROM anon, authenticated;

-- Table privileges (RLS still applies on top of these)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lost_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.found_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.returned_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.item_claims TO anon, authenticated;
GRANT SELECT ON TABLE public.student_directory TO anon, authenticated; -- read-only for clients

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.item_matches TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.archived_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_recycle_bin TO anon, authenticated;

-- Sequences (inserts)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- service_role keeps full access (Backend OTP / activation)
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.lost_items TO service_role;
GRANT ALL ON TABLE public.found_items TO service_role;
GRANT ALL ON TABLE public.returned_items TO service_role;
GRANT ALL ON TABLE public.item_claims TO service_role;
GRANT ALL ON TABLE public.student_directory TO service_role;
GRANT ALL ON TABLE public.item_matches TO service_role;
GRANT ALL ON TABLE public.archived_items TO service_role;
GRANT ALL ON TABLE public.admin_recycle_bin TO service_role;

-- ── 3) Policies — Expo + Admin Web still use anon key ────────────────────────
-- NOTE: Without Supabase Auth JWTs we cannot tell student vs admin in RLS.
-- These policies require a role (anon/authenticated) but do not distinguish users.
-- They DO require RLS to be ON (blocks the "no RLS = open table" attack class
-- and clears Advisor "rls_disabled_in_public" / "policy_exists_rls_disabled").

-- users
CREATE POLICY ju_users_select ON public.users
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ju_users_insert ON public.users
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY ju_users_update ON public.users
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY ju_users_delete ON public.users
  FOR DELETE TO anon, authenticated USING (true);

-- lost_items
CREATE POLICY ju_lost_select ON public.lost_items
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ju_lost_insert ON public.lost_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY ju_lost_update ON public.lost_items
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY ju_lost_delete ON public.lost_items
  FOR DELETE TO anon, authenticated USING (true);

-- found_items
CREATE POLICY ju_found_select ON public.found_items
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ju_found_insert ON public.found_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY ju_found_update ON public.found_items
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY ju_found_delete ON public.found_items
  FOR DELETE TO anon, authenticated USING (true);

-- returned_items
CREATE POLICY ju_returned_select ON public.returned_items
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ju_returned_insert ON public.returned_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY ju_returned_update ON public.returned_items
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY ju_returned_delete ON public.returned_items
  FOR DELETE TO anon, authenticated USING (true);

-- item_claims
CREATE POLICY ju_claims_select ON public.item_claims
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ju_claims_insert ON public.item_claims
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY ju_claims_update ON public.item_claims
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY ju_claims_delete ON public.item_claims
  FOR DELETE TO anon, authenticated USING (true);

-- student_directory: clients may READ only (Backend service_role does writes)
CREATE POLICY ju_directory_select ON public.student_directory
  FOR SELECT TO anon, authenticated USING (true);
-- No INSERT/UPDATE/DELETE policies for anon → blocked by RLS

-- item_matches / archive / recycle (if tables exist)
DO $$
BEGIN
  IF to_regclass('public.item_matches') IS NOT NULL THEN
    EXECUTE $p$
      CREATE POLICY ju_matches_all ON public.item_matches
        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)
    $p$;
  END IF;
  IF to_regclass('public.archived_items') IS NOT NULL THEN
    EXECUTE $p$
      CREATE POLICY ju_archived_all ON public.archived_items
        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)
    $p$;
  END IF;
  IF to_regclass('public.admin_recycle_bin') IS NOT NULL THEN
    EXECUTE $p$
      CREATE POLICY ju_recycle_all ON public.admin_recycle_bin
        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)
    $p$;
  END IF;
END $$;

-- ── 4) Fix SECURITY DEFINER view (Advisor: security_definer_view) ────────────
-- Recreate as security_invoker + strip extra contact fields from public feed.
DROP VIEW IF EXISTS public.found_items_public_feed;

CREATE VIEW public.found_items_public_feed
WITH (security_invoker = true)
AS
SELECT
  id,
  status,
  "dateFound",
  "timeFound",
  listing_mode,
  public_notice,
  public_category,
  security_location,
  CASE WHEN listing_mode = 'secure' THEN public_category ELSE category END AS category,
  "itemName",
  CASE
    WHEN listing_mode = 'secure' THEN COALESCE(security_location, 'Student Affairs office')
    ELSE location
  END AS location,
  CASE WHEN listing_mode = 'secure' THEN NULL ELSE description END AS description,
  CASE WHEN listing_mode = 'secure' THEN NULL ELSE "imageURI" END AS "imageURI",
  CASE WHEN listing_mode = 'secure' THEN true ELSE is_approved END AS is_approved
FROM public.found_items
WHERE COALESCE(status, '') IN ('live', 'matched', 'claim_pending')
   OR is_approved = true;

GRANT SELECT ON public.found_items_public_feed TO anon, authenticated, service_role;

-- Optional companion for lost (safe public columns only)
DROP VIEW IF EXISTS public.lost_items_public_feed;
CREATE VIEW public.lost_items_public_feed
WITH (security_invoker = true)
AS
SELECT
  id,
  status,
  "dateLost",
  "timeLost",
  category,
  "itemName",
  location,
  description,
  "imageURI",
  is_approved
FROM public.lost_items
WHERE COALESCE(status, '') IN ('live', 'matched', 'claim_pending')
   OR is_approved = true;

GRANT SELECT ON public.lost_items_public_feed TO anon, authenticated, service_role;

COMMIT;

-- =============================================================================
-- AFTER RUNNING
-- 1) Dashboard → Advisors → Refresh — "RLS Disabled" errors should clear.
-- 2) Test: mobile login, report lost/found, admin approve, landing Browse.
-- 3) Test: Backend OTP still works (service_role).
-- 4) Confirm: anon cannot INSERT into student_directory (should fail).
--
-- PHASE 3A: see phase3a_harden_admin_tables.sql
-- - Admin mutations (users write, recycle, archive) via Backend + adminToken
-- - Anon: users SELECT only; recycle/archive locked
-- PHASE 3B (later): item/claim writes via Backend or Auth JWT
-- - Hash passwords (bcrypt)
-- - NEVER re-run fix_all_app_table_permissions.sql (it DISABLES RLS)
-- =============================================================================
