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

// Check if path has static file extension
const hasFileExtension = (path) => {
  const ext = path.split('/').pop()?.split('.').pop()?.toLowerCase();
  return ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'map', 'json', 'webp', 'mp4', 'webm', 'html'].includes(ext);
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

// 4. Debug endpoint
router.get('/debug', async (req, env) => {
  const url = new URL(req.url);
  const testFiles = ['/admin/admin.html', '/admin/admin.js', '/core/theme/theme.css'];
  const results = {};
  
  if (env.ASSETS) {
    for (const file of testFiles) {
      try {
        const testReq = new Request(new URL(file, url.origin).toString(), { method: 'GET' });
        const resp = await env.ASSETS.fetch(testReq);
        results[file] = { status: resp.status, type: resp.headers.get('content-type') };
      } catch (e) {
        results[file] = { error: e.message };
      }
    }
  }
  
  return json({
    bindings: {
      ASSETS: !!env.ASSETS,
      ASSETS_TYPE: env.ASSETS ? typeof env.ASSETS : 'undefined',
      DB: !!env.DB,
      PRODUCT_MEDIA: !!env.PRODUCT_MEDIA,
      R2_BUCKET: !!env.R2_BUCKET,
      VERSION: env.VERSION
    },
    fileTests: results,
    fix: !env.ASSETS ? 'ASSETS binding missing! Check wrangler.toml has [assets] section with binding="ASSETS" and run_worker_first=true' : null
  }, 200, CORS);
});

// 5. Static Assets & SPA Fallback
router.all('*', async (req, env) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // CRITICAL: Check if ASSETS binding exists
  if (!env.ASSETS) {
    return json({ 
      error: 'ASSETS binding not configured',
      fix: 'Add to wrangler.toml: [assets] directory="./frontend" binding="ASSETS" run_worker_first=true',
      path 
    }, 500, CORS);
  }

  // Try serving static asset directly first
  try {
    const assetResponse = await env.ASSETS.fetch(req);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  } catch (e) {
    console.error('Asset fetch error:', e.message);
  }

  // If it's a file request and not found, return 404
  if (hasFileExtension(path)) {
    return json({ error: 'File Not Found', path }, 404, CORS);
  }

  // Admin routes & root - serve admin SPA
  if (path === '/' || path === '/admin' || path === '/admin/' || path.startsWith('/admin/')) {
    try {
      const adminUrl = new URL(SPA_FILES.admin, url.origin);
      return await env.ASSETS.fetch(new Request(adminUrl.toString(), { method: 'GET' }));
    } catch (e) {
      return json({ error: 'Failed to serve admin', detail: e.message }, 500, CORS);
    }
  }

  // Product Page URLs
  const pMatch = path.match(PRODUCT_PAGE_REGEX) || path.match(LEGACY_PRODUCT_PATTERN);
  if (pMatch || path === '/product' || path === '/product/') {
    try {
      const productUrl = new URL(SPA_FILES.product, url.origin);
      if (pMatch) productUrl.searchParams.set('id', pMatch[1]);
      return await env.ASSETS.fetch(new Request(productUrl.toString(), { method: 'GET' }));
    } catch (e) {
      return json({ error: 'Failed to serve product page', detail: e.message }, 500, CORS);
    }
  }

  return json({ error: 'Not Found', path }, 404, CORS);
});

export default router;
