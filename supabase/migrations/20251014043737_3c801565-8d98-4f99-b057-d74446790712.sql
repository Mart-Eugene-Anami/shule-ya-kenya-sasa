-- Remove incorrectly named foreign key constraint
-- This constraint is named students_section_id_fkey but actually references stream_id
ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_section_id_fkey;