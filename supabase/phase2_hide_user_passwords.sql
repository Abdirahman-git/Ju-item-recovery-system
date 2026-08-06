-- =============================================================================
-- JU LOFO — Phase 2: Hide users.password from anon / authenticated clients
-- =============================================================================
-- Run AFTER deploying Backend /api/auth/login + /api/auth/change-password and
-- wiring Mobile + Web login to those endpoints.
--
-- Effect:
--   - Clients (anon key) can still SELECT profile fields on users (name, role, …)
--   - Clients CANNOT read or write the password column
--   - Backend service_role still has full access (login, activate, reset, change)
--
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- Ensure table grants exist (column revoke needs an underlying table privilege)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO anon, authenticated;
GRANT ALL ON TABLE public.users TO service_role;

-- Strip password from client-readable / writable surface
REVOKE SELECT (password) ON TABLE public.users FROM anon, authenticated;
REVOKE UPDATE (password) ON TABLE public.users FROM anon, authenticated;
REVOKE INSERT (password) ON TABLE public.users FROM anon, authenticated;

COMMIT;

-- =============================================================================
-- VERIFY (run in SQL Editor as needed):
--   -- As anon, this should fail or omit password:
--   -- select password from public.users limit 1;
--
-- APP SMOKE:
--   1) Mobile login (Backend must be running)
--   2) Web /login admin
--   3) Change password (mobile user + admin web)
--   4) Forgot-password reset still works
-- =============================================================================
