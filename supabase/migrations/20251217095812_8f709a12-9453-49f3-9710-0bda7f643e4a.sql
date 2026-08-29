-- Add pathway column for CBC Senior students
ALTER TABLE public.students 
ADD COLUMN pathway text;

-- Add comment for documentation
COMMENT ON COLUMN public.students.pathway IS 'CBC Senior pathway: stem, arts_sports, social_sciences (only for Grade 10-12 students)';