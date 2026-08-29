-- Drop the old unique constraint that prevents same subject in multiple divisions
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_school_id_name_curriculum_key;

-- Add new unique constraint that includes division_id
-- This allows "Mathematics" to exist in both Upper Primary and Junior Secondary
ALTER TABLE public.subjects ADD CONSTRAINT subjects_school_id_name_curriculum_division_key 
  UNIQUE (school_id, name, curriculum, division_id);