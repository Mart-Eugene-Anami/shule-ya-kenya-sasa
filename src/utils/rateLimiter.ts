/**
 * Rate Limiter Utility
 * 
 * Provides rate limiting functionality for sensitive operations like login, API calls, etc.
 * Uses localStorage to track request counts and timestamps.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

const RATE_LIMIT_STORAGE_KEY = 'rate_limit';

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier for the rate limit (e.g., 'login', 'api_call')
 * @param config - Rate limit configuration
 * @returns Object with shouldLimit flag and remaining requests
 */
export function checkRateLimit(key: string, config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 }): {
  shouldLimit: boolean;
  remaining: number;
  resetTime: number;
} {
  try {
    const storageKey = `${RATE_LIMIT_STORAGE_KEY}_${key}`;
    const now = Date.now();
    
    // Get current state from localStorage
    const stored = localStorage.getItem(storageKey);
    let state: RateLimitState = stored ? JSON.parse(stored) : { count: 0, resetTime: now + config.windowMs };
    
    // Reset if window has expired
    if (now >= state.resetTime) {
      state = { count: 0, resetTime: now + config.windowMs };
    }
    
    // Check if limit exceeded
    const shouldLimit = state.count >= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - state.count);
    
    if (!shouldLimit) {
      // Increment count
      state.count++;
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
    
    return {
      shouldLimit,
      remaining,
      resetTime: state.resetTime
    };
  } catch (error) {
    // If localStorage fails, allow the request (fail open)
    return {
      shouldLimit: false,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs
    };
  }
}

/**
 * Reset rate limit for a specific key
 * @param key - Unique identifier for the rate limit
 */
export function resetRateLimit(key: string): void {
  try {
    const storageKey = `${RATE_LIMIT_STORAGE_KEY}_${key}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Get remaining time until rate limit resets
 * @param key - Unique identifier for the rate limit
 * @returns Remaining time in milliseconds, or 0 if no limit is active
 */
export function getRateLimitResetTime(key: string): number {
  try {
    const storageKey = `${RATE_LIMIT_STORAGE_KEY}_${key}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return 0;
    
    const state: RateLimitState = JSON.parse(stored);
    const now = Date.now();
    
    if (now >= state.resetTime) {
      localStorage.removeItem(storageKey);
      return 0;
    }
    
    return state.resetTime - now;
  } catch (error) {
    return 0;
  }
}

/**
 * Clear all rate limits (useful for testing or logout)
 */
export function clearAllRateLimits(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(RATE_LIMIT_STORAGE_KEY)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    // Silently fail
  }
}
