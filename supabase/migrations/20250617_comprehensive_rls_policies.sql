
-- Comprehensive RLS Policies for the Updated Database Schema

-- Drop all existing policies first to avoid conflicts
DO $$
DECLARE 
    r RECORD;
BEGIN
    -- Drop all existing policies
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- ==============================================
-- PROFILES TABLE POLICIES
-- ==============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles  
FOR UPDATE USING (auth.uid() = id);

-- Super admins can view and manage all profiles
CREATE POLICY "Super admins manage all profiles" ON public.profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Admins can view profiles in their school
CREATE POLICY "Admins view school profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
    AND p.school_id = profiles.school_id
  )
);

-- Teachers can view profiles in their school
CREATE POLICY "Teachers view school profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'teacher'
    AND p.school_id = profiles.school_id
  )
);

-- ==============================================
-- SCHOOLS TABLE POLICIES  
-- ==============================================

-- Super admins can manage all schools
CREATE POLICY "Super admins manage schools" ON public.schools
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- School members can view their school
CREATE POLICY "School members view own school" ON public.schools
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = schools.id
  )
);

-- Admins can update their school
CREATE POLICY "Admins update own school" ON public.schools
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = schools.id
    AND role = 'admin'
  )
);

-- ==============================================
-- ACADEMIC YEARS TABLE POLICIES
-- ==============================================

-- School members can view academic years
CREATE POLICY "School members view academic years" ON public.academic_years
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = academic_years.school_id
  )
);

-- Admins can manage academic years
CREATE POLICY "Admins manage academic years" ON public.academic_years
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = academic_years.school_id
    AND role IN ('super_admin', 'admin')
  )
);

-- ==============================================
-- TERMS TABLE POLICIES
-- ==============================================

-- School members can view terms
CREATE POLICY "School members view terms" ON public.terms
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = terms.school_id
  )
);

-- Admins can manage terms
CREATE POLICY "Admins manage terms" ON public.terms
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = terms.school_id
    AND role IN ('super_admin', 'admin')
  )
);

-- ==============================================
-- GRADES TABLE POLICIES
-- ==============================================

-- School members can view grades
CREATE POLICY "School members view grades" ON public.grades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = grades.school_id
  )
);

-- Admins can manage grades
CREATE POLICY "Admins manage grades" ON public.grades
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = grades.school_id
    AND role IN ('super_admin', 'admin')
  )
);

-- ==============================================
-- STREAMS TABLE POLICIES
-- ==============================================

-- School members can view streams
CREATE POLICY "School members view streams" ON public.streams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.grades g ON g.id = streams.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
  )
);

-- Admins can manage streams
CREATE POLICY "Admins manage streams" ON public.streams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.grades g ON g.id = streams.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
    AND p.role IN ('super_admin', 'admin')
  )
);

-- Teachers can update streams they are assigned to
CREATE POLICY "Teachers update assigned streams" ON public.streams
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.grades g ON g.id = streams.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
    AND p.role = 'teacher'
    AND (streams.teacher_id = auth.uid() OR streams.teacher_id IS NULL)
  )
);

-- ==============================================
-- STUDENTS TABLE POLICIES
-- ==============================================

-- School members can view students
CREATE POLICY "School members view students" ON public.students
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = students.school_id
  )
);

-- Admins and teachers can manage students
CREATE POLICY "Admins and teachers manage students" ON public.students
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = students.school_id
    AND role IN ('super_admin', 'admin', 'teacher')
  )
);

-- Students can view their own record
CREATE POLICY "Students view own record" ON public.students
FOR SELECT USING (user_id = auth.uid());

-- ==============================================
-- TEACHERS TABLE POLICIES
-- ==============================================

-- School members can view teachers
CREATE POLICY "School members view teachers" ON public.teachers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = teachers.school_id
  )
);

-- Admins can manage teachers
CREATE POLICY "Admins manage teachers" ON public.teachers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = teachers.school_id
    AND role IN ('super_admin', 'admin')
  )
);

-- Teachers can view and update their own record
CREATE POLICY "Teachers manage own record" ON public.teachers
FOR ALL USING (user_id = auth.uid());

-- ==============================================
-- EXAMS TABLE POLICIES
-- ==============================================

-- School members can view exams
CREATE POLICY "School members view exams" ON public.exams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = exams.school_id
  )
);

-- Admins and teachers can manage exams
CREATE POLICY "Admins and teachers manage exams" ON public.exams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = exams.school_id
    AND role IN ('super_admin', 'admin', 'teacher')
  )
);

-- ==============================================
-- MARKS TABLE POLICIES
-- ==============================================

-- Teachers can view marks for their school
CREATE POLICY "School members view marks" ON public.marks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = marks.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
  )
);

-- Teachers can manage marks
CREATE POLICY "Teachers manage marks" ON public.marks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = marks.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
    AND p.role IN ('super_admin', 'admin', 'teacher')
  )
);

-- Students can view their own marks
CREATE POLICY "Students view own marks" ON public.marks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE id = marks.student_id 
    AND user_id = auth.uid()
  )
);

-- ==============================================
-- ATTENDANCE TABLE POLICIES
-- ==============================================

-- School members can view attendance
CREATE POLICY "School members view attendance" ON public.attendance
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = attendance.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
  )
);

-- Teachers can manage attendance
CREATE POLICY "Teachers manage attendance" ON public.attendance
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = attendance.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
    AND p.role IN ('super_admin', 'admin', 'teacher')
  )
);

-- ==============================================
-- RUBRICS TABLE POLICIES
-- ==============================================

-- School members can view rubrics
CREATE POLICY "School members view rubrics" ON public.rubrics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = rubrics.school_id
  )
);

-- Admins can manage rubrics
CREATE POLICY "Admins manage rubrics" ON public.rubrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = rubrics.school_id
    AND role IN ('super_admin', 'admin')
  )
);

-- ==============================================
-- ASSESSMENT TYPES TABLE POLICIES
-- ==============================================

-- School members can view assessment types
CREATE POLICY "School members view assessment types" ON public.assessment_types
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = assessment_types.school_id
  )
);

-- Admins can manage assessment types
CREATE POLICY "Admins manage assessment types" ON public.assessment_types
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = assessment_types.school_id
    AND role IN ('super_admin', 'admin')
  )
);

-- ==============================================
-- MARK ENTRY SESSIONS TABLE POLICIES
-- ==============================================

-- Teachers can view mark entry sessions
CREATE POLICY "Teachers view mark sessions" ON public.mark_entry_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.streams s ON s.id = mark_entry_sessions.stream_id
    JOIN public.grades g ON g.id = s.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
    AND p.role IN ('super_admin', 'admin', 'teacher')
  )
);

-- Teachers can manage their own mark entry sessions
CREATE POLICY "Teachers manage own mark sessions" ON public.mark_entry_sessions
FOR ALL USING (teacher_id = auth.uid());

-- Admins can manage all mark entry sessions in their school
CREATE POLICY "Admins manage school mark sessions" ON public.mark_entry_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.streams s ON s.id = mark_entry_sessions.stream_id
    JOIN public.grades g ON g.id = s.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
    AND p.role IN ('super_admin', 'admin')
  )
);

-- ==============================================
-- STUDENT HISTORY TABLE POLICIES
-- ==============================================

-- School members can view student history
CREATE POLICY "School members view student history" ON public.student_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = student_history.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
  )
);

-- Admins can manage student history
CREATE POLICY "Admins manage student history" ON public.student_history
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = student_history.student_id
    WHERE p.id = auth.uid() 
    AND p.school_id = s.school_id
    AND p.role IN ('super_admin', 'admin')
  )
);

-- ==============================================
-- AUDIT LOGS TABLE POLICIES
-- ==============================================

-- Super admins can view all audit logs
CREATE POLICY "Super admins view all audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Admins can view audit logs for their school
CREATE POLICY "Admins view school audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'admin'
    AND school_id IN (
      SELECT school_id FROM public.profiles WHERE id = audit_logs.user_id
    )
  )
);

-- All authenticated users can create audit logs
CREATE POLICY "Users create audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (user_id = auth.uid());

-- ==============================================
-- REMAINING TABLES (ROOMS, TIMETABLES, etc.)
-- ==============================================

-- Rooms policies
CREATE POLICY "School members view rooms" ON public.rooms
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = rooms.school_id
  )
);

CREATE POLICY "Admins manage rooms" ON public.rooms
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = rooms.school_id
    AND role IN ('super_admin', 'admin')
  )
);

-- Timetables policies
CREATE POLICY "School members view timetables" ON public.timetables
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = timetables.school_id
  )
);

CREATE POLICY "Admins manage timetables" ON public.timetables
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = timetables.school_id
    AND role IN ('super_admin', 'admin')
  )
);

-- Timetable slots policies
CREATE POLICY "School members view timetable slots" ON public.timetable_slots
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.timetables t ON t.id = timetable_slots.timetable_id
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
  )
);

CREATE POLICY "Admins manage timetable slots" ON public.timetable_slots
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.timetables t ON t.id = timetable_slots.timetable_id
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
    AND p.role IN ('super_admin', 'admin')
  )
);

-- Teacher availability policies
CREATE POLICY "Teachers view availability" ON public.teacher_availability
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.teachers t ON t.id = teacher_availability.teacher_id
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
  )
);

CREATE POLICY "Teachers manage own availability" ON public.teacher_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE id = teacher_availability.teacher_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins manage teacher availability" ON public.teacher_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.teachers t ON t.id = teacher_availability.teacher_id
    WHERE p.id = auth.uid() 
    AND p.school_id = t.school_id
    AND p.role IN ('super_admin', 'admin')
  )
);

-- Timetable rules policies
CREATE POLICY "School members view timetable rules" ON public.timetable_rules
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = timetable_rules.school_id
  )
);

CREATE POLICY "Admins manage timetable rules" ON public.timetable_rules
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND school_id = timetable_rules.school_id
    AND role IN ('super_admin', 'admin')
  )
);
