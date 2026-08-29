-- Create school_divisions table for organizing grades into divisions
-- (Lower Primary, Upper Primary, Junior Secondary, 8-4-4, CBC Senior, etc.)

CREATE TABLE public.school_divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_name text, -- e.g., "LP", "UP", "JS", "SS"
  description text,
  curriculum text NOT NULL, -- 'cbc', 'cbc-senior', '8-4-4'
  grade_level_start integer NOT NULL, -- e.g., 1 for Lower Primary
  grade_level_end integer NOT NULL, -- e.g., 3 for Lower Primary
  division_type text NOT NULL, -- 'lower_primary', 'upper_primary', 'junior_secondary', 'senior_secondary', '8-4-4'
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(school_id, division_type)
);

-- Enable RLS
ALTER TABLE public.school_divisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_divisions
CREATE POLICY "School admins can manage divisions"
ON public.school_divisions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = school_divisions.school_id
    AND profiles.role IN ('super_admin', 'school_admin')
  )
);

CREATE POLICY "School members can view divisions"
ON public.school_divisions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = school_divisions.school_id
  )
);

-- Add division_id to grades table to link grades to divisions
ALTER TABLE public.grades
ADD COLUMN division_id uuid REFERENCES public.school_divisions(id) ON DELETE SET NULL;

-- Add division_id to teachers table to assign teachers to specific divisions
ALTER TABLE public.teachers
ADD COLUMN division_id uuid REFERENCES public.school_divisions(id) ON DELETE SET NULL;

-- Add division_id to timetable_configurations to allow division-specific timetables
ALTER TABLE public.timetable_configurations
ADD COLUMN division_id uuid REFERENCES public.school_divisions(id) ON DELETE SET NULL;

-- Add division_id to subjects table for division-specific subjects
ALTER TABLE public.subjects
ADD COLUMN division_id uuid REFERENCES public.school_divisions(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_school_divisions_school_id ON public.school_divisions(school_id);
CREATE INDEX idx_grades_division_id ON public.grades(division_id);
CREATE INDEX idx_teachers_division_id ON public.teachers(division_id);
CREATE INDEX idx_timetable_configurations_division_id ON public.timetable_configurations(division_id);
CREATE INDEX idx_subjects_division_id ON public.subjects(division_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_school_divisions_updated_at
BEFORE UPDATE ON public.school_divisions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();