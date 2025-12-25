/**
 * Product detail handler.
 */

import { json } from '../../utils/response.js';
import { toISO8601 } from '../../utils/formatting.js';

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
  } catch (e) {
    console.error('Failed to parse addons_json for product', row.id, ':', e.message);
  }

  const stats = await env.DB.prepare(
    'SELECT COUNT(*) as cnt, AVG(rating) as avg FROM reviews WHERE product_id = ? AND status = ?'
  ).bind(row.id, 'approved').first();

  const reviewsResult = await env.DB.prepare(
    `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url
     FROM reviews
     LEFT JOIN orders ON reviews.order_id = orders.order_id
     WHERE reviews.product_id = ? AND reviews.status = ?
     ORDER BY reviews.created_at DESC`
  ).bind(row.id, 'approved').all();

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
      reviews
    },
    addons
  });
}
