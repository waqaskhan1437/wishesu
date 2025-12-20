/**
 * Central constants - Shared across all modules
 */

// Application version - used for cache busting and debug info
export const VERSION = globalThis.VERSION || "15";

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
