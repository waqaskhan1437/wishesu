/**
 * Shared Route Constants
 * Used by both frontend and backend for URL pattern matching
 */

// Product page URL pattern: /p/:id/:slug
export const PRODUCT_PAGE_PATTERN = '/p/:id/:slug';
export const PRODUCT_PAGE_REGEX = /^\/p\/(\d+)\/([a-z0-9-]+)$/;

// Legacy product URL pattern (for backwards compatibility)
export const LEGACY_PRODUCT_PATTERN = /^\/product-?(\d+)\/(.+)$/;

// Admin routes
export const ADMIN_ROUTES = ['/admin', '/admin/'];

// SPA HTML files
export const SPA_FILES = {
  admin: '/admin/admin.html',
  product: '/product/page.html'
};

// Build product URL from id and slug
export const buildProductUrl = (id, slug) => `/p/${id}/${slug}`;

// Parse product URL to extract id
export const parseProductUrl = (path) => {
  const match = path.match(PRODUCT_PAGE_REGEX);
  if (match) return { id: match[1], slug: match[2] };

  const legacyMatch = path.match(LEGACY_PRODUCT_PATTERN);
  if (legacyMatch) return { id: legacyMatch[1], slug: legacyMatch[2] };

  return null;
};
