/**
 * Products controller - Product CRUD operations
 * OPTIMIZED: Added in-memory caching for frequently accessed products
 */

import { json, cachedJson } from '../utils/response.js';
import { slugifyStr, toISO8601 } from '../utils/formatting.js';

// In-memory cache for products list (reduces DB queries)
let productsCache = null;
let productsCacheTime = 0;
const PRODUCTS_CACHE_TTL = 30000; // 30 seconds

/**
 * Get active products (public)
 * OPTIMIZED: Single JOIN query + Edge caching + In-memory caching
 */
export async function getProducts(env) {
  const now = Date.now();
  
  // Return cached data if still valid
  if (productsCache && (now - productsCacheTime) < PRODUCTS_CACHE_TTL) {
    return cachedJson({ products: productsCache }, 120);
  }
  
  const r = await env.DB.prepare(`
    SELECT
      p.id, p.title, p.slug, p.normal_price, p.sale_price,
      p.thumbnail_url, p.normal_delivery_text, p.instant_delivery,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') as review_count,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'approved') as rating_average
    FROM products p
    WHERE p.status = ?
    ORDER BY p.sort_order ASC, p.id DESC
  `).bind('active').all();

  const products = (r.results || []).map(product => ({
    ...product,
    delivery_time_days: parseInt(product.normal_delivery_text) || 1,
    review_count: product.review_count || 0,
    rating_average: product.rating_average ? Math.round(product.rating_average * 10) / 10 : 0
  }));

  // Update cache
  productsCache = products;
  productsCacheTime = Date.now();

  // Cache for 2 minutes on edge
  return cachedJson({ products }, 120);
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
export async function getProduct(env, id) {
  let row;
  if (isNaN(Number(id))) {
    row = await env.DB.prepare('SELECT * FROM products WHERE slug = ?').bind(id).first();
  } else {
    row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(id)).first();
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
      `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url 
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
  
  return json({
    product: {
      ...row,
      delivery_time_days: deliveryTimeDays,
      addons,
      review_count: stats?.cnt || 0,
      rating_average: stats?.avg ? Math.round(stats.avg * 10) / 10 : 5.0,
      reviews: reviews
    },
    addons
  });
}

/**
 * Save product (create or update)
 */
export async function saveProduct(env, body) {
  const title = (body.title || '').trim();
  if (!title) return json({ error: 'Title required' }, 400);
  
  // Invalidate products cache
  productsCache = null;
  productsCacheTime = 0;
  
  const slug = (body.slug || '').trim() || slugifyStr(title);
  const addonsJson = JSON.stringify(body.addons || []);
  
  if (body.id) {
    const galleryJson = Array.isArray(body.gallery_images) 
      ? JSON.stringify(body.gallery_images) 
      : (body.gallery_images || '[]');
    
    // Store delivery_time_days in normal_delivery_text field as days number
    const deliveryDays = body.delivery_time_days || body.normal_delivery_text || '1';
    
    await env.DB.prepare(`
      UPDATE products SET title=?, slug=?, description=?, normal_price=?, sale_price=?,
      instant_delivery=?, normal_delivery_text=?, thumbnail_url=?, video_url=?,
      gallery_images=?, addons_json=?, seo_title=?, seo_description=?, seo_keywords=?, seo_canonical=?,
      whop_plan=?, whop_price_map=?, whop_product_id=? WHERE id=?
    `).bind(
      title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
      body.instant_delivery ? 1 : 0, String(deliveryDays),
      body.thumbnail_url || '', body.video_url || '', galleryJson, addonsJson,
      body.seo_title || '', body.seo_description || '', body.seo_keywords || '', body.seo_canonical || '',
      body.whop_plan || '', body.whop_price_map || '', body.whop_product_id || '', Number(body.id)
    ).run();
    return json({ success: true, id: body.id, slug, url: `/product-${body.id}/${encodeURIComponent(slug)}` });
  }
  
  const galleryJson = Array.isArray(body.gallery_images) 
    ? JSON.stringify(body.gallery_images) 
    : (body.gallery_images || '[]');
  
  // Store delivery_time_days in normal_delivery_text field as days number
  const deliveryDays = body.delivery_time_days || body.normal_delivery_text || '1';
  
  const r = await env.DB.prepare(`
    INSERT INTO products (title, slug, description, normal_price, sale_price,
    instant_delivery, normal_delivery_text, thumbnail_url, video_url,
    gallery_images, addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
    whop_plan, whop_price_map, whop_product_id, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
  `).bind(
    title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
    body.instant_delivery ? 1 : 0, String(deliveryDays),
    body.thumbnail_url || '', body.video_url || '', galleryJson, addonsJson,
    body.seo_title || '', body.seo_description || '', body.seo_keywords || '', body.seo_canonical || '',
    body.whop_plan || '', body.whop_price_map || '', body.whop_product_id || ''
  ).run();
  const newId = r.meta?.last_row_id;
  return json({ success: true, id: newId, slug, url: `/product-${newId}/${encodeURIComponent(slug)}` });
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
  
  await env.DB.prepare('UPDATE products SET status = ? WHERE id = ?').bind(status, Number(id)).run();
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
  let exists = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(newSlug).first();
  while (exists) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx++;
    exists = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(newSlug).first();
  }
  
  const r = await env.DB.prepare(
    `INSERT INTO products (
      title, slug, description, normal_price, sale_price,
      instant_delivery, normal_delivery_text, thumbnail_url, video_url,
      addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
      whop_plan, whop_price_map, status, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    'draft',
    0
  ).run();
  return json({ success: true, id: r.meta?.last_row_id, slug: newSlug });
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
    'SELECT id, sort_order FROM products WHERE id = ? AND status = ?'
  ).bind(productId, 'active').first();
  
  if (!current) return json({ error: 'Product not found' }, 404);
  
  // OPTIMIZED: Run prev and next queries in parallel
  const [prev, next] = await Promise.all([
    // Get previous product (higher sort_order or lower id if same sort_order)
    env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url 
      FROM products 
      WHERE status = 'active' 
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
      WHERE status = 'active' 
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
      url: `/product-${prev.id}/${encodeURIComponent(prev.slug || '')}`
    } : null,
    next: next ? {
      id: next.id,
      title: next.title,
      slug: next.slug,
      thumbnail_url: next.thumbnail_url,
      url: `/product-${next.id}/${encodeURIComponent(next.slug || '')}`
    } : null
  });
}

/**
 * Handle product routing (canonical URLs and redirects)
 */
export async function handleProductRouting(env, url, path) {
  // Legacy: /product?id=123 -> /product-123/<slug>
  const legacyId = (path === '/product') ? url.searchParams.get('id') : null;
  if (legacyId) {
    const p = await env.DB.prepare('SELECT id, title, slug FROM products WHERE id = ? LIMIT 1').bind(Number(legacyId)).first();
    if (p) {
      const slug = p.slug ? String(p.slug) : slugifyStr(p.title);
      if (!p.slug) {
        try {
          await env.DB.prepare('UPDATE products SET slug = ? WHERE id = ?').bind(slug, Number(p.id)).run();
        } catch (e) {}
      }
      const canonical = `/product-${p.id}/${encodeURIComponent(slug)}`;
      return Response.redirect(`${url.origin}${canonical}`, 301);
    }
  }

  // Old pretty: /product/<slug> -> /product-<id>/<slug>
  if (path.startsWith('/product/') && path.length > '/product/'.length) {
    const slugIn = decodeURIComponent(path.slice('/product/'.length));
    const row = await env.DB.prepare('SELECT id, title, slug FROM products WHERE slug = ? LIMIT 1').bind(slugIn).first();
    if (row) {
      const canonicalSlug = row.slug ? String(row.slug) : slugifyStr(row.title);
      if (!row.slug) {
        try {
          await env.DB.prepare('UPDATE products SET slug = ? WHERE id = ?').bind(canonicalSlug, Number(row.id)).run();
        } catch (e) {}
      }
      const canonical = `/product-${row.id}/${encodeURIComponent(canonicalSlug)}`;
      return Response.redirect(`${url.origin}${canonical}`, 301);
    }
  }

  return null;
}
