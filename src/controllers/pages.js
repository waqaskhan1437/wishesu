/**
 * Pages controller - Dynamic page management
 */

import { json } from '../utils/response.js';
import { toISO8601 } from '../utils/formatting.js';

/**
 * Get active pages (public)
 */
export async function getPages(env) {
  const r = await env.DB.prepare(
    'SELECT id, slug, title, meta_description, created_at, updated_at FROM pages WHERE status = ? ORDER BY id DESC'
  ).bind('published').all();
  
  const pages = (r.results || []).map(page => {
    if (page.created_at) page.created_at = toISO8601(page.created_at);
    if (page.updated_at) page.updated_at = toISO8601(page.updated_at);
    return page;
  });

  return json({ pages });
}

/**
 * Get all pages (admin)
 */
export async function getPagesList(env) {
  const r = await env.DB.prepare(
    'SELECT * FROM pages ORDER BY id DESC'
  ).all();
  
  const pages = (r.results || []).map(page => {
    if (page.created_at) page.created_at = toISO8601(page.created_at);
    if (page.updated_at) page.updated_at = toISO8601(page.updated_at);
    return page;
  });

  return json({ pages });
}

/**
 * Get page by slug
 */
export async function getPage(env, slug) {
  const row = await env.DB.prepare('SELECT * FROM pages WHERE slug = ?').bind(slug).first();
  if (!row) return json({ error: 'Page not found' }, 404);

  if (row.created_at) row.created_at = toISO8601(row.created_at);
  if (row.updated_at) row.updated_at = toISO8601(row.updated_at);

  return json({ page: row });
}

/**
 * Save page (create or update)
 */
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

/**
 * Save page builder (simplified endpoint)
 */
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

/**
 * Delete page by ID
 */
export async function deletePage(env, id) {
  await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

/**
 * Delete page by slug
 */
export async function deletePageBySlug(env, body) {
  const name = (body.name || '').trim();
  if (!name) return json({ error: 'name required' }, 400);
  
  await env.DB.prepare('DELETE FROM pages WHERE slug = ?').bind(name).run();
  return json({ success: true });
}

/**
 * Update page status
 */
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

/**
 * Duplicate page
 */
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

/**
 * Load page builder content
 */
export async function loadPageBuilder(env, name) {
  if (!name) return json({ error: 'name required' }, 400);
  
  const row = await env.DB.prepare('SELECT content FROM pages WHERE slug = ?').bind(name).first();
  if (!row) return json({ content: '' });
  
  return json({ content: row.content || '' });
}

/**
 * Serve dynamic page
 */
export async function serveDynamicPage(env, slug) {
  const row = await env.DB.prepare(
    'SELECT * FROM pages WHERE slug = ? AND status = ?'
  ).bind(slug, 'published').first();
  
  if (!row) return null;

  // Return page content with basic HTML wrapper
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${row.title || slug}</title>
  ${row.meta_description ? `<meta name="description" content="${row.meta_description}">` : ''}
  <style>body{font-family:-apple-system,system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;}</style>
</head>
<body>
  ${row.content || ''}
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
