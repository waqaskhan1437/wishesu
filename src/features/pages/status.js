/**
 * Page status and delete handlers.
 */

import { json } from '../../../utils/response.js';

export async function deletePage(env, id) {
  await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

export async function deletePageBySlug(env, body) {
  const name = (body.name || '').trim();
  if (!name) return json({ error: 'name required' }, 400);

  await env.DB.prepare('DELETE FROM pages WHERE slug = ?').bind(name).run();
  return json({ success: true });
}

export async function updatePageStatus(env, body) {
  const id = body.id;
  const status = (body.status || '').trim().toLowerCase();
  if (!id || !status) {
    return json({ error: 'id and status required' }, 400);
  }
  if (status !== 'published' && status !== 'draft') {
    return json({ error: 'invalid status' }, 400);
  }
  await env.DB.prepare('UPDATE pages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, Number(id)).run();
  return json({ success: true });
}
