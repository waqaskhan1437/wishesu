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
  SPA_FILES
} from '../core/constants/routes.js';

const router = AutoRouter();

// Check if path has a static file extension
const hasFileExtension = (path) => {
  const ext = path.split('/').pop()?.split('.').pop()?.toLowerCase();
  return ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'map', 'json', 'webp', 'mp4', 'webm'].includes(ext);
};

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

  // Try to serve static asset first
  if (env.ASSETS) {
    try {
      const asset = await env.ASSETS.fetch(req);
      if (asset.status !== 404) return asset;
    } catch (e) { /* ignore */ }
  }

  // If it's a file with extension and not found, return 404
  // Don't serve SPA HTML for .js, .css, etc files
  if (hasFileExtension(path)) {
    return json({ error: 'File Not Found', path }, 404, CORS);
  }

  // Admin SPA Fallback (for routes without file extension)
  if (path === '/' || path === '/admin' || path === '/admin/' || path.startsWith('/admin/')) {
    return env.ASSETS.fetch(new Request(new URL(SPA_FILES.admin, req.url), req));
  }

  // Product Page Rewrite
  const pMatch = path.match(PRODUCT_PAGE_REGEX) || path.match(LEGACY_PRODUCT_PATTERN);
  if (pMatch || path === '/product' || path === '/product/') {
    const spaUrl = new URL(SPA_FILES.product, req.url);
    if (pMatch) spaUrl.searchParams.set('id', pMatch[1]);
    return env.ASSETS.fetch(new Request(spaUrl, req));
  }

  return json({ error: 'Not Found' }, 404, CORS);
});

export default router;
