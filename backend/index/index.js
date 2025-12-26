/**
 * Worker Entry Point
 * run_worker_first = true means ALL requests come here first
 * We handle API routes and forward static files to ASSETS binding
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
      return json({ ok: true, DB: !!env.DB, ASSETS: !!env.ASSETS }, 200, CORS);
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

    // Serve static files via ASSETS binding
    if (env.ASSETS) {
      // Handle directory paths: /product/ or /product -> /product/index.html
      let assetPath = path;
      
      if (assetPath === '/' || assetPath === '') {
        assetPath = '/index.html';
      } else if (assetPath.endsWith('/')) {
        assetPath = assetPath + 'index.html';
      } else if (!assetPath.includes('.')) {
        // No extension - try as directory/index.html first
        assetPath = assetPath + '/index.html';
      }

      try {
        // Try to fetch the asset
        const assetUrl = new URL(assetPath, url.origin);
        const assetResponse = await env.ASSETS.fetch(assetUrl.toString());
        
        if (assetResponse.status === 200) {
          return assetResponse;
        }
        
        // If directory/index.html failed, try original path
        if (assetPath !== path) {
          const originalResponse = await env.ASSETS.fetch(new URL(path, url.origin).toString());
          if (originalResponse.status === 200) {
            return originalResponse;
          }
        }
        
        // Return 404 page if available
        const notFoundResponse = await env.ASSETS.fetch(new URL('/404.html', url.origin).toString());
        if (notFoundResponse.status === 200) {
          return new Response(notFoundResponse.body, {
            status: 404,
            headers: notFoundResponse.headers
          });
        }
      } catch (e) {
        // Asset fetch failed
        console.error('Asset fetch error:', e.message);
      }
    }

    // Fallback: 404
    return json({ error: 'Not Found', path }, 404, CORS);
  }
};
