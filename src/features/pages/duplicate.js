/**
 * Page duplication handler.
 */

import { json } from '../../../utils/response.js';

export async function duplicatePage(env, body) {
  const id = body.id;
  if (!id) {
    return json({ error: 'id required' }, 400);
  }
  const row = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(Number(id)).first();
  if (!row) {
    return json({ error: 'Page not found' }, 404);
  }

  const baseSlug = row.slug || 'page';
  let newSlug = baseSlug + '-copy';
  let idx = 1;
  let exists = await env.DB.prepare('SELECT slug FROM pages WHERE slug = ?').bind(newSlug).first();
  while (exists) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx++;
    exists = await env.DB.prepare('SELECT slug FROM pages WHERE slug = ?').bind(newSlug).first();
  }

  const r = await env.DB.prepare(
    'INSERT INTO pages (slug, title, content, meta_description, status) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    newSlug,
    (row.title || '') + ' Copy',
    row.content || '',
    row.meta_description || '',
    'draft'
  ).run();

  return json({ success: true, id: r.meta?.last_row_id, slug: newSlug });
}
