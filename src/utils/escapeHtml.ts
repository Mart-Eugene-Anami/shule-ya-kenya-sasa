/**
 * Escapes HTML-significant characters to prevent XSS when interpolating
 * user-supplied or database-sourced strings into raw HTML templates
 * (e.g. PDF/print HTML).
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
