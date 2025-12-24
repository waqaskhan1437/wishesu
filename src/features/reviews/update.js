/**
 * Review update handler.
 */

import { json } from '../../../utils/response.js';

export async function updateReview(env, body) {
  const id = Number(body.id);

  const updates = [];
  const values = [];

  if (body.status !== undefined) {
    updates.push('status = ?');
    values.push(body.status);
  }
  if (body.author_name !== undefined) {
    updates.push('author_name = ?');
    values.push(body.author_name);
  }
  if (body.rating !== undefined) {
    updates.push('rating = ?');
    values.push(Number(body.rating));
  }
  if (body.comment !== undefined) {
    updates.push('comment = ?');
    values.push(body.comment);
  }
  if (body.show_on_product !== undefined) {
    updates.push('show_on_product = ?');
    values.push(body.show_on_product ? 1 : 0);
  }

  if (updates.length === 0) {
    return json({ error: 'No fields to update' }, 400);
  }

  values.push(id);
  await env.DB.prepare(`UPDATE reviews SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values).run();
  return json({ success: true });
}
