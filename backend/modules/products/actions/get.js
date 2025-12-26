/**
 * Get Single Product Action
 * GET /api/product/:id
 */

import { json, notFound } from '../../../core/utils/response.js';
import { getProductByIdOrSlug } from '../service/service.js';
import { decorate } from '../utils/helpers.js';

export const getProduct = async (request, env) => {
  const id = request.params?.id;
  if (!id) return notFound('Product ID required');

  const row = await getProductByIdOrSlug(env.DB, id);
  if (!row) return notFound('Product not found');

  return json({ product: decorate(row) });
};
