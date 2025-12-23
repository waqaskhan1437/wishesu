/**
 * Admin Controller Index
 * Exports all admin controller functions
 * Replaces monolithic admin.js (657 lines)
 */

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

// Data Management & Downloads
export { resetData, handleSecureDownload } from './data-management.js';

// Import/Export
export {
  exportFull,
  exportProducts,
  exportPages,
  exportForGoogleSheets,
  importProducts,
  importPages
} from './import-export.js';

// Maintenance
export {
  testGoogleSync,
  clearTempFiles,
  clearPendingCheckouts
} from './maintenance.js';
