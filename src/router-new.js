/**
 * Simplified Router - Modular Route Registration
 * Replaces monolithic router.js (726 lines → ~200 lines)
 * Routes organized by feature modules
 */

import { json } from './utils/response.js';
import { initDB } from './config/db.js';

// Import route modules
import { registerProductRoutes } from './routes/products.routes.js';
import { registerOrderRoutes } from './routes/orders.routes.js';
import { registerReviewRoutes } from './routes/reviews.routes.js';
import { registerChatRoutes } from './routes/chat.routes.js';
import { registerWhopRoutes } from './routes/whop.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';

/**
 * Simple Router Class
 * Manages route registration and matching
 */
class Router {
  constructor() {
    this.routes = {
      GET: new Map(),
      POST: new Map(),
      PUT: new Map(),
      DELETE: new Map(),
      PATCH: new Map()
    };
  }

  /**
   * Register GET route
   */
  get(path, handler) {
    this.routes.GET.set(path, handler);
  }

  /**
   * Register POST route
   */
  post(path, handler) {
    this.routes.POST.set(path, handler);
  }

  /**
   * Register PUT route
   */
  put(path, handler) {
    this.routes.PUT.set(path, handler);
  }

  /**
   * Register DELETE route
   */
  delete(path, handler) {
    this.routes.DELETE.set(path, handler);
  }

  /**
   * Register PATCH route
   */
  patch(path, handler) {
    this.routes.PATCH.set(path, handler);
  }

  /**
   * Match route and execute handler
   */
  async match(method, path, req, env, url) {
    const methodRoutes = this.routes[method];
    if (!methodRoutes) {
      return null;
    }

    const handler = methodRoutes.get(path);
    if (handler) {
      return await handler(req, env, url);
    }

    return null;
  }
}

/**
 * Route API requests to appropriate handlers
 * @param {Request} req - Request object
 * @param {Object} env - Environment bindings
 * @param {URL} url - Parsed URL
 * @param {string} path - URL path
 * @param {string} method - HTTP method
 * @returns {Promise<Response|null>}
 */
export async function routeApiRequest(req, env, url, path, method) {
  // ----- HEALTH & DEBUG ROUTES (no DB required) -----
  if (path === '/api/health') {
    return json({ ok: true, time: Date.now() });
  }

  if (path === '/api/time') {
    return json({ serverTime: Date.now() });
  }

  // ----- CHECK IF API ROUTE -----
  if (!path.startsWith('/api/')) {
    return null;
  }

  // ----- INITIALIZE DATABASE -----
  // All API routes (except health checks) require DB
  if (!env.DB) {
    return json({ error: 'Database not configured' }, 500);
  }

  await initDB(env);

  // ----- CREATE ROUTER INSTANCE -----
  const router = new Router();

  // ----- REGISTER ALL ROUTE MODULES -----
  registerProductRoutes(router);
  registerOrderRoutes(router);
  registerReviewRoutes(router);
  registerChatRoutes(router);
  registerWhopRoutes(router);
  registerAdminRoutes(router);

  // TODO: Register remaining route modules
  // registerPagesRoutes(router);
  // registerBlogRoutes(router);
  // registerForumRoutes(router);
  // registerWebhookRoutes(router);

  // ----- MATCH AND EXECUTE ROUTE -----
  const response = await router.match(method, path, req, env, url);

  if (response) {
    return response;
  }

  // ----- ROUTE NOT FOUND -----
  return json({ error: 'Route not found', path, method }, 404);
}

export default routeApiRequest;
