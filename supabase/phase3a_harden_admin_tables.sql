-- =============================================================================
-- JU LOFO — Phase 3A: Harden admin tables (users writes + recycle + archive)
-- =============================================================================
-- Run AFTER deploying Backend admin APIs + wiring Web/Mobile to use adminToken.
--
-- Effect:
--   - anon may SELECT users (profiles / lists) but cannot INSERT/UPDATE/DELETE
--   - anon has NO access to admin_recycle_bin or archived_items
--   - Backend service_role keeps full access for /api/admin/*
--
-- Does NOT change lost_items / found_items / item_claims policies
-- (those warnings remain until Phase 3B).
--
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ── users: keep SELECT for clients; drop write policies ──────────────────────
DROP POLICY IF EXISTS ju_users_insert ON public.users;
DROP POLICY IF EXISTS ju_users_update ON public.users;
DROP POLICY IF EXISTS ju_users_delete ON public.users;

-- Ensure SELECT policy still exists
DROP POLICY IF EXISTS ju_users_select ON public.users;
CREATE POLICY ju_users_select ON public.users
  FOR SELECT TO anon, authenticated USING (true);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.users FROM anon, authenticated;
GRANT SELECT ON TABLE public.users TO anon, authenticated;
GRANT ALL ON TABLE public.users TO service_role;

-- Re-apply password column lockdown (Phase 2) in case grants were reset
REVOKE SELECT (password) ON TABLE public.users FROM anon, authenticated;
REVOKE UPDATE (password) ON TABLE public.users FROM anon, authenticated;
REVOKE INSERT (password) ON TABLE public.users FROM anon, authenticated;

-- ── admin_recycle_bin: Backend only ──────────────────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.admin_recycle_bin') IS NOT NULL THEN
    FOR r IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'admin_recycle_bin'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_recycle_bin', r.policyname);
    END LOOP;

    ALTER TABLE public.admin_recycle_bin ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.admin_recycle_bin FROM anon, authenticated;
    GRANT ALL ON TABLE public.admin_recycle_bin TO service_role;
  END IF;
END $$;

-- ── archived_items: Backend only ─────────────────────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.archived_items') IS NOT NULL THEN
    FOR r IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'archived_items'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.archived_items', r.policyname);
    END LOOP;

    ALTER TABLE public.archived_items ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.archived_items FROM anon, authenticated;
    GRANT ALL ON TABLE public.archived_items TO service_role;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- AFTER RUNNING
-- 1) Re-login as admin (new adminToken)
-- 2) Test: approve/delete user, recycle restore/purge, archive restore/purge
-- 3) Advisors: fewer "RLS Policy Always True" on users/recycle/archive
-- 4) Remaining warnings on items/claims are expected (Phase 3B)
-- =============================================================================
