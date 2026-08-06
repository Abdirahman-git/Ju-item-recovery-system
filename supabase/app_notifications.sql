-- In-app notifications (no SMS). Broadcast when an item goes LIVE.
-- Run this ENTIRE script in Supabase SQL Editor (safe to re-run).

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'item_live',
  title TEXT NOT NULL,
  body TEXT,
  item_type TEXT CHECK (item_type IN ('lost', 'found')),
  item_id BIGINT,
  item_name TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id BIGINT NOT NULL REFERENCES public.app_notifications(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_created
  ON public.app_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_reads_email
  ON public.notification_reads(user_email);

-- One notification per live item (trigger + app can both try safely)
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_notifications_item_unique
  ON public.app_notifications (item_type, item_id)
  WHERE item_id IS NOT NULL;

ALTER TABLE public.app_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_notifications_select_all ON public.app_notifications;
DROP POLICY IF EXISTS app_notifications_insert_all ON public.app_notifications;
DROP POLICY IF EXISTS notification_reads_all ON public.notification_reads;

CREATE POLICY app_notifications_select_all
  ON public.app_notifications FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY app_notifications_insert_all
  ON public.app_notifications FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY notification_reads_all
  ON public.notification_reads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.app_notifications TO anon, authenticated, service_role;
GRANT ALL ON public.notification_reads TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.app_notifications_id_seq TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_notifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reads TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- Trigger: runs as SECURITY DEFINER so anon inserts still notify
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_item_went_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_live boolean := false;
  v_is_live boolean := false;
  v_type text;
  v_label text;
  v_name text;
  v_cat text;
  v_row jsonb;
  v_status text;
  v_approved text;
BEGIN
  v_row := to_jsonb(NEW);
  v_status := lower(trim(coalesce(v_row->>'status', '')));
  v_approved := lower(trim(coalesce(v_row->>'is_approved', '')));

  v_is_live := (v_status = 'live') OR (v_approved IN ('true', 't', '1'));

  IF NOT v_is_live THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_was_live :=
      lower(trim(coalesce(to_jsonb(OLD)->>'status', ''))) = 'live'
      OR lower(trim(coalesce(to_jsonb(OLD)->>'is_approved', ''))) IN ('true', 't', '1');
    -- Already live → do not spam another notification on edit
    IF v_was_live THEN
      RETURN NEW;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'lost_items' THEN
    v_type := 'lost';
    v_label := 'Lost';
  ELSE
    v_type := 'found';
    v_label := 'Found';
  END IF;

  v_name := coalesce(
    nullif(trim(v_row->>'itemName'), ''),
    nullif(trim(v_row->>'itemname'), ''),
    nullif(trim(v_row->>'item_name'), ''),
    'An item'
  );

  v_cat := coalesce(
    nullif(trim(v_row->>'category'), ''),
    nullif(trim(v_row->>'public_category'), ''),
    nullif(trim(v_row->>'publicCategory'), '')
  );

  INSERT INTO public.app_notifications (type, title, body, item_type, item_id, item_name, category)
  VALUES (
    'item_live',
    'New ' || v_label || ' item',
    CASE
      WHEN v_cat IS NOT NULL THEN v_name || ' (' || v_cat || ') is now live on the feed.'
      ELSE v_name || ' is now live on the feed.'
    END,
    v_type,
    NEW.id,
    v_name,
    v_cat
  )
  ON CONFLICT (item_type, item_id) WHERE item_id IS NOT NULL DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_item_went_live failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lost_items_notify_live ON public.lost_items;
CREATE TRIGGER trg_lost_items_notify_live
  AFTER INSERT OR UPDATE ON public.lost_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_item_went_live();

DROP TRIGGER IF EXISTS trg_found_items_notify_live ON public.found_items;
CREATE TRIGGER trg_found_items_notify_live
  AFTER INSERT OR UPDATE ON public.found_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_item_went_live();

-- ============================================================
-- Backfill: notifications for items already LIVE
-- ============================================================

INSERT INTO public.app_notifications (type, title, body, item_type, item_id, item_name, category)
SELECT
  'item_live',
  'New Lost item',
  CASE
    WHEN nullif(trim(coalesce(j->>'category', '')), '') IS NOT NULL
      THEN coalesce(
            nullif(trim(j->>'itemName'), ''),
            nullif(trim(j->>'itemname'), ''),
            nullif(trim(j->>'item_name'), ''),
            'An item'
          ) || ' (' || trim(j->>'category') || ') is now live on the feed.'
    ELSE coalesce(
           nullif(trim(j->>'itemName'), ''),
           nullif(trim(j->>'itemname'), ''),
           nullif(trim(j->>'item_name'), ''),
           'An item'
         ) || ' is now live on the feed.'
  END,
  'lost',
  i.id,
  coalesce(
    nullif(trim(j->>'itemName'), ''),
    nullif(trim(j->>'itemname'), ''),
    nullif(trim(j->>'item_name'), ''),
    'An item'
  ),
  nullif(trim(coalesce(j->>'category', '')), '')
FROM public.lost_items i
CROSS JOIN LATERAL to_jsonb(i) AS j
WHERE lower(coalesce(j->>'status', '')) = 'live'
   OR lower(coalesce(j->>'is_approved', '')) IN ('true', 't', '1')
ON CONFLICT (item_type, item_id) WHERE item_id IS NOT NULL DO NOTHING;

INSERT INTO public.app_notifications (type, title, body, item_type, item_id, item_name, category)
SELECT
  'item_live',
  'New Found item',
  CASE
    WHEN nullif(trim(coalesce(j->>'category', j->>'public_category', '')), '') IS NOT NULL
      THEN coalesce(
            nullif(trim(j->>'itemName'), ''),
            nullif(trim(j->>'itemname'), ''),
            nullif(trim(j->>'item_name'), ''),
            'An item'
          ) || ' (' || trim(coalesce(j->>'category', j->>'public_category')) || ') is now live on the feed.'
    ELSE coalesce(
           nullif(trim(j->>'itemName'), ''),
           nullif(trim(j->>'itemname'), ''),
           nullif(trim(j->>'item_name'), ''),
           'An item'
         ) || ' is now live on the feed.'
  END,
  'found',
  i.id,
  coalesce(
    nullif(trim(j->>'itemName'), ''),
    nullif(trim(j->>'itemname'), ''),
    nullif(trim(j->>'item_name'), ''),
    'An item'
  ),
  nullif(trim(coalesce(j->>'category', j->>'public_category', '')), '')
FROM public.found_items i
CROSS JOIN LATERAL to_jsonb(i) AS j
WHERE lower(coalesce(j->>'status', '')) = 'live'
   OR lower(coalesce(j->>'is_approved', '')) IN ('true', 't', '1')
ON CONFLICT (item_type, item_id) WHERE item_id IS NOT NULL DO NOTHING;
