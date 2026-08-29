/**
 * Shared Supabase client mock for unit tests.
 *
 * Provides a chainable query-builder mock that mirrors the real
 * Supabase JS client API surface used throughout the codebase.
 * Each test can override return values via vi.fn().mockResolvedValue().
 */
import { vi } from "vitest";

/** Creates a fresh chainable query builder mock */
export function createQueryMock(resolvedData: any = { data: null, error: null }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedData),
    maybeSingle: vi.fn().mockResolvedValue(resolvedData),
    then: undefined as any, // Allows awaiting the chain directly
  };

  // Make the chain itself thenable so `await supabase.from(...).select(...)` works
  chain.then = (resolve: any) => resolve(resolvedData);

  return chain;
}

/** Creates a mock supabase client */
export function createSupabaseMock() {
  return {
    from: vi.fn(() => createQueryMock()),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  };
}
