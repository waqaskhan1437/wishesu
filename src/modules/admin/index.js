/**
 * Admin Module
 * Complete admin dashboard and management system
 *
 * Structure:
 * - Frontend: Dashboard, settings, management views
 * - Backend: Admin controllers and API
 */

// ==========================================
// FRONTEND EXPORTS
// ==========================================

// Core Admin Scripts
export * from './frontend/scripts/app.js';
export * from './frontend/scripts/components-view.js';
export * from './frontend/scripts/dashboard-api.js';
export * from './frontend/scripts/dashboard-stats.js';
export * from './frontend/scripts/dashboard-view.js';
export * from './frontend/scripts/pages-api.js';
export * from './frontend/scripts/pages-table.js';
export * from './frontend/scripts/pages-view.js';

// ==========================================
// BACKEND EXPORTS
// ==========================================

// Admin API
export * from './backend/api/admin.api.js';

// Admin Controllers
export * from './backend/controllers/index.js';
export * from './backend/controllers/cache.js';
export * from './backend/controllers/data-management.js';
export * from './backend/controllers/import-export.js';
export * from './backend/controllers/maintenance.js';
export * from './backend/controllers/settings.js';
export * from './backend/controllers/upload.js';
export * from './backend/controllers/users.js';

// ==========================================
// MODULE INFO
// ==========================================
export const MODULE_INFO = {
  name: 'admin',
  version: '1.0.0',
  description: 'Admin dashboard and management system',
  files: {
    frontend: {
      views: [
        'dashboard.html',
        'index.html',
        'landing-builder.html',
        'migrate-reviews.html'
      ],
      styles: [
        'admin-nav.css',
        'style.admin.css'
      ],
      scripts: [
        'app.js',
        'components-view.js',
        'dashboard-api.js',
        'dashboard-stats.js',
        'dashboard-view.js',
        'pages-api.js',
        'pages-table.js',
        'pages-view.js'
      ]
    },
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
