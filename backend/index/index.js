/**
 * Worker Entry Point
 * Cloudflare serves static files from ./frontend automatically
 * Worker only handles /api/* routes and redirects
 */

import { api } from '../core/router/api.js';
import { handleBatch } from '../core/utils/batch.js';
import { CORS, handleOptions } from '../core/config/cors/cors.js';
import { initDatabase } from '../core/middleware/db.js';
import { json } from '../core/utils/response/response.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // API batch endpoint
    if (path === '/api/batch' && request.method === 'POST') {
      await initDatabase(request, env);
      return handleBatch(request, env, ctx, api);
    }

    // All API routes
    if (path.startsWith('/api/')) {
      await initDatabase(request, env);
      return api.fetch(request, env, ctx);
    }

    // Debug endpoint
    if (path === '/debug') {
      return json({ ok: true, DB: !!env.DB, path }, 200, CORS);
    }

    // Pretty URL: /p/:id/:slug -> redirect to /product/?id=:id
    if (path.startsWith('/p/')) {
      const parts = path.split('/');
      const id = parts[2];
      if (id) {
        return Response.redirect(url.origin + '/product/?id=' + id, 302);
      }
    }

    // /buyer-order?id=X -> redirect to /order/buyer-order.html?id=X
    if (path === '/buyer-order') {
      const id = url.searchParams.get('id') || '';
      return Response.redirect(url.origin + '/order/buyer-order.html?id=' + encodeURIComponent(id), 302);
    }

    // Legacy: /product-123/anything -> redirect to /product/?id=123
    if (path.match(/^\/product-\d+/)) {
      const match = path.match(/product-(\d+)/);
      if (match) {
        return Response.redirect(url.origin + '/product/?id=' + match[1], 302);
      }
    }

    // If we reach here, it means Cloudflare couldn't find a static file
    // This should only happen for truly non-existent paths
    return json({ error: 'Not Found', path }, 404, CORS);
  }
};
