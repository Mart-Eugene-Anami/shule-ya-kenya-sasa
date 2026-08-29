import DOMPurify from "dompurify";

/**
 * Sanitizes a string input by stripping HTML/script tags and dangerous characters.
 * Use on all user-facing text inputs before storage or rendering.
 */
export function sanitizeInput(value: string): string {
  if (!value) return value;
  // Strip all HTML tags and entities
  const clean = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  // Remove residual dangerous chars: < > $ ` \
  return clean.replace(/[<>$`\\]/g, "");
}

/**
 * Sanitizes an email address — allows standard email chars only.
 */
export function sanitizeEmail(value: string): string {
  if (!value) return value;
  return value.replace(/[^a-zA-Z0-9@._+\-]/g, "").trim();
}

/**
 * Sanitizes a phone number — allows digits, +, -, spaces, parens only.
 */
export function sanitizePhone(value: string): string {
  if (!value) return value;
  return value.replace(/[^0-9+\-() ]/g, "").trim();
}

/**
 * Sanitizes a numeric string input.
 */
export function sanitizeNumeric(value: string): string {
  if (!value) return value;
  return value.replace(/[^0-9.\-]/g, "");
}

/**
 * Sanitize an object's string values recursively (shallow — one level).
 */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  const sanitized = { ...data };
  for (const key in sanitized) {
    const val = sanitized[key];
    if (typeof val === "string") {
      if (key.toLowerCase().includes("email")) {
        (sanitized as Record<string, unknown>)[key] = sanitizeEmail(val);
      } else if (key.toLowerCase().includes("phone")) {
        (sanitized as Record<string, unknown>)[key] = sanitizePhone(val);
      } else if (key.toLowerCase().includes("password") || key.toLowerCase().includes("confirm")) {
        // Don't sanitize passwords — they need special chars
        continue;
      } else {
        (sanitized as Record<string, unknown>)[key] = sanitizeInput(val);
      }
    }
  }
  return sanitized;
}
