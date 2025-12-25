/**
 * Cloudflare Worker - Main Entry Point
 * Modular Architecture
 */

// Core imports
import { CORS, handleOptions } from './core/config/cors.js';
import { initDB } from './core/config/db.js';
import { VERSION } from './core/config/constants.js';
import { generateProductSchema, generateCollectionSchema, injectSchemaIntoHTML } from './core/utils/schema.js';
import { getMimeTypeFromFilename } from './core/utils/upload-helper.js';

// Router
import { routeApiRequest } from './router.js';

// Module imports
import { handleProductRouting } from './modules/products/backend/controllers/products.controller.js';
import { handleSecureDownload, maybePurgeCache } from './modules/admin/backend/controllers/index.js';
import { cleanupExpired } from './modules/whop/backend/controllers/index.js';
import { renderBlogArchive, renderBlogPost, renderBlogSubmit } from './modules/blog/backend/controllers/render.js';
import { renderForumArchive, renderForumTopic } from './modules/forum/backend/controllers/render.js';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    let path = url.pathname.replace(/\/+/g, '/');
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    const method = req.method;

    // Helper functions
    const requiresAdminAuth = () => false;

    const getClientIp = () => {
      return req.headers.get('cf-connecting-ip') ||
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown';
    };

    const isSameOrigin = () => {
      const origin = req.headers.get('origin') || '';
      const referer = req.headers.get('referer') || '';
      const host = req.headers.get('host') || '';
      const ok = (value) => {
        if (!value) return false;
        try {
          const u = new URL(value);
          return u.host === host;
        } catch (_) {
          return false;
        }
      };
      return ok(origin) || ok(referer);
    };

    const checkAdminAuth = async () => {
      const pass = (env.ADMIN_PASSWORD || '').toString().trim();
      if (!pass) return false;
      const user = (env.ADMIN_USER || '').toString().trim();
      const header = req.headers.get('authorization') || '';
      if (!header.toLowerCase().startsWith('basic ')) return false;
      let decoded = '';
      try { decoded = atob(header.slice(6)); } catch (_) { return false; }
      const parts = decoded.split(':');
      const u = parts.shift() || '';
      const p = parts.join(':') || '';
      if (user && u !== user) return false;
      return p === pass;
    };

    const shouldRateLimit = (p) => {
      return p.startsWith('/admin') || p.startsWith('/api/admin/');
    };

    const isRateLimited = async () => {
      if (!env.DB) return false;
      try {
        await initDB(env);
        const ip = getClientIp();
        const row = await env.DB.prepare(
          `SELECT COUNT(*) as c
           FROM admin_login_attempts
           WHERE ip = ? AND datetime(created_at) > datetime('now', '-10 minutes')`
        ).bind(ip).first();
        return Number(row?.c || 0) >= 10;
      } catch (_) {
        return false;
      }
    };

    const recordFailedAttempt = async () => {
      if (!env.DB) return;
      try {
        await initDB(env);
        const ip = getClientIp();
        await env.DB.prepare(
          `INSERT INTO admin_login_attempts (ip) VALUES (?)`
        ).bind(ip).run();
      } catch (_) {}
    };

    // Auto-purge cache on version change
    const shouldPurgeCache = path.startsWith('/admin') || path.startsWith('/api/admin/') || path.startsWith('/api/whop/webhook');
    if (shouldPurgeCache) {
      await maybePurgeCache(env, initDB);
    }

    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      return handleOptions(req);
    }

    try {
      // Admin logout
      if (path === '/admin/logout') {
        return new Response('Logged out', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
        });
      }

      // Admin auth check
      if (requiresAdminAuth(path, method)) {
        if (shouldRateLimit(path) && await isRateLimited()) {
          return new Response('Too many login attempts. Try again later.', { status: 429 });
        }

        const ok = await checkAdminAuth();
        if (!ok) {
          await recordFailedAttempt();
          return new Response('Authentication required', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
          });
        }

        if (!['GET','HEAD','OPTIONS'].includes(method) && !isSameOrigin()) {
          return new Response('CSRF blocked', { status: 403 });
        }
      }

      // CSRF protection for admin routes
      if ((path.startsWith('/admin') || path.startsWith('/api/admin/')) && !['GET','HEAD','OPTIONS'].includes(method) && !isSameOrigin()) {
        return new Response('CSRF blocked', { status: 403 });
      }

      // Helper functions for pages/settings
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
          } catch (_) {}
        }
        return { homePath: '/index.html', productsPath: '/products-grid.html', blogPath: '/blog' };
      };

      const getGtmId = async () => {
        if (!env.DB) return '';
        await initDB(env);
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('analytics').first();
        if (row && row.value) {
          try {
            const v = JSON.parse(row.value);
            const id = String(v.gtm_id || '').trim();
            return /^GTM-[A-Z0-9]+$/i.test(id) ? id : '';
          } catch (_) {
            return '';
          }
        }
        return '';
      };

      const injectGtm = (html, gtmId) => {
        if (!gtmId) return html;
        if (html.includes('googletagmanager.com/gtm.js')) return html;
        const headSnippet = `\n<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>\n<!-- End Google Tag Manager -->\n`;
        const bodySnippet = `\n<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->\n`;
        let out = html;
        out = out.includes('</head>') ? out.replace('</head>', headSnippet + '</head>') : headSnippet + out;
        out = out.includes('</body>') ? out.replace('</body>', bodySnippet + '</body>') : out + bodySnippet;
        return out;
      };

      // Blog routes
      if ((method === 'GET' || method === 'HEAD') && (path === '/blog/submit' || path === '/blog/submit/')) {
        if (env.DB) {
          await initDB(env);
          const gtmId = await getGtmId();
          const resp = await renderBlogSubmit();
          const html = injectGtm(await resp.text(), gtmId);
          const headers = new Headers(resp.headers);
          return new Response(html, { status: resp.status, headers });
        }
      }

      if ((method === 'GET' || method === 'HEAD') && (path === '/blog' || path === '/blog/')) {
        if (env.DB) {
          await initDB(env);
          const gtmId = await getGtmId();
          const resp = await renderBlogArchive(env);
          const html = injectGtm(await resp.text(), gtmId);
          const headers = new Headers(resp.headers);
          return new Response(html, { status: resp.status, headers });
        }
      }

      const blogMatch = path.match(/^\/blog\/([a-z0-9-]+)\/?$/);
      if ((method === 'GET' || method === 'HEAD') && blogMatch) {
        const slug = blogMatch[1];
        if (env.DB) {
          await initDB(env);
          const gtmId = await getGtmId();
          const resp = await renderBlogPost(env, slug);
          const html = injectGtm(await resp.text(), gtmId);
          const headers = new Headers(resp.headers);
          return new Response(html, { status: resp.status, headers });
        }
      }

      // Forum routes
      if ((method === 'GET' || method === 'HEAD') && (path === '/forum' || path === '/forum/')) {
        if (env.DB) {
          await initDB(env);
          const gtmId = await getGtmId();
          const resp = await renderForumArchive(env);
          const html = injectGtm(await resp.text(), gtmId);
          const headers = new Headers(resp.headers);
          return new Response(html, { status: resp.status, headers });
        }
      }

      const forumMatch = path.match(/^\/forum\/([a-z0-9-]+)\/?$/);
      if ((method === 'GET' || method === 'HEAD') && forumMatch) {
        const slug = forumMatch[1];
        if (env.DB) {
          await initDB(env);
          const gtmId = await getGtmId();
          const resp = await renderForumTopic(env, slug);
          const html = injectGtm(await resp.text(), gtmId);
          const headers = new Headers(resp.headers);
          return new Response(html, { status: resp.status, headers });
        }
      }

      // Secure download route
      if ((method === 'GET' || method === 'HEAD') && path.startsWith('/secure/')) {
        return handleSecureDownload(env, path, url.searchParams);
      }

      // API routing
      if (path.startsWith('/api/')) {
        const apiResp = await routeApiRequest(req, env, url, path, method);
        if (apiResp) return apiResp;
      }

      // Product routing (slug-based)
      let schemaProductId = null;
      if ((method === 'GET' || method === 'HEAD') && env.DB) {
        const productRouteResult = await handleProductRouting(env, path, initDB);
        if (productRouteResult) {
          if (productRouteResult.assetPath) {
            path = productRouteResult.assetPath;
            schemaProductId = productRouteResult.productId;
          } else if (productRouteResult.redirect) {
            return Response.redirect(productRouteResult.redirect, 301);
          }
        }
      }

      // Static asset handling
      const isGetLike = method === 'GET' || method === 'HEAD';
      const staticExt = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|mp4|webm|json|xml|txt)$/i;
      const isAssetPath = staticExt.test(path);

      if (isGetLike) {
        let assetPath = path;
        
        // Home page handling
        if (assetPath === '/') {
          const defaults = await getDefaultPages();
          assetPath = defaults.homePath;
        }
        
        const assetReq = new Request(new URL(assetPath, url.origin), req);
        
        // Cache check for static assets
        if (isAssetPath) {
          try {
            const assetCacheKey = new Request(assetReq.url, { method: 'GET' });
            const cachedAsset = await caches.default.match(assetCacheKey);
            if (cachedAsset) {
              const headers = new Headers(cachedAsset.headers);
              headers.set('X-Cache', 'HIT');
              headers.set('X-Worker-Version', VERSION);
              return new Response(cachedAsset.body, { status: cachedAsset.status, headers });
            }
          } catch (e) {}
        }

        const assetResp = await env.ASSETS.fetch(assetReq);
        
        const contentType = assetResp.headers.get('content-type') || '';
        const isHTML = contentType.includes('text/html') || assetPath === '/_product_template.tpl';
        const isSuccess = assetResp.status === 200;
        
        const shouldCache = isHTML && isSuccess && !path.startsWith('/admin') && !path.includes('/admin/');
        const cacheKey = new Request(req.url, { 
          method: 'GET',
          headers: { 'Accept': 'text/html' }
        });

        if (shouldCache) {
          try {
            const cachedResponse = await caches.default.match(cacheKey);
            if (cachedResponse) {
              const headers = new Headers(cachedResponse.headers);
              headers.set('X-Cache', 'HIT');
              headers.set('X-Worker-Version', VERSION);
              return new Response(cachedResponse.body, { status: cachedResponse.status, headers });
            }
          } catch (cacheError) {}
        }
        
        if (isHTML && isSuccess) {
          try {
            const baseUrl = url.origin;
            let html = await assetResp.text();
            const gtmId = await getGtmId();
            
            // Product schema injection
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
                  const reviewsResult = await env.DB.prepare(
                    'SELECT * FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC LIMIT 5'
                  ).bind(Number(productId), 'approved').all();
                  
                  const reviews = reviewsResult.results || [];
                  const schemaJson = generateProductSchema(product, baseUrl, reviews);
                  html = injectSchemaIntoHTML(html, 'product-schema', schemaJson);
                }
              }
            }
            
            // Collection schema injection
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
            
            html = injectGtm(html, gtmId);

            const headers = new Headers();
            headers.set('Content-Type', 'text/html; charset=utf-8');
            headers.set('X-Worker-Version', VERSION);
            headers.set('X-Cache', 'MISS');
            
            const response = new Response(html, { status: 200, headers });
            
            if (shouldCache) {
              try {
                const cacheResponse = new Response(html, {
                  status: 200,
                  headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=300',
                    'X-Worker-Version': VERSION,
                    'X-Cache-Created': new Date().toISOString()
                  }
                });
                ctx.waitUntil(caches.default.put(cacheKey, cacheResponse));
              } catch (cacheError) {}
            }
            
            return response;
          } catch (e) {
            console.error('Schema injection error:', e);
          }
        }
        
        // Static asset caching
        const passthroughHeaders = new Headers(assetResp.headers);
        passthroughHeaders.set('X-Worker-Version', VERSION);

        const canCacheAsset = isGetLike && isAssetPath && assetResp.status === 200;
        if (canCacheAsset) {
          if (!passthroughHeaders.get('Cache-Control')) {
            passthroughHeaders.set('Cache-Control', 'public, max-age=86400');
          }
          passthroughHeaders.set('X-Cache', 'MISS');

          try {
            const assetCacheKey = new Request(assetReq.url, { method: 'GET' });
            const cacheCopy = new Response(assetResp.clone().body, {
              status: assetResp.status,
              headers: passthroughHeaders
            });
            ctx.waitUntil(caches.default.put(assetCacheKey, cacheCopy));
          } catch (e) {}

          return new Response(assetResp.body, { status: assetResp.status, headers: passthroughHeaders });
        }

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
        const result = await cleanupExpired(env);
        const data = await result.json();
        console.log('Cleanup result:', data);
      }
    } catch (e) {
      console.error('Cron job error:', e);
    }
  }
};
