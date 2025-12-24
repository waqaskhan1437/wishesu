/**
 * API router with modular route handlers.
 */

import { json } from '../utils/response.js';
import { initDB } from '../config/db.js';
import { routeAdmin, routeAdminNoDb } from './admin.api.js';
import { routeBlog } from './blog.api.js';
import { routeChat } from './chat.api.js';
import { routeForum } from './forum.api.js';
import { routeOrders } from './orders.api.js';
import { routeProducts } from './products.api.js';
import { routeReviews } from './reviews.api.js';
import { routeWhop, routeWhopNoDb } from './whop.api.js';

export async function routeApiRequest(req, env, url, path, method) {
  if (path === '/api/health') {
    return json({ ok: true, time: Date.now() });
  }

  if (path === '/api/time') {
    return json({ serverTime: Date.now() });
  }

  const whopNoDb = routeWhopNoDb(path, method);
  if (whopNoDb) return whopNoDb;

  const adminNoDb = await routeAdminNoDb(req, env, url, path, method);
  if (adminNoDb) return adminNoDb;

  if (!path.startsWith('/api/') && path !== '/submit-order') {
    return null;
  }

  if (!env.DB) {
    return json({ error: 'Database not configured' }, 500);
  }

  await initDB(env);

  const routes = [
    routeChat,
    routeAdmin,
    routeBlog,
    routeForum,
    routeProducts,
    routeWhop,
    routeOrders,
    routeReviews
  ];

  for (const route of routes) {
    const resp = await route(req, env, url, path, method);
    if (resp) return resp;
  }

  return json({ error: 'API endpoint not found', path, method }, 404);
}
