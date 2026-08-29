import { supabase } from "@/integrations/supabase/client";

export interface PricingTierInfo {
  student_count: number;
  pricing_tier: string;
  monthly_cost: number;
  termly_cost: number;
  requires_consultation: boolean;
}

export interface SchoolAccessInfo {
  id: string;
  name: string;
  access_status: 'allowed' | 'restricted';
  student_count: number;
  pricing_tier: string;
  monthly_cost: number;
  termly_cost: number;
  requires_consultation: boolean;
}

export const PRICING_TIERS = {
  tier_1: {
    name: 'Tier 1',
    range: '0 - 500 students',
    monthly: 4000,
    termly: 12000,
  },
  tier_2: {
    name: 'Tier 2',
    range: '501 - 1,000 students',
    monthly: 5500,
    termly: 16500,
  },
  tier_3: {
    name: 'Tier 3',
    range: '1,001 - 2,000 students',
    monthly: 7500,
    termly: 22500,
  },
  tier_4: {
    name: 'Tier 4',
    range: 'Above 2,000 students',
    monthly: null,
    termly: null,
    requiresConsultation: true,
  },
};

export const PAYMENT_DETAILS = {
  paybillNumber: '247247',
  accountNumber: '796029',
};

// Cache for school access status to prevent redundant API calls
const accessCache = new Map<string, { hasAccess: boolean; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

/**
 * Clear the access cache for a specific school or all schools
 */
export const clearAccessCache = (schoolId?: string) => {
  if (schoolId) {
    accessCache.delete(schoolId);
  } else {
    accessCache.clear();
  }
};

/**
 * Get pricing tier information for a school
 */
export const getSchoolPricingTier = async (schoolId: string): Promise<PricingTierInfo | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_school_pricing_tier', { p_school_id: schoolId });

    if (error) {
      console.error('Error getting school pricing tier:', error);
      throw error;
    }

    if (data && data.length > 0) {
      return {
        student_count: Number(data[0].student_count),
        pricing_tier: data[0].pricing_tier,
        monthly_cost: Number(data[0].monthly_cost),
        termly_cost: Number(data[0].termly_cost),
        requires_consultation: data[0].requires_consultation,
      };
    }

    return null;
  } catch (error) {
    console.error('Error in getSchoolPricingTier:', error);
    throw error;
  }
};

/**
 * Check if a school has access to the system
 * Uses caching to prevent redundant API calls during session
 */
export const checkSchoolAccess = async (schoolId: string, forceRefresh = false): Promise<boolean> => {
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = accessCache.get(schoolId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Using cached school access:', { schoolId, hasAccess: cached.hasAccess });
        return cached.hasAccess;
      }
    }

    const { data, error } = await supabase
      .rpc('school_has_access', { p_school_id: schoolId });

    if (error) {
      console.error('Error checking school access:', error);
      // On error, check cache even if expired - better to use stale data than block user
      const cached = accessCache.get(schoolId);
      if (cached) {
        console.log('Using stale cache due to error:', cached.hasAccess);
        return cached.hasAccess;
      }
      // Default to allowing access on error to prevent blocking legitimate users
      return true;
    }

    const hasAccess = data === true;
    
    // Update cache
    accessCache.set(schoolId, { hasAccess, timestamp: Date.now() });
    console.log('School access check completed:', { schoolId, hasAccess });
    
    return hasAccess;
  } catch (error) {
    console.error('Error in checkSchoolAccess:', error);
    // On error, allow access to prevent blocking legitimate users
    const cached = accessCache.get(schoolId);
    return cached?.hasAccess ?? true;
  }
};

/**
 * Toggle school access (super admin only)
 * Also clears the access cache for immediate effect
 */
export const toggleSchoolAccess = async (schoolId: string, accessStatus: 'allowed' | 'restricted'): Promise<void> => {
  try {
    const { error } = await supabase
      .rpc('toggle_school_access', { 
        p_school_id: schoolId, 
        p_access_status: accessStatus 
      });

    if (error) {
      console.error('Error toggling school access:', error);
      throw error;
    }

    // Clear cache so next check fetches fresh data
    clearAccessCache(schoolId);
  } catch (error) {
    console.error('Error in toggleSchoolAccess:', error);
    throw error;
  }
};

/**
 * Get all schools with access info (for super admin)
 */
export const getSchoolsWithAccessInfo = async (): Promise<SchoolAccessInfo[]> => {
  try {
    // First get all schools with access_status
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, access_status')
      .order('name');

    if (schoolsError) {
      console.error('Error fetching schools:', schoolsError);
      throw schoolsError;
    }

    if (!schools || schools.length === 0) {
      return [];
    }

    // Get pricing info for each school
    const schoolsWithAccess: SchoolAccessInfo[] = await Promise.all(
      schools.map(async (school) => {
        const pricingInfo = await getSchoolPricingTier(school.id);
        
        // Update cache while we're at it
        accessCache.set(school.id, { 
          hasAccess: school.access_status === 'allowed', 
          timestamp: Date.now() 
        });
        
        return {
          id: school.id,
          name: school.name,
          access_status: school.access_status as 'allowed' | 'restricted',
          student_count: pricingInfo?.student_count || 0,
          pricing_tier: pricingInfo?.pricing_tier || 'tier_1',
          monthly_cost: pricingInfo?.monthly_cost || 0,
          termly_cost: pricingInfo?.termly_cost || 0,
          requires_consultation: pricingInfo?.requires_consultation || false,
        };
      })
    );

    return schoolsWithAccess;
  } catch (error) {
    console.error('Error in getSchoolsWithAccessInfo:', error);
    throw error;
  }
};

/**
 * Get pricing tier display name
 */
export const getPricingTierDisplayName = (tier: string): string => {
  switch (tier) {
    case 'tier_1':
      return 'Tier 1 (0-500 students)';
    case 'tier_2':
      return 'Tier 2 (501-1,000 students)';
    case 'tier_3':
      return 'Tier 3 (1,001-2,000 students)';
    case 'tier_4':
      return 'Tier 4 (2,000+ students)';
    default:
      return 'Unknown Tier';
  }
};

/**
 * Format currency in KES
 */
export const formatKES = (amount: number | null): string => {
  if (amount === null || amount === 0) {
    return 'Contact for Quote';
  }
  return `KES ${amount.toLocaleString()}`;
};
