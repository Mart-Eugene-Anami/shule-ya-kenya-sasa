-- Create CBC Senior tracks table for pathway subject combinations
CREATE TABLE public.cbc_senior_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  pathway TEXT NOT NULL CHECK (pathway IN ('stem', 'arts_sports', 'social_sciences')),
  name TEXT NOT NULL,
  description TEXT,
  subject_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, pathway, name)
);

-- Enable RLS
ALTER TABLE public.cbc_senior_tracks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "School admins can manage tracks"
ON public.cbc_senior_tracks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = cbc_senior_tracks.school_id
    AND profiles.role IN ('super_admin', 'school_admin')
  )
);

CREATE POLICY "School members can view tracks"
ON public.cbc_senior_tracks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = cbc_senior_tracks.school_id
  )
);

-- Add track_id column to students table for CBC Senior track assignment
ALTER TABLE public.students 
ADD COLUMN track_id UUID REFERENCES public.cbc_senior_tracks(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_cbc_senior_tracks_school_pathway ON public.cbc_senior_tracks(school_id, pathway);
CREATE INDEX idx_students_track_id ON public.students(track_id);

-- Add trigger for updated_at
CREATE TRIGGER update_cbc_senior_tracks_updated_at
  BEFORE UPDATE ON public.cbc_senior_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();