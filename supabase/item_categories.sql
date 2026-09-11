-- JU LOFO — Persistent item categories (admin-addable, shared pickers)
-- Run in Supabase SQL Editor, then: NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.item_categories (
  name text PRIMARY KEY,
  is_admin_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS item_categories_name_ci
  ON public.item_categories (lower(name));

COMMENT ON TABLE public.item_categories IS
  'System + admin-created item categories. Survives across reports (unlike distinct item.category only).';

-- Seed built-in list (Jewelry intentionally omitted)
INSERT INTO public.item_categories (name, is_admin_only, is_active) VALUES
  ('Electronics', false, true),
  ('Clothing', false, true),
  ('Accessories', false, true),
  ('Documents', false, true),
  ('Keys', false, true),
  ('Bags', false, true),
  ('Sports Equipment', false, true),
  ('Glasses/Sunglasses', false, true),
  ('Wallet/Purse', false, true),
  ('ID/Cards', false, true),
  ('Financial', true, true),
  ('Other', false, true)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.item_categories FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.item_categories TO anon, authenticated;
GRANT ALL ON TABLE public.item_categories TO service_role;

DROP POLICY IF EXISTS ju_item_categories_select ON public.item_categories;
CREATE POLICY ju_item_categories_select ON public.item_categories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS ju_item_categories_insert ON public.item_categories;
CREATE POLICY ju_item_categories_insert ON public.item_categories
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS ju_item_categories_update ON public.item_categories;
CREATE POLICY ju_item_categories_update ON public.item_categories
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
