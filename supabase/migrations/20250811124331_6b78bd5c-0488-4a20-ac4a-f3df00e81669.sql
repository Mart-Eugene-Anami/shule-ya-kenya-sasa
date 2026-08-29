-- Create a proper marks table for exam marks
CREATE TABLE IF NOT EXISTS public.marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL,
  student_id UUID NOT NULL,
  subject TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  out_of DECIMAL(5,2) NOT NULL DEFAULT 100,
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on marks table
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for marks
CREATE POLICY "Teachers can insert marks for their school"
ON public.marks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('teacher', 'admin')
    AND school_id = get_user_school_id()
  )
);

CREATE POLICY "Users can view marks for their school"
ON public.marks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND school_id = get_user_school_id()
  )
);

CREATE POLICY "Teachers can update marks for their school"
ON public.marks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('teacher', 'admin')
    AND school_id = get_user_school_id()
  )
);

CREATE POLICY "Teachers can delete marks for their school"
ON public.marks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('teacher', 'admin')
    AND school_id = get_user_school_id()
  )
);

-- Add indexes for better performance
CREATE INDEX idx_marks_exam_id ON public.marks(exam_id);
CREATE INDEX idx_marks_student_id ON public.marks(student_id);
CREATE INDEX idx_marks_subject ON public.marks(subject);

-- Create a view to easily get student details with marks
CREATE OR REPLACE VIEW public.student_marks_view AS
SELECT 
  s.student_id as id,
  CONCAT(s.first_name, ' ', s.last_name) as name,
  s.admission_number as admission_no,
  s.school_id,
  s.stream_id,
  m.id as mark_id,
  m.exam_id,
  m.subject,
  m.score,
  m.out_of,
  m.recorded_by,
  m.recorded_at
FROM students_new s
LEFT JOIN marks m ON s.student_id = m.student_id;