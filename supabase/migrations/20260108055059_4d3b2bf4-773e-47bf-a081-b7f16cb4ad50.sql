-- Create a function to safely delete a school and its related data
CREATE OR REPLACE FUNCTION public.delete_school_cascade(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if the caller is a super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can delete schools';
  END IF;

  -- Delete marks (references students)
  DELETE FROM public.marks 
  WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id);

  -- Delete attendance (references students)
  DELETE FROM public.attendance 
  WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id);

  -- Delete student_history (references students)
  DELETE FROM public.student_history 
  WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id);

  -- Delete archived_student_assignments (references students)
  DELETE FROM public.archived_student_assignments 
  WHERE student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id);

  -- Delete students
  DELETE FROM public.students WHERE school_id = p_school_id;

  -- Delete timetable_slots (references timetables)
  DELETE FROM public.timetable_slots 
  WHERE timetable_id IN (SELECT id FROM public.timetables WHERE school_id = p_school_id);

  -- Delete timetables
  DELETE FROM public.timetables WHERE school_id = p_school_id;

  -- Delete teacher_availability (references teachers)
  DELETE FROM public.teacher_availability 
  WHERE teacher_id IN (SELECT id FROM public.teachers WHERE school_id = p_school_id);

  -- Delete teacher_subject_assignments (references teachers)
  DELETE FROM public.teacher_subject_assignments 
  WHERE teacher_id IN (SELECT id FROM public.teachers WHERE school_id = p_school_id);

  -- Delete archived_teacher_assignments (references teachers)
  DELETE FROM public.archived_teacher_assignments 
  WHERE teacher_id IN (SELECT id FROM public.teachers WHERE school_id = p_school_id);

  -- Delete teachers
  DELETE FROM public.teachers WHERE school_id = p_school_id;

  -- Delete grade_streams (references grades)
  DELETE FROM public.grade_streams 
  WHERE grade_id IN (SELECT id FROM public.grades WHERE school_id = p_school_id);

  -- Delete sections (references grades)
  DELETE FROM public.sections 
  WHERE grade_id IN (SELECT id FROM public.grades WHERE school_id = p_school_id);

  -- Delete exams
  DELETE FROM public.exams WHERE school_id = p_school_id;

  -- Delete terms (references academic_years)
  DELETE FROM public.terms WHERE school_id = p_school_id;

  -- Delete year_transition_notifications
  DELETE FROM public.year_transition_notifications WHERE school_id = p_school_id;

  -- Delete archived_academic_years
  DELETE FROM public.archived_academic_years WHERE school_id = p_school_id;

  -- Delete academic_years
  DELETE FROM public.academic_years WHERE school_id = p_school_id;

  -- Delete streams
  DELETE FROM public.streams WHERE school_id = p_school_id;

  -- Delete grades
  DELETE FROM public.grades WHERE school_id = p_school_id;

  -- Delete mark_entry_sessions (references streams - may have null grade_id on stream)
  DELETE FROM public.mark_entry_sessions 
  WHERE stream_id IN (SELECT id FROM public.streams WHERE school_id = p_school_id);

  -- Delete subjects
  DELETE FROM public.subjects WHERE school_id = p_school_id;

  -- Delete assessment_types
  DELETE FROM public.assessment_types WHERE school_id = p_school_id;

  -- Delete rubrics
  DELETE FROM public.rubrics WHERE school_id = p_school_id;

  -- Delete rooms
  DELETE FROM public.rooms WHERE school_id = p_school_id;

  -- Delete timetable_configurations
  DELETE FROM public.timetable_configurations WHERE school_id = p_school_id;

  -- Delete timetable_rules
  DELETE FROM public.timetable_rules WHERE school_id = p_school_id;

  -- Clear school_id from profiles (don't delete profiles, just unlink them)
  UPDATE public.profiles SET school_id = NULL WHERE school_id = p_school_id;

  -- Finally delete the school
  DELETE FROM public.schools WHERE id = p_school_id;
END;
$$;