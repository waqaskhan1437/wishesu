/**
 * Backend Entry Point
 * Handles API + redirects. Static files served by Cloudflare.
 */
import { AutoRouter } from 'itty-router';
import { api } from '../core/router/api.js';
import { handleBatch } from '../core/utils/batch.js';
import { CORS, handleOptions } from '../core/config/cors/cors.js';
import { initDatabase } from '../core/middleware/db.js';
import { json } from '../core/utils/response/response.js';

const router = AutoRouter();

// 1. CORS preflight
router.options('*', (req) => handleOptions(req));

// 2. Batch API
router.post('/api/batch', async (req, env, ctx) => {
  await initDatabase(req, env);
  return handleBatch(req, env, ctx, api);
});

// 3. API routes
router.all('/api/*', async (req, env, ctx) => {
  await initDatabase(req, env);
  return api.fetch(req, env, ctx);
});

// 4. Debug
router.get('/debug', (req, env) => json({ ok: true, DB: !!env.DB }, 200, CORS));

// 5. Pretty URL redirects - redirect to explicit .html files
router.get('/p/:id/:slug', (req) => {
  return Response.redirect(`/product/index.html?id=${req.params.id}`, 302);
});

router.get('/buyer-order', (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';
  return Response.redirect(`/order/buyer-order.html?id=${encodeURIComponent(id)}`, 302);
});

router.get('/product-:id/*', (req) => {
  const match = new URL(req.url).pathname.match(/product-?(\d+)/);
  if (match) return Response.redirect(`/product/index.html?id=${match[1]}`, 302);
  return Response.redirect('/product/index.html', 302);
});

// 6. Directory to index.html redirects (fixes wrangler dev issues)
router.get('/product', (req) => {
  const url = new URL(req.url);
  return Response.redirect(`/product/index.html${url.search}`, 302);
});

router.get('/product/', (req) => {
  const url = new URL(req.url);
  return Response.redirect(`/product/index.html${url.search}`, 302);
});

router.get('/order/', (req) => {
  const url = new URL(req.url);
  return Response.redirect(`/order/buyer-order.html${url.search}`, 302);
});

router.get('/admin', (req) => Response.redirect('/admin/index.html', 302));
router.get('/admin/', (req) => Response.redirect('/admin/index.html', 302));

// 7. Root redirect
router.get('/', () => Response.redirect('/index.html', 302));

// 8. Catch-all - 404 for unhandled routes
router.all('*', () => json({ error: 'Not Found' }, 404, CORS));

export default router;
