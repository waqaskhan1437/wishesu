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

  // Try serving static asset directly first
  if (env.ASSETS) {
    try {
      const assetResponse = await env.ASSETS.fetch(req);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    } catch (e) {
      console.error('Asset error:', e.message);
    }
  }

  // Product Page URLs: /p/:id/:slug or legacy patterns
  const pMatch = path.match(PRODUCT_PAGE_REGEX) || path.match(LEGACY_PRODUCT_PATTERN);
  if (pMatch || path === '/product' || path === '/product/') {
    if (env.ASSETS) {
      const productUrl = new URL(SPA_FILES.product, url.origin);
      const productReq = new Request(productUrl.toString(), { method: 'GET' });
      return env.ASSETS.fetch(productReq);
    }
  }

  // Admin routes & root - serve admin SPA
  if (path === '/' || path === '/admin' || path === '/admin/') {
    if (env.ASSETS) {
      const adminUrl = new URL(SPA_FILES.admin, url.origin);
      const adminReq = new Request(adminUrl.toString(), { method: 'GET' });
      return env.ASSETS.fetch(adminReq);
    }
  }

  return json({ error: 'Not Found', path }, 404, CORS);
});

export default router;
