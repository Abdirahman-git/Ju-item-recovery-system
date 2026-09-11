-- JU LOFO — Staff directory (allowlist + CSV upload in Admin Setup)
-- Run in Supabase SQL Editor, then: NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.staff_directory (
  staff_id text PRIMARY KEY,
  full_name text NOT NULL,
  phone_number text,
  email text,
  department text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'activated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_directory IS
  'Campus staff allowlist for LOFO. Managed from Admin Setup → Staff directory.';

CREATE INDEX IF NOT EXISTS staff_directory_status_idx
  ON public.staff_directory (status);

CREATE INDEX IF NOT EXISTS staff_directory_department_idx
  ON public.staff_directory (department);

ALTER TABLE public.staff_directory ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.staff_directory FROM anon, authenticated;
GRANT SELECT ON TABLE public.staff_directory TO anon, authenticated;
GRANT ALL ON TABLE public.staff_directory TO service_role;

DROP POLICY IF EXISTS ju_staff_directory_select ON public.staff_directory;
CREATE POLICY ju_staff_directory_select ON public.staff_directory
  FOR SELECT TO anon, authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
