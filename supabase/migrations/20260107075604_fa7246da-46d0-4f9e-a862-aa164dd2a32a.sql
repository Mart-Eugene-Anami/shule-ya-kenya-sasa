-- Add explicit DELETE policy for super admins on schools table
CREATE POLICY "Super admins can delete schools"
ON public.schools
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'::app_role
  )
);