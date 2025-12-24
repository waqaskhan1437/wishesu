/**
 * Static asset handling with schema injection and caching.
 */

import { getCachedHtml, setCachedHtml } from './html-cache.js';
import { applyNoStore } from '../cache-headers.js';

export async function handleStaticAsset(req, env, ctx, options) {
  if (!env.ASSETS) return null;

  const {
    path,
    method,
    url,
    initDB,
    version,
    getGtmId,
    injectGtm,
    schema
  } = options;

  const {
    generateProductSchema,
    generateCollectionSchema,
    injectSchemaIntoHTML
  } = schema;

  let assetReq = req;
  let assetPath = path;
  let schemaProductId = null;

  if (method === 'GET' || method === 'HEAD') {
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

  const isGetLike = method === 'GET' || method === 'HEAD';
  const isAssetPath = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|map)$/.test(assetPath);

  if (isGetLike && isAssetPath) {
    try {
      const assetCacheKey = new Request(assetReq.url, { method: 'GET' });
      const cachedAsset = await caches.default.match(assetCacheKey);
      if (cachedAsset) {
        const headers = new Headers(cachedAsset.headers);
        headers.set('X-Cache', 'HIT');
        headers.set('X-Worker-Version', version);
        return new Response(cachedAsset.body, { status: cachedAsset.status, headers });
      }
    } catch (_) {
      // ignore cache errors and continue
    }
  }

  const assetResp = await env.ASSETS.fetch(assetReq);
  const contentType = assetResp.headers.get('content-type') || '';
  const isHTML = contentType.includes('text/html') || assetPath === '/_product_template.tpl';
  const isSuccess = assetResp.status === 200;

  const shouldCacheHtml = isHTML && isSuccess && !path.startsWith('/admin') && !path.includes('/admin/');

  if (shouldCacheHtml) {
    try {
      const cachedResponse = await getCachedHtml(req);
      if (cachedResponse) {
        const headers = new Headers(cachedResponse.headers);
        headers.set('X-Cache', 'HIT');
        headers.set('X-Worker-Version', version);
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          headers
        });
      }
    } catch (_) {
      // ignore cache errors
    }
  }

  if (isHTML && isSuccess) {
    try {
      const baseUrl = url.origin;
      let html = await assetResp.text();
      const gtmId = await getGtmId(env);

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
      headers.set('X-Worker-Version', version);
      headers.set('X-Cache', 'MISS');

      const response = new Response(html, { status: 200, headers });

      if (shouldCacheHtml) {
        try {
          const cacheResponse = new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=300',
              'X-Worker-Version': version,
              'X-Cache-Created': new Date().toISOString()
            }
          });
          ctx.waitUntil(setCachedHtml(req, cacheResponse));
        } catch (_) {
          // ignore cache put errors
        }
      }

      return response;
    } catch (e) {
      console.error('Schema injection error:', e);
    }
  }

  const passthroughHeaders = new Headers(assetResp.headers);
  passthroughHeaders.set('X-Worker-Version', version);

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
    } catch (_) {
      // ignore cache put errors
    }

    return new Response(assetResp.body, { status: assetResp.status, headers: passthroughHeaders });
  }

  const noStoreHeaders = applyNoStore(passthroughHeaders);
  return new Response(assetResp.body, { status: assetResp.status, headers: noStoreHeaders });
}
