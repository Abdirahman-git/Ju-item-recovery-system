-- JU LOFO — split current CS-only directory IDs across faculties.
-- Prefix map:
--   CS = Computer Science and IT
--   MD / MS = Medicine & Surgery
--   EN / ET = Engineering & Technology
--   BA / EC = Economics & Management
--
-- Run the WHOLE file in Supabase SQL Editor (do not highlight a subset).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS faculty text;

DO $$
DECLARE
  rec record;
BEGIN
  DROP TABLE IF EXISTS public._ju_id_remap;
  CREATE TABLE public._ju_id_remap (
    old_id text PRIMARY KEY,
    new_id text NOT NULL
  );

  INSERT INTO public._ju_id_remap (old_id, new_id) VALUES
    ('CS1300648', 'CS1300648'),
    ('CS1300651', 'MD1300651'),
    ('CS1300734', 'MS1300734'),
    ('CS1300652', 'EN1300652'),
    ('CS1300653', 'ET1300653'),
    ('CS1300733', 'BA1300733'),
    ('CS1300655', 'EC1300655'),
    ('CS1300656', 'CS1300656'),
    ('CS1300661', 'CS1300661'),
    ('CS1300662', 'MS1300662'),
    ('CS1300663', 'EN1300663'),
    ('CS1300664', 'ET1300664'),
    ('CS1300665', 'BA1300665'),
    ('CS1300666', 'EC1300666'),
    ('CS1300667', 'CS1300667'),
    ('CS1300669', 'MD1300669'),
    ('CS1300670', 'MS1300670'),
    ('CS1300732', 'EN1300732'),
    ('CS1300673', 'ET1300673'),
    ('CS1300674', 'BA1300674'),
    ('CS1300679', 'EC1300679'),
    ('CS1300680', 'CS1300680'),
    ('CS1300681', 'MD1300681'),
    ('CS1300684', 'MS1300684'),
    ('CS1300686', 'EN1300686'),
    ('CS1300688', 'ET1300688'),
    ('CS1300731', 'BA1300731'),
    ('CS1300690', 'EC1300690'),
    ('CS1300691', 'CS1300691'),
    ('CS1300693', 'MD1300693'),
    ('CS1300695', 'MS1300695'),
    ('CS1300697', 'EN1300697'),
    ('CS1300699', 'ET1300699'),
    ('CS1300737', 'BA1300737'),
    ('CS1300703', 'EC1300703'),
    ('CS1300704', 'CS1300704'),
    ('CS1300705', 'MD1300705'),
    ('CS1300890', 'MS1300890'),
    ('CS1300708', 'EN1300708'),
    ('CS1300709', 'ET1300709'),
    ('CS1300710', 'BA1300710'),
    ('CS1300712', 'EC1300712'),
    ('CS1300727', 'CS1300727'),
    ('CS1300713', 'MD1300713'),
    ('CS1300716', 'MS1300716'),
    ('CS1300718', 'EN1300718'),
    ('CS1300720', 'ET1300720'),
    ('CS1300721', 'BA1300721'),
    ('CS1300722', 'EC1300722'),
    ('CS1300632', 'CS1300632');

  UPDATE public.student_directory d
  SET student_id = m.new_id || '__tmp'
  FROM public._ju_id_remap m
  WHERE d.student_id = m.old_id
    AND m.old_id <> m.new_id;

  UPDATE public.student_directory
  SET student_id = replace(student_id, '__tmp', '')
  WHERE student_id LIKE '%__tmp';

  UPDATE public.users u
  SET student_id = m.new_id || '__tmp'
  FROM public._ju_id_remap m
  WHERE u.student_id = m.old_id
    AND m.old_id <> m.new_id;

  UPDATE public.users
  SET student_id = replace(student_id, '__tmp', '')
  WHERE student_id LIKE '%__tmp';

  BEGIN
    UPDATE public.item_claims c
    SET claimer_student_id = m.new_id
    FROM public._ju_id_remap m
    WHERE c.claimer_student_id = m.old_id
      AND m.old_id <> m.new_id;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
  END;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lost_items' AND column_name = 'student_id'
  ) THEN
    UPDATE public.lost_items i
    SET student_id = m.new_id
    FROM public._ju_id_remap m
    WHERE i.student_id = m.old_id
      AND m.old_id <> m.new_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'found_items' AND column_name = 'student_id'
  ) THEN
    UPDATE public.found_items i
    SET student_id = m.new_id
    FROM public._ju_id_remap m
    WHERE i.student_id = m.old_id
      AND m.old_id <> m.new_id;
  END IF;

  DROP TABLE public._ju_id_remap;
END $$;

UPDATE public.student_directory
SET faculty = CASE upper(left(student_id, 2))
  WHEN 'CS' THEN 'Computer Science and IT'
  WHEN 'MD' THEN 'Medicine & Surgery'
  WHEN 'MS' THEN 'Medicine & Surgery'
  WHEN 'EN' THEN 'Engineering & Technology'
  WHEN 'ET' THEN 'Engineering & Technology'
  WHEN 'BA' THEN 'Economics & Management'
  WHEN 'EC' THEN 'Economics & Management'
  ELSE faculty
END;

UPDATE public.users
SET faculty = CASE upper(left(student_id, 2))
  WHEN 'CS' THEN 'Computer Science and IT'
  WHEN 'MD' THEN 'Medicine & Surgery'
  WHEN 'MS' THEN 'Medicine & Surgery'
  WHEN 'EN' THEN 'Engineering & Technology'
  WHEN 'ET' THEN 'Engineering & Technology'
  WHEN 'BA' THEN 'Economics & Management'
  WHEN 'EC' THEN 'Economics & Management'
  ELSE faculty
END
WHERE role IS DISTINCT FROM 'admin';

CREATE INDEX IF NOT EXISTS users_faculty_idx ON public.users (faculty);
