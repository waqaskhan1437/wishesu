/**
 * Cloudflare Worker - Main Entry Point with HTML Caching
 * Modular ES Module Structure
 */

import { CORS, handleOptions } from './config/cors.js';
import { initDB } from './config/db.js';
import { VERSION } from './config/constants.js';
import { routeApiRequest } from './router.js';
import { handleProductRouting } from './controllers/products.js';
import { handleSecureDownload, maybePurgeCache } from './controllers/admin.js';
import { cleanupExpired } from './controllers/whop.js';
import { generateProductSchema, generateCollectionSchema, injectSchemaIntoHTML } from './utils/schema.js';
import { getMimeTypeFromFilename } from './utils/upload-helper.js';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    // Normalize the request path
    let path = url.pathname.replace(/\/+/g, '/');
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    const method = req.method;

    // Auto-purge cache on version change (only for admin/webhook routes)
    const shouldPurgeCache = path.startsWith('/admin') || path.startsWith('/api/admin/') || path.startsWith('/api/whop/webhook');
    if (shouldPurgeCache) {
      await maybePurgeCache(env, initDB);
    }

    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      return handleOptions(req);
    }

    try {
      // Private asset: never serve the raw product template directly
      if ((method === 'GET' || method === 'HEAD') && (path === '/_product_template.tpl' || path === '/_product_template' || path === '/_product_template.html')) {
        return new Response('Not found', { status: 404 });
      }

      // ----- CANONICAL PRODUCT URLs -----
      if ((method === 'GET' || method === 'HEAD') && (path === '/product' || path.startsWith('/product/'))) {
        if (env.DB) {
          await initDB(env);
          const redirect = await handleProductRouting(env, url, path);
          if (redirect) return redirect;
        }
      }

      // ----- API ROUTES -----
      if (path.startsWith('/api/') || path === '/submit-order') {
        const apiResponse = await routeApiRequest(req, env, url, path, method);
        if (apiResponse) return apiResponse;
      }

      // ----- SECURE DOWNLOAD -----
      if (path.startsWith('/download/')) {
        const orderId = path.split('/').pop();
        return handleSecureDownload(env, orderId, url.origin);
      }

      // ----- ADMIN SPA ROUTING -----
      // Handle both /admin and /admin/ and all admin sub-routes
      if ((path === '/admin' || path.startsWith('/admin/')) && !path.startsWith('/api/')) {
        // Special handling for standalone pages that remain separate
        if (path.endsWith('/page-builder.html') ||
            path.endsWith('/landing-builder.html') ||
            path.endsWith('/product-form.html')) {
          // Let them fall through to asset serving
        } else if (path.startsWith('/admin')) {
          // Serve the main dashboard.html for all other admin routes
          // This includes: /admin, /admin/, /admin/dashboard.html, /admin/orders.html, etc.
          if (env.ASSETS) {
            const assetResp = await env.ASSETS.fetch(new Request(new URL('/admin/dashboard.html', req.url)));
            const headers = new Headers(assetResp.headers);
            headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('X-Worker-Version', VERSION);
            return new Response(assetResp.body, { status: assetResp.status, headers });
          }
        }
      }

      // ----- DYNAMIC PAGES -----
      if (path.endsWith('.html') && !path.includes('/admin/') && !path.startsWith('/admin')) {
        const slug = path.slice(1).replace(/\.html$/, '');
        try {
          if (env.DB) {
            await initDB(env);
            const row = await env.DB.prepare('SELECT content FROM pages WHERE slug = ? AND status = ?').bind(slug, 'published').first();
            if (row && row.content) {
              return new Response(row.content, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              });
            }
          }
        } catch (e) {
          // continue to static assets
        }
      }

      // ----- STATIC ASSETS WITH SERVER-SIDE SCHEMA INJECTION & CACHING -----
      if (env.ASSETS) {
        let assetReq = req;
        let assetPath = path;
        let schemaProductId = null;

        // Canonical product URLs: /product-<id>/<slug>
        if ((method === 'GET' || method === 'HEAD')) {
          const canonicalMatch = assetPath.match(/^\/product-(\d+)\/(.+)$/);
          if (canonicalMatch) {
            const pid = Number(canonicalMatch[1]);
            if (!Number.isNaN(pid)) {
              schemaProductId = pid;
              const rewritten = new URL(req.url);
              rewritten.pathname = '/_product_template.tpl';
              rewritten.searchParams.set('id', String(schemaProductId));
              assetReq = new Request(rewritten.toString(), req);
              assetPath = '/_product_template.tpl';
            }
          }
        }

        const assetResp = await env.ASSETS.fetch(assetReq);

        const contentType = assetResp.headers.get('content-type') || '';
        const isHTML = contentType.includes('text/html') || assetPath === '/_product_template.tpl';
        const isSuccess = assetResp.status === 200;

        // Caching: Only cache HTML pages, never admin routes
        const shouldCache = isHTML && isSuccess && !path.startsWith('/admin') && !path.includes('/admin/');
        const cacheKey = new Request(req.url, {
          method: 'GET',
          headers: { 'Accept': 'text/html' }
        });

        if (shouldCache) {
          try {
            // Check cache first
            const cachedResponse = await caches.default.match(cacheKey);
            if (cachedResponse) {
              console.log('Cache HIT for:', req.url);
              const headers = new Headers(cachedResponse.headers);
              headers.set('X-Cache', 'HIT');
              headers.set('X-Worker-Version', VERSION);
              return new Response(cachedResponse.body, {
                status: cachedResponse.status,
                headers
              });
            }
            console.log('Cache MISS for:', req.url);
          } catch (cacheError) {
            console.warn('Cache check failed:', cacheError);
            // Continue with normal processing if cache fails
          }
        }

        if (isHTML && isSuccess) {
          try {
            const baseUrl = url.origin;
            let html = await assetResp.text();

            // Product detail page - inject individual product schema
            if (assetPath === '/_product_template.tpl' || assetPath === '/product.html' || assetPath === '/product') {
              const productId = schemaProductId ? String(schemaProductId) : url.searchParams.get('id');
              if (productId && env.DB) {
                await initDB(env);
                const product = await env.DB.prepare(`
                  SELECT p.*,
                    COUNT(r.id) as review_count,
                    AVG(r.rating) as rating_average
                  FROM products p
                  LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                  WHERE p.id = ?
                  GROUP BY p.id
                `).bind(Number(productId)).first();

                if (product) {
                  // Fetch reviews for schema
                  const reviewsResult = await env.DB.prepare(
                    'SELECT * FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC LIMIT 5'
                  ).bind(Number(productId), 'approved').all();

                  const reviews = reviewsResult.results || [];
                  const schemaJson = generateProductSchema(product, baseUrl, reviews);
                  html = injectSchemaIntoHTML(html, 'product-schema', schemaJson);
                }
              }
            }

            // Collection page - inject product list schema
            if (assetPath === '/index.html' || assetPath === '/' || assetPath === '/products.html') {
              if (env.DB) {
                await initDB(env);
                const productsResult = await env.DB.prepare(`
                  SELECT p.*,
                    COUNT(r.id) as review_count,
                    AVG(r.rating) as rating_average
                  FROM products p
                  LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                  WHERE p.status = 'active'
                  GROUP BY p.id
                  ORDER BY p.sort_order ASC, p.id DESC
                `).all();

                const products = productsResult.results || [];
                if (products.length > 0) {
                  const schemaJson = generateCollectionSchema(products, baseUrl);
                  html = injectSchemaIntoHTML(html, 'collection-schema', schemaJson);
                }
              }
            }

            const headers = new Headers();
            headers.set('Content-Type', 'text/html; charset=utf-8');
            headers.set('X-Worker-Version', VERSION);
            headers.set('X-Cache', 'MISS');

            const response = new Response(html, { status: 200, headers });

            // Cache the response for non-admin pages (5 minutes TTL)
            if (shouldCache) {
              try {
                const cacheResponse = new Response(html, {
                  status: 200,
                  headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=300', // 5 minutes
                    'X-Worker-Version': VERSION,
                    'X-Cache-Created': new Date().toISOString()
                  }
                });

                // Store in cache asynchronously
                ctx.waitUntil(caches.default.put(cacheKey, cacheResponse));
                console.log('Cached response for:', req.url);
              } catch (cacheError) {
                console.warn('Cache storage failed:', cacheError);
                // Continue even if caching fails
              }
            }

            return response;
          } catch (e) {
            console.error('Schema injection error:', e);
          }
        }

        // For non-HTML or failed schema injection, just pass through with version header
        const headers = new Headers(assetResp.headers);
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        headers.set('Pragma', 'no-cache');
        headers.set('X-Worker-Version', VERSION);

        return new Response(assetResp.body, { status: assetResp.status, headers });
      }

      return new Response('Not found', { status: 404 });
    } catch (e) {
      console.error('Worker error:', e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }
  },

  // Scheduled handler for cron jobs
  async scheduled(event, env, ctx) {
    console.log('Cron job started:', event.cron);

    try {
      if (env.DB) {
        await initDB(env);
        // Cleanup expired Whop checkout sessions
        const result = await cleanupExpired(env);
        const data = await result.json();
        console.log('Cleanup result:', data);
      }
    } catch (e) {
      console.error('Cron job error:', e);
    }
  }
};
