/**
 * Delete Product Action
 * DELETE /api/product/delete?id=X
 */

import { json, error } from '../../../core/utils/response.js';
import { removeProduct } from '../service/service.js';

export const deleteProduct = async (request, env) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return error('Product ID required');
  }

  await removeProduct(env.DB, id);
  return json({ ok: true });
};
