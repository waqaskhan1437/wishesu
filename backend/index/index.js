/**
 * Backend Entry Point
 * Handles CORS, DB Init, and Routing
 */
import { AutoRouter } from 'itty-router';
import { api } from '../core/router/api.js';
import { handleBatch } from '../core/utils/batch.js';
import { CORS, handleOptions } from '../core/config/cors/cors.js';
import { initDatabase } from '../core/middleware/db.js';
import { json } from '../core/utils/response/response.js';
import {
  PRODUCT_PAGE_REGEX,
  LEGACY_PRODUCT_PATTERN,
  ADMIN_ROUTES,
  SPA_FILES
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

// 4. Static Assets & SPA Fallback
router.all('*', async (req, env) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Serve Asset if exists
  if (env.ASSETS) {
    try {
      const asset = await env.ASSETS.fetch(req);
      if (asset.status !== 404) return asset;
    } catch (e) { /* ignore */ }
  }

  // Admin SPA Fallback
  if (ADMIN_ROUTES.some(r => path.startsWith(r)) || path === '/') {
    return env.ASSETS.fetch(new Request(new URL(SPA_FILES.admin, req.url), req));
  }

  // Product Page Rewrite
  const pMatch = path.match(PRODUCT_PAGE_REGEX) || path.match(LEGACY_PRODUCT_PATTERN);
  if (pMatch || path === '/product') {
    const spaUrl = new URL(SPA_FILES.product, req.url);
    if (pMatch) spaUrl.searchParams.set('id', pMatch[1]);
    return env.ASSETS.fetch(new Request(spaUrl, req));
  }

  return json({ error: 'Not Found' }, 404, CORS);
});

export default router;
