// Reviews API controller
import { json } from '../utils/response.js';

/**
 * Get all reviews with optional filtering
 * @param {Object} env - Environment bindings
 * @param {URL} url - Request URL with query parameters
 * @returns {Promise<Response>}
 */
export async function getReviews(env, url) {
  // Support filtering by productId(s), ids and rating via query parameters.
  const params = url.searchParams;
  const rating = params.get('rating');
  const productId = params.get('productId');
  const productIds = params.get('productIds');
  const ids = params.get('ids');
  let sql = 'SELECT r.*, p.title as product_title FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.status = ?';
  /**
   * Bind values can be strings or numbers.  TypeScript incorrectly infers
   * this array as `string[]` because the first value is a string, which causes
   * type errors when numbers are pushed.  Annotate the type explicitly to
   * avoid type errors in the Cloudflare editor.
   * @type {(string|number)[]}
   */
  const binds = ['approved'];
  // Filter by rating
  if (rating) {
    sql += ' AND r.rating = ?';
    binds.push(Number(rating));
  }
  // Filter by single product
  if (productId) {
    sql += ' AND r.product_id = ?';
    binds.push(Number(productId));
  }
  // Filter by multiple products
  if (productIds) {
    const idsArr = productIds.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    if (idsArr.length > 0) {
      sql += ` AND r.product_id IN (${idsArr.map(() => '?').join(',')})`;
      binds.push(...idsArr);
    }
  }
  // Filter by specific review IDs
  if (ids) {
    const idsArr2 = ids.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    if (idsArr2.length > 0) {
      sql += ` AND r.id IN (${idsArr2.map(() => '?').join(',')})`;
      binds.push(...idsArr2);
    }
  }
  sql += ' ORDER BY r.created_at DESC';
  const stmt = await env.DB.prepare(sql);
  const r = await stmt.bind(...binds).all();

  // Convert created_at to ISO 8601 format with Z suffix for UTC
  const reviews = (r.results || []).map(review => {
    if (review.created_at && typeof review.created_at === 'string') {
      review.created_at = review.created_at.replace(' ', 'T') + 'Z';
    }
    return review;
  });

  return json({ reviews });
}

/**
 * Get reviews for a specific product
 * @param {Object} env - Environment bindings
 * @param {string} productId - Product ID
 * @returns {Promise<Response>}
 */
export async function getProductReviews(env, productId) {
   const r = await env.DB.prepare(
     `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url 
      FROM reviews 
      LEFT JOIN orders ON reviews.order_id = orders.order_id 
      WHERE reviews.product_id = ? AND reviews.status = ? 
      ORDER BY reviews.created_at DESC`
   ).bind(Number(productId), 'approved').all();

   // Convert created_at to ISO 8601 format with Z suffix for UTC
   const reviews = (r.results || []).map(review => {
     if (review.created_at && typeof review.created_at === 'string') {
       review.created_at = review.created_at.replace(' ', 'T') + 'Z';
     }
     return review;
   });

   return json({ reviews });
}

/**
 * Add a new review
 * @param {Object} env - Environment bindings
 * @param {Object} body - Review data
 * @returns {Promise<Response>}
 */
export async function addReview(env, body) {
  if (!body.productId || !body.rating) return json({ error: 'productId and rating required' }, 400);
  
  await env.DB.prepare(
    'INSERT INTO reviews (product_id, author_name, rating, comment, status, order_id, show_on_product) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(Number(body.productId), body.author || 'Customer', Number(body.rating), body.comment || '', 'approved', body.orderId || null, body.showOnProduct !== undefined ? (body.showOnProduct ? 1 : 0) : 1).run();
  
  return json({ success: true });
}

/**
 * Update a review
 * @param {Object} env - Environment bindings
 * @param {Object} body - Update data
 * @returns {Promise<Response>}
 */
export async function updateReview(env, body) {
  const id = Number(body.id);
  
  // Build dynamic update query based on provided fields
  const updates = [];
  const values = [];
  
  if (body.status !== undefined) {
    updates.push('status = ?');
    values.push(body.status);
  }
  if (body.author_name !== undefined) {
    updates.push('author_name = ?');
    values.push(body.author_name);
  }
  if (body.rating !== undefined) {
    updates.push('rating = ?');
    values.push(Number(body.rating));
  }
  if (body.comment !== undefined) {
    updates.push('comment = ?');
    values.push(body.comment);
  }
  if (body.show_on_product !== undefined) {
    updates.push('show_on_product = ?');
    values.push(Number(body.show_on_product));
  }
  
  if (updates.length === 0) {
    return json({ error: 'No fields to update' }, 400);
  }
  
  values.push(id);
  await env.DB.prepare(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  return json({ success: true });
}

/**
 * Delete a review
 * @param {Object} env - Environment bindings
 * @param {string} id - Review ID
 * @returns {Promise<Response>}
 */
export async function deleteReview(env, id) {
  await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}