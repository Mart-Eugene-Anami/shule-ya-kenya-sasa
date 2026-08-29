
-- Enable Row Level Security on all tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;

-- Create a function to check user role
CREATE OR REPLACE FUNCTION public.check_user_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = required_role
  );
END;
$$;

-- Profile policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- School policies
CREATE POLICY "Admin can view schools"
ON public.schools FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.school_id = schools.id
  )
);

CREATE POLICY "Admin can update their school"
ON public.schools FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.school_id = schools.id
    AND profiles.role = 'admin'
  )
);

-- Similar policies can be created for other tables
