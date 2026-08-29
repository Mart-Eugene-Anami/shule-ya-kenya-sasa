
-- Add track_id to rooms table for CBE Senior track labeling
ALTER TABLE public.rooms 
ADD COLUMN track_id uuid REFERENCES public.cbc_senior_tracks(id) ON DELETE SET NULL;

-- Add index for track_id lookups
CREATE INDEX idx_rooms_track_id ON public.rooms(track_id);
