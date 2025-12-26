/**
 * Cloudflare Worker Entry Point
 * Hyper-Modular Anti-Loop Architecture with Itty-Router v5
 */

import { AutoRouter, error as ittyError } from 'itty-router';
import { api } from '../core/router/api.js';
import { handleBatch } from '../core/utils/batch.js';
import { preflight, corsify, CORS_HEADERS } from '../core/middleware/cors.js';
import { errorHandler } from '../core/middleware/error.js';
import { initDatabase } from '../core/middleware/db.js';
import { json } from '../core/utils/response.js';
import {
  PRODUCT_PAGE_REGEX,
  LEGACY_PRODUCT_PATTERN,
  ADMIN_ROUTES,
  SPA_FILES
} from '../core/constants/routes.js';

const router = AutoRouter({
  before: [preflight],
  catch: errorHandler,
  finally: [corsify]
});

// 1. Batch Endpoint - Must be before generic /api/* route
router.post('/api/batch', async (request, env, ctx) => {
  await initDatabase(request, env);
  return handleBatch(request, env, ctx, api);
});

// 2. API Routes
router.all('/api/*', async (request, env, ctx) => {
  // Initialize DB for API requests
  await initDatabase(request, env);
  return api.fetch(request, env, ctx);
});

// 3. Static Assets & SPA Fallback
router.all('*', async (request, env) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/g, '') || '/';

  // Check if ASSETS binding exists
  if (!env.ASSETS) {
    return json({ error: 'Assets binding missing' }, 500);
  }

  // Try to serve static asset FIRST (CSS, JS, images, etc.)
  try {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  } catch {
    // Asset fetch failed, continue to SPA routing
  }

  // Admin routes -> admin.html
  if (ADMIN_ROUTES.includes(path) || path === '' || path === '/') {
    const rewritten = new URL(request.url);
    rewritten.pathname = SPA_FILES.admin;
    return env.ASSETS.fetch(new Request(rewritten.toString(), request));
  }

  // New product URL pattern: /p/:id/:slug
  const productMatch = path.match(PRODUCT_PAGE_REGEX);
  if (productMatch) {
    const rewritten = new URL(request.url);
    rewritten.pathname = SPA_FILES.product;
    rewritten.searchParams.set('id', productMatch[1]);
    return env.ASSETS.fetch(new Request(rewritten.toString(), request));
  }

  // Legacy product URL pattern: /product-123/slug or /product123/slug
  const legacyMatch = path.match(LEGACY_PRODUCT_PATTERN);
  if (legacyMatch) {
    const rewritten = new URL(request.url);
    rewritten.pathname = SPA_FILES.product;
    rewritten.searchParams.set('id', legacyMatch[1]);
    return env.ASSETS.fetch(new Request(rewritten.toString(), request));
  }

  // Product page direct access
  if (path === '/product' || path === '/product/') {
    const rewritten = new URL(request.url);
    rewritten.pathname = SPA_FILES.product;
    return env.ASSETS.fetch(new Request(rewritten.toString(), request));
  }

  // CRITICAL: Return 404 for unmatched routes
  // This prevents infinite loops by NOT redirecting to another worker route
  return new Response(
    JSON.stringify({ error: 'Not Found', path }),
    {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    }
  );
});

export default router;
