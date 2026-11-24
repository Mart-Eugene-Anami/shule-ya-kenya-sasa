import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { checkSchoolAccess, clearAccessCache } from "@/services/accessControlService";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<"super_admin" | "school_admin" | "teacher" | "student">;
}

const PUBLIC_PATHS = ["/", "/login", "/access-restricted"];
const ACCESS_EXEMPT_PATHS = ["/payment-info", "/access-restricted", "/unauthorized"];

const LOADING_TIMEOUT_MS = 4000;
const MAX_RETRIES = 3;

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'access_denied' | 'authorized';

const RouteGuard = ({ children, allowedRoles = [] }: RouteGuardProps) => {
  const { user, session, loading, profileError, isAuthorized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [retryTick, setRetryTick] = useState(0);
  const lastCheckKeyRef = useRef('');
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const isPublicPath = useMemo(() => PUBLIC_PATHS.includes(location.pathname), [location.pathname]);
  const isAccessExemptPath = useMemo(() => 
    ACCESS_EXEMPT_PATHS.some(path => location.pathname.startsWith(path)), 
    [location.pathname]
  );
  const isAuthenticated = useMemo(() => !!session && !!user, [session, user]);

  const checkKey = `${location.pathname}|${loading}|${user?.id}|${user?.role}|${user?.schoolId}|${!!session}|${profileError}|${retryTick}`;

  const performAuthCheck = useCallback(async () => {
    if (loading) return;
    if (lastCheckKeyRef.current === checkKey) return;
    lastCheckKeyRef.current = checkKey;

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }

    // Handle public paths
    if (isPublicPath) {
      if (isAuthenticated && location.pathname === "/login") {
        let redirectPath = "/dashboard";
        if (user?.role === "super_admin") redirectPath = "/super-admin";
        else if (user?.role === "teacher") redirectPath = "/teacher-dashboard";
        else if (user?.role === "student") redirectPath = "/student-dashboard";
        navigate(redirectPath, { replace: true });
        return;
      }
      setAuthState('authorized');
      return;
    }

    // Signed in, but the profile could not be loaded (missing, unreadable, bad role).
    // Wait briefly in case it is still loading, then explain the problem.
    if (session && !user) {
      if (!profileError && retryTick === 0) {
        setAuthState('loading');
        return;
      }
      setAuthState('access_denied');
      navigate("/unauthorized", { replace: true, state: { reason: profileError ?? 'fetch_failed' } });
      return;
    }

    // Handle unauthenticated users on protected routes
    if (!isAuthenticated) {
      setAuthState('unauthenticated');
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return;
    }

    // Check role authorization
    if (allowedRoles.length > 0 && !isAuthorized(allowedRoles)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      setAuthState('access_denied');
      navigate("/unauthorized", { replace: true, state: { reason: 'role' } });
      return;
    }

    // Super admin can access everything
    if (user?.role === "super_admin") {
      setAuthState('authorized');
      return;
    }

    // Check school access for non-super-admin users (non-blocking — use cached)
    if (user?.schoolId && !isAccessExemptPath) {
      try {
        const hasAccess = await checkSchoolAccess(user.schoolId);
        if (!hasAccess) {
          setAuthState('access_denied');
          navigate("/access-restricted", { replace: true });
          return;
        }
      } catch {
        // Allow access on error to prevent blocking legitimate users
      }
    }

    // Redirect teachers/students from admin dashboard
    if (user?.role === "teacher" && location.pathname === "/dashboard") {
      navigate("/teacher-dashboard", { replace: true });
      return;
    }
    if (user?.role === "student" && location.pathname === "/dashboard") {
      navigate("/student-dashboard", { replace: true });
      return;
    }
    if (user?.role === "student") {
      setAuthState('authorized');
      return;
    }

    // Check school_id for school-specific routes
    const schoolSpecificPaths = ["/students", "/teachers", "/grades", "/streams", "/attendance", "/exams", "/mark-entry", "/dashboard"];
    const isSchoolSpecificPath = schoolSpecificPaths.some(path => location.pathname.startsWith(path));
    
    if (isSchoolSpecificPath && !user?.schoolId) { // super admins returned above
      setAuthState('access_denied');
      navigate("/unauthorized", { replace: true, state: { reason: 'no_school' } });
      return;
    }
    
    setAuthState('authorized');
  }, [checkKey, loading, session, user, profileError, retryTick, location.pathname, navigate, allowedRoles, toast, isAuthorized, isPublicPath, isAccessExemptPath, isAuthenticated]);

  useEffect(() => {
    if (lastCheckKeyRef.current !== checkKey) {
      setAuthState('loading');
    }
    performAuthCheck();
  }, [performAuthCheck, checkKey]);

  // Timeout: if stuck loading for too long, force a retry
  useEffect(() => {
    if (authState === 'loading' || loading) {
      loadingTimerRef.current = setTimeout(() => {
        setRetryTick((tick) => Math.min(tick + 1, MAX_RETRIES));
      }, LOADING_TIMEOUT_MS);
    }
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [authState, loading, retryTick]);

  // Clear cache on logout
  useEffect(() => {
    if (!session && !loading) {
      clearAccessCache();
    }
  }, [session, loading]);

  if (loading || authState === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (authState === 'authorized') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default RouteGuard;
