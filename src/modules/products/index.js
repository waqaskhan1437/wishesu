/**
 * Products Module
 * Complete product management system
 *
 * Structure:
 * - Frontend: Product views, forms, cards, grid, SEO
 * - Backend: API routes and controllers
 */

// ==========================================
// FRONTEND EXPORTS
// ==========================================

// Core Product Scripts
export * from './frontend/scripts/product-detail.js';
export * from './frontend/scripts/product-list.js';
export * from './frontend/scripts/product-cards.js';
export * from './frontend/scripts/product-form.js';
export * from './frontend/scripts/product-addons.js';
export * from './frontend/scripts/product-seo.js';

// Product Components
export * from './frontend/scripts/product-card.js';
export * from './frontend/scripts/product-grid.js';
export * from './frontend/scripts/product-info-panel.js';

// Admin Product Scripts
export * from './frontend/scripts/product-form-page.js';
export * from './frontend/scripts/products-api.js';
export * from './frontend/scripts/products-header.js';
export * from './frontend/scripts/products-table.js';
export * from './frontend/scripts/products-view.js';

// ==========================================
// BACKEND EXPORTS
// ==========================================

// Product API
export * from './backend/api/products.api.js';

// Product Controllers
export * from './backend/controllers/products.controller.js';

// ==========================================
// MODULE INFO
// ==========================================
export const MODULE_INFO = {
  name: 'products',
  version: '1.0.0',
  description: 'Product management module with full CRUD operations',
  files: {
    frontend: {
      views: ['product-form.html'],
      styles: ['product-form.base.css', 'product-form.addons.css'],
      scripts: [
        'product-detail.js',
        'product-list.js',
        'product-cards.js',
        'product-form.js',
        'product-addons.js',
        'product-seo.js',
        'product-card.js',
        'product-grid.js',
        'product-info-panel.js',
        'product-form-page.js',
        'products-api.js',
        'products-header.js',
        'products-table.js',
        'products-view.js'
      ]
    },
    backend: {
      api: ['products.api.js'],
      controllers: ['products.controller.js']
    }
  }
};
