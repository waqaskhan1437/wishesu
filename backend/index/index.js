/**
 * Backend Entry Point
 * Handles CORS, DB Init, and Routing
 * 
 * 🔍 DEBUG: Import debug system (remove this line to disable)
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

// 🔍 DEBUG SYSTEM - Remove these imports to disable debugging
import { 
  DEBUG_ENABLED, 
  createDebugSession, 
  handleDebugRequest, 
  handleDebugJSON 
} from '../debug/debug.js';

const router = AutoRouter();

// 🔍 DEBUG ROUTES - Remove this section to disable
router.get('/debug', (req, env) => handleDebugRequest(req, env));
router.get('/debug/json', (req, env) => handleDebugJSON(req, env));
router.get('/debug/test/:file', async (req, env) => {
  const file = req.params.file;
  const url = new URL(req.url);
  
  if (!env.ASSETS) {
    return json({ error: 'ASSETS binding missing' }, 500);
  }
  
  try {
    const testUrl = new URL(`/${file}`, url.origin);
    const resp = await env.ASSETS.fetch(new Request(testUrl.toString()));
    const text = await resp.text();
    return json({
      file,
      status: resp.status,
      contentType: resp.headers.get('content-type'),
      size: text.length,
      preview: text.substring(0, 200)
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

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

  // 🔍 DEBUG: Create session for this request
  const debug = DEBUG_ENABLED ? createDebugSession(req) : null;
  
  const log = (cat, msg, data) => {
    if (debug) debug.log(cat, msg, data);
    console.log(`[${cat}] ${msg}`, data ? JSON.stringify(data) : '');
  };

  log('REQUEST', `Incoming: ${req.method} ${path}`);
  log('ENV', 'Bindings check', {
    ASSETS: !!env.ASSETS,
    DB: !!env.DB
  });

  // Try serving static asset directly first
  if (env.ASSETS) {
    log('ASSETS', `Trying to serve: ${path}`);
    try {
      const assetResponse = await env.ASSETS.fetch(req);
      log('ASSETS', `Response status: ${assetResponse.status}`, {
        status: assetResponse.status,
        contentType: assetResponse.headers.get('content-type')
      });
      
      if (assetResponse.status !== 404) {
        log('SUCCESS', `Served static file: ${path}`);
        return assetResponse;
      } else {
        log('WARNING', `File not found in ASSETS: ${path}`);
      }
    } catch (e) {
      log('ERROR', `ASSETS.fetch failed: ${e.message}`, { error: e.message, stack: e.stack });
    }
  } else {
    log('ERROR', 'ASSETS binding is NOT available!');
  }

  // Product Page URLs: /p/:id/:slug or legacy patterns
  const pMatch = path.match(PRODUCT_PAGE_REGEX) || path.match(LEGACY_PRODUCT_PATTERN);
  if (pMatch || path === '/product' || path === '/product/') {
    log('SPA', `Product page detected: ${path}`, { match: pMatch });
    if (env.ASSETS) {
      const productUrl = new URL(SPA_FILES.product, url.origin);
      log('SPA', `Serving product SPA: ${productUrl.pathname}`);
      const productReq = new Request(productUrl.toString(), { method: 'GET' });
      return env.ASSETS.fetch(productReq);
    }
  }

  // Admin routes & root - serve admin SPA
  if (path === '/' || path === '/admin' || path === '/admin/') {
    log('SPA', `Admin page detected: ${path}`);
    if (env.ASSETS) {
      const adminUrl = new URL(SPA_FILES.admin, url.origin);
      log('SPA', `Serving admin SPA: ${adminUrl.pathname}`);
      const adminReq = new Request(adminUrl.toString(), { method: 'GET' });
      return env.ASSETS.fetch(adminReq);
    }
  }

  log('ERROR', `No handler found for: ${path}`);
  return json({ 
    error: 'Not Found', 
    path,
    debug: DEBUG_ENABLED ? 'Visit /debug for detailed diagnostics' : 'Debug disabled'
  }, 404, CORS);
});

export default router;
