/**
 * Permission mapping for all API endpoints
 * This file maps each API endpoint to required permissions
 */

export const ENDPOINT_PERMISSIONS = {
  // Chat APIs
  '/api/chat/start': { method: 'POST', permission: 'chat:send' },
  '/api/chat/sync': { method: 'GET', permission: 'chat:read' },
  '/api/chat/send': { method: 'POST', permission: 'chat:send' },

  // Admin Chat APIs
  '/api/admin/chats/block': { method: 'POST', permission: 'chat:block' },
  '/api/admin/chats/delete': { method: 'DELETE', permission: 'chat:delete' },
  '/api/admin/chats/sessions': { method: 'GET', permission: 'chat:list' },

  // Admin SEO APIs
  '/api/admin/seo/settings': { method: 'GET', permission: 'settings:seo' },
  '/api/admin/seo/settings:POST': { method: 'POST', permission: 'settings:seo' },
  '/api/admin/seo/pages': { method: 'GET', permission: 'settings:seo' },
  '/api/admin/seo/pages:POST': { method: 'POST', permission: 'settings:seo' },
  '/api/admin/seo/pages:DELETE': { method: 'DELETE', permission: 'settings:seo' },
  '/api/admin/seo/products': { method: 'GET', permission: 'settings:seo' },
  '/api/admin/seo/products:POST': { method: 'POST', permission: 'settings:seo' },

  // Automation APIs
  '/api/admin/automation/settings': { method: 'GET', permission: 'settings:automation' },
  '/api/admin/automation/settings:POST': { method: 'POST', permission: 'settings:automation' },
  '/api/admin/automation/logs': { method: 'GET', permission: 'settings:automation' },
  '/api/admin/automation/logs:DELETE': { method: 'DELETE', permission: 'settings:automation' },
  '/api/admin/automation/test': { method: 'POST', permission: 'settings:automation' },
  '/api/admin/automation/test/webhook': { method: 'POST', permission: 'settings:automation' },
  '/api/admin/automation/test/email': { method: 'POST', permission: 'settings:automation' },

  // Cache Purge
  '/api/purge-cache': { method: 'POST', permission: 'settings:admin' },

  // Products APIs
  '/api/products': { method: 'GET', permission: 'products:list' },
  '/api/products/list': { method: 'GET', permission: 'products:list' },
  '/api/product/': { method: 'GET', permission: 'products:read' }, // Dynamic route
  '/api/product/save': { method: 'POST', permission: 'products:update' },
  '/api/product/delete': { method: 'DELETE', permission: 'products:delete' },
  '/api/product/status': { method: 'POST', permission: 'products:update' },
  '/api/product/duplicate': { method: 'POST', permission: 'products:create' },
  '/api/products/save': { method: 'POST', permission: 'products:create' },
  '/api/products/duplicate': { method: 'POST', permission: 'products:create' },
  '/api/products/status': { method: 'POST', permission: 'products:update' },

  // Orders APIs
  '/api/orders': { method: 'GET', permission: 'orders:list' },
  '/api/orders/list': { method: 'GET', permission: 'orders:list' },
  '/api/order/': { method: 'GET', permission: 'orders:read' }, // Dynamic route
  '/api/order/save': { method: 'POST', permission: 'orders:create' },
  '/api/order/delete': { method: 'DELETE', permission: 'orders:delete' },
  '/api/order/deliver': { method: 'POST', permission: 'orders:deliver' },
  '/api/order/update': { method: 'POST', permission: 'orders:update' },
  '/api/order/archive-link': { method: 'POST', permission: 'orders:update' },
  '/api/order/mark-tip-paid': { method: 'POST', permission: 'orders:update' },
  '/api/order/request-revision': { method: 'POST', permission: 'orders:revise' },
  '/api/order/update-portfolio': { method: 'POST', permission: 'orders:update' },
  '/api/admin/order/manual-create': { method: 'POST', permission: 'orders:create' },

  // Reviews APIs
  '/api/reviews': { method: 'GET', permission: 'reviews:list' },
  '/api/reviews/product/': { method: 'GET', permission: 'reviews:read' }, // Dynamic route
  '/api/reviews/save': { method: 'POST', permission: 'reviews:create' },
  '/api/reviews/delete': { method: 'DELETE', permission: 'reviews:delete' },
  '/api/reviews/update': { method: 'POST', permission: 'reviews:update' },

  // Pages APIs
  '/api/pages': { method: 'GET', permission: 'pages:list' },
  '/api/pages/list': { method: 'GET', permission: 'pages:list' },
  '/api/pages/default': { method: 'GET', permission: 'pages:read' },
  '/api/pages/save': { method: 'POST', permission: 'pages:create' },
  '/api/pages/status': { method: 'POST', permission: 'pages:update' },
  '/api/pages/delete': { method: 'DELETE', permission: 'pages:delete' },
  '/api/pages/duplicate': { method: 'POST', permission: 'pages:create' },
  '/api/pages/type': { method: 'POST', permission: 'pages:update' },
  '/api/pages/set-default': { method: 'POST', permission: 'pages:update' },
  '/api/pages/clear-default': { method: 'POST', permission: 'pages:update' },
  '/api/page/': { method: 'GET', permission: 'pages:read' }, // Dynamic route
  '/api/page/slugs/': { method: 'GET', permission: 'pages:read' },
  '/api/page/load-builder': { method: 'POST', permission: 'pages:builder' },
  '/api/page/save-builder': { method: 'POST', permission: 'pages:builder' },
  '/api/page/delete-slug/': { method: 'DELETE', permission: 'pages:delete' }, // Dynamic route

  // Blogs APIs
  '/api/blogs': { method: 'GET', permission: 'blogs:read' },
  '/api/blogs/list': { method: 'GET', permission: 'blogs:list' },
  '/api/blogs/published': { method: 'GET', permission: 'blogs:read' },
  '/api/blog/': { method: 'GET', permission: 'blogs:read' }, // Dynamic route
  '/api/blog/save': { method: 'POST', permission: 'blogs:create' },
  '/api/blog/save/': { method: 'POST', permission: 'blogs:update' }, // Dynamic route
  '/api/blog/delete': { method: 'DELETE', permission: 'blogs:delete' },
  '/api/blog/status': { method: 'POST', permission: 'blogs:update' },
  '/api/blog/published/': { method: 'GET', permission: 'blogs:read' }, // Dynamic route
  '/api/blog/previous/': { method: 'GET', permission: 'blogs:read' }, // Dynamic route
  '/api/blog/duplicate': { method: 'POST', permission: 'blogs:create' },

  // Blog Comments
  '/api/blog/comments': { method: 'GET', permission: 'blogs:comments:list' },
  '/api/blog/comments/check': { method: 'GET', permission: 'blogs:comments:read' },
  '/api/blog/comments/save': { method: 'POST', permission: 'blogs:comments:create' },
  '/api/blog/comments/status': { method: 'POST', permission: 'blogs:comments:update' },
  '/api/blog/comments/delete': { method: 'DELETE', permission: 'blogs:comments:delete' },
  '/api/blog/comments/bulk': { method: 'POST', permission: 'blogs:comments:update' },

  // Forum APIs
  '/api/forum': { method: 'GET', permission: 'forum:list' },
  '/api/forum/published': { method: 'GET', permission: 'forum:list' },
  '/api/forum/question': { method: 'GET', permission: 'forum:read' },
  '/api/forum/question/': { method: 'GET', permission: 'forum:read' }, // Dynamic route
  '/api/forum/question/replies': { method: 'GET', permission: 'forum:read' },
  '/api/forum/question/submit': { method: 'POST', permission: 'forum:create' },
  '/api/forum/reply/submit': { method: 'POST', permission: 'forum:replies:create' },
  '/api/forum/question/check': { method: 'GET', permission: 'forum:read' },
  '/api/forum/admin/questions': { method: 'GET', permission: 'forum:questions:list' },
  '/api/forum/admin/replies': { method: 'GET', permission: 'forum:replies:list' },
  '/api/forum/question/status': { method: 'POST', permission: 'forum:questions:update' },
  '/api/forum/reply/status': { method: 'POST', permission: 'forum:replies:update' },
  '/api/forum/question/delete': { method: 'DELETE', permission: 'forum:questions:delete' },
  '/api/forum/reply/delete': { method: 'DELETE', permission: 'forum:replies:delete' },
  '/api/forum/sidebar': { method: 'GET', permission: 'forum:list' },

  // Admin APIs
  '/api/admin/debug': { method: 'GET', permission: null }, // No permission needed
  '/api/admin/whop/settings': { method: 'GET', permission: 'settings:payments' },
  '/api/admin/whop/settings:POST': { method: 'POST', permission: 'settings:payments' },
  '/api/admin/branding': { method: 'GET', permission: 'settings:branding' },
  '/api/admin/branding:POST': { method: 'POST', permission: 'settings:branding' },
  '/api/admin/cobalt': { method: 'GET', permission: 'settings:branding' },
  '/api/admin/cobalt:POST': { method: 'POST', permission: 'settings:branding' },
  '/api/admin/components': { method: 'GET', permission: 'settings:admin' },
  '/api/admin/components:POST': { method: 'POST', permission: 'settings:admin' },
  '/api/admin/upload/encrypted': { method: 'POST', permission: 'settings:admin' },
  '/api/admin/upload/temp': { method: 'POST', permission: 'settings:admin' },
  '/api/admin/r2/get': { method: 'GET', permission: 'settings:admin' },
  '/api/admin/archive-credentials': { method: 'GET', permission: 'settings:admin' },

  // Coupons APIs
  '/api/coupons': { method: 'GET', permission: 'coupons:list' },
  '/api/coupons/active': { method: 'GET', permission: 'coupons:read' },
  '/api/coupons/enabled': { method: 'GET', permission: 'settings:payments' },
  '/api/coupons/enabled:POST': { method: 'POST', permission: 'settings:payments' },
  '/api/coupons/validate': { method: 'GET', permission: 'coupons:validate' },
  '/api/coupons/save': { method: 'POST', permission: 'coupons:create' },
  '/api/coupons/update': { method: 'POST', permission: 'coupons:update' },
  '/api/coupons/delete': { method: 'DELETE', permission: 'coupons:delete' },
  '/api/coupons/status': { method: 'POST', permission: 'coupons:update' },

  // Payment Methods
  '/api/payment/settings': { method: 'GET', permission: 'settings:payments' },
  '/api/payment/settings:POST': { method: 'POST', permission: 'settings:payments' },
  '/api/payment/enabled': { method: 'GET', permission: 'settings:payments' },
  '/api/payment/enabled:POST': { method: 'POST', permission: 'settings:payments' },
  '/api/payment/enabled-methods': { method: 'GET', permission: 'settings:payments' },
  '/api/payment/status': { method: 'GET', permission: 'settings:payments' },

  // Whop APIs
  '/api/whop/checkout': { method: 'POST', permission: null }, // Public
  '/api/whop/checkout/plan': { method: 'POST', permission: null }, // Public
  '/api/whop/webhook': { method: 'POST', permission: null }, // Webhook
  '/api/whop/test': { method: 'GET', permission: 'settings:payments' },
  '/api/whop/test/webhook': { method: 'GET', permission: 'settings:payments' },

  // Admin API Keys
  '/api/admin/api-keys': { method: 'POST', permission: 'settings:api' },
  '/api/admin/api-keys:GET': { method: 'GET', permission: 'settings:api' },
  '/api/admin/api-keys/': { method: 'GET', permission: 'settings:api' },
  '/api/admin/api-keys/:PUT': { method: 'PUT', permission: 'settings:api' },
  '/api/admin/api-keys/:DELETE': { method: 'DELETE', permission: 'settings:api' }
}

export function getAllPublicEndpoints() {
  return [
    { path: '/api/products', method: 'GET', permission: 'products:list' },
    { path: '/api/products/list', method: 'GET', permission: 'products:list' },
    { path: '/api/reviews', method: 'GET', permission: 'reviews:list' },
    { path: '/api/reviews/product/*', method: 'GET', permission: 'reviews:read' },
    { path: '/api/pages', method: 'GET', permission: 'pages:list' },
    { path: '/api/blogs', method: 'GET', permission: 'blogs:read' },
    { path: '/api/blogs/published', method: 'GET', permission: 'blogs:read' },
    { path: '/api/blog/published/*', method: 'GET', permission: 'blogs:read' },
    { path: '/api/blog/previous/*', method: 'GET', permission: 'blogs:read' },
    { path: '/api/blog/comments', method: 'GET', permission: 'blogs:comments:list' },
    { path: '/api/forum/published', method: 'GET', permission: 'forum:list' },
    { path: '/api/forum/question/*', method: 'GET', permission: 'forum:read' },
    { path: '/api/forum/sidebar', method: 'GET', permission: 'forum:list' },
    { path: '/api/coupons/active', method: 'GET', permission: 'coupons:read' },
    { path: '/api/whop/test', method: 'GET', permission: 'settings:payments' },
    { path: '/api/whop/test/webhook', method: 'GET', permission: 'settings:payments' },
    { path: '/api/admin/debug', method: 'GET', permission: null }
  ];
};

/**
 * Find permission for a given endpoint path and HTTP method
 */
export function getRequiredPermission(path, method) {
  // Exact match first
  const key = path + (method !== 'GET' ? ':' + method : '');
  const exactMatch = ENDPOINT_PERMISSIONS[key];
  if (exactMatch) return exactMatch.permission;

  // Fallback to path-only match
  const pathOnlyMatch = ENDPOINT_PERMISSIONS[path];
  if (pathOnlyMatch && pathOnlyMatch.method === method) {
    return pathOnlyMatch.permission;
  }

  return null;
}

/**
 * Check if an endpoint is marked as public read (no auth required)
 */
export function isPublicReadEndpoint(path, method) {
  return method === 'GET' && (
    path.startsWith('/api/products') ||
    path === '/api/reviews' ||
    path.startsWith('/api/reviews/product/') ||
    path === '/api/pages' ||
    path === '/api/blogs' ||
    path === '/api/blogs/published' ||
    path.startsWith('/api/blog/published/') ||
    path.startsWith('/api/blog/previous/') ||
    path === '/api/blog/comments' ||
    path === '/api/forum/published' ||
    path.startsWith('/api/forum/question/') ||
    path === '/api/forum/sidebar' ||
    path === '/api/coupons/active' ||
    path === '/api/whop/test' ||
    path === '/api/whop/test/webhook' ||
    path === '/api/admin/debug'
  );
}

/**
 * List all public endpoints that don't require authentication
 */
;

/**
 * Find permission for a given endpoint path and HTTP method
 */
export function getRequiredPermission(path, method) {
  // Exact match first
  const key = path + (method !== 'GET' ? ':' + method : '');
  const exactMatch = ENDPOINT_PERMISSIONS[key];
  if (exactMatch) return exactMatch.permission;

  // Fallback to path-only match
  const pathOnlyMatch = ENDPOINT_PERMISSIONS[path];
  if (pathOnlyMatch && pathOnlyMatch.method === method) {
    return pathOnlyMatch.permission;
  }

  return null;
}

/**
 * Check if an endpoint is marked as public read (no auth required)
 */
export function isPublicReadEndpoint(path, method) {
  return method === 'GET' && (
    path.startsWith('/api/products') ||
    path === '/api/reviews' ||
    path.startsWith('/api/reviews/product/') ||
    path === '/api/pages' ||
    path === '/api/blogs' ||
    path === '/api/blogs/published' ||
    path.startsWith('/api/blog/published/') ||
    path.startsWith('/api/blog/previous/') ||
    path === '/api/blog/comments' ||
    path === '/api/forum/published' ||
    path.startsWith('/api/forum/question/') ||
    path === '/api/forum/sidebar' ||
    path === '/api/coupons/active' ||
    path === '/api/whop/test' ||
    path === '/api/whop/test/webhook' ||
    path === '/api/admin/debug'
  );
}

/**
 * List all public endpoints that don't require authentication
 */
export function getAllPublicEndpoints() {
  return [
    { path: '/api/products', method: 'GET', permission: 'products:list' },
    { path: '/api/products/list', method: 'GET', permission: 'products:list' },
    { path: '/api/reviews', method: 'GET', permission: 'reviews:list' },
    { path: '/api/reviews/product/*', method: 'GET', permission: 'reviews:read' },
    { path: '/api/pages', method: 'GET', permission: 'pages:list' },
    { path: '/api/blogs', method: 'GET', permission: 'blogs:read' },
    { path: '/api/blogs/published', method: 'GET', permission: 'blogs:read' },
    { path: '/api/blog/published/*', method: 'GET', permission: 'blogs:read' },
    { path: '/api/blog/previous/*', method: 'GET', permission: 'blogs:read' },
    { path: '/api/blog/comments', method: 'GET', permission: 'blogs:comments:list' },
    { path: '/api/forum/published', method: 'GET', permission: 'forum:list' },
    { path: '/api/forum/question/*', method: 'GET', permission: 'forum:read' },
    { path: '/api/forum/sidebar', method: 'GET', permission: 'forum:list' },
    { path: '/api/coupons/active', method: 'GET', permission: 'coupons:read' },
    { path: '/api/whop/test', method: 'GET', permission: 'settings:payments' },
    { path: '/api/whop/test/webhook', method: 'GET', permission: 'settings:payments' },
    { path: '/api/admin/debug', method: 'GET', permission: null }
  ];
}

  '/api/orders': { method: 'GET', permission: 'orders:list' },
  '/api/order/create': { method: 'POST', permission: 'orders:create' },
  '/api/order/manual': { method: 'POST', permission: 'orders:create' },
  '/api/order/buyer': { method: 'GET', permission: 'orders:read' },
  '/api/order/delete': { method: 'DELETE', permission: 'orders:delete' },
  '/api/order/update': { method: 'POST', permission: 'orders:update' },
  '/api/order/deliver': { method: 'POST', permission: 'orders:deliver' },
  '/api/order/revision': { method: 'POST', permission: 'orders:revise' },
  '/api/order/portfolio': { method: 'POST', permission: 'orders:update' },
  '/api/order/archive': { method: 'POST', permission: 'orders:update' },
  '/api/order/tip': { method: 'POST', permission: 'orders:update' },

  // Reviews APIs
  '/api/reviews': { method: 'GET', permission: 'reviews:list' },
  '/api/reviews/product': { method: 'GET', permission: 'reviews:list' },
  '/api/review/add': { method: 'POST', permission: 'reviews:create' },
  '/api/review/update': { method: 'POST', permission: 'reviews:update' },
  '/api/review/delete': { method: 'DELETE', permission: 'reviews:delete' },

  // Payment APIs
  '/api/whop/checkout': { method: 'POST', permission: 'orders:create' },
  '/api/paypal/order': { method: 'POST', permission: 'orders:create' },
  '/api/paypal/order/capture': { method: 'POST', permission: 'orders:create' },
  '/api/payment/methods': { method: 'GET', permission: 'settings:payments' },
  '/api/payment/settings': { method: 'GET', permission: 'settings:payments' },
  '/api/payment/settings': { method: 'POST', permission: 'settings:payments' },
  '/api/payment/enabled': { method: 'GET', permission: 'settings:payments' },
  '/api/payment/enabled': { method: 'POST', permission: 'settings:payments' },

  // Pages APIs
  '/api/pages': { method: 'GET', permission: 'pages:list' },
  '/api/pages/list': { method: 'GET', permission: 'pages:list' },
  '/api/page/': { method: 'GET', permission: 'pages:read' }, // Dynamic route
  '/api/page/save': { method: 'POST', permission: 'pages:create' },
  '/api/page/delete': { method: 'DELETE', permission: 'pages:delete' },
  '/api/pages/save': { method: 'POST', permission: 'pages:create' },
  '/api/pages/delete': { method: 'POST', permission: 'pages:delete' },
  '/api/pages/status': { method: 'POST', permission: 'pages:update' },
  '/api/pages/duplicate': { method: 'POST', permission: 'pages:create' },
  '/api/pages/load': { method: 'GET', permission: 'pages:builder' },
  '/api/pages/default': { method: 'GET', permission: 'pages:read' },
  '/api/pages/set-default': { method: 'POST', permission: 'pages:update' },
  '/api/pages/clear-default': { method: 'POST', permission: 'pages:update' },
  '/api/pages/type': { method: 'POST', permission: 'pages:update' },

  // Blogs APIs
  '/api/blogs': { method: 'GET', permission: 'blogs:list' },
  '/api/blogs/list': { method: 'GET', permission: 'blogs:list' },
  '/api/blogs/published': { method: 'GET', permission: 'blogs:read' },
  '/api/blog/previous/': { method: 'GET', permission: 'blogs:read' }, // Dynamic
  '/api/blog/public/': { method: 'GET', permission: 'blogs:read' }, // Dynamic
  '/api/blog/': { method: 'GET', permission: 'blogs:read' }, // Dynamic
  '/api/blog/save': { method: 'POST', permission: 'blogs:create' },
  '/api/blog/delete': { method: 'DELETE', permission: 'blogs:delete' },
  '/api/blogs/status': { method: 'POST', permission: 'blogs:update' },
  '/api/blogs/duplicate': { method: 'POST', permission: 'blogs:create' },

  // Blog Comments APIs
  '/api/blog/comments/': { method: 'GET', permission: 'blogs:comments:list' }, // Dynamic
  '/api/blog/comments/check-pending': { method: 'POST', permission: 'blogs:comments:read' },
  '/api/blog/comments/add': { method: 'POST', permission: 'blogs:comments:create' },
  '/api/admin/blog-comments': { method: 'GET', permission: 'blogs:comments:list' },
  '/api/admin/blog-comments/status': { method: 'POST', permission: 'blogs:comments:update' },
  '/api/admin/blog-comments/delete': { method: 'DELETE', permission: 'blogs:comments:delete' },
  '/api/admin/blog-comments/bulk': { method: 'POST', permission: 'blogs:comments:update' },

  // Forum APIs
  '/api/forum/questions': { method: 'GET', permission: 'forum:list' },
  '/api/forum/question/': { method: 'GET', permission: 'forum:read' }, // Dynamic
  '/api/forum/question-replies': { method: 'GET', permission: 'forum:read' },
  '/api/forum/question-by-id': { method: 'GET', permission: 'forum:read' },
  '/api/forum/check-pending': { method: 'POST', permission: 'forum:read' },
  '/api/forum/submit-question': { method: 'POST', permission: 'forum:create' },
  '/api/forum/submit-reply': { method: 'POST', permission: 'forum:create' },
  '/api/forum/sidebar': { method: 'GET', permission: 'forum:read' },
  '/api/admin/forum/questions': { method: 'GET', permission: 'forum:questions:list' },
  '/api/admin/forum/migrate': { method: 'POST', permission: 'settings:admin' },
  '/api/admin/forum/replies': { method: 'GET', permission: 'forum:replies:list' },
  '/api/admin/forum/question-status': { method: 'POST', permission: 'forum:questions:update' },
  '/api/admin/forum/reply-status': { method: 'POST', permission: 'forum:replies:update' },
  '/api/admin/forum/question': { method: 'DELETE', permission: 'forum:questions:delete' },
  '/api/admin/forum/reply': { method: 'DELETE', permission: 'forum:replies:delete' },

  // Coupons APIs
  '/api/coupons': { method: 'GET', permission: 'coupons:list' },
  '/api/coupons/active': { method: 'GET', permission: 'coupons:list' },
  '/api/coupons/enabled': { method: 'GET', permission: 'coupons:read' },
  '/api/coupons/enabled': { method: 'POST', permission: 'coupons:update' },
  '/api/coupons/validate': { method: 'POST', permission: 'coupons:validate' },
  '/api/coupons/create': { method: 'POST', permission: 'coupons:create' },
  '/api/coupons/update': { method: 'POST', permission: 'coupons:update' },
  '/api/coupons/delete': { method: 'DELETE', permission: 'coupons:delete' },
  '/api/coupons/status': { method: 'POST', permission: 'coupons:update' },

  // Users APIs
  '/api/admin/users': { method: 'GET', permission: 'users:list' },
  '/api/admin/user-details': { method: 'GET', permission: 'users:read' },

  // Admin APIs
  '/api/admin/export/full': { method: 'GET', permission: 'export:full' },
  '/api/admin/export/products': { method: 'GET', permission: 'export:products' },
  '/api/admin/export/pages': { method: 'GET', permission: 'export:pages' },
  '/api/admin/export/blogs': { method: 'GET', permission: 'export:blogs' },
  '/api/admin/export-data': { method: 'GET', permission: 'export:data' },
  '/api/admin/import/blogs': { method: 'POST', permission: 'import:blogs' },
  '/api/admin/import/products': { method: 'POST', permission: 'import:products' },
  '/api/admin/import/pages': { method: 'POST', permission: 'import:pages' },

  // API Key Management
  '/api/admin/api-keys/permissions': { method: 'GET', permission: 'settings:admin' },
  '/api/admin/api-keys': { method: 'POST', permission: 'settings:admin' },
  '/api/admin/api-keys:GET': { method: 'GET', permission: 'settings:admin' },
  '/api/admin/api-keys/:GET': { method: 'GET', permission: 'settings:admin' }, // Dynamic
  '/api/admin/api-keys/:PUT': { method: 'PUT', permission: 'settings:admin' }, // Dynamic
  '/api/admin/api-keys/:DELETE': { method: 'DELETE', permission: 'settings:admin' }, // Dynamic
  '/api/admin/api-keys/analytics': { method: 'GET', permission: 'settings:admin' },
};

// Helper to check if path matches dynamic route
export function getRequiredPermission(path, method) {
  // Exact match first
  const key = `${path}`;
  if (ENDPOINT_PERMISSIONS[key] && ENDPOINT_PERMISSIONS[key].method === method) {
    return ENDPOINT_PERMISSIONS[key].permission;
  }

  // Check dynamic routes
  for (const [route, config] of Object.entries(ENDPOINT_PERMISSIONS)) {
    if (config.method === method && route.endsWith('/') && path.startsWith(route)) {
      return config.permission;
    }
  }

  return null;
}
