
ALTER TABLE public.rubrics
  ADD COLUMN is_multi_subject boolean NOT NULL DEFAULT false,
  ADD COLUMN subjects text[] NOT NULL DEFAULT '{}'::text[];
