-- First, create the Edge Function for teacher creation with authentication
CREATE OR REPLACE FUNCTION public.create_teacher_with_auth(
  p_name text,
  p_email text,
  p_password text,
  p_subject text,
  p_school_id uuid,
  p_is_stream_teacher boolean DEFAULT false,
  p_stream_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  new_teacher jsonb;
BEGIN
  -- Create teacher record
  INSERT INTO public.teachers (
    name,
    email,
    subject,
    school_id,
    is_stream_teacher,
    stream_id,
    status,
    hire_date
  ) VALUES (
    p_name,
    p_email,
    p_subject,
    p_school_id,
    p_is_stream_teacher,
    p_stream_id,
    'active',
    CURRENT_DATE
  )
  RETURNING jsonb_build_object(
    'id', id,
    'name', name,
    'email', email,
    'subject', subject,
    'school_id', school_id,
    'is_stream_teacher', is_stream_teacher,
    'stream_id', stream_id,
    'status', status,
    'hire_date', hire_date,
    'created_at', created_at
  ) INTO new_teacher;

  RETURN jsonb_build_object(
    'success', true,
    'teacher', new_teacher,
    'message', 'Teacher created successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A teacher with this email already exists'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Update the streams table to ensure school-level streams apply to all grades
-- Create a trigger to automatically apply new streams to all existing grades
CREATE OR REPLACE FUNCTION public.apply_stream_to_all_grades()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  grade_record RECORD;
BEGIN
  -- Only apply to school-level streams (grade_id is NULL)
  IF NEW.grade_id IS NULL THEN
    -- Apply this stream to all grades in the same school
    FOR grade_record IN 
      SELECT id FROM public.grades WHERE school_id = NEW.school_id
    LOOP
      INSERT INTO public.grade_streams (grade_id, stream_id)
      VALUES (grade_record.id, NEW.id)
      ON CONFLICT (grade_id, stream_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_apply_stream_to_grades ON public.streams;
CREATE TRIGGER trigger_apply_stream_to_grades
  AFTER INSERT ON public.streams
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_stream_to_all_grades();

-- Create a trigger to apply all existing streams to new grades
CREATE OR REPLACE FUNCTION public.apply_all_streams_to_new_grade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  stream_record RECORD;
BEGIN
  -- Apply all school-level streams to the new grade
  FOR stream_record IN 
    SELECT id FROM public.streams 
    WHERE school_id = NEW.school_id AND grade_id IS NULL
  LOOP
    INSERT INTO public.grade_streams (grade_id, stream_id)
    VALUES (NEW.id, stream_record.id)
    ON CONFLICT (grade_id, stream_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for new grades
DROP TRIGGER IF EXISTS trigger_apply_streams_to_new_grade ON public.grades;
CREATE TRIGGER trigger_apply_streams_to_new_grade
  AFTER INSERT ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_all_streams_to_new_grade();