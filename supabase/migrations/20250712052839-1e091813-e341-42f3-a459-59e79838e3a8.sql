-- First, add school_id to streams table and make grade_id nullable since streams will be school-level
ALTER TABLE public.streams 
ADD COLUMN school_id UUID REFERENCES public.schools(id);

-- Update existing streams to have school_id from their grade's school_id
UPDATE public.streams 
SET school_id = grades.school_id 
FROM public.grades 
WHERE streams.grade_id = grades.id;

-- Make school_id NOT NULL after populating it
ALTER TABLE public.streams 
ALTER COLUMN school_id SET NOT NULL;

-- Make grade_id nullable since streams will apply to all grades
ALTER TABLE public.streams 
ALTER COLUMN grade_id DROP NOT NULL;

-- Create a new table to track which streams apply to which grades (many-to-many relationship)
CREATE TABLE public.grade_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(grade_id, stream_id)
);

-- Enable RLS on the new table
ALTER TABLE public.grade_streams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for grade_streams
CREATE POLICY "School members can view grade streams" 
ON public.grade_streams 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.grades g ON g.id = grade_streams.grade_id
        WHERE p.id = auth.uid() 
        AND p.school_id = g.school_id
    )
);

CREATE POLICY "School admins can manage grade streams" 
ON public.grade_streams 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.grades g ON g.id = grade_streams.grade_id
        WHERE p.id = auth.uid() 
        AND p.school_id = g.school_id 
        AND p.role = ANY(ARRAY['super_admin'::app_role, 'school_admin'::app_role])
    )
);

-- Update the streams RLS policies to work with school_id
DROP POLICY IF EXISTS "School admins can manage streams" ON public.streams;
DROP POLICY IF EXISTS "School members can view streams" ON public.streams;

CREATE POLICY "School admins can manage streams" 
ON public.streams 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.school_id = streams.school_id 
        AND p.role = ANY(ARRAY['super_admin'::app_role, 'school_admin'::app_role])
    )
);

CREATE POLICY "School members can view streams" 
ON public.streams 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.school_id = streams.school_id
    )
);

-- Populate the grade_streams table with existing data (each stream currently tied to one grade)
INSERT INTO public.grade_streams (grade_id, stream_id)
SELECT grade_id, id 
FROM public.streams 
WHERE grade_id IS NOT NULL;

-- Now that we have the many-to-many relationship, we can set grade_id to NULL for existing streams
-- to make them school-level
UPDATE public.streams SET grade_id = NULL;