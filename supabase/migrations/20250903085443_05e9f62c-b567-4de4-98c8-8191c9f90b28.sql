-- First, let's check and ensure our database has proper RLS policies
-- Enable RLS on key tables if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_types ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for authentication
-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" ON public.profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Schools policies
DROP POLICY IF EXISTS "Public can view schools" ON public.schools;
CREATE POLICY "Public can view schools" ON public.schools
FOR SELECT USING (true);

DROP POLICY IF EXISTS "School admins can manage their school" ON public.schools;
CREATE POLICY "School admins can manage their school" ON public.schools
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'super_admin' OR (role = 'school_admin' AND school_id = schools.id))
  )
);

-- Students policies  
DROP POLICY IF EXISTS "School members can view students" ON public.students;
CREATE POLICY "School members can view students" ON public.students
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id = students.school_id
  )
);

DROP POLICY IF EXISTS "School admins and teachers can manage students" ON public.students;
CREATE POLICY "School admins and teachers can manage students" ON public.students
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id = students.school_id 
    AND role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- Teachers policies
DROP POLICY IF EXISTS "School members can view teachers" ON public.teachers;
CREATE POLICY "School members can view teachers" ON public.teachers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id = teachers.school_id
  )
);

DROP POLICY IF EXISTS "School admins can manage teachers" ON public.teachers;
CREATE POLICY "School admins can manage teachers" ON public.teachers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id = teachers.school_id 
    AND role IN ('super_admin', 'school_admin')
  )
);

-- Basic policies for other tables
DROP POLICY IF EXISTS "School members can view grades" ON public.grades;
CREATE POLICY "School members can view grades" ON public.grades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id = grades.school_id
  )
);

DROP POLICY IF EXISTS "School members can view streams" ON public.streams;
CREATE POLICY "School members can view streams" ON public.streams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id = streams.school_id
  )
);

DROP POLICY IF EXISTS "School members can view exams" ON public.exams;
CREATE POLICY "School members can view exams" ON public.exams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id = exams.school_id
  )
);

DROP POLICY IF EXISTS "School members can view marks" ON public.marks;
CREATE POLICY "School members can view marks" ON public.marks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.profiles p ON p.school_id = s.school_id
    WHERE s.id = marks.student_id AND p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "School members can view rubrics" ON public.rubrics;
CREATE POLICY "School members can view rubrics" ON public.rubrics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id = rubrics.school_id
  )
);

DROP POLICY IF EXISTS "School members can view assessment types" ON public.assessment_types;
CREATE POLICY "School members can view assessment types" ON public.assessment_types
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND school_id = assessment_types.school_id
  )
);