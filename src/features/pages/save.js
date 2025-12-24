/**
 * Page save handlers.
 */

import { json } from '../../utils/response.js';

export async function savePage(env, body) {
  if (!body.slug || !body.title) return json({ error: 'slug and title required' }, 400);

  if (body.id) {
    await env.DB.prepare(
      'UPDATE pages SET slug=?, title=?, content=?, meta_description=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(body.slug, body.title, body.content || '', body.meta_description || '', body.status || 'published', Number(body.id)).run();
    return json({ success: true, id: body.id });
  }

  const r = await env.DB.prepare(
    'INSERT INTO pages (slug, title, content, meta_description, status) VALUES (?, ?, ?, ?, ?)'
  ).bind(body.slug, body.title, body.content || '', body.meta_description || '', body.status || 'published').run();
  return json({ success: true, id: r.meta?.last_row_id });
}

export async function savePageBuilder(env, body) {
  const name = (body.name || '').trim();
  const content = body.content || '';

  if (!name) return json({ error: 'name required' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM pages WHERE slug = ?').bind(name).first();

  if (existing) {
    await env.DB.prepare(
      'UPDATE pages SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(content, existing.id).run();
    return json({ success: true, id: existing.id });
  }

  const r = await env.DB.prepare(
    'INSERT INTO pages (slug, title, content, status) VALUES (?, ?, ?, ?)'
  ).bind(name, name, content, 'published').run();
  return json({ success: true, id: r.meta?.last_row_id });
}
