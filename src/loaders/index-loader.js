/**
 * Index Loader - Central Module Exports
 * Consolidates all exports from modular files for index.js
 * This file imports from all consolidated modules and re-exports them
 */

export * from './utils/html-entities.js';
export * from './utils/html-sanitizer.js';
export * from './utils/date-formatter.js';
export * from './utils/json-helpers.js';
export * from './utils/cache-headers.js';
export * from './utils/url-helpers.js';
export * from './utils/path-detection.js';
export * from './utils/hostname-helpers.js';
export * from './utils/feature-flags.js';
export * from './utils/html-injector.js';
export * from './utils/paginations.js';
export * from './utils/string-helpers.js';
export * from './utils/price-formatter.js';
export * from './utils/star-renderer.js';
export * from './utils/card-renderer.js';

export * from './routing/path-aliases.js';

export * from './ssr/product-ssr.js';
export * from './ssr/product-renderer.js';
export * from './ssr/product-player.js';
export * from './ssr/review-ssr.js';
export * from './ssr/review-media.js';
export * from './ssr/blog-ssr.js';
export * from './ssr/forum-ssr.js';
export * from './ssr/blog-page-generator.js';
export * from './ssr/forum-page-generator.js';
export * from './ssr/query-helpers.js';
export * from './ssr/component-applier.js';

export * from './seo/seo-helpers.js';
export * from './seo/seo-tags.js';
export * from './seo/sitemap-helpers.js';

export * from './components/global-components.js';

export * from './utils/settings-helper.js';
export * from './utils/db-helpers.js';
export * from './utils/cache-keys.js';
export * from './utils/error-handler.js';
export * from './utils/order-decoder.js';
export * from './utils/response.js';
export * from './utils/validation.js';
export * from './utils/formatting.js';

export {
  initDB,
  getDb,
  getDbWithRetry,
  withDbRetry,
  isDbReady,
  isDbInitialized
} from './config/db.js';

export { CORS } from './config/cors.js';

export * from './controllers/products.js';
export * from './controllers/orders.js';
export * from './controllers/blog.js';
export * from './controllers/forum.js';
export * from './controllers/reviews.js';
export * from './controllers/pages.js';
export * from './controllers/admin.js';
export * from './controllers/email.js';
export * from './controllers/chat.js';
export * from './controllers/coupons.js';
export * from './controllers/noindex.js';
export * from './controllers/seo-minimal.js';
export * from './controllers/settings-clean.js';
export * from './controllers/settings-media.js';
export * from './controllers/backup.js';
export * from './controllers/api-keys.js';
export * from './controllers/analytics.js';
export * from './controllers/webhooks.js';
export * from './controllers/paypal.js';
export * from './controllers/payment-gateway.js';
export * from './controllers/payment-universal.js';
export * from './controllers/whop.js';
export * from './controllers/blog-comments.js';
