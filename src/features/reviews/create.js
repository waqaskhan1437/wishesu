/**
 * Review creation handler.
 */

import { json } from '../../utils/response.js';

export async function addReview(env, body) {
  if (!body.productId || !body.rating) return json({ error: 'productId and rating required' }, 400);

  await env.DB.prepare(
    'INSERT INTO reviews (product_id, author_name, rating, comment, status, order_id, show_on_product) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    Number(body.productId),
    body.author || 'Customer',
    Number(body.rating),
    body.comment || '',
    'approved',
    body.orderId || null,
    body.showOnProduct !== undefined ? (body.showOnProduct ? 1 : 0) : 1
  ).run();

  return json({ success: true });
}
