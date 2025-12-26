/**
 * Update Order Status Action
 * POST /api/order/update-status
 */

import { json, error, notFound } from '../../../core/utils/response.js';
import { setOrderStatus, getOrderById } from '../service/service.js';
import { decorate } from '../utils/helpers.js';

export const updateOrderStatus = async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || '').trim();
  const status = String(body.status || '').trim();

  if (!orderId || !status) {
    return error('Missing order_id or status');
  }

  await setOrderStatus(env.DB, { orderId, status });

  const row = await getOrderById(env.DB, orderId);
  if (!row) return notFound('Order not found');

  return json({ order: decorate(row) });
};
