// Components Routes
// Site components (header/footer) API endpoints

export const COMPONENTS_ROUTES = [
  // Admin endpoints (protected)
  { method: 'GET', path: '/api/admin/settings/components', adminRequired: true },
  { method: 'POST', path: '/api/admin/settings/components', adminRequired: true },
  
  // Public endpoints (read-only)
  { method: 'GET', path: '/api/settings/components', public: true },
  { method: 'POST', path: '/api/settings/components', adminRequired: true }
];

/**
 * Check if a route is components related
 */
export function isComponentsRoute(path) {
  return path.startsWith('/api/settings/components') ||
         path.startsWith('/api/admin/settings/components');
}

/**
 * Get components route config
 */
export function getComponentsRouteConfig(method, path) {
  return COMPONENTS_ROUTES.find(r => {
    if (r.method !== method) return false;
    if (r.path.endsWith('/')) {
      return path.startsWith(r.path);
    }
    return path === r.path;
  });
}