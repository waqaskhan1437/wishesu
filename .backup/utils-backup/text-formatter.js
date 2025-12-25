/**
 * Text Formatter (Backend)
 * Text formatting utilities for backend operations
 */

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 100, suffix = '...') {
  if (!text) return '';

  const str = text.toString();
  if (str.length <= maxLength) return str;

  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter
 */
export function capitalize(text) {
  if (!text) return '';

  const str = text.toString();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Strip HTML tags
 */
export function stripHTML(html) {
  if (!html) return '';

  return html
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Escape special characters for regex
 */
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate excerpt from HTML
 */
export function excerpt(html, maxLength = 160) {
  const text = stripHTML(html);
  return truncate(text, maxLength);
}

export default { truncate, capitalize, stripHTML, escapeRegex, excerpt };
