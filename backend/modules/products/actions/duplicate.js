/**
 * Duplicate Product Action
 * POST /api/product/duplicate
 */

import { json, error, notFound } from '../../../core/utils/response.js';
import {
  getProductById,
  duplicateProduct,
  getProductByIdOrSlug
} from '../service/service.js';
import { decorate } from '../utils/helpers.js';

export const duplicateProductAction = async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id || 0);

  if (!id) {
    return error('id required');
  }

  const source = await getProductById(env.DB, id);
  if (!source) {
    return notFound('Product not found');
  }

  const res = await duplicateProduct(env.DB, source);
  const newId = res?.meta?.last_row_id ?? res?.lastRowId;

  const row = await getProductByIdOrSlug(env.DB, newId);
  return json({ product: decorate(row) });
};
