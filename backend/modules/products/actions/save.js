/**
 * Save Product Action (Create or Update)
 * POST /api/product/save
 */

import { json, error, serverError } from '../../../core/utils/response.js';
import {
  createProduct,
  updateProduct,
  getProductByIdOrSlug
} from '../service/service.js';
import { toPayload } from '../utils/payload.js';
import { decorate } from '../utils/helpers.js';

export const saveProduct = async (request, env) => {
  try {
    const raw = await request.text();
    let body = {};

    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        return error('Invalid JSON body');
      }
    }

    const payload = toPayload(body);

    if (!payload.title) {
      return error('Title required');
    }

    let productId;

    if (payload.id) {
      await updateProduct(env.DB, payload);
      productId = payload.id;
    } else {
      const res = await createProduct(env.DB, payload);
      productId = res?.meta?.last_row_id ?? res?.lastRowId;
    }

    const row = await getProductByIdOrSlug(env.DB, productId);
    return json({ product: decorate(row) });
  } catch (err) {
    return serverError(err.message || 'Save failed');
  }
};
