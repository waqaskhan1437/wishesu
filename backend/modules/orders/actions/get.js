/**
 * Get Single Order Action
 * GET /api/order/:id
 */

import { json, notFound } from '../../../core/utils/response.js';
import { getOrderById } from '../service/service.js';
import { decorate } from '../utils/helpers.js';

export const getOrder = async (request, env) => {
  const id = request.params?.id;
  if (!id) return notFound('Order ID required');

  const row = await getOrderById(env.DB, id);
  if (!row) return notFound('Order not found');

  return json({ order: decorate(row) });
};
