
-- Drop existing problematic policies first
DROP POLICY IF EXISTS "School admins can manage streams" ON public.streams;
DROP POLICY IF EXISTS "School admins can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "School admins can manage students" ON public.students;
DROP POLICY IF EXISTS "School admins can manage exams" ON public.exams;
DROP POLICY IF EXISTS "School users can manage marks" ON public.marks;
DROP POLICY IF EXISTS "School admins can manage grades" ON public.grades;
DROP POLICY IF EXISTS "School admins can manage academic years" ON public.academic_years;
DROP POLICY IF EXISTS "School admins can manage terms" ON public.terms;
DROP POLICY IF EXISTS "School admins can manage assessment types" ON public.assessment_types;
DROP POLICY IF EXISTS "School users can manage rubrics" ON public.rubrics;
DROP POLICY IF EXISTS "School users can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "School users can manage mark entry sessions" ON public.mark_entry_sessions;
DROP POLICY IF EXISTS "School admins can manage student history" ON public.student_history;
DROP POLICY IF EXISTS "School admins can manage rooms" ON public.rooms;
DROP POLICY IF EXISTS "School users can manage timetables" ON public.timetables;
DROP POLICY IF EXISTS "School users can manage timetable slots" ON public.timetable_slots;
DROP POLICY IF EXISTS "School admins can manage timetable rules" ON public.timetable_rules;
DROP POLICY IF EXISTS "School users can manage teacher availability" ON public.teacher_availability;

-- Create proper RLS policies for academic_years
CREATE POLICY "School members can view academic years" ON public.academic_years
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = academic_years.school_id
  )
);

CREATE POLICY "School admins can manage academic years" ON public.academic_years
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = academic_years.school_id
    AND role IN ('super_admin', 'school_admin')
  )
);

-- Create proper RLS policies for terms
CREATE POLICY "School members can view terms" ON public.terms
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = terms.school_id
  )
);

CREATE POLICY "School admins can manage terms" ON public.terms
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = terms.school_id
    AND role IN ('super_admin', 'school_admin')
  )
);

-- Create proper RLS policies for grades
CREATE POLICY "School members can view grades" ON public.grades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = grades.school_id
  )
);

CREATE POLICY "School admins can manage grades" ON public.grades
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = grades.school_id
    AND role IN ('super_admin', 'school_admin')
  )
);

-- Create proper RLS policies for streams
CREATE POLICY "School members can view streams" ON public.streams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.grades g ON g.id = streams.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
  )
);

CREATE POLICY "School admins can manage streams" ON public.streams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.grades g ON g.id = streams.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
    AND p.role IN ('super_admin', 'school_admin')
  )
);

-- Create proper RLS policies for students
CREATE POLICY "School members can view students" ON public.students
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = students.school_id
  )
);

CREATE POLICY "School admins and teachers can manage students" ON public.students
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = students.school_id
    AND role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- Create proper RLS policies for teachers
CREATE POLICY "School members can view teachers" ON public.teachers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = teachers.school_id
  )
);

CREATE POLICY "School admins can manage teachers" ON public.teachers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = teachers.school_id
    AND role IN ('super_admin', 'school_admin')
  )
);

-- Create proper RLS policies for exams
CREATE POLICY "School members can view exams" ON public.exams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = exams.school_id
  )
);

CREATE POLICY "School admins and teachers can manage exams" ON public.exams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = exams.school_id
    AND role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- Create proper RLS policies for marks
CREATE POLICY "School members can view marks" ON public.marks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = marks.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
  )
);

CREATE POLICY "School admins and teachers can manage marks" ON public.marks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = marks.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
    AND p.role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- Create proper RLS policies for attendance
CREATE POLICY "School members can view attendance" ON public.attendance
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = attendance.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
  )
);

CREATE POLICY "School admins and teachers can manage attendance" ON public.attendance
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = attendance.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
    AND p.role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- Create proper RLS policies for assessment_types
CREATE POLICY "School members can view assessment types" ON public.assessment_types
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = assessment_types.school_id
  )
);

CREATE POLICY "School admins can manage assessment types" ON public.assessment_types
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = assessment_types.school_id
    AND role IN ('super_admin', 'school_admin')
  )
);

-- Create proper RLS policies for rubrics
CREATE POLICY "School members can view rubrics" ON public.rubrics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = rubrics.school_id
  )
);

CREATE POLICY "School admins and teachers can manage rubrics" ON public.rubrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = rubrics.school_id
    AND p.role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- Create proper RLS policies for mark_entry_sessions
CREATE POLICY "School members can view mark entry sessions" ON public.mark_entry_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.streams s ON s.id = mark_entry_sessions.stream_id
    JOIN public.grades g ON g.id = s.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
  )
);

CREATE POLICY "School admins and teachers can manage mark entry sessions" ON public.mark_entry_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.streams s ON s.id = mark_entry_sessions.stream_id
    JOIN public.grades g ON g.id = s.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
    AND p.role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- Create proper RLS policies for student_history
CREATE POLICY "School members can view student history" ON public.student_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = student_history.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
  )
);

CREATE POLICY "School admins can manage student history" ON public.student_history
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = student_history.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
    AND p.role IN ('super_admin', 'school_admin')
  )
);

-- Create proper RLS policies for audit_logs
CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "School admins can view school audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p2.id = audit_logs.user_id
    WHERE p1.id = auth.uid() 
    AND p1.role = 'school_admin'
    AND p1.school_id = p2.school_id
  )
);

CREATE POLICY "Users can create audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create proper RLS policies for rooms
CREATE POLICY "School members can view rooms" ON public.rooms
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = rooms.school_id
  )
);

CREATE POLICY "School admins can manage rooms" ON public.rooms
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = rooms.school_id
    AND role IN ('super_admin', 'school_admin')
  )
);

-- Create proper RLS policies for timetables
CREATE POLICY "School members can view timetables" ON public.timetables
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = timetables.school_id
  )
);

CREATE POLICY "School admins and teachers can manage timetables" ON public.timetables
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = timetables.school_id
    AND role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- Create proper RLS policies for timetable_slots
CREATE POLICY "School members can view timetable slots" ON public.timetable_slots
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.timetables t ON t.id = timetable_slots.timetable_id
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
  )
);

CREATE POLICY "School admins and teachers can manage timetable slots" ON public.timetable_slots
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.timetables t ON t.id = timetable_slots.timetable_id
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
    AND p.role IN ('super_admin', 'school_admin', 'teacher')
  )
);

-- Create proper RLS policies for timetable_rules
CREATE POLICY "School members can view timetable rules" ON public.timetable_rules
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = timetable_rules.school_id
  )
);

CREATE POLICY "School admins can manage timetable rules" ON public.timetable_rules
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = timetable_rules.school_id
    AND role IN ('super_admin', 'school_admin')
  )
);

-- Create proper RLS policies for teacher_availability
CREATE POLICY "School members can view teacher availability" ON public.teacher_availability
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.teachers t ON t.id = teacher_availability.teacher_id
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
  )
);

CREATE POLICY "Teachers can manage own availability" ON public.teacher_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE id = teacher_availability.teacher_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "School admins can manage teacher availability" ON public.teacher_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.teachers t ON t.id = teacher_availability.teacher_id
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
    AND p.role IN ('super_admin', 'school_admin')
  )
);
