/**
 * Access Control Service Tests
 *
 * Tests the school access verification system:
 * - checkSchoolAccess: RPC call with 30s client-side cache
 * - Cache hit/miss/expiry behaviour
 * - Graceful error handling (stale cache fallback, default-allow)
 * - clearAccessCache: selective and full cache clearing
 * - getPricingTierDisplayName: human-readable tier labels
 * - formatKES: currency formatting with "Contact for Quote" fallback
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Import AFTER mocks are in place
import {
  checkSchoolAccess,
  clearAccessCache,
  getPricingTierDisplayName,
  formatKES,
  PRICING_TIERS,
} from "../accessControlService";

describe("accessControlService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Always clear the module-level cache between tests
    clearAccessCache();
  });

  // =========================================================================
  // checkSchoolAccess
  // =========================================================================
  describe("checkSchoolAccess", () => {
    it("returns true when the RPC resolves with true", async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      const result = await checkSchoolAccess("school-1");

      expect(result).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("school_has_access", { p_school_id: "school-1" });
    });

    it("returns false when the RPC resolves with false", async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });

      const result = await checkSchoolAccess("school-2");

      expect(result).toBe(false);
    });

    it("uses cached value on subsequent calls within cache window", async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      // First call — hits RPC
      await checkSchoolAccess("school-1");
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Second call — should use cache
      const result = await checkSchoolAccess("school-1");
      expect(result).toBe(true);
      expect(mockRpc).toHaveBeenCalledTimes(1); // no extra RPC call
    });

    it("bypasses cache when forceRefresh is true", async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      await checkSchoolAccess("school-1");
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Force refresh should call RPC again
      await checkSchoolAccess("school-1", true);
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    it("returns stale cache on RPC error if cache exists", async () => {
      // Populate cache
      mockRpc.mockResolvedValue({ data: true, error: null });
      await checkSchoolAccess("school-1");

      // Now force refresh with an error — should fall back to stale cache
      mockRpc.mockResolvedValue({ data: null, error: { message: "DB down" } });
      const result = await checkSchoolAccess("school-1", true);

      expect(result).toBe(true); // stale cache value
    });

    it("defaults to true (allow) on error with no cache", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "DB down" } });

      const result = await checkSchoolAccess("brand-new-school");

      expect(result).toBe(true); // fail-open to prevent blocking legitimate users
    });

    it("defaults to true when RPC throws an exception and no cache exists", async () => {
      mockRpc.mockRejectedValue(new Error("Network failure"));

      const result = await checkSchoolAccess("school-x");

      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // clearAccessCache
  // =========================================================================
  describe("clearAccessCache", () => {
    it("clears cache for a specific school", async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      // Populate caches for two schools
      await checkSchoolAccess("school-1");
      await checkSchoolAccess("school-2");
      expect(mockRpc).toHaveBeenCalledTimes(2);

      // Clear only school-1
      clearAccessCache("school-1");

      // school-1 should hit RPC again, school-2 should still be cached
      await checkSchoolAccess("school-1");
      await checkSchoolAccess("school-2");
      expect(mockRpc).toHaveBeenCalledTimes(3); // only one new call for school-1
    });

    it("clears entire cache when called without arguments", async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      await checkSchoolAccess("school-1");
      await checkSchoolAccess("school-2");

      clearAccessCache(); // clear all

      await checkSchoolAccess("school-1");
      await checkSchoolAccess("school-2");
      expect(mockRpc).toHaveBeenCalledTimes(4); // 2 original + 2 new
    });
  });

  // =========================================================================
  // getPricingTierDisplayName
  // =========================================================================
  describe("getPricingTierDisplayName", () => {
    it("returns correct display name for tier_1", () => {
      expect(getPricingTierDisplayName("tier_1")).toBe("Tier 1 (0-500 students)");
    });

    it("returns correct display name for tier_2", () => {
      expect(getPricingTierDisplayName("tier_2")).toBe("Tier 2 (501-1,000 students)");
    });

    it("returns correct display name for tier_3", () => {
      expect(getPricingTierDisplayName("tier_3")).toBe("Tier 3 (1,001-2,000 students)");
    });

    it("returns correct display name for tier_4", () => {
      expect(getPricingTierDisplayName("tier_4")).toBe("Tier 4 (2,000+ students)");
    });

    it("returns 'Unknown Tier' for unrecognised tier", () => {
      expect(getPricingTierDisplayName("tier_99")).toBe("Unknown Tier");
    });
  });

  // =========================================================================
  // formatKES
  // =========================================================================
  describe("formatKES", () => {
    it("formats a positive amount with KES prefix", () => {
      expect(formatKES(4000)).toBe("KES 4,000");
    });

    it("returns 'Contact for Quote' for null", () => {
      expect(formatKES(null)).toBe("Contact for Quote");
    });

    it("returns 'Contact for Quote' for zero", () => {
      expect(formatKES(0)).toBe("Contact for Quote");
    });

    it("formats large amounts with comma separators", () => {
      expect(formatKES(22500)).toBe("KES 22,500");
    });
  });

  // =========================================================================
  // PRICING_TIERS constant
  // =========================================================================
  describe("PRICING_TIERS", () => {
    it("has four tiers defined", () => {
      expect(Object.keys(PRICING_TIERS)).toHaveLength(4);
    });

    it("tier_4 requires consultation (no fixed price)", () => {
      expect(PRICING_TIERS.tier_4.monthly).toBeNull();
      expect(PRICING_TIERS.tier_4.termly).toBeNull();
      expect(PRICING_TIERS.tier_4.requiresConsultation).toBe(true);
    });
  });
});
