-- Fix infinite recursion in profiles RLS policies
-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;

-- Create new safe RLS policies for profiles using existing is_super_admin function
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