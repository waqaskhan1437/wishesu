/**
 * Admin Controller Index
 * Exports all admin controller functions
 * Replaces monolithic admin.js (657 lines)
 */

// Debug & Health
export { getDebugInfo } from './debug.js';

// Cache Management
export { purgeCache, maybePurgeCache } from './cache.js';

// File Upload
export {
  getArchiveCredentials,
  uploadEncryptedFile,
  uploadTempFile,
  getR2File
} from './upload.js';

// Settings
export {
  getWhopSettings,
  saveWhopSettings,
  getAnalyticsSettings,
  saveAnalyticsSettings,
  getControlWebhookSettings,
  saveControlWebhookSettings,
  getDefaultPages,
  saveDefaultPages
} from './settings.js';

// User Management
export { listUsers, updateUserBlocks } from './users.js';

// Data Reset (if exists, add later)
// export { resetData } from './data-reset.js';
