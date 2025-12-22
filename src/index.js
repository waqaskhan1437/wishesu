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
import { renderBlogArchive, renderBlogPost, renderBlogSubmit } from './controllers/blog.js';
import { renderForumArchive, renderForumTopic } from './controllers/forum.js';
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

      // Public blog route (admin configurable)
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
        const defaults = await getDefaultPages();
        // If admin configured a custom blog landing page, serve it.
        if (defaults.blogPath && defaults.blogPath !== '/blog') {
          const to = new URL(req.url);
          to.pathname = defaults.blogPath;
          return env.ASSETS ? env.ASSETS.fetch(new Request(to.toString(), req)) : fetch(to.toString(), req);
        }
        if (env.DB) {
          await initDB(env);
          const gtmId = await getGtmId();
          const resp = await renderBlogArchive(env, url.origin);
          const html = injectGtm(await resp.text(), gtmId);
          const headers = new Headers(resp.headers);
          return new Response(html, { status: resp.status, headers });
        }
      }
      if ((method === 'GET' || method === 'HEAD') && path.startsWith('/blog/')) {
        const slug = path.split('/').filter(Boolean)[1];
        if (env.DB) {
          await initDB(env);
          const gtmId = await getGtmId();
          const resp = await renderBlogPost(env, slug);
          const html = injectGtm(await resp.text(), gtmId);
          const headers = new Headers(resp.headers);
          return new Response(html, { status: resp.status, headers });
        }
      }

      // Public forum routes
      if ((method === 'GET' || method === 'HEAD') && (path === '/forum' || path === '/forum/')) {
        if (env.DB) {
          await initDB(env);
          const gtmId = await getGtmId();
          const resp = await renderForumArchive(env, url.origin);
          const html = injectGtm(await resp.text(), gtmId);
          const headers = new Headers(resp.headers);
          return new Response(html, { status: resp.status, headers });
        }
      }
      if ((method === 'GET' || method === 'HEAD') && path.startsWith('/forum/')) {
        const slug = path.split('/').filter(Boolean)[1];
        if (env.DB) {
          await initDB(env);
          const gtmId = await getGtmId();
          const resp = await renderForumTopic(env, slug);
          const html = injectGtm(await resp.text(), gtmId);
          const headers = new Headers(resp.headers);
          return new Response(html, { status: resp.status, headers });
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
        if (apiResponse) return apiResponse;
      }

      // ----- SECURE DOWNLOAD -----
      if (path.startsWith('/download/')) {
        const orderId = path.split('/').pop();
        return handleSecureDownload(env, orderId, url.origin);
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
            const row = await env.DB.prepare(
              `SELECT content FROM pages
               WHERE slug = ?
               AND (status = 'published' OR status = 'active' OR status IS NULL OR status = '')`
            ).bind(slug).first();
            if (row && row.content) {
              const gtmId = await getGtmId();
              const html = injectGtm(row.content, gtmId);
              return new Response(html, {
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

        // Cache non-HTML static assets (js/css/images/fonts) to reduce internal subrequests
        // and improve performance. Admin HTML is still served with no-store.
        const isGetLike = (method === 'GET' || method === 'HEAD');
        const isAssetPath = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|map)$/.test(assetPath);
        if (isGetLike && isAssetPath) {
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
            const gtmId = await getGtmId();
            
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
            
            html = injectGtm(html, gtmId);

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
        
        // For non-HTML or failed schema injection, pass through with version header.
// Cache static assets (js/css/images/fonts) to reduce repeated internal ASSETS subrequests.
        const passthroughHeaders = new Headers(assetResp.headers);
        passthroughHeaders.set('X-Worker-Version', VERSION);

        const canCacheAsset = isGetLike && isAssetPath && assetResp.status === 200;
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
