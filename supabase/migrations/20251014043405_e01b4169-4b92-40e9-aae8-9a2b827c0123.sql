-- Add foreign key constraints to students table
ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_grade_id_fkey,
  DROP CONSTRAINT IF EXISTS students_stream_id_fkey,
  DROP CONSTRAINT IF EXISTS students_school_id_fkey;

-- Add foreign key constraint for grade_id
ALTER TABLE public.students
  ADD CONSTRAINT students_grade_id_fkey 
  FOREIGN KEY (grade_id) 
  REFERENCES public.grades(id) 
  ON DELETE RESTRICT;

-- Add foreign key constraint for stream_id
ALTER TABLE public.students
  ADD CONSTRAINT students_stream_id_fkey 
  FOREIGN KEY (stream_id) 
  REFERENCES public.streams(id) 
  ON DELETE RESTRICT;

-- Add foreign key constraint for school_id
ALTER TABLE public.students
  ADD CONSTRAINT students_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;