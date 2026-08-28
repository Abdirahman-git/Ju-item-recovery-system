-- JU LOFO — store each user's faculty on the users table
-- Source of truth remains student_directory (ID lookup). Users never pick a department.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS faculty text;

-- Copy faculty from the university directory onto existing accounts
UPDATE public.users AS u
SET faculty = d.faculty
FROM public.student_directory AS d
WHERE lower(u.student_id) = lower(d.student_id)
  AND coalesce(nullif(trim(u.faculty), ''), '') = ''
  AND coalesce(nullif(trim(d.faculty), ''), '') <> '';

CREATE INDEX IF NOT EXISTS users_faculty_idx ON public.users (faculty);
