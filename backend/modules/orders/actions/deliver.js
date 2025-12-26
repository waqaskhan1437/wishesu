/**
 * Deliver Order Action
 * POST /api/order/deliver
 */

import { json, error, notFound } from '../../../core/utils/response.js';
import { setOrderDelivered, getOrderById } from '../service/service.js';
import { decorate } from '../utils/helpers.js';

export const deliverOrder = async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || '').trim();
  const archiveUrl = String(body.archive_url || body.archiveUrl || '').trim();

  if (!orderId || !archiveUrl) {
    return error('Missing order_id or archive_url');
  }

  await setOrderDelivered(env.DB, { orderId, archiveUrl });

  const row = await getOrderById(env.DB, orderId);
  if (!row) return notFound('Order not found');

  return json({ order: decorate(row) });
};
