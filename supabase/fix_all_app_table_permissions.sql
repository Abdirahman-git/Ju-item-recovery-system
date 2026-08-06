-- ⚠️ DO NOT RUN ON PRODUCTION
-- This script DISABLES Row Level Security and GRANTs ALL to anon.
-- That is what triggered Supabase Security Advisor critical alerts.
--
-- Use instead: supabase/secure_rls_lockdown.sql
-- See: supabase/SECURITY.md
--
-- Kept only for local emergency debugging. Prefer enabling RLS + policies.

-- Admin full access for lost_items, found_items, and related tables.
-- Run in Supabase SQL Editor if delete/update fails with RLS errors.

ALTER TABLE public.lost_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.returned_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_matches DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.lost_items TO anon, authenticated, service_role;
GRANT ALL ON public.found_items TO anon, authenticated, service_role;
GRANT ALL ON public.returned_items TO anon, authenticated, service_role;
GRANT ALL ON public.item_claims TO anon, authenticated, service_role;
GRANT ALL ON public.item_matches TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
