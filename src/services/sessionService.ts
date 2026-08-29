
import { supabase } from "@/integrations/supabase/client";

/**
 * Optimized session management service to handle thousands of concurrent users.
 *
 * SECURITY NOTE: getSession() reads from localStorage and does NOT validate
 * the token server-side. Use supabase.auth.getUser() for any security-critical
 * checks (e.g., permission verification, sensitive data access).
 */
export const sessionService = {
  /**
   * Get the current session (from local storage — NOT server-validated).
   * For security-critical checks, use supabase.auth.getUser() instead.
   */
  getSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error getting session:", error.message);
        throw error;
      }
      
      return data.session;
    } catch (error) {
      console.error("Session retrieval failed:", error);
      return null;
    }
  },
  
  /**
   * Set up a session listener that avoids Supabase client deadlocks
   * @param callback Function to call when session changes
   */
  subscribeToSessionChanges: (callback: (session: any) => void) => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Use non-blocking approach to prevent deadlocks
      setTimeout(() => {
        callback(session);
      }, 0);
    });
    
    return data.subscription;
  },
  
  /**
   * Refresh the session token to extend it
   */
  refreshSession: async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Error refreshing session:", error.message);
        throw error;
      }
      
      return data.session;
    } catch (error) {
      console.error("Session refresh failed:", error);
      return null;
    }
  }
};
