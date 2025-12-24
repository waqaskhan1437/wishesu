/**
 * Order management handlers.
 */

import { json } from '../../../utils/response.js';

export async function deleteOrder(env, id) {
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

export async function updateOrder(env, body) {
  const orderId = body.orderId;
  if (!orderId) return json({ error: 'orderId required' }, 400);

  const updates = [];
  const values = [];

  if (body.status !== undefined) {
    updates.push('status = ?');
    values.push(body.status);
  }
  if (body.delivery_time_minutes !== undefined) {
    updates.push('delivery_time_minutes = ?');
    values.push(Number(body.delivery_time_minutes));
  }

  if (updates.length === 0) {
    return json({ error: 'No fields to update' }, 400);
  }

  values.push(orderId);
  await env.DB.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`).bind(...values).run();
  return json({ success: true });
}

export async function updatePortfolio(env, body) {
  await env.DB.prepare(
    'UPDATE orders SET portfolio_enabled=? WHERE order_id=?'
  ).bind(body.portfolioEnabled ? 1 : 0, body.orderId).run();
  return json({ success: true });
}

export async function updateArchiveLink(env, body) {
  await env.DB.prepare('UPDATE orders SET archive_url=? WHERE order_id=?').bind(body.archiveUrl, body.orderId).run();
  return json({ success: true });
}
