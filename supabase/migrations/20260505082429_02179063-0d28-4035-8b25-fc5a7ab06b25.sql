
-- 1. Schools: remove public read + redundant insert policy
DROP POLICY IF EXISTS "Public can view schools" ON public.schools;
DROP POLICY IF EXISTS "school_creation_policy" ON public.schools;
DROP POLICY IF EXISTS "Users can view their schools" ON public.schools;

CREATE POLICY "School members and super admins can view schools"
ON public.schools
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.school_id = schools.id
  )
);

-- 2. Storage: scope logo write/update/delete to admin's own school folder
DROP POLICY IF EXISTS "School admins can upload school logos" ON storage.objects;
DROP POLICY IF EXISTS "School admins can update school logos" ON storage.objects;
DROP POLICY IF EXISTS "School admins can delete school logos" ON storage.objects;

CREATE POLICY "School admins can upload own school logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'super_admin'::public.app_role
        OR (p.role = 'school_admin'::public.app_role
            AND (storage.foldername(name))[1] = p.school_id::text)
      )
  )
);

CREATE POLICY "School admins can update own school logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'super_admin'::public.app_role
        OR (p.role = 'school_admin'::public.app_role
            AND (storage.foldername(name))[1] = p.school_id::text)
      )
  )
);

CREATE POLICY "School admins can delete own school logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'super_admin'::public.app_role
        OR (p.role = 'school_admin'::public.app_role
            AND (storage.foldername(name))[1] = p.school_id::text)
      )
  )
);
