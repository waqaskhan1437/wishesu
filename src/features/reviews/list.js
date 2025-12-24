/**
 * Review list handlers.
 */

import { json } from '../../../utils/response.js';
import { toISO8601 } from '../../../utils/formatting.js';

function normalizeIds(raw) {
  return raw.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
}

export async function getReviews(env, url) {
  const params = url.searchParams;
  const rating = params.get('rating');
  const productId = params.get('productId');
  const productIds = params.get('productIds');
  const ids = params.get('ids');

  let sql = 'SELECT r.*, p.title as product_title FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.status = ?';
  const binds = ['approved'];

  if (rating) {
    sql += ' AND r.rating = ?';
    binds.push(Number(rating));
  }
  if (productId) {
    sql += ' AND r.product_id = ?';
    binds.push(Number(productId));
  }
  if (productIds) {
    const idsArr = normalizeIds(productIds);
    if (idsArr.length > 0) {
      sql += ` AND r.product_id IN (${idsArr.map(() => '?').join(',')})`;
      binds.push(...idsArr);
    }
  }
  if (ids) {
    const idsArr2 = normalizeIds(ids);
    if (idsArr2.length > 0) {
      sql += ` AND r.id IN (${idsArr2.map(() => '?').join(',')})`;
      binds.push(...idsArr2);
    }
  }
  sql += ' ORDER BY r.created_at DESC';

  const stmt = await env.DB.prepare(sql);
  const r = await stmt.bind(...binds).all();

  const reviews = (r.results || []).map(review => {
    if (review.created_at && typeof review.created_at === 'string') {
      review.created_at = toISO8601(review.created_at);
    }
    return review;
  });

  return json({ reviews });
}

export async function getProductReviews(env, productId) {
  const r = await env.DB.prepare(
    `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url
     FROM reviews
     LEFT JOIN orders ON reviews.order_id = orders.order_id
     WHERE reviews.product_id = ? AND reviews.status = ?
     ORDER BY reviews.created_at DESC`
  ).bind(Number(productId), 'approved').all();

  const reviews = (r.results || []).map(review => {
    if (review.created_at && typeof review.created_at === 'string') {
      review.created_at = toISO8601(review.created_at);
    }
    return review;
  });

  return json({ reviews });
}
