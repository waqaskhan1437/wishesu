/**
 * List Products Action
 * GET /api/products
 */

import { json } from '../../../core/utils/response.js';
import { getAllProducts } from '../service/service.js';
import { decorate } from '../utils/helpers.js';

export const listProducts = async (request, env) => {
  const rows = await getAllProducts(env.DB);
  return json({ results: rows.map(decorate) });
};
