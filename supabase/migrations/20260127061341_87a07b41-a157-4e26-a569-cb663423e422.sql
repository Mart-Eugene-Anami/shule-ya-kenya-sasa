-- Create a table for system-wide default subjects managed by super admin
CREATE TABLE public.system_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  curriculum text NOT NULL,
  division_type text NOT NULL, -- e.g., 'lower_primary', 'upper_primary', 'junior_secondary', 'senior_secondary', 'secondary'
  pathway text DEFAULT NULL, -- For CBC Senior: 'core', 'stem', 'arts_sports', 'social_sciences'
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(name, curriculum, division_type)
);

-- Enable RLS
ALTER TABLE public.system_subjects ENABLE ROW LEVEL SECURITY;

-- Everyone can view system subjects (needed during school registration)
CREATE POLICY "Anyone can view system subjects"
ON public.system_subjects
FOR SELECT
USING (true);

-- Only super admins can manage system subjects
CREATE POLICY "Super admins can manage system subjects"
ON public.system_subjects
FOR ALL
USING (public.is_super_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_system_subjects_updated_at
BEFORE UPDATE ON public.system_subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default CBC Lower Primary subjects (Grade 1-3)
INSERT INTO public.system_subjects (name, curriculum, division_type, display_order) VALUES
('Literacy Activities', 'cbc', 'lower_primary', 1),
('Kiswahili Activities', 'cbc', 'lower_primary', 2),
('Mathematical Activities', 'cbc', 'lower_primary', 3),
('Environmental Activities', 'cbc', 'lower_primary', 4),
('Hygiene and Nutrition Activities', 'cbc', 'lower_primary', 5),
('Religious Education', 'cbc', 'lower_primary', 6),
('Movement and Creative Activities', 'cbc', 'lower_primary', 7);

-- Insert default CBC Upper Primary subjects (Grade 4-6)
INSERT INTO public.system_subjects (name, curriculum, division_type, display_order) VALUES
('English', 'cbc', 'upper_primary', 1),
('Kiswahili', 'cbc', 'upper_primary', 2),
('Mathematics', 'cbc', 'upper_primary', 3),
('Integrated Science', 'cbc', 'upper_primary', 4),
('Social Studies', 'cbc', 'upper_primary', 5),
('Agriculture', 'cbc', 'upper_primary', 6),
('Creative Arts', 'cbc', 'upper_primary', 7),
('Home Science', 'cbc', 'upper_primary', 8),
('Physical Health Education', 'cbc', 'upper_primary', 9),
('Religious Education', 'cbc', 'upper_primary', 10);

-- Insert default CBC Junior Secondary subjects (Grade 7-9)
INSERT INTO public.system_subjects (name, curriculum, division_type, display_order) VALUES
('English', 'cbc', 'junior_secondary', 1),
('Kiswahili', 'cbc', 'junior_secondary', 2),
('Mathematics', 'cbc', 'junior_secondary', 3),
('Integrated Science', 'cbc', 'junior_secondary', 4),
('Social Studies', 'cbc', 'junior_secondary', 5),
('Agriculture', 'cbc', 'junior_secondary', 6),
('Creative Arts', 'cbc', 'junior_secondary', 7),
('Home Science', 'cbc', 'junior_secondary', 8),
('Physical Health Education', 'cbc', 'junior_secondary', 9),
('Business Studies', 'cbc', 'junior_secondary', 10),
('Pre-Technical Studies', 'cbc', 'junior_secondary', 11),
('Religious Education', 'cbc', 'junior_secondary', 12);

-- Insert default CBC Senior Secondary Core subjects (Grade 10-12)
INSERT INTO public.system_subjects (name, curriculum, division_type, pathway, display_order) VALUES
('English', 'cbc-senior', 'senior_secondary', 'core', 1),
('Kiswahili', 'cbc-senior', 'senior_secondary', 'core', 2),
('Mathematics', 'cbc-senior', 'senior_secondary', 'core', 3),
('Religious Education', 'cbc-senior', 'senior_secondary', 'core', 4),
('Community Service Learning', 'cbc-senior', 'senior_secondary', 'core', 5),
('Health Education', 'cbc-senior', 'senior_secondary', 'core', 6),
('Life Skills', 'cbc-senior', 'senior_secondary', 'core', 7),
('French', 'cbc-senior', 'senior_secondary', 'core', 8),
('German', 'cbc-senior', 'senior_secondary', 'core', 9),
('Arabic', 'cbc-senior', 'senior_secondary', 'core', 10),
('Mandarin', 'cbc-senior', 'senior_secondary', 'core', 11),
('Indigenous Languages', 'cbc-senior', 'senior_secondary', 'core', 12);

-- CBC Senior STEM pathway subjects
INSERT INTO public.system_subjects (name, curriculum, division_type, pathway, display_order) VALUES
('Biology', 'cbc-senior', 'senior_secondary', 'stem', 1),
('Chemistry', 'cbc-senior', 'senior_secondary', 'stem', 2),
('Physics', 'cbc-senior', 'senior_secondary', 'stem', 3),
('Computer Science', 'cbc-senior', 'senior_secondary', 'stem', 4),
('Agriculture', 'cbc-senior', 'senior_secondary', 'stem', 5),
('Home Science', 'cbc-senior', 'senior_secondary', 'stem', 6),
('Drawing & Design', 'cbc-senior', 'senior_secondary', 'stem', 7),
('Aviation Technology', 'cbc-senior', 'senior_secondary', 'stem', 8),
('Marine Technology', 'cbc-senior', 'senior_secondary', 'stem', 9);

-- CBC Senior Arts & Sports pathway subjects
INSERT INTO public.system_subjects (name, curriculum, division_type, pathway, display_order) VALUES
('History', 'cbc-senior', 'senior_secondary', 'arts_sports', 1),
('Geography', 'cbc-senior', 'senior_secondary', 'arts_sports', 2),
('Music', 'cbc-senior', 'senior_secondary', 'arts_sports', 3),
('Theatre Arts', 'cbc-senior', 'senior_secondary', 'arts_sports', 4),
('Visual Arts', 'cbc-senior', 'senior_secondary', 'arts_sports', 5),
('Physical Education', 'cbc-senior', 'senior_secondary', 'arts_sports', 6),
('Sports Science', 'cbc-senior', 'senior_secondary', 'arts_sports', 7);

-- CBC Senior Social Sciences pathway subjects
INSERT INTO public.system_subjects (name, curriculum, division_type, pathway, display_order) VALUES
('Business Studies', 'cbc-senior', 'senior_secondary', 'social_sciences', 1),
('Economics', 'cbc-senior', 'senior_secondary', 'social_sciences', 2),
('Government & Citizenship', 'cbc-senior', 'senior_secondary', 'social_sciences', 3);

-- Insert default 8-4-4 Secondary subjects
INSERT INTO public.system_subjects (name, curriculum, division_type, display_order) VALUES
('Mathematics', '8-4-4', 'secondary', 1),
('English', '8-4-4', 'secondary', 2),
('Kiswahili', '8-4-4', 'secondary', 3),
('Biology', '8-4-4', 'secondary', 4),
('Chemistry', '8-4-4', 'secondary', 5),
('Physics', '8-4-4', 'secondary', 6),
('History', '8-4-4', 'secondary', 7),
('Geography', '8-4-4', 'secondary', 8),
('Religious Education', '8-4-4', 'secondary', 9),
('Agriculture', '8-4-4', 'secondary', 10),
('Business Studies', '8-4-4', 'secondary', 11),
('Computer Studies', '8-4-4', 'secondary', 12);