/**
 * Worker entry point with modular routing.
 */

import { initDB } from '../config/db.js';
import { VERSION } from '../config/constants.js';
// Updated imports to use new modular structure
import { handleProductRouting } from '../modules/products/backend/controllers/products.controller.js';
import { handleSecureDownload, maybePurgeCache } from '../modules/admin/backend/controllers/index.js';
import { cleanupExpired } from '../modules/whop/backend/controllers/index.js';
import { generateProductSchema, generateCollectionSchema, injectSchemaIntoHTML } from '../shared/utils/backend/schema.js';
import { handleCorsPreflight, applyCors } from './cors.js';
import { requireAdminAuth } from './admin-auth.js';
import { enforceCsrf } from './csrf.js';
import { applyNoStore } from './cache-headers.js';
import {
  handleBlogRoutes,
  handleForumRoutes,
  handleDynamicPage,
  resolveDefaultPagePath,
  getGtmId,
  injectGtm
} from './page-handler.js';
import { handleStaticAsset } from './asset-handler.js';

function normalizePath(pathname) {
  let path = pathname.replace(/\/+/g, '/');
  if (!path.startsWith('/')) path = '/' + path;
  return path;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    let path = normalizePath(url.pathname);
    const method = req.method;

    const shouldPurgeCache = path.startsWith('/admin') || path.startsWith('/api/admin/') || path.startsWith('/api/whop/webhook');
    if (shouldPurgeCache) {
      await maybePurgeCache(env, initDB);
    }

    const preflight = handleCorsPreflight(req);
    if (preflight) return preflight;

    try {
      if (path === '/admin/logout') {
        return new Response('Logged out', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
        });
      }

      const authResponse = await requireAdminAuth(req, env, path, method);
      if (authResponse) return authResponse;

      const csrfResponse = enforceCsrf(req, path, method);
      if (csrfResponse) return csrfResponse;

      const blogResponse = await handleBlogRoutes(req, env, url, path, method);
      if (blogResponse) return blogResponse;

      const forumResponse = await handleForumRoutes(req, env, url, path, method);
      if (forumResponse) return forumResponse;

      const resolved = await resolveDefaultPagePath(env, url, path, method);
      path = resolved.path;
      url.pathname = resolved.url.pathname;

      if ((method === 'GET' || method === 'HEAD') && (path === '/_product_template.tpl' || path === '/_product_template' || path === '/_product_template.html')) {
        return new Response('Not found', { status: 404 });
      }

      if ((method === 'GET' || method === 'HEAD') && (path === '/product' || path.startsWith('/product/'))) {
        if (env.DB) {
          await initDB(env);
          const redirect = await handleProductRouting(env, url, path);
          if (redirect) return redirect;
        }
      }

      if (path.startsWith('/api/') || path === '/submit-order') {
        // API routing will be handled by individual module APIs
        // For now, returning 404 - implement module-based API routing
        return new Response('API endpoint - implement module routing', { status: 501 });
      }

      if (path.startsWith('/download/')) {
        const orderId = path.split('/').pop();
        return handleSecureDownload(env, orderId, url.origin);
      }

      if (path.startsWith('/admin') && !path.startsWith('/api/')) {
        const isStandalone =
          path.includes('/product-form') ||
          path.includes('/page-builder') ||
          path.includes('/landing-builder');

        if (!isStandalone && env.ASSETS) {
          const assetResp = await env.ASSETS.fetch(new Request(new URL('/admin/dashboard.html', req.url)));
          const headers = applyNoStore(assetResp.headers);
          headers.set('X-Worker-Version', VERSION);
          return new Response(assetResp.body, { status: assetResp.status, headers });
        }
      }

      const dynamicPage = await handleDynamicPage(req, env, url, path, method);
      if (dynamicPage) return dynamicPage;

      const assetResponse = await handleStaticAsset(req, env, ctx, {
        path,
        method,
        url,
        initDB,
        version: VERSION,
        getGtmId,
        injectGtm,
        schema: {
          generateProductSchema,
          generateCollectionSchema,
          injectSchemaIntoHTML
        }
      });
      if (assetResponse) return assetResponse;

      return new Response('Not found', { status: 404 });
    } catch (e) {
      console.error('Worker error:', e);
      const headers = applyCors(new Headers({ 'Content-Type': 'application/json' }));
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers
      });
    }
  },

  async scheduled(event, env, ctx) {
    try {
      if (env.DB) {
        await initDB(env);
        const result = await cleanupExpired(env);
        const data = await result.json();
      }
    } catch (e) {
      console.error('Cron job error:', e);
    }
  }
};
