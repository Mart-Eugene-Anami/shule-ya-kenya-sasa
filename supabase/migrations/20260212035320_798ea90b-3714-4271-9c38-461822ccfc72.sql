ALTER TABLE public.timetable_configurations
ADD COLUMN school_days text[] NOT NULL DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'];