
-- Fix foreign key constraints and structural issues

-- Add missing foreign key constraints to streams table
ALTER TABLE public.streams 
ADD CONSTRAINT streams_grade_id_fkey 
FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;

ALTER TABLE public.streams 
ADD CONSTRAINT streams_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Add missing foreign key constraints to teachers table
ALTER TABLE public.teachers 
ADD CONSTRAINT teachers_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.teachers 
ADD CONSTRAINT teachers_stream_id_fkey 
FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE SET NULL;

-- Add missing foreign key constraints to marks table
ALTER TABLE public.marks 
ADD CONSTRAINT marks_exam_id_fkey 
FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

ALTER TABLE public.marks 
ADD CONSTRAINT marks_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.marks 
ADD CONSTRAINT marks_assessment_type_id_fkey 
FOREIGN KEY (assessment_type_id) REFERENCES public.assessment_types(id) ON DELETE SET NULL;

ALTER TABLE public.marks 
ADD CONSTRAINT marks_rubric_id_fkey 
FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE SET NULL;

-- Add missing foreign key constraints to exams table
ALTER TABLE public.exams 
ADD CONSTRAINT exams_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.exams 
ADD CONSTRAINT exams_term_id_fkey 
FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE SET NULL;

ALTER TABLE public.exams 
ADD CONSTRAINT exams_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add missing foreign key constraints to students table
ALTER TABLE public.students 
ADD CONSTRAINT students_grade_id_fkey 
FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;

ALTER TABLE public.students 
ADD CONSTRAINT students_stream_id_fkey 
FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE CASCADE;

ALTER TABLE public.students 
ADD CONSTRAINT students_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add missing foreign key constraints to other tables
ALTER TABLE public.academic_years 
ADD CONSTRAINT academic_years_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.terms 
ADD CONSTRAINT terms_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.terms 
ADD CONSTRAINT terms_academic_year_id_fkey 
FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;

ALTER TABLE public.grades 
ADD CONSTRAINT grades_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.grades 
ADD CONSTRAINT grades_academic_year_id_fkey 
FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- Add missing foreign key constraints to assessment_types table
ALTER TABLE public.assessment_types 
ADD CONSTRAINT assessment_types_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add missing foreign key constraints to rubrics table
ALTER TABLE public.rubrics 
ADD CONSTRAINT rubrics_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.rubrics 
ADD CONSTRAINT rubrics_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add missing foreign key constraints to attendance table
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_stream_id_fkey 
FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE CASCADE;

ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_recorded_by_fkey 
FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_term_id_fkey 
FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE SET NULL;

-- Add missing foreign key constraints to mark_entry_sessions table
ALTER TABLE public.mark_entry_sessions 
ADD CONSTRAINT mark_entry_sessions_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.mark_entry_sessions 
ADD CONSTRAINT mark_entry_sessions_stream_id_fkey 
FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE CASCADE;

ALTER TABLE public.mark_entry_sessions 
ADD CONSTRAINT mark_entry_sessions_assessment_type_id_fkey 
FOREIGN KEY (assessment_type_id) REFERENCES public.assessment_types(id) ON DELETE CASCADE;

ALTER TABLE public.mark_entry_sessions 
ADD CONSTRAINT mark_entry_sessions_exam_id_fkey 
FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

-- Add missing foreign key constraints to audit_logs table
ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add missing foreign key constraints to student_history table
ALTER TABLE public.student_history 
ADD CONSTRAINT student_history_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.student_history 
ADD CONSTRAINT student_history_academic_year_id_fkey 
FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;

ALTER TABLE public.student_history 
ADD CONSTRAINT student_history_grade_id_fkey 
FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;

ALTER TABLE public.student_history 
ADD CONSTRAINT student_history_stream_id_fkey 
FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE CASCADE;

-- Add constraint to ensure unique active academic year per school
CREATE UNIQUE INDEX CONCURRENTLY idx_unique_active_academic_year_per_school 
ON public.academic_years (school_id) 
WHERE is_active = true;

-- Add constraint to ensure unique active term per academic year
CREATE UNIQUE INDEX CONCURRENTLY idx_unique_active_term_per_academic_year 
ON public.terms (academic_year_id) 
WHERE is_active = true;

-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_students_grade_stream ON public.students (grade_id, stream_id);
CREATE INDEX CONCURRENTLY idx_marks_exam_student ON public.marks (exam_id, student_id);
CREATE INDEX CONCURRENTLY idx_attendance_date_stream ON public.attendance (date, stream_id);
CREATE INDEX CONCURRENTLY idx_teachers_school_subject ON public.teachers (school_id, subject);
