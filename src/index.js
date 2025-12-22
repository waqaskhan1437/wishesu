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
import { renderBlogArchive, renderBlogPost } from './controllers/blog.js';
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

// Cache toggle:
// - Set DISABLE_CACHE=1 in your Worker environment to disable all caching (testing mode)
// - Or add ?nocache=1 / ?_nocache=1 to any URL, or send header X-Bypass-Cache: 1 to bypass cache per request
const reqCacheControl = (req.headers.get('cache-control') || '').toLowerCase();
const cacheBypassParam = url.searchParams.get('nocache') === '1' || url.searchParams.get('_nocache') === '1';
const cacheDisabled =
  String(env?.DISABLE_CACHE || '') === '1' ||
  cacheBypassParam ||
  req.headers.get('x-bypass-cache') === '1' ||
  reqCacheControl.includes('no-store') ||
  reqCacheControl.includes('no-cache');

const withNoStore = (resp) => {
  if (!cacheDisabled || !resp) return resp;
  const headers = new Headers(resp.headers);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('X-Cache', headers.get('X-Cache') || 'BYPASS');
  headers.set('X-Cache-Disabled', '1');
  return new Response(resp.body, { status: resp.status, headers });
};

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
      // Helper: read default public pages from settings
      const getDefaultPages = async () => {
        if (!env.DB) return { homePath: '/index.html', productsPath: '/products-grid.html', blogPath: '/blog' };
        await initDB(env);
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('default_pages').first();
        if (row && row.value) {
          try {
            const v = JSON.parse(row.value);
            return {
              homePath: v.homePath || '/index.html',
              productsPath: v.productsPath || '/products-grid.html',
              blogPath: v.blogPath || '/blog'
            };
          } catch (_) {
            // ignore
          }
        }
        return { homePath: '/index.html', productsPath: '/products-grid.html', blogPath: '/blog' };
      };

      // Public blog route (admin configurable)
      if ((method === 'GET' || method === 'HEAD') && (path === '/blog' || path === '/blog/')) {
        const defaults = await getDefaultPages();
        // If admin configured a custom blog landing page, serve it.
        if (defaults.blogPath && defaults.blogPath !== '/blog') {
          const to = new URL(req.url);
          to.pathname = defaults.blogPath;
          return env.ASSETS ? env.ASSETS.fetch(new Request(to.toString(), req)) : fetch(to.toString(), req);
        }
        if (env.DB) {
          await initDB(env);
          return withNoStore(await renderBlogArchive(env, url.origin));
        }
      }
      if ((method === 'GET' || method === 'HEAD') && path.startsWith('/blog/')) {
        const slug = path.split('/').filter(Boolean)[1];
        if (env.DB) {
          await initDB(env);
          return withNoStore(await renderBlogPost(env, slug));
        }
      }

      // Default page mapping (admin configurable)
      if ((method === 'GET' || method === 'HEAD') && (path === '/' || path === '/index.html' || path === '/products' || path === '/products/' || path === '/products.html')) {
        const defaults = await getDefaultPages();
        let target = null;
        if (path === '/' || path === '/index.html') target = defaults.homePath;
        else target = defaults.productsPath;
        if (target && target !== path) {
          const to = new URL(req.url);
          to.pathname = target;
          // Preserve query
          return env.ASSETS ? env.ASSETS.fetch(new Request(to.toString(), req)) : fetch(to.toString(), req);
        }
      }
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
        if (apiResponse) return withNoStore(apiResponse);
      }

      // ----- SECURE DOWNLOAD -----
      if (path.startsWith('/download/')) {
        const orderId = path.split('/').pop();
        return withNoStore(await handleSecureDownload(env, orderId, url.origin));
      }

      // ----- ADMIN SPA ROUTING -----
      if (path.startsWith('/admin') && !path.startsWith('/api/')) {
        // Standalone pages that should NOT be handled by the SPA router
        // FIX: Check using 'includes' to support both .html and clean URLs
        const isStandalone = 
          path.includes('/product-form') || 
          path.includes('/page-builder') || 
          path.includes('/landing-builder');

        if (isStandalone) {
          // Let the request fall through to the static asset server
          // (This allows product-form to load correctly whether path ends in .html or not)
        } else {
          // All other /admin routes are part of the SPA and should serve the dashboard
          if (env.ASSETS) {
            const assetResp = await env.ASSETS.fetch(new Request(new URL('/admin/dashboard.html', req.url)));
            const headers = new Headers(assetResp.headers);
            headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('X-Worker-Version', VERSION);
            if (cacheDisabled) {
              headers.set('X-Cache', 'BYPASS');
              headers.set('X-Cache-Disabled', '1');
            }
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
const dynHeaders = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
dynHeaders.set('X-Worker-Version', VERSION);
if (cacheDisabled) {
  dynHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  dynHeaders.set('Pragma', 'no-cache');
  dynHeaders.set('X-Cache', 'BYPASS');
  dynHeaders.set('X-Cache-Disabled', '1');
}
return new Response(row.content, { headers: dynHeaders });
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

        // Cache non-HTML static assets (js/css/images/fonts) to reduce internal subrequests
        // and improve performance. Admin HTML is still served with no-store.
        const isGetLike = (method === 'GET' || method === 'HEAD');
        const isAssetPath = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|map)$/.test(assetPath);
        if (!cacheDisabled && isGetLike && isAssetPath) {
          try {
            const assetCacheKey = new Request(assetReq.url, { method: 'GET' });
            const cachedAsset = await caches.default.match(assetCacheKey);
            if (cachedAsset) {
              const headers = new Headers(cachedAsset.headers);
              headers.set('X-Cache', 'HIT');
              headers.set('X-Worker-Version', VERSION);
              return new Response(cachedAsset.body, { status: cachedAsset.status, headers });
            }
          } catch (e) {
            // ignore cache errors and continue
          }
        }

        const assetResp = await env.ASSETS.fetch(assetReq);
        
        const contentType = assetResp.headers.get('content-type') || '';
        const isHTML = contentType.includes('text/html') || assetPath === '/_product_template.tpl';
        const isSuccess = assetResp.status === 200;
        
        // Caching: Only cache HTML pages, never admin routes
        const shouldCache = isHTML && isSuccess && !path.startsWith('/admin') && !path.includes('/admin/') && !cacheDisabled;
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
            headers.set('X-Cache', cacheDisabled ? 'BYPASS' : 'MISS');
            if (cacheDisabled) {
              headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
              headers.set('Pragma', 'no-cache');
              headers.set('X-Cache-Disabled', '1');
            }
            
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
        
        // For non-HTML or failed schema injection, pass through with version header.
// Cache static assets (js/css/images/fonts) to reduce repeated internal ASSETS subrequests.
        const passthroughHeaders = new Headers(assetResp.headers);
        passthroughHeaders.set('X-Worker-Version', VERSION);

// Testing mode: disable all caching and prevent browser from storing assets/pages.
if (cacheDisabled) {
  passthroughHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  passthroughHeaders.set('Pragma', 'no-cache');
  passthroughHeaders.set('X-Cache', 'BYPASS');
  passthroughHeaders.set('X-Cache-Disabled', '1');
  return new Response(assetResp.body, { status: assetResp.status, headers: passthroughHeaders });
}

        const canCacheAsset = !cacheDisabled && isGetLike && isAssetPath && assetResp.status === 200;
        if (canCacheAsset) {
          // If the upstream didn't provide caching headers, set a sensible default.
          if (!passthroughHeaders.get('Cache-Control')) {
            passthroughHeaders.set('Cache-Control', 'public, max-age=86400'); // 1 day
          }
          passthroughHeaders.set('X-Cache', 'MISS');

          try {
            const assetCacheKey = new Request(assetReq.url, { method: 'GET' });
            const cacheCopy = new Response(assetResp.clone().body, {
              status: assetResp.status,
              headers: passthroughHeaders
            });
            ctx.waitUntil(caches.default.put(assetCacheKey, cacheCopy));
          } catch (e) {
            // ignore cache put errors
          }

          return new Response(assetResp.body, { status: assetResp.status, headers: passthroughHeaders });
        }

        // Default for everything else: don't store
        passthroughHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        passthroughHeaders.set('Pragma', 'no-cache');
        return new Response(assetResp.body, { status: assetResp.status, headers: passthroughHeaders });
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
