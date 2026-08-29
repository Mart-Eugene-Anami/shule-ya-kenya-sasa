-- Create timetable_configurations table to store different configs per school
CREATE TABLE public.timetable_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  curriculum_type TEXT, -- 'cbc', '844', or NULL for all
  applicable_grades TEXT[] DEFAULT ARRAY[]::TEXT[], -- Grade names this config applies to
  start_time TIME NOT NULL DEFAULT '08:20',
  lesson_duration_minutes INTEGER NOT NULL DEFAULT 40,
  lessons_per_day INTEGER NOT NULL DEFAULT 8,
  breaks JSONB NOT NULL DEFAULT '[{"id": "break1", "name": "Short Break", "afterPeriod": 2, "durationMinutes": 15}, {"id": "break2", "name": "Lunch Break", "afterPeriod": 5, "durationMinutes": 30}]'::jsonb,
  subject_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timetable_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "School admins can manage timetable configurations"
ON public.timetable_configurations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = timetable_configurations.school_id
    AND profiles.role IN ('super_admin', 'school_admin')
  )
);

CREATE POLICY "School members can view timetable configurations"
ON public.timetable_configurations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = timetable_configurations.school_id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_timetable_configurations_updated_at
BEFORE UPDATE ON public.timetable_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();