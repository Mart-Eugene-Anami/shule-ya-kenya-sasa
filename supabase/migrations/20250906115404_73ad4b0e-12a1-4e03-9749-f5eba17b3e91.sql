-- Create subjects table for storing school subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  curriculum TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(school_id, name, curriculum)
);

-- Enable RLS on subjects table
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subjects
CREATE POLICY "School admins can manage subjects" ON public.subjects
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND school_id = subjects.school_id 
      AND role = ANY(ARRAY['super_admin'::app_role, 'school_admin'::app_role])
  )
);

CREATE POLICY "School members can view subjects" ON public.subjects
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND school_id = subjects.school_id
  )
);

-- Create updated_at trigger for subjects
CREATE TRIGGER update_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();