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

// Helper to fetch assets - tries ASSETS binding first, then falls back to fetch
async function fetchAsset(env, url, request) {
  // Method 1: Try ASSETS binding
  if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    try {
      const req = new Request(url.toString(), { method: 'GET', headers: request?.headers });
      return await env.ASSETS.fetch(req);
    } catch (e) {
      console.error('ASSETS.fetch failed:', e.message);
    }
  }
  
  // Method 2: Fallback - return null to indicate asset fetching not available
  return null;
}

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
  
  for (const file of testFiles) {
    const testUrl = new URL(file, url.origin);
    const resp = await fetchAsset(env, testUrl, req);
    if (resp) {
      results[file] = { status: resp.status, type: resp.headers.get('content-type') };
    } else {
      results[file] = { error: 'fetchAsset returned null' };
    }
  }
  
  return json({
    bindings: {
      ASSETS: !!env.ASSETS,
      ASSETS_TYPE: env.ASSETS ? typeof env.ASSETS : 'undefined',
      ASSETS_HAS_FETCH: env.ASSETS ? typeof env.ASSETS.fetch : 'N/A',
      DB: !!env.DB,
      PRODUCT_MEDIA: !!env.PRODUCT_MEDIA,
      R2_BUCKET: !!env.R2_BUCKET,
      VERSION: env.VERSION
    },
    fileTests: results,
    envKeys: Object.keys(env),
    recommendation: !env.ASSETS ? 
      'ASSETS binding missing. Run: npm install wrangler@latest && npx wrangler deploy' : 
      'ASSETS binding exists'
  }, 200, CORS);
});

// 5. Static Assets & SPA Fallback
router.all('*', async (req, env) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Try serving static asset directly first
  const assetResponse = await fetchAsset(env, url, req);
  if (assetResponse && assetResponse.status !== 404) {
    return assetResponse;
  }

  // If it's a file request and not found, return 404
  if (hasFileExtension(path)) {
    return json({ 
      error: 'File Not Found', 
      path,
      assetsAvailable: !!env.ASSETS,
      hint: !env.ASSETS ? 'ASSETS binding not configured - update wrangler and redeploy' : 'File does not exist'
    }, 404, CORS);
  }

  // Admin routes & root - serve admin SPA
  if (path === '/' || path === '/admin' || path === '/admin/' || path.startsWith('/admin/')) {
    const adminUrl = new URL(SPA_FILES.admin, url.origin);
    const adminResp = await fetchAsset(env, adminUrl, req);
    if (adminResp) return adminResp;
    
    // If no ASSETS, return helpful error
    return json({ 
      error: 'Cannot serve admin page',
      reason: 'ASSETS binding not available',
      fix: 'Update wrangler: npm install wrangler@latest && npx wrangler deploy',
      checkEnv: Object.keys(env)
    }, 500, CORS);
  }

  // Product Page URLs
  const pMatch = path.match(PRODUCT_PAGE_REGEX) || path.match(LEGACY_PRODUCT_PATTERN);
  if (pMatch || path === '/product' || path === '/product/') {
    const productUrl = new URL(SPA_FILES.product, url.origin);
    if (pMatch) productUrl.searchParams.set('id', pMatch[1]);
    const productResp = await fetchAsset(env, productUrl, req);
    if (productResp) return productResp;
    
    return json({ 
      error: 'Cannot serve product page',
      reason: 'ASSETS binding not available'
    }, 500, CORS);
  }

  return json({ error: 'Not Found', path }, 404, CORS);
});

export default router;
