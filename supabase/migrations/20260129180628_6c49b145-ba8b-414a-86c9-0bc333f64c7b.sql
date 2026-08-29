-- Create archived_marks table to store historical mark data
CREATE TABLE IF NOT EXISTS public.archived_marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_mark_id UUID NOT NULL,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  admission_no TEXT NOT NULL,
  exam_id UUID NOT NULL,
  exam_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  score NUMERIC NOT NULL,
  out_of NUMERIC NOT NULL DEFAULT 100,
  grade TEXT,
  academic_year_id UUID NOT NULL,
  term_id UUID,
  term_name TEXT,
  grade_id UUID NOT NULL,
  grade_name TEXT NOT NULL,
  stream_id UUID NOT NULL,
  stream_name TEXT NOT NULL,
  school_id UUID NOT NULL,
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create archived_attendance table to store historical attendance data
CREATE TABLE IF NOT EXISTS public.archived_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_attendance_id UUID NOT NULL,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  admission_no TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  academic_year_id UUID NOT NULL,
  term_id UUID,
  term_name TEXT,
  grade_id UUID NOT NULL,
  grade_name TEXT NOT NULL,
  stream_id UUID NOT NULL,
  stream_name TEXT NOT NULL,
  school_id UUID NOT NULL,
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create archived_exams table to store historical exam data
CREATE TABLE IF NOT EXISTS public.archived_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_exam_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  grades TEXT[] NOT NULL,
  subjects TEXT[] NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  school_id UUID NOT NULL,
  academic_year_id UUID NOT NULL,
  term_id UUID,
  term_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.archived_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_exams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for archived_marks
CREATE POLICY "School admins can view archived marks" 
ON public.archived_marks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.school_id = archived_marks.school_id
  AND profiles.role IN ('school_admin', 'super_admin', 'teacher')
));

-- Create RLS policies for archived_attendance
CREATE POLICY "School admins can view archived attendance" 
ON public.archived_attendance 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.school_id = archived_attendance.school_id
  AND profiles.role IN ('school_admin', 'super_admin', 'teacher')
));

-- Create RLS policies for archived_exams
CREATE POLICY "School admins can view archived exams" 
ON public.archived_exams 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.school_id = archived_exams.school_id
  AND profiles.role IN ('school_admin', 'super_admin', 'teacher')
));

-- Create indexes for better query performance
CREATE INDEX idx_archived_marks_academic_year ON public.archived_marks(academic_year_id);
CREATE INDEX idx_archived_marks_school ON public.archived_marks(school_id);
CREATE INDEX idx_archived_attendance_academic_year ON public.archived_attendance(academic_year_id);
CREATE INDEX idx_archived_attendance_school ON public.archived_attendance(school_id);
CREATE INDEX idx_archived_exams_academic_year ON public.archived_exams(academic_year_id);
CREATE INDEX idx_archived_exams_school ON public.archived_exams(school_id);