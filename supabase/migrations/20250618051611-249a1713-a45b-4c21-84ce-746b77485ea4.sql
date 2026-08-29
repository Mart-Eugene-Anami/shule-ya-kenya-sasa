
-- First, let's ensure the profiles table has the correct role enum values
-- and fix any schema mismatches

-- Update the app_role enum to include all necessary roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_admin';

-- Ensure the profiles table uses the correct role column type
ALTER TABLE public.profiles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

-- Update the create_school_with_admin function to use correct role
CREATE OR REPLACE FUNCTION public.create_school_with_admin(
  p_school_name text, 
  p_school_location text, 
  p_school_phone text, 
  p_school_email text, 
  p_admin_id uuid, 
  p_admin_name text, 
  p_admin_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_school_id uuid;
BEGIN
  -- Start transaction
  BEGIN
    -- Create the school
    INSERT INTO public.schools (
      name,
      location,
      phone,
      email,
      admin_id
    ) VALUES (
      p_school_name,
      p_school_location,
      p_school_phone,
      p_school_email,
      p_admin_id
    )
    RETURNING id INTO v_school_id;

    -- Update the admin profile with school_admin role and school_id
    UPDATE public.profiles 
    SET 
      role = 'school_admin'::public.app_role,
      school_id = v_school_id,
      updated_at = now()
    WHERE id = p_admin_id;

    -- If no profile exists, create one
    IF NOT FOUND THEN
      INSERT INTO public.profiles (
        id,
        name,
        email,
        role,
        school_id
      ) VALUES (
        p_admin_id,
        p_admin_name,
        p_admin_email,
        'school_admin'::public.app_role,
        v_school_id
      );
    END IF;

    RETURN v_school_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE;
  END;
END;
$function$;

-- Fix the handle_new_user trigger function to use correct roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'school_admin'::public.app_role
      WHEN NEW.raw_user_meta_data->>'role' IS NOT NULL THEN (NEW.raw_user_meta_data->>'role')::public.app_role
      ELSE 'school_admin'::public.app_role
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'school_id' IS NULL THEN NULL
      ELSE (NEW.raw_user_meta_data->>'school_id')::uuid
    END
  );
  RETURN NEW;
END;
$function$;
