// Routes Loader
// Combines all route modules and provides unified interface

import { PAGE_BUILDER_ROUTES, isPageBuilderRoute, getPageBuilderRouteConfig } from './page-builder.js';
import { COMPONENTS_ROUTES, isComponentsRoute, getComponentsRouteConfig } from './components.js';

/**
 * All route configs combined
 */
export const ALL_ROUTES = [...PAGE_BUILDER_ROUTES, ...COMPONENTS_ROUTES];

/**
 * Check if a route requires admin auth
 */
export function requiresAdminAuth(method, path) {
  // Check page builder routes
  if (isPageBuilderRoute(path)) {
    const config = getPageBuilderRouteConfig(method, path);
    return config ? config.adminRequired : false;
  }
  
  // Check components routes
  if (isComponentsRoute(path)) {
    const config = getComponentsRouteConfig(method, path);
    return config ? config.adminRequired : false;
  }
  
  return false;
}

/**
 * Check if a route is public (no auth required)
 */
export function isPublicRoute(method, path) {
  // Check page builder routes
  if (isPageBuilderRoute(path)) {
    const config = getPageBuilderRouteConfig(method, path);
    return config ? config.public : false;
  }
  
  // Check components routes
  if (isComponentsRoute(path)) {
    const config = getComponentsRouteConfig(method, path);
    return config ? config.public : false;
  }
  
  return false;
}

/**
 * Get all routes as array for API paths list
 */
export function getAllApiPaths() {
  return ALL_ROUTES.map(r => r.method + ' ' + r.path);
}

/**
 * Log all routes (for debugging)
 */
export function logAllRoutes() {
  console.log('=== Page Builder Routes ===');
  PAGE_BUILDER_ROUTES.forEach(r => {
    console.log(`${r.method} ${r.path} -> admin: ${r.adminRequired}, public: ${r.public}`);
  });
  
  console.log('\n=== Components Routes ===');
  COMPONENTS_ROUTES.forEach(r => {
    console.log(`${r.method} ${r.path} -> admin: ${r.adminRequired}, public: ${r.public}`);
  });
}

// Export individual modules too
export { 
  PAGE_BUILDER_ROUTES, 
  isPageBuilderRoute, 
  getPageBuilderRouteConfig 
} from './page-builder.js';

export { 
  COMPONENTS_ROUTES, 
  isComponentsRoute, 
  getComponentsRouteConfig 
} from './components.js';