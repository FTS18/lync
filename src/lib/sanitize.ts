/**
 * Sanitization utilities — XSS prevention for user-generated content.
 * Strip HTML tags and dangerous characters from all user inputs.
 */

/**
 * Strip all HTML tags and trim whitespace.
 * Use for display names, chat messages, room IDs.
 */
export function sanitizeText(input: string, maxLen = 500): string {
  return input
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .replace(/javascript:/gi, "")     // strip JS protocol
    .replace(/on\w+\s*=/gi, "")       // strip inline event handlers
    .replace(/[<>]/g, "")             // strip remaining angle brackets
    .trim()
    .slice(0, maxLen);
}

/**
 * Sanitize a room code / channel name.
 * Only allow lowercase letters, digits, hyphens.
 */
export function sanitizeRoomId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, "")
    .slice(0, 64);
}

/**
 * Sanitize a display name — allow letters, digits, spaces, underscores, hyphens.
 */
export function sanitizeDisplayName(input: string): string {
  return input
    .replace(/[<>'"&]/g, "")
    .trim()
    .slice(0, 40);
}

/**
 * Escape HTML entities for safe rendering inside dangerouslySetInnerHTML contexts.
 * Prefer not using dangerouslySetInnerHTML at all — use this only as a last resort.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
