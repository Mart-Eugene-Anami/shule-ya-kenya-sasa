/**
 * Authentication Service
 *
 * Provides core auth operations for the school management system:
 * - signIn / signOut: Standard email+password authentication
 * - createUser: Admin-only user creation via the create-user edge function
 *   (there is no self-registration: accounts are created by admins only)
 * - checkUserRole / getCurrentUserSchoolId: Permission helpers
 *
 * Role mapping: The 'admin' role is internally converted to 'school_admin'
 * to match the Supabase app_role enum. Super admins bypass all role checks.
 */
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError, ValidationError, AuthenticationError, AppError, RateLimitError } from "@/lib/errors";
import { checkRateLimit, resetRateLimit } from "@/utils/rateLimiter";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

export const signIn = async (email: string, password: string) => {
  try {
    // Check rate limit for login attempts
    const rateLimitKey = `login_${email}`;
    const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 5, windowMs: 60000 });
    
    if (rateLimit.shouldLimit) {
      throw new RateLimitError("Too many login attempts. Please wait and try again.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw handleSupabaseError(error);
    }

    // Reset rate limit on successful login
    resetRateLimit(rateLimitKey);

    return { data, error: null };
  } catch (error) {
    if (error instanceof AppError) {
      return { data: { user: null, session: null }, error };
    }
    const appError = handleSupabaseError(error);
    return { data: { user: null, session: null }, error: appError };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw handleSupabaseError(error);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw handleSupabaseError(error);
  }
};

export const createUser = async (name: string, email: string, password: string, role: "school_admin" | "teacher" | "student", schoolId?: string) => {
  try {
    // Use getUser() for server-side token validation (not getSession which reads from localStorage)
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      throw new Error("You must be logged in to create users");
    }
    
    const { data: currentUserData, error: profileError } = await supabase
      .from("profiles")
      .select("role, school_id")
      .eq("id", userData.user.id)
      .single();
      
    if (profileError || !currentUserData) {
      throw new Error("Unable to verify your permissions");
    }
    
    if (currentUserData.role !== "super_admin" && currentUserData.role !== "school_admin") {
      throw new Error("You don't have permission to create users");
    }
    
    // If creating a school_admin user, only super_admin can do it
    if (role === "school_admin" && currentUserData.role !== "super_admin") {
      throw new Error("Only super admins can create school administrators");
    }

    // For teacher/student accounts, school_admins must provide schoolId or use their own school
    let targetSchoolId = schoolId;
    if ((role === "teacher" || role === "student") && !targetSchoolId) {
      if (currentUserData.role === "school_admin" && currentUserData.school_id) {
        targetSchoolId = currentUserData.school_id;
      } else {
        throw new Error("School ID is required for teacher and student accounts");
      }
    }

    // Validate password
    if (!password || password.length < 6) {
      throw new Error("Password is required and must be at least 6 characters");
    }

    // Create the user with the admin API (the server re-checks every permission)
    return await invokeEdgeFunction('create-user', {
      name,
      email,
      password,
      role,
      schoolId: targetSchoolId
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw handleSupabaseError(error);
  }
};

// Helper function to check if user has required role
export const checkUserRole = async (requiredRoles: string[]): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    return profile?.role ? requiredRoles.includes(profile.role) : false;
  } catch (error) {
    return false;
  }
};

// Helper function to get current user's school ID
export const getCurrentUserSchoolId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
      
    return profile?.school_id || null;
  } catch (error) {
    return null;
  }
};
