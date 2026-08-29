/**
 * AuthContext — Global authentication state provider
 *
 * Manages the entire auth lifecycle:
 * - Session bootstrapping on app load (getSession + onAuthStateChange)
 * - Profile fetching from the `profiles` table with fallback to user_metadata
 * - Role-based authorization via isAuthorized()
 * - User creation (createNewUser) and invitation (sendRegistrationLink)
 * - Post-login routing (super_admin → /super-admin, others → /dashboard)
 *
 * The context value is memoized to prevent unnecessary re-renders in consumers.
 */
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, useRef } from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { signIn, signUp, signOut, createUser } from "@/services/authService";
import { User } from "@/types";

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  userProfile: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<SupabaseUser | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  createNewUser: (name: string, email: string, password: string, role: "school_admin" | "teacher" | "student", schoolId?: string) => Promise<any>;
  sendRegistrationLink: (email: string, role: "school_admin" | "teacher" | "student", schoolId?: string) => Promise<{ registrationUrl?: string }>;
  isAuthorized: (allowedRoles?: Array<"super_admin" | "school_admin" | "teacher" | "student">) => boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  // Guard against double-fetching the same profile
  const profileFetchedRef = useRef<string | null>(null);

  const isAuthorized = useCallback((allowedRoles?: Array<"super_admin" | "school_admin" | "teacher" | "student">) => {
    if (!user) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (user.role === "super_admin") return true;
    return allowedRoles.includes(user.role);
  }, [user]);

  const setUserFromProfile = useCallback((profileData: any) => {
    if (!profileData) return;
    
    const validRoles: ("super_admin" | "school_admin" | "teacher" | "student")[] = ["super_admin", "school_admin", "teacher", "student"];
    const userRole = validRoles.includes(profileData.role as any) 
      ? (profileData.role as "super_admin" | "school_admin" | "teacher" | "student") 
      : "student";
    
    setUser({
      id: profileData.id,
      name: profileData.name || "",
      email: profileData.email || "",
      role: userRole,
      schoolId: profileData.school_id
    });
  }, []);
  
  const setBasicUserFromAuth = useCallback((authUser: SupabaseUser) => {
    const metaData = authUser.user_metadata || {};
    setUser({
      id: authUser.id,
      name: metaData.name || authUser.email?.split('@')[0] || "",
      email: authUser.email || "",
      role: (metaData.role as "super_admin" | "school_admin" | "teacher" | "student") || "student",
      schoolId: metaData.school_id
    });
  }, []);

  // Single profile fetch function with dedup guard
  const fetchAndSetProfile = useCallback(async (userId: string): Promise<any> => {
    // Skip if we already fetched this user's profile
    if (profileFetchedRef.current === userId) return null;
    profileFetchedRef.current = userId;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) setBasicUserFromAuth(authData.user);
        return null;
      }
      
      setUserFromProfile(data);
      setUserProfile(data);
      return data;
    } catch {
      return null;
    }
  }, [setUserFromProfile, setBasicUserFromAuth]);

  useEffect(() => {
    let isMounted = true;
    
    const setupAuth = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          await supabase.auth.signOut();
          if (isMounted) {
            setUser(null);
            setUserProfile(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }
        
        if (isMounted) setSession(sessionData.session);
        
        // Set up auth listener — this handles INITIAL_SESSION too
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!isMounted) return;
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            setSession(newSession);
            if (newSession?.user) {
              await fetchAndSetProfile(newSession.user.id);
            }
            if (isMounted) setLoading(false);
          } else if (event === 'SIGNED_OUT') {
            profileFetchedRef.current = null;
            setUser(null);
            setUserProfile(null);
            setSession(null);
          }
        });
        
        // For existing session, fetch profile (dedup guard prevents double-fetch)
        if (sessionData.session?.user && isMounted) {
          await fetchAndSetProfile(sessionData.session.user.id);
        }
        
        if (isMounted) setLoading(false);

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch {
        if (isMounted) setLoading(false);
      }
    };

    setupAuth();
    
    // Re-validate session on visibility change (debounced)
    let visibilityTimeout: ReturnType<typeof setTimeout>;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(async () => {
          // Use getUser() for server-side validation instead of getSession() which reads from localStorage
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (!userError && userData.user) {
            // Token is valid server-side; refresh the local session object
            const { data: sessionData } = await supabase.auth.getSession();
            if (!user) {
              profileFetchedRef.current = null;
              await fetchAndSetProfile(userData.user.id);
            }
            setSession(sessionData.session);
          } else {
            // Token invalid or expired — force clean logout
            setUser(null);
            setUserProfile(null);
            setSession(null);
          }
        }, 500);
      }
    };

    const handleOnline = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setSession(data.session);
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      clearTimeout(visibilityTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      profileFetchedRef.current = null; // Force re-fetch
      await fetchAndSetProfile(session.user.id);
    }
  }, [session, fetchAndSetProfile]);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await signIn(email, password);
      
      if (error) throw error;
      if (!data?.session) throw new Error("Login failed. Please try again.");
      
      setSession(data.session);
      profileFetchedRef.current = null; // Force fresh fetch on login
      
      if (data.user) {
        const profileData = await fetchAndSetProfile(data.user.id);
        
        const role = profileData?.role || data.user.user_metadata?.role;
        if (!profileData) {
          setBasicUserFromAuth(data.user);
        }
        
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/') {
          window.location.href = role === 'super_admin' ? '/super-admin' : '/dashboard';
        }
      }
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const { data: superAdminExists, error: checkError } = await supabase
        .rpc('check_super_admin_exists');
      
      if (checkError) throw new Error("Error checking for existing super admin");
      if (superAdminExists) throw new Error("A super admin already exists. Please contact them for access.");
      
      const user = await signUp(name, email, password, 'super_admin');
      if (!user) throw new Error("Registration failed. Please try again.");
      return user;
    } catch (error: any) {
      throw error;
    }
  };

  const createNewUser = async (name: string, email: string, password: string, role: "school_admin" | "teacher" | "student", schoolId?: string) => {
    try {
      const result = await createUser(name, email, password, role, schoolId);
      
      if (result.user && schoolId && role === 'teacher') {
        await supabase.from('teachers').insert({
          user_id: result.user.id,
          name,
          email,
          subject: 'General',
          school_id: schoolId
        });
      }
      
      return result;
    } catch (error: any) {
      throw error;
    }
  };
  
  const sendRegistrationLink = async (email: string, role: "school_admin" | "teacher" | "student", schoolId?: string): Promise<{ registrationUrl?: string }> => {
    try {
      if (!user || (user.role !== 'super_admin' && user.role !== 'school_admin')) {
        throw new Error("You don't have permission to send registration links");
      }
      if (role === 'school_admin' && user.role !== 'super_admin') {
        throw new Error("Only super admins can send registration links to school administrators");
      }
      
      let schoolName = '';
      if (schoolId) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('name')
          .eq('id', schoolId)
          .single();
        schoolName = schoolData?.name || '';
      }
      
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, role, schoolId, invitedBy: user.id, schoolName }
      });
      
      if (error) throw new Error(`Failed to send invitation: ${error.message}`);
      
      toast({
        title: "Invitation sent",
        description: `Registration link sent to ${email}`,
      });
      
      return { registrationUrl: data?.registrationUrl };
    } catch (error: any) {
      toast({
        title: "Failed to send invitation",
        description: error.message || "An error occurred while sending the invitation",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      profileFetchedRef.current = null;
      setUserProfile(null);
      setUser(null);
      setSession(null);
      // Clear all security-sensitive localStorage items
      localStorage.removeItem('login_rate_limit');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      throw error;
    }
  };

  const contextValue = useMemo(() => ({
    user,
    session,
    userProfile,
    loading,
    login,
    register,
    logout,
    refreshProfile,
    createNewUser,
    sendRegistrationLink,
    isAuthorized,
  }), [user, session, userProfile, loading, refreshProfile, isAuthorized]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
