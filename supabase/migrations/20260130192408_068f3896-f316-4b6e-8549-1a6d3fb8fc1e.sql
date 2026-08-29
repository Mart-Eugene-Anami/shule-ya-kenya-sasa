-- Add subject type and pathway information to subjects table
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS subject_type TEXT NOT NULL DEFAULT 'core' CHECK (subject_type IN ('core', 'optional', 'elective')),
ADD COLUMN IF NOT EXISTS pathway TEXT CHECK (pathway IN ('stem', 'arts_sports', 'social_sciences', NULL)),
ADD COLUMN IF NOT EXISTS max_lessons_per_week INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS requires_special_room BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS special_room_type TEXT;

-- Add max lessons per week constraint to teachers table
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS max_lessons_per_week INTEGER DEFAULT 30;

-- Add special room type for labs, computer rooms, etc.
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;

-- Create table for subject-room requirements (e.g., Physics requires Lab)
CREATE TABLE IF NOT EXISTS public.subject_room_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_type TEXT,
  is_mandatory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(school_id, subject_id, room_id)
);

-- Enable RLS on subject_room_requirements
ALTER TABLE public.subject_room_requirements ENABLE ROW LEVEL SECURITY;

-- RLS policies for subject_room_requirements
CREATE POLICY "School admins can manage subject room requirements"
ON public.subject_room_requirements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = subject_room_requirements.school_id
    AND profiles.role IN ('super_admin', 'school_admin')
  )
);

CREATE POLICY "School members can view subject room requirements"
ON public.subject_room_requirements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = subject_room_requirements.school_id
  )
);

-- Add free period tracking to timetable slots
ALTER TABLE public.timetable_slots
ADD COLUMN IF NOT EXISTS is_free_period BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_optional_subject BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pathway TEXT CHECK (pathway IN ('stem', 'arts_sports', 'social_sciences', NULL));

-- Add weekly lesson tracking for constraint enforcement
CREATE TABLE IF NOT EXISTS public.timetable_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  constraint_type TEXT NOT NULL CHECK (constraint_type IN ('teacher_max_lessons', 'subject_max_lessons', 'free_periods_per_day', 'max_consecutive_lessons')),
  entity_id UUID, -- teacher_id or subject_id depending on type
  entity_name TEXT, -- for subjects that don't have UUIDs yet
  max_value INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on timetable_constraints
ALTER TABLE public.timetable_constraints ENABLE ROW LEVEL SECURITY;

-- RLS policies for timetable_constraints
CREATE POLICY "School admins can manage timetable constraints"
ON public.timetable_constraints
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = timetable_constraints.school_id
    AND profiles.role IN ('super_admin', 'school_admin')
  )
);

CREATE POLICY "School members can view timetable constraints"
ON public.timetable_constraints
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = timetable_constraints.school_id
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subject_room_requirements_school ON public.subject_room_requirements(school_id);
CREATE INDEX IF NOT EXISTS idx_subject_room_requirements_subject ON public.subject_room_requirements(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_constraints_school ON public.timetable_constraints(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_constraints_type ON public.timetable_constraints(constraint_type);
CREATE INDEX IF NOT EXISTS idx_subjects_type ON public.subjects(subject_type);
CREATE INDEX IF NOT EXISTS idx_subjects_pathway ON public.subjects(pathway);

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_subject_room_requirements_updated_at
BEFORE UPDATE ON public.subject_room_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timetable_constraints_updated_at
BEFORE UPDATE ON public.timetable_constraints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();