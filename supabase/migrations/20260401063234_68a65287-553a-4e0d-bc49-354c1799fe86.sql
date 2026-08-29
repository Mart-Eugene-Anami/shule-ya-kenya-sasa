
-- Table to store report card comments from subject teachers, class teachers, and head teachers
CREATE TABLE public.report_card_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  comment_type text NOT NULL CHECK (comment_type IN ('subject_teacher', 'class_teacher', 'head_teacher')),
  subject text, -- only for subject_teacher type
  comment text NOT NULL,
  commented_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, exam_id, comment_type, subject)
);

ALTER TABLE public.report_card_comments ENABLE ROW LEVEL SECURITY;

-- School admins and teachers can manage comments
CREATE POLICY "School staff can manage report comments"
ON public.report_card_comments FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN students s ON s.id = report_card_comments.student_id
    WHERE p.id = auth.uid()
    AND p.school_id = s.school_id
    AND p.role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- School members can view comments
CREATE POLICY "School members can view report comments"
ON public.report_card_comments FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN students s ON s.id = report_card_comments.student_id
    WHERE p.id = auth.uid()
    AND p.school_id = s.school_id
  )
);
