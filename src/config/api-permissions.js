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
  '/api/admin/seo/settings': { method: 'POST', permission: 'settings:seo' },
  '/api/admin/seo/pages': { method: 'GET', permission: 'settings:seo' },
  '/api/admin/seo/pages': { method: 'POST', permission: 'settings:seo' },
  '/api/admin/seo/pages': { method: 'DELETE', permission: 'settings:seo' },
  '/api/admin/seo/products': { method: 'GET', permission: 'settings:seo' },
  '/api/admin/seo/products': { method: 'POST', permission: 'settings:seo' },

  // Automation APIs
  '/api/admin/automation/settings': { method: 'GET', permission: 'settings:automation' },
  '/api/admin/automation/settings': { method: 'POST', permission: 'settings:automation' },
  '/api/admin/automation/logs': { method: 'GET', permission: 'settings:automation' },
  '/api/admin/automation/logs': { method: 'DELETE', permission: 'settings:automation' },
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
  '/api/admin/api-keys': { method: 'GET', permission: 'settings:admin' },
  '/api/admin/api-keys/': { method: 'GET', permission: 'settings:admin' }, // Dynamic
  '/api/admin/api-keys/': { method: 'PUT', permission: 'settings:admin' }, // Dynamic
  '/api/admin/api-keys/': { method: 'DELETE', permission: 'settings:admin' }, // Dynamic
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
