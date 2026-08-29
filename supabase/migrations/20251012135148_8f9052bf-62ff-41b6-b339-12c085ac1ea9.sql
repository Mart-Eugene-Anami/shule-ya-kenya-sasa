-- Add teacher_id to grade_streams table to track stream teachers per grade-stream combination
ALTER TABLE public.grade_streams 
ADD COLUMN teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_grade_streams_teacher_id ON public.grade_streams(teacher_id);

-- Add comment for clarity
COMMENT ON COLUMN public.grade_streams.teacher_id IS 'The stream teacher assigned to this specific grade-stream combination';

-- Remove the old stream_id from teachers table as it's no longer needed
-- Teachers are now linked via grade_streams table
ALTER TABLE public.teachers DROP COLUMN IF EXISTS stream_id;

-- Update RLS policies for grade_streams to allow teacher management
DROP POLICY IF EXISTS "School admins can manage grade streams" ON public.grade_streams;
DROP POLICY IF EXISTS "School members can view grade streams" ON public.grade_streams;

CREATE POLICY "School admins can manage grade streams" 
ON public.grade_streams 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN grades g ON g.id = grade_streams.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id 
    AND p.role IN ('super_admin', 'school_admin')
  )
);

CREATE POLICY "School members can view grade streams" 
ON public.grade_streams 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN grades g ON g.id = grade_streams.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
  )
);