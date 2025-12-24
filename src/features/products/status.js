/**
 * Product status and delete handlers.
 */

import { json } from '../../../utils/response.js';

export async function deleteProduct(env, id) {
  if (!id) return json({ error: 'ID required' }, 400);
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

export async function updateProductStatus(env, body) {
  const id = body.id;
  const status = (body.status || '').trim().toLowerCase();
  if (!id || !status) {
    return json({ error: 'id and status required' }, 400);
  }
  if (status !== 'active' && status !== 'draft') {
    return json({ error: 'invalid status' }, 400);
  }
  await env.DB.prepare('UPDATE products SET status = ? WHERE id = ?').bind(status, Number(id)).run();
  return json({ success: true });
}
