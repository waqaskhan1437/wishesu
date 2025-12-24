/**
 * Buyer order handlers.
 */

import { json } from '../../../utils/response.js';
import { toISO8601 } from '../../../utils/formatting.js';

export async function getBuyerOrder(env, orderId) {
  const row = await env.DB.prepare(
    'SELECT o.*, p.title as product_title, p.thumbnail_url as product_thumbnail FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_id = ?'
  ).bind(orderId).first();

  if (!row) return json({ error: 'Order not found' }, 404);

  const reviewCheck = await env.DB.prepare(
    'SELECT id FROM reviews WHERE order_id = ? LIMIT 1'
  ).bind(orderId).first();
  const hasReview = !!reviewCheck;

  let addons = [], email = '', amount = null;
  try {
    if (row.encrypted_data && row.encrypted_data[0] === '{') {
      const d = JSON.parse(row.encrypted_data);
      addons = d.addons || [];
      email = d.email || '';
      amount = d.amount;
    }
  } catch (e) {
    console.error('Failed to parse order encrypted_data for buyer order:', orderId, e.message);
  }

  const orderData = { ...row, addons, email, amount, has_review: hasReview };
  if (orderData.created_at && typeof orderData.created_at === 'string') {
    orderData.created_at = toISO8601(orderData.created_at);
  }

  return json({ order: orderData });
}
