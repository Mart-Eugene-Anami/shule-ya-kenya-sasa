import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const WARNING_BEFORE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const THROTTLE_MS = 30000; // Only reset timers every 30s max (was 1s — massive perf win)

interface UseIdleTimeoutOptions {
  onTimeout?: () => void;
  onWarning?: () => void;
  timeout?: number;
}

export const useIdleTimeout = (options: UseIdleTimeoutOptions = {}) => {
  const { session, logout } = useAuth();
  const { toast } = useToast();
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  const timeout = options.timeout || IDLE_TIMEOUT_MS;

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (warningRef.current) { clearTimeout(warningRef.current); warningRef.current = null; }
  }, []);

  const handleTimeout = useCallback(async () => {
    if (options.onTimeout) options.onTimeout();
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity.",
      variant: "destructive",
    });
    await logout();
  }, [logout, toast, options]);

  const handleWarning = useCallback(() => {
    if (options.onWarning) options.onWarning();
    toast({
      title: "Session Expiring Soon",
      description: "Your session will expire in 5 minutes due to inactivity. Move your mouse or press a key to stay logged in.",
    });
  }, [toast, options]);

  const resetTimer = useCallback(() => {
    if (!session) return;
    lastActivityRef.current = Date.now();
    clearTimers();
    warningRef.current = setTimeout(handleWarning, timeout - WARNING_BEFORE_TIMEOUT_MS);
    timeoutRef.current = setTimeout(handleTimeout, timeout);
  }, [session, clearTimers, handleWarning, handleTimeout, timeout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Only reset timers if enough time passed — reduces main thread work dramatically
    if (now - lastActivityRef.current > THROTTLE_MS) {
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    if (!session) {
      clearTimers();
      return;
    }

    // Use fewer events — mousemove is extremely noisy, removed
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [session, handleActivity, resetTimer, clearTimers]);

  // Handle visibility change
  useEffect(() => {
    if (!session) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= timeout) {
          handleTimeout();
        } else {
          resetTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, timeout, handleTimeout, resetTimer]);

  return { resetTimer, lastActivity: lastActivityRef.current };
};
