-- Create table for teacher-subject assignments per grade-stream combination
CREATE TABLE IF NOT EXISTS public.teacher_subject_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  grade_stream_id uuid NOT NULL REFERENCES public.grade_streams(id) ON DELETE CASCADE,
  subject text NOT NULL,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, grade_stream_id, subject, academic_year_id)
);

-- Add RLS policies
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- School admins can manage teacher assignments
CREATE POLICY "School admins can manage teacher assignments"
ON public.teacher_subject_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN teachers t ON t.id = teacher_subject_assignments.teacher_id
    WHERE p.id = auth.uid()
    AND p.school_id = t.school_id
    AND p.role IN ('super_admin', 'school_admin')
  )
);

-- School members can view teacher assignments
CREATE POLICY "School members can view teacher assignments"
ON public.teacher_subject_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN teachers t ON t.id = teacher_subject_assignments.teacher_id
    WHERE p.id = auth.uid()
    AND p.school_id = t.school_id
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_teacher_subject_assignments_updated_at
BEFORE UPDATE ON public.teacher_subject_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();