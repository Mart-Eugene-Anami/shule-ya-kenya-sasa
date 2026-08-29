
-- First, let's ensure proper foreign key relationships are established
-- Add missing foreign key constraints for academic_years and terms
ALTER TABLE academic_years 
ADD CONSTRAINT fk_academic_years_school 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE terms 
ADD CONSTRAINT fk_terms_academic_year 
FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_terms_school 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Ensure grades are properly linked to academic years
ALTER TABLE grades 
ADD CONSTRAINT fk_grades_academic_year 
FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_grades_school 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Ensure streams are properly linked
ALTER TABLE streams 
ADD CONSTRAINT fk_streams_grade 
FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_streams_academic_year 
FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_streams_teacher 
FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- Ensure students are properly linked
ALTER TABLE students 
ADD CONSTRAINT fk_students_grade 
FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_students_stream 
FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_students_school 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Ensure teachers are properly linked
ALTER TABLE teachers 
ADD CONSTRAINT fk_teachers_school 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_teachers_stream 
FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_teachers_academic_year 
FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;

-- Ensure exams are properly linked
ALTER TABLE exams 
ADD CONSTRAINT fk_exams_school 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_exams_term 
FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;

-- Ensure marks are properly linked
ALTER TABLE marks 
ADD CONSTRAINT fk_marks_exam 
FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_marks_student 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Ensure attendance is properly linked
ALTER TABLE attendance 
ADD CONSTRAINT fk_attendance_student 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_attendance_stream 
FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_attendance_term 
FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;

-- Create archived academic years table for historical data
CREATE TABLE IF NOT EXISTS archived_academic_years (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_academic_year_id uuid NOT NULL,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year text NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_by uuid NOT NULL,
  archive_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create archived student assignments table
CREATE TABLE IF NOT EXISTS archived_student_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL,
  grade_id uuid NOT NULL,
  stream_id uuid NOT NULL,
  grade_name text NOT NULL,
  stream_name text NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create archived teacher assignments table
CREATE TABLE IF NOT EXISTS archived_teacher_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL,
  stream_id uuid,
  grade_id uuid,
  subjects_taught text[] DEFAULT ARRAY[]::text[],
  is_stream_teacher boolean DEFAULT false,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create year transition notifications table
CREATE TABLE IF NOT EXISTS year_transition_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('term_transition', 'year_end', 'year_start')),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_for_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  scheduled_for timestamp with time zone
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_archived_student_assignments_academic_year ON archived_student_assignments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_archived_teacher_assignments_academic_year ON archived_teacher_assignments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_year_transition_notifications_school ON year_transition_notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_terms_active ON terms(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(school_id, is_active);

-- Function to archive academic year data
CREATE OR REPLACE FUNCTION archive_academic_year_data(
  p_academic_year_id uuid,
  p_archived_by uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_academic_year academic_years%ROWTYPE;
BEGIN
  -- Get the academic year details
  SELECT * INTO v_academic_year FROM academic_years WHERE id = p_academic_year_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Academic year not found';
  END IF;
  
  -- Archive the academic year
  INSERT INTO archived_academic_years (
    original_academic_year_id,
    school_id,
    year,
    archived_by,
    archive_data
  ) VALUES (
    p_academic_year_id,
    v_academic_year.school_id,
    v_academic_year.year,
    p_archived_by,
    jsonb_build_object(
      'is_active', v_academic_year.is_active,
      'created_at', v_academic_year.created_at,
      'updated_at', v_academic_year.updated_at
    )
  );
  
  -- Archive student assignments
  INSERT INTO archived_student_assignments (
    student_id,
    academic_year_id,
    grade_id,
    stream_id,
    grade_name,
    stream_name
  )
  SELECT 
    s.id,
    p_academic_year_id,
    s.grade_id,
    s.stream_id,
    g.name,
    st.name
  FROM students s
  JOIN grades g ON s.grade_id = g.id
  JOIN streams st ON s.stream_id = st.id
  WHERE g.academic_year_id = p_academic_year_id;
  
  -- Archive teacher assignments
  INSERT INTO archived_teacher_assignments (
    teacher_id,
    academic_year_id,
    stream_id,
    grade_id,
    subjects_taught,
    is_stream_teacher
  )
  SELECT 
    t.id,
    p_academic_year_id,
    t.stream_id,
    g.id,
    t.subjects_taught,
    t.is_stream_teacher
  FROM teachers t
  LEFT JOIN streams s ON t.stream_id = s.id
  LEFT JOIN grades g ON s.grade_id = g.id
  WHERE t.academic_year_id = p_academic_year_id;
  
END;
$$;

-- Function to transition to new academic year
CREATE OR REPLACE FUNCTION transition_to_new_academic_year(
  p_school_id uuid,
  p_new_year text,
  p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_academic_year_id uuid;
  v_new_academic_year_id uuid;
BEGIN
  -- Get current active academic year
  SELECT id INTO v_old_academic_year_id 
  FROM academic_years 
  WHERE school_id = p_school_id AND is_active = true;
  
  -- Archive old academic year data if exists
  IF v_old_academic_year_id IS NOT NULL THEN
    PERFORM archive_academic_year_data(v_old_academic_year_id, p_user_id);
    
    -- Deactivate old academic year
    UPDATE academic_years 
    SET is_active = false, updated_at = now() 
    WHERE id = v_old_academic_year_id;
  END IF;
  
  -- Create new academic year
  INSERT INTO academic_years (school_id, year, is_active)
  VALUES (p_school_id, p_new_year, true)
  RETURNING id INTO v_new_academic_year_id;
  
  -- Create notification for admin
  INSERT INTO year_transition_notifications (
    school_id,
    academic_year_id,
    notification_type,
    message,
    created_for_user_id
  ) VALUES (
    p_school_id,
    v_new_academic_year_id,
    'year_start',
    'New academic year ' || p_new_year || ' has started. Please reassign students to grades and streams.',
    p_user_id
  );
  
  RETURN v_new_academic_year_id;
END;
$$;

-- Function to check and transition terms automatically
CREATE OR REPLACE FUNCTION check_and_transition_terms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_term RECORD;
  v_current_term RECORD;
  v_next_term RECORD;
BEGIN
  -- Check all schools for term transitions
  FOR v_term IN 
    SELECT DISTINCT school_id, academic_year_id
    FROM terms 
    WHERE start_date <= CURRENT_DATE 
    AND end_date >= CURRENT_DATE
  LOOP
    -- Get current active term
    SELECT * INTO v_current_term
    FROM terms 
    WHERE school_id = v_term.school_id 
    AND is_active = true;
    
    -- Get term that should be active based on dates
    SELECT * INTO v_next_term
    FROM terms 
    WHERE school_id = v_term.school_id
    AND academic_year_id = v_term.academic_year_id
    AND start_date <= CURRENT_DATE 
    AND end_date >= CURRENT_DATE;
    
    -- If there's a mismatch, transition
    IF v_current_term.id IS DISTINCT FROM v_next_term.id THEN
      -- Deactivate current term
      UPDATE terms SET is_active = false WHERE id = v_current_term.id;
      
      -- Activate new term
      UPDATE terms SET is_active = true WHERE id = v_next_term.id;
      
      -- Create notification
      INSERT INTO year_transition_notifications (
        school_id,
        academic_year_id,
        notification_type,
        message,
        scheduled_for
      ) VALUES (
        v_term.school_id,
        v_term.academic_year_id,
        'term_transition',
        'Automatic transition to ' || v_next_term.name || ' has occurred.',
        now()
      );
    END IF;
  END LOOP;
END;
$$;

-- Enable RLS on new tables
ALTER TABLE archived_academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_student_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE year_transition_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for archived tables
CREATE POLICY "School admins can view archived academic years"
ON archived_academic_years FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND school_id = archived_academic_years.school_id 
    AND role IN ('school_admin', 'super_admin')
  )
);

CREATE POLICY "School admins can view archived student assignments"
ON archived_student_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN profiles p ON p.school_id = s.school_id
    WHERE s.id = archived_student_assignments.student_id
    AND p.id = auth.uid()
    AND p.role IN ('school_admin', 'teacher', 'super_admin')
  )
);

CREATE POLICY "School admins can view archived teacher assignments"
ON archived_teacher_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM teachers t
    JOIN profiles p ON p.school_id = t.school_id
    WHERE t.id = archived_teacher_assignments.teacher_id
    AND p.id = auth.uid()
    AND p.role IN ('school_admin', 'super_admin')
  )
);

CREATE POLICY "School users can view their notifications"
ON year_transition_notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND school_id = year_transition_notifications.school_id 
    AND role IN ('school_admin', 'teacher', 'super_admin')
  )
);

CREATE POLICY "School admins can manage notifications"
ON year_transition_notifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND school_id = year_transition_notifications.school_id 
    AND role IN ('school_admin', 'super_admin')
  )
);
