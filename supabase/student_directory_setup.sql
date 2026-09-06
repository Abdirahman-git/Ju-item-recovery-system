-- JU LOFO — Student Directory Setup (faculty years + access expiry)
-- Run in Supabase SQL Editor, then: NOTIFY pgrst, 'reload schema';

-- 1) Program length per faculty (admin-editable)
CREATE TABLE IF NOT EXISTS public.faculty_program_years (
  faculty text PRIMARY KEY,
  program_years integer NOT NULL CHECK (program_years >= 1 AND program_years <= 12),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.faculty_program_years (faculty, program_years) VALUES
  ('Computer Science and IT', 4),
  ('Economics & Management', 4),
  ('Engineering & Technology', 4),
  ('Medicine & Surgery', 6)
ON CONFLICT (faculty) DO NOTHING;

ALTER TABLE IF EXISTS public.faculty_program_years ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.faculty_program_years FROM anon, authenticated;
GRANT SELECT ON TABLE public.faculty_program_years TO anon, authenticated;
GRANT ALL ON TABLE public.faculty_program_years TO service_role;

DROP POLICY IF EXISTS ju_faculty_years_select ON public.faculty_program_years;
CREATE POLICY ju_faculty_years_select ON public.faculty_program_years
  FOR SELECT TO anon, authenticated USING (true);

-- 2) Directory access columns
ALTER TABLE public.student_directory
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS intake_year integer,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS access_status text DEFAULT 'active';

COMMENT ON COLUMN public.student_directory.intake_year IS 'Cohort / enrollment year (e.g. 2022)';
COMMENT ON COLUMN public.student_directory.expires_at IS 'Last day student may use the LOFO system';
COMMENT ON COLUMN public.student_directory.access_status IS 'active | expired | blocked';

-- Backfill intake_year to current year when missing (do NOT parse campus ID codes as years)
UPDATE public.student_directory
SET intake_year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
WHERE intake_year IS NULL;

-- Default expires_at using faculty program years (Medicine 6, others 4)
UPDATE public.student_directory d
SET expires_at = make_date(
  COALESCE(d.intake_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer)
    + COALESCE(
      (SELECT f.program_years FROM public.faculty_program_years f WHERE f.faculty = d.faculty),
      4
    ),
  7,
  31
)
WHERE d.expires_at IS NULL AND d.intake_year IS NOT NULL;

UPDATE public.student_directory
SET access_status = CASE
  WHEN expires_at IS NOT NULL AND expires_at < CURRENT_DATE THEN 'expired'
  ELSE COALESCE(NULLIF(trim(access_status), ''), 'active')
END;

-- Keep client writes locked; Backend service_role does mutations
REVOKE ALL ON TABLE public.student_directory FROM anon, authenticated;
GRANT SELECT ON TABLE public.student_directory TO anon, authenticated;
GRANT ALL ON TABLE public.student_directory TO service_role;
