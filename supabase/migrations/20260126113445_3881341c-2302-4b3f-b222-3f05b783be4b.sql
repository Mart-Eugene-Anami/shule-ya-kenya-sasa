-- Add access_status column to schools table
-- Default is 'restricted' - schools cannot access until super admin allows
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'restricted' 
CHECK (access_status IN ('allowed', 'restricted'));

-- Add pricing_tier column to track the tier based on student count
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS pricing_tier text DEFAULT NULL 
CHECK (pricing_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', NULL));

-- Create a function to calculate pricing tier based on student count
CREATE OR REPLACE FUNCTION public.get_school_pricing_tier(p_school_id uuid)
RETURNS TABLE(
  student_count bigint,
  pricing_tier text,
  monthly_cost numeric,
  termly_cost numeric,
  requires_consultation boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_count bigint;
BEGIN
  -- Count active students for this school
  SELECT COUNT(*) INTO v_student_count 
  FROM public.students 
  WHERE school_id = p_school_id AND status = 'active';
  
  -- Determine tier and costs
  IF v_student_count <= 500 THEN
    RETURN QUERY SELECT 
      v_student_count,
      'tier_1'::text,
      4000::numeric,
      12000::numeric,
      false;
  ELSIF v_student_count <= 1000 THEN
    RETURN QUERY SELECT 
      v_student_count,
      'tier_2'::text,
      5500::numeric,
      16500::numeric,
      false;
  ELSIF v_student_count <= 2000 THEN
    RETURN QUERY SELECT 
      v_student_count,
      'tier_3'::text,
      7500::numeric,
      22500::numeric,
      false;
  ELSE
    RETURN QUERY SELECT 
      v_student_count,
      'tier_4'::text,
      0::numeric,
      0::numeric,
      true;
  END IF;
END;
$$;

-- Create a function to check if a school has access
CREATE OR REPLACE FUNCTION public.school_has_access(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT access_status = 'allowed' FROM public.schools WHERE id = p_school_id),
    false
  );
$$;

-- Create a function for super admins to toggle school access
CREATE OR REPLACE FUNCTION public.toggle_school_access(p_school_id uuid, p_access_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can toggle school access';
  END IF;
  
  -- Validate access_status value
  IF p_access_status NOT IN ('allowed', 'restricted') THEN
    RAISE EXCEPTION 'Invalid access status. Must be "allowed" or "restricted"';
  END IF;
  
  -- Update the school's access status
  UPDATE public.schools 
  SET access_status = p_access_status, updated_at = now()
  WHERE id = p_school_id;
END;
$$;