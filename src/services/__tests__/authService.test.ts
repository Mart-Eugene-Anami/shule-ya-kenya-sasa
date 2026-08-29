/**
 * Unit tests for authService.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationError, AuthenticationError, RateLimitError } from "@/lib/errors";

// vi.mock factories are hoisted, so we must use vi.hoisted for shared state
const mockSupabase = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
  from: vi.fn(),
  functions: { invoke: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// Mock rate limiter
vi.mock("@/utils/rateLimiter", () => ({
  checkRateLimit: vi.fn(() => ({ shouldLimit: false, remaining: 5, resetTime: Date.now() + 60000 })),
  resetRateLimit: vi.fn(),
}));

import { signUp, signIn, signOut, checkUserRole, getCurrentUserSchoolId } from "../authService";

function mockProfileQuery(returnData: any, returnError: any = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    insert: vi.fn().mockReturnThis(),
  };
  mockSupabase.from.mockReturnValue(chain);
  return chain;
}

beforeEach(() => { vi.clearAllMocks(); });

describe("signUp", () => {
  it("should call supabase.auth.signUp with correct params", async () => {
    const mockUser = { id: "user-1", email: "test@test.com" };
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockProfileQuery({ id: "user-1", role: "super_admin", name: "Test" });

    const result = await signUp("Test", "test@test.com", "password123", "super_admin");

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "password123",
      options: { data: { name: "Test", role: "super_admin" } },
    });
    expect(result).toEqual(mockUser);
  });

  it("should convert 'admin' role to 'school_admin' in metadata", async () => {
    const mockUser = { id: "user-2", email: "admin@test.com" };
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockProfileQuery({ id: "user-2", role: "school_admin", name: "Admin" });

    await signUp("Admin", "admin@test.com", "password123", "admin");

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { data: { name: "Admin", role: "school_admin" } } })
    );
  });

  it("should throw ValidationError when signUp returns an error", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: null }, error: { message: "Email already taken" } });
    await expect(signUp("Test", "taken@test.com", "pass", "super_admin")).rejects.toThrow();
  });

  it("should throw ValidationError when no user is returned", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: null }, error: null });
    await expect(signUp("Test", "test@test.com", "pass", "super_admin")).rejects.toThrow(ValidationError);
  });

  it("should manually create profile if trigger fails", async () => {
    const mockUser = { id: "user-1", email: "test@test.com" };
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: mockUser }, error: null });
    
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "user-1", role: "super_admin" }, error: null }),
    };
    const queryChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnValue(insertChain),
    };
    mockSupabase.from.mockReturnValue(queryChain);

    const result = await signUp("Test", "test@test.com", "password123", "super_admin");
    expect(result).toEqual(mockUser);
  });
});

describe("signIn", () => {
  it("should return data on successful login", async () => {
    const mockData = { user: { id: "u1" }, session: { access_token: "abc" } };
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: mockData, error: null });
    const result = await signIn("test@test.com", "password");
    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });

  it("should return error object on failed login", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Invalid credentials" } });
    const result = await signIn("bad@test.com", "wrong");
    expect(result.error).toBeTruthy();
  });

  it("should return RateLimitError when rate limited", async () => {
    const { checkRateLimit } = await import("@/utils/rateLimiter");
    vi.mocked(checkRateLimit).mockReturnValue({ shouldLimit: true, remaining: 0, resetTime: Date.now() + 60000 });

    const result = await signIn("test@test.com", "password");
    expect(result.error).toBeInstanceOf(RateLimitError);
  });
});

describe("signOut", () => {
  it("should call supabase.auth.signOut", async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it("should throw AuthenticationError on signOut error", async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: { message: "Network error" } });
    await expect(signOut()).rejects.toThrow();
  });
});

describe("checkUserRole", () => {
  it("should return true when user has required role", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockProfileQuery({ role: "school_admin" });
    const result = await checkUserRole(["school_admin", "super_admin"]);
    expect(result).toBe(true);
  });

  it("should return false when no user is logged in", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await checkUserRole(["school_admin"]);
    expect(result).toBe(false);
  });

  it("should return false on error", async () => {
    mockSupabase.auth.getUser.mockRejectedValue(new Error("Auth error"));
    const result = await checkUserRole(["school_admin"]);
    expect(result).toBe(false);
  });
});

describe("getCurrentUserSchoolId", () => {
  it("should return school_id when user has one", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockProfileQuery({ school_id: "school-123" });
    const result = await getCurrentUserSchoolId();
    expect(result).toBe("school-123");
  });

  it("should return null when no user is logged in", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await getCurrentUserSchoolId();
    expect(result).toBeNull();
  });

  it("should return null on error", async () => {
    mockSupabase.auth.getUser.mockRejectedValue(new Error("Auth error"));
    const result = await getCurrentUserSchoolId();
    expect(result).toBeNull();
  });
});
