
-- Add RLS policies for all tables to ensure proper data access

-- Policies for streams table
CREATE POLICY "School admins can manage streams" ON public.streams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.grades g ON g.id = streams.grade_id
    WHERE p.id = auth.uid() 
    AND p.school_id = g.school_id
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for teachers table
CREATE POLICY "School admins can manage teachers" ON public.teachers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = teachers.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for students table
CREATE POLICY "School admins can manage students" ON public.students
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = students.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for exams table
CREATE POLICY "School admins can manage exams" ON public.exams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = exams.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for marks table
CREATE POLICY "School users can manage marks" ON public.marks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.exams e ON e.id = marks.exam_id
    WHERE p.id = auth.uid() 
    AND (p.school_id = e.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'teacher', 'super_admin')
  )
);

-- Policies for grades table
CREATE POLICY "School admins can manage grades" ON public.grades
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = grades.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for academic_years table
CREATE POLICY "School admins can manage academic years" ON public.academic_years
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = academic_years.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for terms table
CREATE POLICY "School admins can manage terms" ON public.terms
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = terms.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for assessment_types table
CREATE POLICY "School admins can manage assessment types" ON public.assessment_types
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = assessment_types.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for rubrics table
CREATE POLICY "School users can manage rubrics" ON public.rubrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = rubrics.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'teacher', 'super_admin')
  )
);

-- Policies for attendance table
CREATE POLICY "School users can manage attendance" ON public.attendance
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.streams s ON s.id = attendance.stream_id
    JOIN public.grades g ON g.id = s.grade_id
    WHERE p.id = auth.uid() 
    AND (p.school_id = g.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'teacher', 'super_admin')
  )
);

-- Policies for mark_entry_sessions table
CREATE POLICY "School users can manage mark entry sessions" ON public.mark_entry_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.streams s ON s.id = mark_entry_sessions.stream_id
    JOIN public.grades g ON g.id = s.grade_id
    WHERE p.id = auth.uid() 
    AND (p.school_id = g.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'teacher', 'super_admin')
  )
);

-- Policies for audit_logs table
CREATE POLICY "School admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for student_history table
CREATE POLICY "School admins can manage student history" ON public.student_history
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.students s ON s.id = student_history.student_id
    WHERE p.id = auth.uid() 
    AND (p.school_id = s.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for rooms table
CREATE POLICY "School admins can manage rooms" ON public.rooms
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = rooms.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for timetables table
CREATE POLICY "School users can manage timetables" ON public.timetables
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = timetables.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'teacher', 'super_admin')
  )
);

-- Policies for timetable_slots table
CREATE POLICY "School users can manage timetable slots" ON public.timetable_slots
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.timetables t ON t.id = timetable_slots.timetable_id
    WHERE p.id = auth.uid() 
    AND (p.school_id = t.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'teacher', 'super_admin')
  )
);

-- Policies for timetable_rules table
CREATE POLICY "School admins can manage timetable rules" ON public.timetable_rules
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.school_id = timetable_rules.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'super_admin')
  )
);

-- Policies for teacher_availability table
CREATE POLICY "School users can manage teacher availability" ON public.teacher_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.teachers t ON t.id = teacher_availability.teacher_id
    WHERE p.id = auth.uid() 
    AND (p.school_id = t.school_id OR p.role = 'super_admin')
    AND p.role IN ('school_admin', 'teacher', 'super_admin')
  )
);
