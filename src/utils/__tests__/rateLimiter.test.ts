/**
 * Unit tests for rate limiter utility
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitResetTime,
  clearAllRateLimits,
} from "../rateLimiter";

describe("Rate Limiter", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe("checkRateLimit", () => {
    it("should allow requests within limit", () => {
      const result = checkRateLimit("test-key", { maxRequests: 5, windowMs: 60000 });
      expect(result.shouldLimit).toBe(false);
      expect(result.remaining).toBe(5); // 5 - 0 = 5 remaining before first request
    });

    it("should decrement remaining requests", () => {
      checkRateLimit("test-key", { maxRequests: 3, windowMs: 60000 });
      const result = checkRateLimit("test-key", { maxRequests: 3, windowMs: 60000 });
      expect(result.remaining).toBe(2); // 3 - 1 = 2 remaining before second request
    });

    it("should limit requests after max is reached", () => {
      const config = { maxRequests: 2, windowMs: 60000 };
      checkRateLimit("test-key", config);
      checkRateLimit("test-key", config);
      const result = checkRateLimit("test-key", config);
      expect(result.shouldLimit).toBe(true);
      expect(result.remaining).toBe(0); // 2 - 2 = 0 remaining before third request
    });

    it("should use default config if not provided", () => {
      const result = checkRateLimit("test-key");
      expect(result.shouldLimit).toBe(false);
      expect(result.remaining).toBe(5); // Default maxRequests is 5
    });

    it("should reset after window expires", () => {
      const config = { maxRequests: 2, windowMs: 100 }; // 100ms window
      checkRateLimit("test-key", config);
      checkRateLimit("test-key", config);
      
      // Wait for window to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = checkRateLimit("test-key", config);
          expect(result.shouldLimit).toBe(false);
          expect(result.remaining).toBe(2); // First request after reset, count = 0
          resolve(null);
        }, 150);
      });
    });

    it("should handle different keys independently", () => {
      checkRateLimit("key-1", { maxRequests: 2, windowMs: 60000 });
      checkRateLimit("key-1", { maxRequests: 2, windowMs: 60000 });
      
      const result = checkRateLimit("key-2", { maxRequests: 2, windowMs: 60000 });
      expect(result.shouldLimit).toBe(false);
      expect(result.remaining).toBe(2); // First request for key-2, count = 0
    });

    it("should fail open on localStorage error", () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error("localStorage error");
      };

      const result = checkRateLimit("test-key", { maxRequests: 1, windowMs: 60000 });
      expect(result.shouldLimit).toBe(false);
      expect(result.remaining).toBe(1);

      localStorage.getItem = originalGetItem;
    });
  });

  describe("resetRateLimit", () => {
    it("should reset rate limit for specific key", () => {
      const config = { maxRequests: 2, windowMs: 60000 };
      checkRateLimit("test-key", config);
      checkRateLimit("test-key", config);
      
      resetRateLimit("test-key");
      
      const result = checkRateLimit("test-key", config);
      expect(result.shouldLimit).toBe(false);
      expect(result.remaining).toBe(2); // First request after reset, count = 0
    });

    it("should handle non-existent keys gracefully", () => {
      expect(() => resetRateLimit("non-existent-key")).not.toThrow();
    });

    it("should fail silently on localStorage error", () => {
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = () => {
        throw new Error("localStorage error");
      };

      expect(() => resetRateLimit("test-key")).not.toThrow();

      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe("getRateLimitResetTime", () => {
    it("should return reset time for active limit", () => {
      const config = { maxRequests: 5, windowMs: 60000 };
      checkRateLimit("test-key", config);
      
      const resetTime = getRateLimitResetTime("test-key");
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60000);
    });

    it("should return 0 for non-existent key", () => {
      const resetTime = getRateLimitResetTime("non-existent-key");
      expect(resetTime).toBe(0);
    });

    it("should return 0 after window expires", () => {
      const config = { maxRequests: 2, windowMs: 100 };
      checkRateLimit("test-key", config);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          const resetTime = getRateLimitResetTime("test-key");
          expect(resetTime).toBe(0);
          resolve(null);
        }, 150);
      });
    });

    it("should clear expired keys", () => {
      const config = { maxRequests: 2, windowMs: 100 };
      checkRateLimit("test-key", config);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          const resetTime = getRateLimitResetTime("test-key");
          expect(resetTime).toBe(0);
          
          // Key should be cleared, so next request should be allowed
          const result = checkRateLimit("test-key", config);
          expect(result.shouldLimit).toBe(false);
          resolve(null);
        }, 150);
      });
    });

    it("should fail silently on localStorage error", () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error("localStorage error");
      };

      const resetTime = getRateLimitResetTime("test-key");
      expect(resetTime).toBe(0);

      localStorage.getItem = originalGetItem;
    });
  });

  describe("clearAllRateLimits", () => {
    it("should clear all rate limits", () => {
      const config = { maxRequests: 2, windowMs: 60000 };
      checkRateLimit("key-1", config);
      checkRateLimit("key-1", config);
      checkRateLimit("key-2", config);
      
      clearAllRateLimits();
      
      const result1 = checkRateLimit("key-1", config);
      const result2 = checkRateLimit("key-2", config);
      
      expect(result1.shouldLimit).toBe(false);
      expect(result2.shouldLimit).toBe(false);
    });

    it("should handle empty localStorage gracefully", () => {
      expect(() => clearAllRateLimits()).not.toThrow();
    });

    it("should fail silently on localStorage error", () => {
      const originalKeys = Object.keys;
      Object.keys = () => {
        throw new Error("localStorage error");
      };

      expect(() => clearAllRateLimits()).not.toThrow();

      Object.keys = originalKeys;
    });
  });

  describe("Rate Limiting Scenarios", () => {
    it("should handle login rate limiting", () => {
      const email = "test@example.com";
      const loginKey = `login_${email}`;
      
      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(loginKey, { maxRequests: 5, windowMs: 60000 });
        expect(result.shouldLimit).toBe(false);
      }
      
      // 6th attempt should be rate limited
      const result = checkRateLimit(loginKey, { maxRequests: 5, windowMs: 60000 });
      expect(result.shouldLimit).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("should allow different rate limits for different operations", () => {
      const apiResult = checkRateLimit("api_call", { maxRequests: 100, windowMs: 60000 });
      const loginResult = checkRateLimit("login", { maxRequests: 5, windowMs: 60000 });
      
      expect(apiResult.remaining).toBe(100); // 100 - 0 = 100 (before increment)
      expect(loginResult.remaining).toBe(5); // 5 - 0 = 5 (before increment)
    });
  });
});
