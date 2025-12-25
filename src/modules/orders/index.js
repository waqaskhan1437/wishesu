/**
 * Orders Module
 * Complete order management and processing system
 *
 * Structure:
 * - Frontend: Order views, buyer order page, order details
 * - Backend: API routes and controllers
 */

// ==========================================
// FRONTEND EXPORTS
// ==========================================

// Core Order Scripts
export * from './frontend/scripts/order-detail.js';
export * from './frontend/scripts/buyer-order.js';
export * from './frontend/scripts/order-display.js';
export * from './frontend/scripts/order-review.js';
export * from './frontend/scripts/order-tip.js';
export * from './frontend/scripts/order-video.js';

// Admin Order Scripts
export * from './frontend/scripts/admin-orders.js';
export * from './frontend/scripts/orders.js';
export * from './frontend/scripts/orders-api.js';
export * from './frontend/scripts/orders-countdown.js';
export * from './frontend/scripts/orders-header.js';
export * from './frontend/scripts/orders-modal.js';
export * from './frontend/scripts/orders-table.js';
export * from './frontend/scripts/orders-view.js';
export * from './frontend/scripts/dashboard-recent-orders.js';

// ==========================================
// BACKEND EXPORTS
// ==========================================

// Orders API
export * from './backend/api/orders.api.js';

// Orders Controllers
export * from './backend/controllers/orders.controller.js';
export * from './backend/controllers/order-helpers.js';

// ==========================================
// MODULE INFO
// ==========================================
export const MODULE_INFO = {
  name: 'orders',
  version: '1.0.0',
  description: 'Order management and processing module',
  files: {
    frontend: {
      views: ['buyer-order.html', 'order-detail.html', 'order-success.html'],
      scripts: [
        'order-detail.js',
        'buyer-order.js',
        'order-display.js',
        'order-review.js',
        'order-tip.js',
        'order-video.js',
        'admin-orders.js',
        'orders.js',
        'orders-api.js',
        'orders-countdown.js',
        'orders-header.js',
        'orders-modal.js',
        'orders-table.js',
        'orders-view.js',
        'dashboard-recent-orders.js'
      ]
    },
    backend: {
      api: ['orders.api.js'],
      controllers: ['orders.controller.js', 'order-helpers.js']
    }
  }
};
