/**
 * Admin Module
 * Complete admin dashboard and management system
 *
 * Structure:
 * - Frontend: Dashboard, settings, management views
 * - Backend: Admin controllers and API
 */

// ==========================================
// BACKEND EXPORTS
// ==========================================

// Admin API
export * from './admin.api.js';

// Admin Controllers
export * from './controllers/index.js';
export * from './controllers/cache.js';
export * from './controllers/data-management.js';
export * from './controllers/import-export.js';
export * from './controllers/maintenance.js';
export * from './controllers/settings.js';
export * from './controllers/upload.js';
export * from './controllers/users.js';

// ==========================================
// MODULE INFO
// ==========================================
export const MODULE_INFO = {
  name: 'admin',
  version: '1.0.0',
  description: 'Admin dashboard and management system',
  files: {
    backend: {
      api: ['admin.api.js'],
      controllers: [
        'index.js',
        'cache.js',
        'data-management.js',
        'import-export.js',
        'maintenance.js',
        'settings.js',
        'upload.js',
        'users.js'
      ]
    }
  }
};
