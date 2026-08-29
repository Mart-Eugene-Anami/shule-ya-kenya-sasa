/**
 * Client-side login rate limiter.
 *
 * Tracks consecutive failed login attempts in localStorage.
 * After MAX_ATTEMPTS (5) failures, the user is locked out for
 * LOCKOUT_DURATION_MS (10 minutes). Successful login resets the counter.
 *
 * NOTE: This is a UX-layer guard. Server-side rate limiting via
 * Supabase Auth config provides the true security boundary.
 */

const STORAGE_KEY = "login_rate_limit";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

interface RateLimitState {
  attempts: number;
  lockedUntil: number | null; // epoch ms
}

function getState(): RateLimitState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted data – reset
  }
  return { attempts: 0, lockedUntil: null };
}

function setState(state: RateLimitState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Returns remaining lockout seconds, or 0 if not locked. */
export function getRemainingLockoutSeconds(): number {
  const state = getState();
  if (!state.lockedUntil) return 0;
  const remaining = state.lockedUntil - Date.now();
  if (remaining <= 0) {
    // Lockout expired – reset
    setState({ attempts: 0, lockedUntil: null });
    return 0;
  }
  return Math.ceil(remaining / 1000);
}

/** Whether the user is currently locked out. */
export function isLockedOut(): boolean {
  return getRemainingLockoutSeconds() > 0;
}

/** Record a failed login attempt. Returns true if now locked out. */
export function recordFailedAttempt(): boolean {
  const state = getState();
  // If already locked, stay locked
  if (state.lockedUntil && state.lockedUntil > Date.now()) return true;

  state.attempts += 1;
  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  setState(state);
  return state.attempts >= MAX_ATTEMPTS;
}

/** Reset on successful login. */
export function resetAttempts() {
  localStorage.removeItem(STORAGE_KEY);
}

/** How many attempts remain before lockout. */
export function attemptsRemaining(): number {
  const state = getState();
  if (state.lockedUntil && state.lockedUntil > Date.now()) return 0;
  return Math.max(0, MAX_ATTEMPTS - state.attempts);
}
