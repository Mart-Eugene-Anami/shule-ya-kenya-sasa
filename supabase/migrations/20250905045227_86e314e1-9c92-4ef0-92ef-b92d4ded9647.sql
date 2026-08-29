-- Fix security warnings: Add missing RLS policies and fix function search paths

-- Fix the sections table that has RLS enabled but no policies
CREATE POLICY "School admins can manage sections" ON sections
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN grades g ON g.id = sections.grade_id
    WHERE p.id = auth.uid() 
      AND p.school_id = g.school_id 
      AND p.role = ANY(ARRAY['super_admin'::app_role, 'school_admin'::app_role])
  )
);

CREATE POLICY "School members can view sections" ON sections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN grades g ON g.id = sections.grade_id
    WHERE p.id = auth.uid() 
      AND p.school_id = g.school_id
  )
);

-- Fix function search paths for security
ALTER FUNCTION public.apply_all_streams_to_new_grade() SET search_path = public;
ALTER FUNCTION public.apply_stream_to_all_grades() SET search_path = public;
ALTER FUNCTION public.compute_score_from_rubric(numeric, uuid) SET search_path = public;
ALTER FUNCTION public.check_super_admin_exists() SET search_path = public;
ALTER FUNCTION public.check_user_role(text) SET search_path = public;
ALTER FUNCTION public.archive_academic_year_data(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.check_and_transition_terms() SET search_path = public;
ALTER FUNCTION public.create_school_with_admin(text, text, text, text, uuid, text, text) SET search_path = public;
ALTER FUNCTION public.transition_to_new_academic_year(uuid, text, uuid) SET search_path = public;
ALTER FUNCTION public.create_teacher_with_auth(text, text, text, text, uuid, boolean, uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;