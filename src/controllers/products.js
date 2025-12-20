/**
 * Products controller - Product CRUD operations
 */

import { json } from '../utils/response.js';
import { slugifyStr, toISO8601 } from '../utils/formatting.js';

/**
 * Get active products (public)
 */
export async function getProducts(env) {
  const r = await env.DB.prepare(
    'SELECT id, title, slug, normal_price, sale_price, thumbnail_url, normal_delivery_text FROM products WHERE status = ? ORDER BY sort_order ASC, id DESC'
  ).bind('active').all();
  
  const products = r.results || [];
  const productsWithReviews = await Promise.all(products.map(async (product) => {
    const stats = await env.DB.prepare(
      'SELECT COUNT(*) as cnt, AVG(rating) as avg FROM reviews WHERE product_id = ? AND status = ?'
    ).bind(product.id, 'approved').first();
    
    return {
      ...product,
      review_count: stats?.cnt || 0,
      rating_average: stats?.avg ? Math.round(stats.avg * 10) / 10 : 0
    };
  }));
  
  return json({ products: productsWithReviews });
}

/**
 * Get all products (admin)
 */
export async function getProductsList(env) {
  const r = await env.DB.prepare(
    'SELECT id, title, slug, normal_price, sale_price, thumbnail_url, normal_delivery_text, status FROM products ORDER BY id DESC'
  ).all();
  return json({ products: r.results || [] });
}

/**
 * Get single product by ID or slug
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
  
  const stats = await env.DB.prepare(
    'SELECT COUNT(*) as cnt, AVG(rating) as avg FROM reviews WHERE product_id = ? AND status = ?'
  ).bind(row.id, 'approved').first();
  
  // Fetch reviews for rich results schema
  const reviewsResult = await env.DB.prepare(
    `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url 
     FROM reviews 
     LEFT JOIN orders ON reviews.order_id = orders.order_id 
     WHERE reviews.product_id = ? AND reviews.status = ? 
     ORDER BY reviews.created_at DESC`
  ).bind(row.id, 'approved').all();

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
  
  return json({
    product: {
      ...row,
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
  
  const slug = (body.slug || '').trim() || slugifyStr(title);
  const addonsJson = JSON.stringify(body.addons || []);
  
  if (body.id) {
    const galleryJson = Array.isArray(body.gallery_images) 
      ? JSON.stringify(body.gallery_images) 
      : (body.gallery_images || '[]');
    
    await env.DB.prepare(`
      UPDATE products SET title=?, slug=?, description=?, normal_price=?, sale_price=?,
      instant_delivery=?, normal_delivery_text=?, thumbnail_url=?, video_url=?,
      gallery_images=?, addons_json=?, seo_title=?, seo_description=?, seo_keywords=?, seo_canonical=?,
      whop_plan=?, whop_price_map=?, whop_product_id=? WHERE id=?
    `).bind(
      title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
      body.instant_delivery ? 1 : 0, body.normal_delivery_text || '',
      body.thumbnail_url || '', body.video_url || '', galleryJson, addonsJson,
      body.seo_title || '', body.seo_description || '', body.seo_keywords || '', body.seo_canonical || '',
      body.whop_plan || '', body.whop_price_map || '', body.whop_product_id || '', Number(body.id)
    ).run();
    return json({ success: true, id: body.id, slug, url: `/product-${body.id}/${encodeURIComponent(slug)}` });
  }
  
  const galleryJson = Array.isArray(body.gallery_images) 
    ? JSON.stringify(body.gallery_images) 
    : (body.gallery_images || '[]');
  
  const r = await env.DB.prepare(`
    INSERT INTO products (title, slug, description, normal_price, sale_price,
    instant_delivery, normal_delivery_text, thumbnail_url, video_url,
    gallery_images, addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
    whop_plan, whop_price_map, whop_product_id, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
  `).bind(
    title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
    body.instant_delivery ? 1 : 0, body.normal_delivery_text || '',
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
