ALTER TABLE public.timetable_constraints
  DROP CONSTRAINT IF EXISTS timetable_constraints_constraint_type_check;

ALTER TABLE public.timetable_constraints
  ADD CONSTRAINT timetable_constraints_constraint_type_check
  CHECK (
    constraint_type = ANY (
      ARRAY[
        'teacher_max_lessons'::text,
        'subject_max_lessons'::text,
        'free_periods_per_day'::text,
        'max_consecutive_lessons'::text,
        'subject_max_period'::text
      ]
    )
  );