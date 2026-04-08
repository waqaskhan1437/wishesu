// Page Builder Routes
// All page builder API endpoints with admin security

export const PAGE_BUILDER_ROUTES = [
  // List all pages (admin only)
  { method: 'GET', path: '/api/pages', adminRequired: true },
  { method: 'GET', path: '/api/pages/list', adminRequired: true },
  
  // Get single page (public - for serving pages)
  { method: 'GET', path: '/api/page/', public: true },
  
  // Load page for editing (admin only)
  { method: 'GET', path: '/api/pages/load', adminRequired: true },
  
  // Save page (admin only)
  { method: 'POST', path: '/api/page/save', adminRequired: true },
  { method: 'POST', path: '/api/pages/save', adminRequired: true },
  
  // Delete page (admin only)
  { method: 'DELETE', path: '/api/page/delete', adminRequired: true },
  { method: 'POST', path: '/api/pages/delete', adminRequired: true },
  { method: 'POST', path: '/api/admin/pages/delete-all', adminRequired: true },
  
  // Page operations (admin only)
  { method: 'POST', path: '/api/pages/status', adminRequired: true },
  { method: 'POST', path: '/api/pages/duplicate', adminRequired: true },
  { method: 'POST', path: '/api/pages/set-default', adminRequired: true },
  { method: 'POST', path: '/api/pages/clear-default', adminRequired: true },
  { method: 'POST', path: '/api/pages/type', adminRequired: true },
  
  // Get default page by type (public - for serving)
  { method: 'GET', path: '/api/pages/default', public: true }
];

/**
 * Check if a route is page builder related
 */
export function isPageBuilderRoute(path) {
  return path.startsWith('/api/pages') || 
         path.startsWith('/api/page/');
}

/**
 * Get page builder route config
 */
export function getPageBuilderRouteConfig(method, path) {
  return PAGE_BUILDER_ROUTES.find(r => {
    if (r.method !== method) return false;
    if (r.path.endsWith('/')) {
      return path.startsWith(r.path);
    }
    return path === r.path;
  });
}