/**
 * Central constants - Shared across all modules
 */

// Application version - used for cache busting and debug info
// Note: This is a fallback. Actual version comes from env.VERSION in wrangler.toml
export const VERSION = "1766444251";

// Rate limiting defaults
export const RATE_LIMIT = {
  CHAT_MSG_PER_SEC: 1,
  MAX_CHAT_MSG_LENGTH: 500
};

// File size limits
export const FILE_SIZE_LIMITS = {
  VIDEO_MAX_MB: 500,
  FILE_MAX_MB: 10
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200
};
