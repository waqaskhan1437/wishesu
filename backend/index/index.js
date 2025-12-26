/**
 * Backend Entry Point
 * Handles API routes first, then serves static files via ASSETS binding
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

// 2. API routes - init DB first
router.all('/api/*', async (req, env, ctx) => {
  await initDatabase(req, env);
  return api.fetch(req, env, ctx);
});

// 3. Batch API
router.post('/api/batch', async (req, env, ctx) => {
  await initDatabase(req, env);
  return handleBatch(req, env, ctx, api);
});

// 4. Debug endpoint
router.get('/debug', async (req, env) => {
  return json({
    status: 'ok',
    bindings: { DB: !!env.DB, ASSETS: !!env.ASSETS }
  }, 200, CORS);
});

// 5. Redirects
router.get('/p/:id/:slug', (req) => {
  return Response.redirect(`/product/?id=${req.params.id}`, 302);
});

router.get('/buyer-order', (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';
  return Response.redirect(`/order/buyer-order.html?id=${encodeURIComponent(id)}`, 302);
});

router.get('/product-:id/*', (req) => {
  const match = new URL(req.url).pathname.match(/product-?(\d+)/);
  if (match) return Response.redirect(`/product/?id=${match[1]}`, 302);
  return Response.redirect('/product/', 302);
});

// 6. Static file handler - serves ALL non-API requests from ASSETS
async function serveStatic(req, env) {
  if (!env.ASSETS) {
    return json({ error: 'ASSETS not configured' }, 500, CORS);
  }
  
  const url = new URL(req.url);
  let pathname = url.pathname;
  
  // Handle directory paths - serve index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  } else if (pathname.endsWith('/')) {
    pathname = pathname + 'index.html';
  } else if (!pathname.includes('.')) {
    // No extension - try as directory with index.html
    pathname = pathname + '/index.html';
  }
  
  // Build new request with resolved path
  const assetUrl = new URL(pathname, url.origin);
  assetUrl.search = url.search; // Preserve query params
  
  try {
    const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), req));
    
    // If 404, try original path (might be a file without extension)
    if (response.status === 404 && pathname !== url.pathname) {
      const originalUrl = new URL(url.pathname, url.origin);
      originalUrl.search = url.search;
      return env.ASSETS.fetch(new Request(originalUrl.toString(), req));
    }
    
    return response;
  } catch (e) {
    return json({ error: 'Asset fetch failed', message: e.message }, 500, CORS);
  }
}

// 7. Catch-all - serve static files
router.all('*', serveStatic);

export default router;
