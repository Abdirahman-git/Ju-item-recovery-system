-- FIX: SQL Editor shows notifications, but mobile Inbox is empty.
-- Confirmed: anon API returns count=0 with no error → RLS blocking.
-- Run ALL of this in Supabase SQL Editor (Role: postgres).

-- 1) Open policies first
DROP POLICY IF EXISTS app_notifications_select_all ON public.app_notifications;
DROP POLICY IF EXISTS app_notifications_insert_all ON public.app_notifications;
DROP POLICY IF EXISTS app_notifications_update_all ON public.app_notifications;
DROP POLICY IF EXISTS app_notifications_delete_all ON public.app_notifications;
DROP POLICY IF EXISTS notification_reads_all ON public.notification_reads;

CREATE POLICY app_notifications_select_all
  ON public.app_notifications FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY app_notifications_insert_all
  ON public.app_notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY app_notifications_update_all
  ON public.app_notifications FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY app_notifications_delete_all
  ON public.app_notifications FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY notification_reads_all
  ON public.notification_reads FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2) Enable RLS (policies above allow everyone to read/write inbox)
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- 3) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_notifications TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reads TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.app_notifications_id_seq TO anon, authenticated, service_role;

-- 4) Refresh API cache
NOTIFY pgrst, 'reload schema';

-- 5) Verify as postgres (should be > 0)
SELECT count(*) AS as_postgres FROM public.app_notifications;
