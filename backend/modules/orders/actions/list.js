/**
 * List Orders Action
 * GET /api/orders
 */

import { json } from '../../../core/utils/response.js';
import { listOrders } from '../service/service.js';
import { decorate } from '../utils/helpers.js';

export const listOrdersAction = async (request, env) => {
  const rows = await listOrders(env.DB);
  return json({ results: rows.map(decorate) });
};
