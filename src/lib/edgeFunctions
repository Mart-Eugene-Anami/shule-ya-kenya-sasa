/**
 * Helper for calling Supabase edge functions.
 *
 * supabase.functions.invoke() reports any non-2xx reply as the generic message
 * "Edge Function returned a non-2xx status code" and hides the real reason in
 * error.context. This helper digs the server's message out so users see why a
 * request failed (e.g. "The email x@y.com is already registered").
 *
 * It also treats a reply of { success: false, error } as a failure, which is the
 * shape all of our edge functions use.
 */
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- callers choose their own response type
export async function invokeEdgeFunction<T = any>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    let message = error.message || "Request failed";
    try {
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === "function") {
        const payload = await context.json();
        if (payload?.error) message = String(payload.error);
      }
    } catch {
      // The reply was not JSON; keep the generic message.
    }
    throw new Error(message);
  }

  if (data && typeof data === "object" && (data as { success?: boolean }).success === false) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }

  return data as T;
}
