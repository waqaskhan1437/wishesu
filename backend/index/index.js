/**
 * Backend Entry Point
 * Static files served by Cloudflare automatically
 * Worker only handles API routes and SPA redirects
 */
import { AutoRouter } from 'itty-router';
import { api } from '../core/router/api.js';
import { handleBatch } from '../core/utils/batch.js';
import { CORS, handleOptions } from '../core/config/cors/cors.js';
import { initDatabase } from '../core/middleware/db.js';
import { json } from '../core/utils/response/response.js';
import {
  PRODUCT_PAGE_REGEX,
  LEGACY_PRODUCT_PATTERN
} from '../core/constants/routes.js';

const router = AutoRouter();

// 1. Global Middleware: CORS & DB
router.all('*', async (req, env) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.url.includes('/api/')) await initDatabase(req, env);
});

// 2. Batch API
router.post('/api/batch', (req, env, ctx) => handleBatch(req, env, ctx, api));

// 3. Main API Router
router.all('/api/*', (req, env, ctx) => api.fetch(req, env, ctx));

// 4. Debug endpoint
router.get('/debug', async (req, env) => {
  return json({
    status: 'ok',
    mode: 'static-first',
    message: 'Static files served by Cloudflare, Worker handles API only',
    bindings: {
      DB: !!env.DB,
      PRODUCT_MEDIA: !!env.PRODUCT_MEDIA,
      R2_BUCKET: !!env.R2_BUCKET,
      VERSION: env.VERSION
    },
    envKeys: Object.keys(env)
  }, 200, CORS);
});

// 5. Product page redirect - /p/:id/:slug → /product/?id=:id
router.get('/p/:id/:slug', (req) => {
  const id = req.params.id;
  return Response.redirect(`/product/?id=${id}`, 302);
});

// Legacy product patterns
router.get('/product-:id/*', (req) => {
  const url = new URL(req.url);
  const match = url.pathname.match(/product-?(\d+)/);
  if (match) {
    return Response.redirect(`/product/?id=${match[1]}`, 302);
  }
  return Response.redirect('/product/', 302);
});

// 6. Catch-all - return 404 for anything worker receives that's not handled
// Static files won't reach here - Cloudflare serves them first
router.all('*', (req) => {
  const url = new URL(req.url);
  return json({ 
    error: 'Not Found',
    path: url.pathname,
    hint: 'Static files are served by Cloudflare. This route is not handled.'
  }, 404, CORS);
});

export default router;
