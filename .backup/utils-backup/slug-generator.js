/**
 * Slug Generator (Backend)
 * Consistent slug generation for backend operations
 * Consolidates duplicate slugify implementations
 */

/**
 * Generate URL-friendly slug
 * @param {string} text - Text to slugify
 * @returns {string} Slug
 */
export function slugify(text) {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

/**
 * Generate unique slug with timestamp
 */
export function uniqueSlug(text) {
  const base = slugify(text);
  const timestamp = Date.now().toString(36);
  return `${base}-${timestamp}`;
}

/**
 * Generate slug with ID
 */
export function slugWithId(text, id) {
  const base = slugify(text);
  return `${base}-${id}`;
}

export default { slugify, uniqueSlug, slugWithId };
