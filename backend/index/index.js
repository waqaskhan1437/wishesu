/**
 * Backend Entry Point
 * Simple setup - API routes only, static files auto-served by Cloudflare
 */
import { AutoRouter } from 'itty-router';
import { api } from '../core/router/api.js';
import { handleBatch } from '../core/utils/batch.js';
import { CORS, handleOptions } from '../core/config/cors/cors.js';
import { initDatabase } from '../core/middleware/db.js';
import { json } from '../core/utils/response/response.js';

const router = AutoRouter();

// CORS preflight
router.options('*', (req) => handleOptions(req));

// Batch API
router.post('/api/batch', async (req, env, ctx) => {
  await initDatabase(req, env);
  return handleBatch(req, env, ctx, api);
});

// API routes
router.all('/api/*', async (req, env, ctx) => {
  await initDatabase(req, env);
  return api.fetch(req, env, ctx);
});

// Debug
router.get('/debug', (req, env) => json({ ok: true, DB: !!env.DB }, 200, CORS));

// Redirects with safe URL parsing
router.get('/p/:id/:slug', (req) => {
  try {
    return Response.redirect(`/product/?id=${req.params.id}`, 302);
  } catch (e) {
    return json({ error: e.message }, 500, CORS);
  }
});

router.get('/buyer-order', (req) => {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id') || '';
    return Response.redirect(`/order/buyer-order.html?id=${encodeURIComponent(id)}`, 302);
  } catch (e) {
    return json({ error: e.message }, 500, CORS);
  }
});

router.get('/product-:id/*', (req) => {
  try {
    const match = new URL(req.url).pathname.match(/product-?(\d+)/);
    if (match) return Response.redirect(`/product/?id=${match[1]}`, 302);
    return Response.redirect('/product/', 302);
  } catch (e) {
    return json({ error: e.message }, 500, CORS);
  }
});

// Export with spread - fixes wrangler dev bug
export default { ...router };
