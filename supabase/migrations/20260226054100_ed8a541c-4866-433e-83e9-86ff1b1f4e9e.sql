
-- Add track_ids array and room_mode to rooms for CBE Senior multi-track support
ALTER TABLE public.rooms 
ADD COLUMN track_ids uuid[] DEFAULT '{}'::uuid[],
ADD COLUMN room_mode text DEFAULT 'standard';

-- Migrate existing track_id data to track_ids array
UPDATE public.rooms 
SET track_ids = ARRAY[track_id], room_mode = 'full'
WHERE track_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.rooms.room_mode IS 'standard (non-CBE-Senior), full (single track occupies room), split (multiple tracks share room)';
COMMENT ON COLUMN public.rooms.track_ids IS 'Array of track IDs assigned to this room (CBE Senior only)';
