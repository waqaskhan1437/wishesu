/**
 * Review delete handler.
 */

import { json } from '../../../utils/response.js';

export async function deleteReview(env, id) {
  await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}
