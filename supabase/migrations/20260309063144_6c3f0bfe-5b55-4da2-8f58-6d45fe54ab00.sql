ALTER TABLE public.timetable_constraints ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.timetable_constraints ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE public.timetable_constraints ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.timetable_constraints ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.timetable_constraints ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.timetable_constraints ALTER COLUMN updated_at SET NOT NULL;