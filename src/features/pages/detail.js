/**
 * Page detail handler.
 */

import { json } from '../../utils/response.js';
import { toISO8601 } from '../../utils/formatting.js';

export async function getPage(env, slug) {
  const row = await env.DB.prepare('SELECT * FROM pages WHERE slug = ?').bind(slug).first();
  if (!row) return json({ error: 'Page not found' }, 404);

  if (row.created_at) row.created_at = toISO8601(row.created_at);
  if (row.updated_at) row.updated_at = toISO8601(row.updated_at);

  return json({ page: row });
}
