-- Fix timetables foreign key: stream_id should reference streams, not sections
ALTER TABLE public.timetables 
DROP CONSTRAINT timetables_stream_id_fkey;

ALTER TABLE public.timetables 
ADD CONSTRAINT timetables_stream_id_fkey 
FOREIGN KEY (stream_id) REFERENCES public.streams(id);