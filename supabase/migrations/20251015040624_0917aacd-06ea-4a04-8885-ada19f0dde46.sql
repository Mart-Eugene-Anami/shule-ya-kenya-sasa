-- Drop the incorrect foreign key constraint
ALTER TABLE public.attendance 
  DROP CONSTRAINT IF EXISTS attendance_stream_id_fkey;

-- Add the correct foreign key constraint pointing to streams table
ALTER TABLE public.attendance 
  ADD CONSTRAINT attendance_stream_id_fkey 
  FOREIGN KEY (stream_id) 
  REFERENCES public.streams(id) 
  ON DELETE CASCADE;