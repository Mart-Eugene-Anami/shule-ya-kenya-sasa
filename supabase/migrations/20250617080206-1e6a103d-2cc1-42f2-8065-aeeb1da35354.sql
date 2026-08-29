
-- Create the app_role enum (handle existing enum)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'teacher', 'student');
  END IF;
END $$;

-- Ensure profiles table has the correct structure
DO $$
BEGIN
  -- Check if profiles table exists and has correct columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'role' AND table_schema = 'public') THEN
    -- Add role column if it doesn't exist
    ALTER TABLE public.profiles ADD COLUMN role public.app_role DEFAULT 'admin';
  ELSE
    -- Update existing role column type
    ALTER TABLE public.profiles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
  END IF;
END $$;

-- Create or update academic_years table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create or update terms table
CREATE TABLE IF NOT EXISTS public.terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update grades table to match code structure
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

-- Handle sections to streams migration safely
DO $$
BEGIN
  -- Create streams table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id),
    academic_year_id UUID REFERENCES public.academic_years(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- If sections table exists, migrate data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sections' AND table_schema = 'public') THEN
    -- Copy data from sections to streams
    INSERT INTO public.streams (id, name, grade_id, teacher_id, academic_year_id, created_at, updated_at)
    SELECT id, name, grade_id, teacher_id, academic_year_id, created_at, updated_at
    FROM public.sections
    ON CONFLICT (id) DO NOTHING;
    
    -- Update students table column name if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'section_id' AND table_schema = 'public') THEN
      ALTER TABLE public.students RENAME COLUMN section_id TO stream_id;
    END IF;
    
    -- Update teachers table column name if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'primary_section_id' AND table_schema = 'public') THEN
      ALTER TABLE public.teachers RENAME COLUMN primary_section_id TO stream_id;
    END IF;
  END IF;
END $$;

-- Create enhanced marks table with rubric support
CREATE TABLE IF NOT EXISTS public.rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade_ranges JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create assessment_types table
CREATE TABLE IF NOT EXISTS public.assessment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  weight DECIMAL DEFAULT 1.0,
  max_marks INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update marks table with enhanced structure
ALTER TABLE public.marks 
ADD COLUMN IF NOT EXISTS assessment_type_id UUID REFERENCES public.assessment_types(id),
ADD COLUMN IF NOT EXISTS raw_mark DECIMAL,
ADD COLUMN IF NOT EXISTS computed_score DECIMAL,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS rubric_id UUID REFERENCES public.rubrics(id),
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Create mark_entry_sessions table
CREATE TABLE IF NOT EXISTS public.mark_entry_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  stream_id UUID NOT NULL REFERENCES public.streams(id),
  subject TEXT NOT NULL,
  assessment_type_id UUID NOT NULL REFERENCES public.assessment_types(id),
  exam_id UUID REFERENCES public.exams(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'finalized')),
  total_students INTEGER,
  entered_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mark_entry_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Update the handle_new_user function to work with correct enum values
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')::public.app_role,
    CASE 
      WHEN NEW.raw_user_meta_data->>'school_id' IS NULL THEN NULL
      ELSE (NEW.raw_user_meta_data->>'school_id')::uuid
    END
  );
  RETURN NEW;
END;
$$;

-- Create function to compute scores from rubrics
CREATE OR REPLACE FUNCTION public.compute_score_from_rubric(p_raw_mark numeric, p_rubric_id uuid)
RETURNS TABLE(computed_score numeric, grade text)
LANGUAGE plpgsql
AS $$
DECLARE
  rubric_data JSONB;
  grade_range JSONB;
BEGIN
  -- Get the rubric
  SELECT grade_ranges INTO rubric_data 
  FROM public.rubrics 
  WHERE id = p_rubric_id AND is_active = true;
  
  IF rubric_data IS NULL THEN
    RETURN QUERY SELECT NULL::DECIMAL, 'No Rubric'::TEXT;
    RETURN;
  END IF;
  
  -- Find matching grade range
  FOR grade_range IN SELECT * FROM jsonb_array_elements(rubric_data)
  LOOP
    IF p_raw_mark >= (grade_range->>'min_mark')::DECIMAL 
       AND p_raw_mark <= (grade_range->>'max_mark')::DECIMAL THEN
      RETURN QUERY SELECT 
        (grade_range->>'points')::DECIMAL,
        (grade_range->>'grade')::TEXT;
      RETURN;
    END IF;
  END LOOP;
  
  -- Default case
  RETURN QUERY SELECT 0::DECIMAL, 'F'::TEXT;
END;
$$;
