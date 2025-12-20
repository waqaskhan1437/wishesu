// Products API controller
import { json } from '../utils/response.js';
import { slugifyStr } from '../utils/helpers.js';

/**
 * Get all active products with review statistics
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
 */
export async function getProducts(env) {
  const r = await env.DB.prepare(
    'SELECT id, title, slug, normal_price, sale_price, thumbnail_url, normal_delivery_text FROM products WHERE status = ? ORDER BY sort_order ASC, id DESC'
  ).bind('active').all();
  
  // Fetch review statistics for each product
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
 * Get a single product by ID or slug with reviews
 * @param {Object} env - Environment bindings
 * @param {string} id - Product ID or slug
 * @returns {Promise<Response>}
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
  
  // Fetch reviews for rich results schema (directly use review's own video URLs)
  const reviewsResult = await env.DB.prepare(
    `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url 
     FROM reviews 
     LEFT JOIN orders ON reviews.order_id = orders.order_id 
     WHERE reviews.product_id = ? AND reviews.status = ? 
     ORDER BY reviews.created_at DESC`
  ).bind(row.id, 'approved').all();

  // Convert created_at to ISO 8601 format with Z suffix for UTC
  const reviews = (reviewsResult.results || []).map(review => {
    if (review.created_at && typeof review.created_at === 'string') {
      review.created_at = review.created_at.replace(' ', 'T') + 'Z';
    }
    if (review.updated_at && typeof review.updated_at === 'string') {
      review.updated_at = review.updated_at.replace(' ', 'T') + 'Z';
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
 * Save a product (create or update)
 * @param {Object} env - Environment bindings
 * @param {Object} body - Product data
 * @returns {Promise<Response>}
 */
export async function saveProduct(env, body) {
  const title = (body.title || '').trim();
  if (!title) return json({ error: 'Title required' }, 400);
  
  const slug = (body.slug || '').trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const addonsJson = JSON.stringify(body.addons || []);
  
  if (body.id) {
    // Prepare gallery_images as JSON string if it's an array
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
  
  // Prepare gallery_images as JSON string if it's an array
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
 * Delete a product
 * @param {Object} env - Environment bindings
 * @param {string} id - Product ID
 * @returns {Promise<Response>}
 */
export async function deleteProduct(env, id) {
  if (!id) return json({ error: 'ID required' }, 400);
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

/**
 * Get all products for admin (including inactive)
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
 */
export async function getProductsList(env) {
  const r = await env.DB.prepare(
    'SELECT id, title, slug, normal_price, sale_price, thumbnail_url, normal_delivery_text, status FROM products ORDER BY id DESC'
  ).all();
  return json({ products: r.results || [] });
}

/**
 * Update product status
 * @param {Object} env - Environment bindings
 * @param {Object} body - Request body with id and status
 * @returns {Promise<Response>}
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
 * Duplicate a product
 * @param {Object} env - Environment bindings
 * @param {Object} body - Request body with id
 * @returns {Promise<Response>}
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
  const baseSlug = row.slug || row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Determine unique new slug
  let newSlug = baseSlug + '-copy';
  let idx = 1;
  let exists = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(newSlug).first();
  while (exists) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx++;
    exists = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(newSlug).first();
  }
  // Copy all relevant fields into a new product row
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