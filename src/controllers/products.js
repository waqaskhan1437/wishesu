/**
 * Products controller - Product CRUD operations
 * OPTIMIZED: Added in-memory caching for frequently accessed products
 * COLD START FIX: Added product slug cache to reduce redirect DB queries
 */

import { json, cachedJson } from '../utils/response.js';
import { canonicalProductPath, slugifyStr, toISO8601 } from '../utils/formatting.js';
import { buildPublicProductStatusWhere, getProductTableColumns } from '../utils/product-visibility.js';

// In-memory cache for products list (reduces DB queries)
let productsCache = null;
let productsCacheTime = 0;
const PRODUCTS_CACHE_TTL = 30000; // 30 seconds

// Product slug cache for fast redirects (reduces cold start DB queries)
const productSlugCache = new Map();
const SLUG_CACHE_TTL = 300000; // 5 minutes

async function getProductTimestampSupport(env) {
  const columns = await getProductTableColumns(env);
  return {
    hasCreatedAt: columns.has('created_at'),
    hasUpdatedAt: columns.has('updated_at')
  };
}

function toCleanString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function stripUrlQueryHash(raw) {
  const s = toCleanString(raw);
  if (!s) return '';
  // Avoid URL() here to preserve relative URLs as-is.
  return s.split('#')[0].split('?')[0];
}

function isBadMediaValue(raw) {
  const s = stripUrlQueryHash(raw).toLowerCase();
  if (!s) return true;
  if (s === 'null' || s === 'undefined' || s === 'false' || s === 'true' || s === '0') return true;
  return false;
}

function isLikelyVideoUrl(raw) {
  const s = stripUrlQueryHash(raw).toLowerCase();
  if (!s) return false;
  if (s.includes('youtube.com') || s.includes('youtu.be')) return true;
  return /\.(mp4|webm|mov|mkv|avi|m4v|flv|wmv|m3u8|mpd)(?:$)/i.test(s);
}

function isLikelyImageUrl(raw) {
  const s = toCleanString(raw).toLowerCase();
  if (!s) return false;
  if (s.startsWith('data:image/')) return true;
  if (s.startsWith('/')) return true;
  if (s.startsWith('http://') || s.startsWith('https://')) return true;
  if (s.startsWith('//')) return true;
  return false;
}

function coerceGalleryArray(value) {
  if (Array.isArray(value)) return value;
  const s = toCleanString(value);
  if (!s) return [];

  // Allow JSON array string.
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  // Accept comma-separated list as a fallback.
  if (s.includes(',')) {
    return s.split(',').map(v => toCleanString(v)).filter(Boolean);
  }

  // Single URL string
  return [s];
}

function normalizeGalleryImages(body) {
  const raw = body && (body.gallery_images ?? body.gallery_urls);
  const input = coerceGalleryArray(raw);

  const normalizedMainThumb = stripUrlQueryHash(body?.thumbnail_url || '');
  const normalizedVideo = stripUrlQueryHash(body?.video_url || '');

  const seen = new Set();
  const out = [];

  for (const item of input) {
    const url = toCleanString(item);
    if (isBadMediaValue(url)) continue;
    if (isLikelyVideoUrl(url)) continue;
    if (!isLikelyImageUrl(url)) continue;

    const normalized = stripUrlQueryHash(url);
    if (!normalized) continue;
    if (normalizedMainThumb && normalized === normalizedMainThumb) continue;
    if (normalizedVideo && normalized === normalizedVideo) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    out.push(url);
    // Hard cap to keep payloads sane.
    if (out.length >= 50) break;
  }

  return out;
}

/**
 * Get active products (public)
 * OPTIMIZED: Single JOIN query + Pagination Support
 */
export async function getProducts(env, url) {
  // Parsing pagination params
  const params = url ? new URL(url).searchParams : { get: () => null };
  const page = parseInt(params.get('page')) || 1;
  // logic: if limit explicitly provided, use it. if not, use 1000 (legacy mode)
  const limitStr = params.get('limit');
  const limit = limitStr ? parseInt(limitStr) : 1000;
  const offset = (page - 1) * limit;
  const filter = params.get('filter') || 'all';

  const kvKey = `api_cache:products:list:${page}:${limit}:${filter}`;
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return cachedJson(JSON.parse(cached), 120);
      }
    } catch(e) {}
  }

  // Cache key based on params
  const now = Date.now();

  // Return cached data ONLY if no specific limit/filter provided (default view)
  if (!limitStr && filter === 'all' && productsCache && (now - productsCacheTime) < PRODUCTS_CACHE_TTL) {
    const defaultData = { products: productsCache, pagination: { page: 1, limit: 1000, total: productsCache.length, pages: 1 } };
    if (env.PAGE_CACHE) {
      await (async () => { const _kvP = env.PAGE_CACHE.put(kvKey, JSON.stringify(defaultData), { expirationTtl: 86400 }).catch(()=>{}); if (env.ctx && env.ctx.waitUntil) env.ctx.waitUntil(_kvP); else await _kvP; })()
    }
    return cachedJson(defaultData, 120);
  }

  // Build Query
  let whereClause = `WHERE ${buildPublicProductStatusWhere('p.status')}`;
  if (filter === 'featured') {
    whereClause += " AND p.featured = 1";
  }

  // Get Total Count
  const totalRow = await env.DB.prepare(`SELECT COUNT(*) as count FROM products p ${whereClause}`).first();
  const total = totalRow?.count || 0;

  const r = await env.DB.prepare(`
    SELECT
      p.id, p.title, p.slug, p.normal_price, p.sale_price,
      p.thumbnail_url, p.normal_delivery_text, p.instant_delivery,
      p.featured,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') as review_count,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'approved') as rating_average
    FROM products p
    ${whereClause}
    ORDER BY p.sort_order ASC, p.id DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const products = (r.results || []).map(product => ({
    ...product,
    delivery_time_days: parseInt(product.normal_delivery_text) || 1,
    review_count: product.review_count || 0,
    rating_average: product.rating_average ? Math.round(product.rating_average * 10) / 10 : 0
  }));

  // Update legacy cache if this was a default request
  if (!limitStr && filter === 'all') {
    productsCache = products;
    productsCacheTime = Date.now();
  }

  const responseData = {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  if (env.PAGE_CACHE) {
    await (async () => { const _kvP = env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 }).catch(()=>{}); if (env.ctx && env.ctx.waitUntil) env.ctx.waitUntil(_kvP); else await _kvP; })()
  }

  // Cache for 2 minutes on edge
  return cachedJson(responseData, 120);
}

/**
 * Get all products (admin)
 */
export async function getProductsList(env) {
  const r = await env.DB.prepare(
    'SELECT id, title, slug, normal_price, sale_price, thumbnail_url, normal_delivery_text, instant_delivery, status FROM products ORDER BY id DESC'
  ).all();
  
  const products = (r.results || []).map(product => ({
    ...product,
    delivery_time_days: parseInt(product.normal_delivery_text) || 1
  }));
  
  return json({ products });
}

/**
 * Get single product by ID or slug
 * OPTIMIZED: Uses Promise.all for parallel queries
 */
export async function getProduct(env, id, opts = {}) {
  const includeHidden = !!opts.includeHidden;

  const kvKey = `api_cache:products:get:${id}:${includeHidden}`;
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return json(JSON.parse(cached));
      }
    } catch(e) {}
  }

  const visibilitySql = includeHidden ? '' : ` AND ${buildPublicProductStatusWhere('status')}`;
  let row;
  if (isNaN(Number(id))) {
    row = await env.DB.prepare(`SELECT * FROM products WHERE slug = ?${visibilitySql}`).bind(id).first();
  } else {
    row = await env.DB.prepare(`SELECT * FROM products WHERE id = ?${visibilitySql}`).bind(Number(id)).first();
  }
  if (!row) return json({ error: 'Product not found' }, 404);
  
  let addons = [];
  try {
    addons = JSON.parse(row.addons_json || '[]');
  } catch(e) {
    console.error('Failed to parse addons_json for product', row.id, ':', e.message);
  }
  
  // OPTIMIZED: Run stats and reviews queries in parallel
  const [stats, reviewsResult] = await Promise.all([
    env.DB.prepare(
      'SELECT COUNT(*) as cnt, AVG(rating) as avg FROM reviews WHERE product_id = ? AND status = ?'
    ).bind(row.id, 'approved').first(),
    env.DB.prepare(
      `SELECT reviews.*,
              -- Prefer review overrides first; fall back to order delivery links
              COALESCE(reviews.delivered_video_url, orders.delivered_video_url) as delivered_video_url,
              COALESCE(reviews.delivered_thumbnail_url, orders.delivered_thumbnail_url) as delivered_thumbnail_url,
              orders.delivered_video_metadata
       FROM reviews 
       LEFT JOIN orders ON reviews.order_id = orders.order_id 
       WHERE reviews.product_id = ? AND reviews.status = ? 
       ORDER BY reviews.created_at DESC`
    ).bind(row.id, 'approved').all()
  ]);

  // Convert created_at to ISO 8601 format
  const reviews = (reviewsResult.results || []).map(review => {
    if (review.created_at && typeof review.created_at === 'string') {
      review.created_at = toISO8601(review.created_at);
    }
    if (review.updated_at && typeof review.updated_at === 'string') {
      review.updated_at = toISO8601(review.updated_at);
    }
    return review;
  });
  
  // Extract delivery_time_days from normal_delivery_text (stores days as number string)
  const deliveryTimeDays = parseInt(row.normal_delivery_text) || 1;
  
  const responseData = {
    product: {
      ...row,
      delivery_time_days: deliveryTimeDays,
      addons,
      review_count: stats?.cnt || 0,
      rating_average: stats?.avg ? Math.round(stats.avg * 10) / 10 : 5.0,
      reviews: reviews
    },
    addons
  };

  if (env.PAGE_CACHE) {
    await (async () => { const _kvP = env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 }).catch(()=>{}); if (env.ctx && env.ctx.waitUntil) env.ctx.waitUntil(_kvP); else await _kvP; })()
  }

  return json(responseData);
}

/**
 * Check if slug is available for use (not used by another product)
 * @param {Object} env - Environment object with DB
 * @param {string} slug - The slug to check
 * @param {number|null} excludeId - Product ID to exclude (for edit mode)
 * @returns {Object} - { available: boolean, suggestions: string[] }
 */
async function checkSlugAvailable(env, slug, excludeId = null) {
  const cleanSlug = (slug || '').trim().toLowerCase();
  if (!cleanSlug) return { available: false, suggestions: [] };

  let query = 'SELECT id, title FROM products WHERE LOWER(slug) = ?';
  const params = [cleanSlug];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(Number(excludeId));
  }

  const result = await env.DB.prepare(query).bind(...params).all();

  if (result.length === 0) {
    return { available: true, suggestions: [] };
  }

  // Generate suggestions
  const suggestions = [];
  const baseSlug = cleanSlug.replace(/-(\d+)$/, '');
  for (let i = 1; i <= 3; i++) {
    suggestions.push(`${baseSlug}-${i}`);
  }
  if (result[0]?.title) {
    const titleSlug = slugifyStr(result[0].title).toLowerCase();
    if (titleSlug !== cleanSlug && !suggestions.includes(titleSlug)) {
      suggestions.unshift(titleSlug);
    }
  }

  return { available: false, suggestions };
}

/**
 * Save product (create or update)
 * SECURITY: Slug uniqueness check added - prevents duplicate slugs
 * URL FORMAT: Changed to /product/<slug> (no ID in URL)
 */
export async function saveProduct(env, body) {
  const title = (body.title || '').trim();
  if (!title) return json({ error: 'Title required' }, 400);
  
  // Invalidate products cache
  productsCache = null;
  productsCacheTime = 0;
  
  let slug = (body.slug || '').trim() || slugifyStr(title);
  const addonsJson = JSON.stringify(body.addons || []);
  const galleryJson = JSON.stringify(normalizeGalleryImages(body));
  const { hasCreatedAt, hasUpdatedAt } = await getProductTimestampSupport(env);
  
  const deliveryDays = body.delivery_time_days || body.normal_delivery_text || '1';

  // SECURITY CHECK: Validate slug uniqueness before saving
  const slugCheck = await checkSlugAvailable(env, slug, body.id || null);
  if (!slugCheck.available) {
    return json({
      error: `Slug '${slug}' is already taken by another product`,
      suggestions: slugCheck.suggestions
    }, 400);
  }

  if (body.id) {
    // UPDATE existing product
    await env.DB.prepare(`
      UPDATE products SET title=?, slug=?, description=?, normal_price=?, sale_price=?,
      instant_delivery=?, normal_delivery_text=?, thumbnail_url=?, video_url=?,
      gallery_images=?, addons_json=?, seo_title=?, seo_description=?, seo_keywords=?, seo_canonical=?,
      whop_plan=?, whop_price_map=?, whop_product_id=?${hasUpdatedAt ? ', updated_at=CURRENT_TIMESTAMP' : ''} WHERE id=?
    `).bind(
      title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
      body.instant_delivery ? 1 : 0, String(deliveryDays),
      body.thumbnail_url || '', body.video_url || '', galleryJson, addonsJson,
      body.seo_title || '', body.seo_description || '', body.seo_keywords || '', body.seo_canonical || '',
      body.whop_plan || '', body.whop_price_map || '', body.whop_product_id || '', Number(body.id)
    ).run();
    return json({ success: true, id: body.id, slug, url: `/product/${encodeURIComponent(slug)}` });
  }

  // INSERT new product
  const r = await env.DB.prepare(`
    INSERT INTO products (title, slug, description, normal_price, sale_price,
    instant_delivery, normal_delivery_text, thumbnail_url, video_url,
    gallery_images, addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
    whop_plan, whop_price_map, whop_product_id, status, sort_order${hasCreatedAt ? ', created_at' : ''}${hasUpdatedAt ? ', updated_at' : ''})
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0${hasCreatedAt ? ', CURRENT_TIMESTAMP' : ''}${hasUpdatedAt ? ', CURRENT_TIMESTAMP' : ''})
  `).bind(
    title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
    body.instant_delivery ? 1 : 0, String(deliveryDays),
    body.thumbnail_url || '', body.video_url || '', galleryJson, addonsJson,
    body.seo_title || '', body.seo_description || '', body.seo_keywords || '', body.seo_canonical || '',
    body.whop_plan || '', body.whop_price_map || '', body.whop_product_id || ''
  ).run();
  const newId = r.meta?.last_row_id;
  return json({ success: true, id: newId, slug, url: `/product/${encodeURIComponent(slug)}` });
}

/**
 * Delete product
 */
export async function deleteProduct(env, id) {
  if (!id) return json({ error: 'ID required' }, 400);
  
  // Invalidate products cache
  productsCache = null;
  productsCacheTime = 0;
  
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

/**
 * Delete all products (admin cleanup)
 */
export async function deleteAllProducts(env) {
  try {
    // Invalidate products cache
    productsCache = null;
    productsCacheTime = 0;

    const result = await env.DB.prepare('DELETE FROM products').run();
    return json({ success: true, count: result?.changes || 0 });
  } catch (err) {
    return json({ error: err.message || 'Failed to delete all products' }, 500);
  }
}

/**
 * Update product status
 */
export async function updateProductStatus(env, body) {
  const id = body.id;
  const status = (body.status || '').trim().toLowerCase();
  if (!id || !status) {
    return json({ error: 'id and status required' }, 400);
  }
  if (status !== 'active' && status !== 'draft') {
    return json({ error: 'invalid status' }, 400);
  }
  
  // Invalidate products cache
  productsCache = null;
  productsCacheTime = 0;
  const { hasUpdatedAt } = await getProductTimestampSupport(env);
  
  await env.DB.prepare(
    `UPDATE products SET status = ?${hasUpdatedAt ? ', updated_at = CURRENT_TIMESTAMP' : ''} WHERE id = ?`
  ).bind(status, Number(id)).run();
  return json({ success: true });
}

/**
 * Duplicate product
 */
export async function duplicateProduct(env, body) {
  const id = body.id;
  if (!id) {
    return json({ error: 'id required' }, 400);
  }
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(id)).first();
  if (!row) {
    return json({ error: 'Product not found' }, 404);
  }
  const baseSlug = row.slug || slugifyStr(row.title);
  let newSlug = baseSlug + '-copy';
  let idx = 1;
  const { hasCreatedAt, hasUpdatedAt } = await getProductTimestampSupport(env);
  
  let newId;
  while (true) {
    try {
      const r = await env.DB.prepare(
        `INSERT INTO products (
          title, slug, description, normal_price, sale_price,
          instant_delivery, normal_delivery_text, thumbnail_url, video_url,
          addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
          whop_plan, whop_price_map, whop_product_id, status, sort_order${hasCreatedAt ? ', created_at' : ''}${hasUpdatedAt ? ', updated_at' : ''}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasCreatedAt ? ', CURRENT_TIMESTAMP' : ''}${hasUpdatedAt ? ', CURRENT_TIMESTAMP' : ''})`
      ).bind(
        (row.title || '') + ' Copy',
        newSlug,
        row.description || '',
        row.normal_price || 0,
        row.sale_price || null,
        row.instant_delivery || 0,
        row.normal_delivery_text || '',
        row.thumbnail_url || '',
        row.video_url || '',
        row.addons_json || '[]',
        row.seo_title || '',
        row.seo_description || '',
        row.seo_keywords || '',
        row.seo_canonical || '',
        row.whop_plan || '',
        row.whop_price_map || '',
        row.whop_product_id || '',
        'draft',
        0
      ).run();
      newId = r.meta?.last_row_id;
      break;
    } catch (err) {
      if (!err.message.includes('UNIQUE constraint')) throw err;
      newSlug = `${baseSlug}-copy${idx++}`;
    }
  }
  return json({ success: true, id: newId, slug: newSlug });
}

/**
 * Get adjacent products (next/previous) for navigation
 * OPTIMIZED: Uses Promise.all for parallel queries
 */
export async function getAdjacentProducts(env, id) {
  const productId = Number(id);
  if (!productId) return json({ error: 'Product ID required' }, 400);
  
  // Get current product's sort_order
  const current = await env.DB.prepare(
    `SELECT id, sort_order FROM products WHERE id = ? AND ${buildPublicProductStatusWhere('status')}`
  ).bind(productId).first();
  
  if (!current) return json({ error: 'Product not found' }, 404);
  
  // OPTIMIZED: Run prev and next queries in parallel
  const [prev, next] = await Promise.all([
    // Get previous product (higher sort_order or lower id if same sort_order)
    env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url 
      FROM products 
      WHERE ${buildPublicProductStatusWhere('status')} 
      AND (
        sort_order < ? 
        OR (sort_order = ? AND id > ?)
      )
      ORDER BY sort_order DESC, id ASC
      LIMIT 1
    `).bind(current.sort_order, current.sort_order, productId).first(),
    // Get next product (lower sort_order or higher id if same sort_order)
    env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url 
      FROM products 
      WHERE ${buildPublicProductStatusWhere('status')} 
      AND (
        sort_order > ? 
        OR (sort_order = ? AND id < ?)
      )
      ORDER BY sort_order ASC, id DESC
      LIMIT 1
    `).bind(current.sort_order, current.sort_order, productId).first()
  ]);
  
  return json({
    previous: prev ? {
      id: prev.id,
      title: prev.title,
      slug: prev.slug,
      thumbnail_url: prev.thumbnail_url,
      url: `/product/${encodeURIComponent(prev.slug || '')}`
    } : null,
    next: next ? {
      id: next.id,
      title: next.title,
      slug: next.slug,
      thumbnail_url: next.thumbnail_url,
      url: `/product/${encodeURIComponent(next.slug || '')}`
    } : null
  });
}

/**
 * Handle product routing (canonical URLs and redirects)
 * OPTIMIZED: Uses in-memory cache to reduce DB queries on cold start
 */
export async function handleProductRouting(env, url, path) {
  const now = Date.now();
  const buildCanonicalResponse = (product) => {
    const canonicalPath = canonicalProductPath({
      id: product.id,
      slug: product.slug,
      title: product.title || `product-${product.id}`
    });
    const target = new URL(url.toString());
    target.pathname = canonicalPath;
    target.search = '';

    return new Response(null, {
      status: 301,
      headers: {
        'Location': target.toString(),
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex, nofollow',
        'Link': `<${target.toString()}>; rel="canonical"`
      }
    });
  };

  // Helper to get product from cache or DB
  async function getProductById(id) {
    const cacheKey = `id:${id}`;
    const cached = productSlugCache.get(cacheKey);
    if (cached && (now - cached.time) < SLUG_CACHE_TTL) {
      return cached.data;
    }
    const p = await env.DB.prepare('SELECT id, title, slug FROM products WHERE id = ? LIMIT 1').bind(Number(id)).first();
    if (p) {
      productSlugCache.set(cacheKey, { data: p, time: now });
    }
    return p;
  }

  async function getProductBySlug(slug) {
    const cacheKey = `slug:${slug}`;
    const cached = productSlugCache.get(cacheKey);
    if (cached && (now - cached.time) < SLUG_CACHE_TTL) {
      return cached.data;
    }
    const p = await env.DB.prepare('SELECT id, title, slug FROM products WHERE slug = ? LIMIT 1').bind(slug).first();
    if (p) {
      productSlugCache.set(cacheKey, { data: p, time: now });
      productSlugCache.set(`id:${p.id}`, { data: p, time: now });
    }
    return p;
  }

  /*
   * Legacy handling - Redirects to new canonical format /product/<slug>
   *
   * Old URLs (301 redirect to new format):
   *   1. /product?id=123      → /product/<slug>
   *   2. /product/<slug>      → /product/<slug> (no change)
   *   3. /product-123/<slug> → /product/<slug>
   */

  // Handle legacy /product?id=123
  const legacyId = (path === '/product') ? url.searchParams.get('id') : null;
  if (legacyId) {
    const p = await getProductById(legacyId);
    if (p) {
      return buildCanonicalResponse(p);
    }
  }

  // Handle legacy /product/<slug>
  if (path.startsWith('/product/') && path.length > '/product/'.length) {
    const slugIn = decodeURIComponent(path.slice('/product/'.length));
    const row = await getProductBySlug(slugIn);
    if (row) {
      return buildCanonicalResponse(row);
    }
  }

  // Handle legacy /product-<id> (bare)
  const bareCanonicalMatch = path.match(/^\/product-(\d+)\/?$/);
  if (bareCanonicalMatch) {
    const row = await getProductById(bareCanonicalMatch[1]);
    if (row) {
      return buildCanonicalResponse(row);
    }
  }

  // Handle legacy /product-<id>/<slug> → redirect to /product/<slug>
  const legacyIdSlugMatch = path.match(/^\/product-(\d+)\/(.+)$/);
  if (legacyIdSlugMatch) {
    const row = await getProductById(legacyIdSlugMatch[1]);
    if (row) {
      return buildCanonicalResponse(row);
    }
  }

  return null;
}
