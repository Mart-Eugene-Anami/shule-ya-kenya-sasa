/**
 * AuthContext — global authentication state provider
 *
 * Security model
 * --------------
 * The user's role and school come ONLY from their row in the `profiles` table,
 * which is written by the server (edge functions / database triggers). They are
 * never taken from `user_metadata`, because users can edit that themselves.
 *
 * Lifecycle
 * ---------
 * - On app load: read the stored session, then load the profile once.
 * - On later auth events: keep the session fresh; reload the profile only when the
 *   signed-in user changes. Supabase calls are never awaited inside the
 *   onAuthStateChange callback (that can deadlock the client), so work is deferred.
 * - If a signed-in user has no usable profile, `user` stays null and `profileError`
 *   says why, so the UI can show a clear message instead of a wrong identity.
 *
 * Accounts are created only by admins through edge functions; there is no
 * self-registration or invite-by-link flow.
 */
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { signIn, signOut } from "@/services/authService";
import { User } from "@/types";

type Role = User["role"];
const VALID_ROLES: Role[] = ["super_admin", "school_admin", "teacher", "student"];

export type ProfileError = "missing_profile" | "fetch_failed" | "invalid_role" | null;

const PROFILE_PROBLEM_MESSAGES: Record<Exclude<ProfileError, null>, string> = {
  missing_profile: "Your account has no profile yet. Please contact your school administrator.",
  fetch_failed: "We couldn't load your account details. Please try again.",
  invalid_role: "Your account has an unrecognised role. Please contact your school administrator.",
};

/** Thrown by login() when credentials are fine but the account itself is not usable. */
export class AccountSetupError extends Error {
  reason: Exclude<ProfileError, null>;
  constructor(reason: Exclude<ProfileError, null>) {
    super(PROFILE_PROBLEM_MESSAGES[reason]);
    this.name = "AccountSetupError";
    this.reason = reason;
  }
}

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  userProfile: any;
  loading: boolean;
  /** Why a signed-in user has no `user` (null when everything is fine). */
  profileError: ProfileError;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthorized: (allowedRoles?: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileError, setProfileError] = useState<ProfileError>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // The profile request currently running (shared by everyone who asks for the same user).
  const inflightRef = useRef<{ userId: string; promise: Promise<ProfileError> } | null>(null);
  // The user whose profile is currently loaded, so refocus/refresh events don't refetch.
  const loadedUserIdRef = useRef<string | null>(null);
  // The signed-in user; results for anyone else (e.g. after sign-out) are discarded.
  const activeUserIdRef = useRef<string | null>(null);

  const clearUserState = useCallback(() => {
    inflightRef.current = null;
    loadedUserIdRef.current = null;
    activeUserIdRef.current = null;
    setUser(null);
    setUserProfile(null);
    setProfileError(null);
  }, []);

  const isAuthorized = useCallback((allowedRoles?: Role[]) => {
    if (!user) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (user.role === "super_admin") return true;
    return allowedRoles.includes(user.role);
  }, [user]);

  /**
   * Loads the profile for `userId`. Resolves to null on success, or the reason it failed.
   * Concurrent callers share one request; failures are never cached, so a retry refetches.
   */
  const loadProfile = useCallback((userId: string, force = false): Promise<ProfileError> => {
    if (!force && loadedUserIdRef.current === userId) return Promise.resolve(null);
    if (inflightRef.current?.userId === userId) return inflightRef.current.promise;

    const fail = (reason: Exclude<ProfileError, null>): ProfileError => {
      if (activeUserIdRef.current === userId) {
        setUser(null);
        setUserProfile(null);
        setProfileError(reason);
      }
      return reason;
    };

    const promise = (async (): Promise<ProfileError> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, school_id")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("[auth] could not load profile", error);
        return fail("fetch_failed");
      }
      if (!data) {
        console.error("[auth] no profile row for user", userId);
        return fail("missing_profile");
      }

      const role = data.role as Role;
      if (!VALID_ROLES.includes(role)) {
        console.error("[auth] profile has an unrecognised role:", data.role);
        return fail("invalid_role");
      }

      if (activeUserIdRef.current !== userId) return null; // signed out while loading

      loadedUserIdRef.current = userId;
      setUser({
        id: data.id,
        name: data.name || "",
        email: data.email || "",
        role,
        schoolId: role === "super_admin" ? null : (data.school_id ?? null),
      });
      setUserProfile(data);
      setProfileError(null);
      return null;
    })().finally(() => {
      if (inflightRef.current?.userId === userId) inflightRef.current = null;
    });

    inflightRef.current = { userId, promise };
    return promise;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          await supabase.auth.signOut();
          if (isMounted) {
            clearUserState();
            setSession(null);
          }
          return;
        }
        if (!isMounted) return;
        setSession(data.session);
        if (data.session?.user) {
          activeUserIdRef.current = data.session.user.id;
          await loadProfile(data.session.user.id, true);
        }
      } catch (err) {
        console.error("[auth] could not start session", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      if (event === "INITIAL_SESSION") return; // handled by init()

      if (event === "SIGNED_OUT") {
        clearUserState();
        setSession(null);
        return;
      }

      setSession(newSession);
      const authUser = newSession?.user;
      if (!authUser) return;
      activeUserIdRef.current = authUser.id;

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // Defer: calling supabase from inside this callback can deadlock the client.
        setTimeout(() => {
          if (isMounted) void loadProfile(authUser.id);
        }, 0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, clearUserState]);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id;
    if (userId) {
      activeUserIdRef.current = userId;
      await loadProfile(userId, true);
    }
  }, [session, loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await signIn(email, password);
    if (error) throw error;
    if (!data?.session || !data.user) throw new Error("Login failed. Please try again.");

    setSession(data.session);
    activeUserIdRef.current = data.user.id;

    const problem = await loadProfile(data.user.id, true);
    if (problem) {
      // Correct password, but the account can't be used: don't leave a half-signed-in session.
      await supabase.auth.signOut();
      throw new AccountSetupError(problem);
    }
    // Navigation is handled by the Login page and RouteGuard once `user` is set.
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await signOut();
    clearUserState();
    setSession(null);
    // Clear security-sensitive localStorage items
    localStorage.removeItem("login_rate_limit");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  }, [clearUserState, toast]);

  const contextValue = useMemo(() => ({
    user,
    session,
    userProfile,
    loading,
    profileError,
    login,
    logout,
    refreshProfile,
    isAuthorized,
  }), [user, session, userProfile, loading, profileError, login, logout, refreshProfile, isAuthorized]);

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
