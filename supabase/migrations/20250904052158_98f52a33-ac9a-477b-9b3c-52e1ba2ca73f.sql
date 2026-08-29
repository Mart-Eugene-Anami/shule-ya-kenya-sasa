-- Fix infinite recursion in profiles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON profiles;

-- Create helper function to check if user is super admin without RLS recursion
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' = 'super_admin' 
         OR auth.users.user_metadata->>'role' = 'super_admin')
  );
$$;

-- Create new safe RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" ON profiles
FOR SELECT USING (is_super_admin());

CREATE POLICY "Super admins can update all profiles" ON profiles
FOR UPDATE USING (is_super_admin());

CREATE POLICY "Super admins can insert profiles" ON profiles
FOR INSERT WITH CHECK (is_super_admin() OR auth.uid() = id);

CREATE POLICY "Super admins can delete profiles" ON profiles
FOR DELETE USING (is_super_admin());