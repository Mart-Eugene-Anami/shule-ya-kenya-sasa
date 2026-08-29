
-- Add division_id to streams table for division-level streams
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.school_divisions(id) ON DELETE SET NULL;

-- Add an override_level column to indicate where this stream was defined
-- 'school' = school-wide (default), 'division' = division-level, 'grade' = grade-level
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS override_level text NOT NULL DEFAULT 'school';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_streams_division_id ON public.streams(division_id);
CREATE INDEX IF NOT EXISTS idx_streams_override_level ON public.streams(override_level);
