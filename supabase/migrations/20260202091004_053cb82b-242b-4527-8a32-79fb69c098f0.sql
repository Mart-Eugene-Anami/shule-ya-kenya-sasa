-- Add grade_id and stream_id to rooms table to link rooms to grade-streams
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS grade_id uuid REFERENCES public.grades(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stream_id uuid REFERENCES public.streams(id) ON DELETE SET NULL;

-- Create a table for room-subject allocations (which subjects can be taught in which rooms)
CREATE TABLE IF NOT EXISTS public.room_subject_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  is_core boolean NOT NULL DEFAULT false,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_id, subject_id, academic_year_id)
);

-- Create a table for room-teacher allocations (which teachers can teach in which rooms)
CREATE TABLE IF NOT EXISTS public.room_teacher_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  lessons_per_week integer NOT NULL DEFAULT 4,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_id, teacher_id, subject_id, academic_year_id)
);

-- Enable RLS on new tables
ALTER TABLE public.room_subject_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_teacher_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_subject_allocations
CREATE POLICY "School admins can manage room subject allocations"
ON public.room_subject_allocations
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.school_id = room_subject_allocations.school_id
  AND profiles.role IN ('super_admin', 'school_admin')
));

CREATE POLICY "School members can view room subject allocations"
ON public.room_subject_allocations
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.school_id = room_subject_allocations.school_id
));

-- RLS policies for room_teacher_allocations
CREATE POLICY "School admins can manage room teacher allocations"
ON public.room_teacher_allocations
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.school_id = room_teacher_allocations.school_id
  AND profiles.role IN ('super_admin', 'school_admin')
));

CREATE POLICY "School members can view room teacher allocations"
ON public.room_teacher_allocations
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.school_id = room_teacher_allocations.school_id
));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rooms_grade_id ON public.rooms(grade_id);
CREATE INDEX IF NOT EXISTS idx_rooms_stream_id ON public.rooms(stream_id);
CREATE INDEX IF NOT EXISTS idx_rooms_school_grade ON public.rooms(school_id, grade_id);
CREATE INDEX IF NOT EXISTS idx_room_subject_allocations_room ON public.room_subject_allocations(room_id);
CREATE INDEX IF NOT EXISTS idx_room_subject_allocations_school ON public.room_subject_allocations(school_id);
CREATE INDEX IF NOT EXISTS idx_room_teacher_allocations_room ON public.room_teacher_allocations(room_id);
CREATE INDEX IF NOT EXISTS idx_room_teacher_allocations_school ON public.room_teacher_allocations(school_id);