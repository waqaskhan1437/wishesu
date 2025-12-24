/**
 * Page builder loader.
 */

import { json } from '../../../utils/response.js';
import { seedBuiltInPages } from './builtin.js';

export async function loadPageBuilder(env, name) {
  if (!name) return json({ error: 'name required' }, 400);
  await seedBuiltInPages(env);

  const row = await env.DB.prepare('SELECT content FROM pages WHERE slug = ?').bind(name).first();
  if (!row) return json({ content: '' });

  return json({ content: row.content || '' });
}
