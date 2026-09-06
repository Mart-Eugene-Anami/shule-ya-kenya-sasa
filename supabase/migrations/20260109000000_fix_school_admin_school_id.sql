-- Fix school admins without school_id by linking them to their schools
-- This migration addresses the issue where school admins created by super admin
-- don't have their school_id properly set in the profiles table

-- First, identify school admins without school_id
-- These should be linked to schools where they are the admin_id
UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE p.role = 'school_admin'::public.app_role
  AND p.school_id IS NULL
  AND s.admin_id = p.id;

-- For any remaining school admins without school_id, log them for manual review
-- (This shouldn't happen if the create_school_with_admin function works correctly)
DO $$
DECLARE
    admin_record RECORD;
    admin_count INTEGER := 0;
BEGIN
    FOR admin_record IN 
        SELECT id, name, email FROM public.profiles 
        WHERE role = 'school_admin'::public.app_role AND school_id IS NULL
    LOOP
        RAISE NOTICE 'School admin without school_id: % (%)', admin_record.name, admin_record.email;
        admin_count := admin_count + 1;
    END LOOP;
    
    IF admin_count > 0 THEN
        RAISE NOTICE 'Total school admins without school_id: %', admin_count;
    END IF;
END $$;

-- Ensure the schools table has access_status set to 'allowed' for existing schools
-- This prevents the school access check from blocking legitimate schools
UPDATE public.schools
SET access_status = 'allowed'::text
WHERE access_status IS NULL OR access_status = '';
