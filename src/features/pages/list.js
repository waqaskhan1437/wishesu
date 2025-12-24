/**
 * Page list handlers.
 */

import { json } from '../../utils/response.js';
import { toISO8601 } from '../../utils/formatting.js';
import { seedBuiltInPages } from './builtin.js';

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
}

export async function getPages(env) {
  const r = await env.DB.prepare(
    `SELECT id, slug, title, meta_description, created_at, updated_at
     FROM pages
     WHERE status = 'published' OR status = 'active' OR status IS NULL OR status = ''
     ORDER BY id DESC`
  ).all();

  const pages = (r.results || []).map(page => {
    if (page.created_at) page.created_at = toISO8601(page.created_at);
    if (page.updated_at) page.updated_at = toISO8601(page.updated_at);
    return page;
  });

  return json({ pages });
}

export async function getPagesList(env) {
  await seedBuiltInPages(env);
  try {
    await env.DB.prepare(
      `UPDATE pages SET status = 'published' WHERE status IS NULL OR status = ''`
    ).run();
  } catch (_) {}

  const r = await env.DB.prepare(
    'SELECT id, slug, title, content, status, created_at, updated_at FROM pages ORDER BY id DESC'
  ).all();

  const pages = (r.results || []).map(page => {
    const contentSize = page.content ? page.content.length : 0;
    const uploaded = page.updated_at
      ? toISO8601(page.updated_at)
      : (page.created_at ? toISO8601(page.created_at) : new Date().toISOString());

    return {
      id: page.id,
      name: page.slug || page.title || 'Untitled',
      title: page.title || page.slug || 'Untitled',
      url: `/${page.slug}.html`,
      size: formatSize(contentSize),
      uploaded,
      status: page.status || 'published'
    };
  });

  return json({ success: true, pages });
}
