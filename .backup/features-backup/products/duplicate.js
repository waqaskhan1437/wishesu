/**
 * Product duplication handler.
 */

import { json } from '../../utils/response.js';
import { slugifyStr } from '../../utils/formatting.js';

export async function duplicateProduct(env, body) {
  const id = body.id;
  if (!id) {
    return json({ error: 'id required' }, 400);
  }
  const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(id)).first();
  if (!row) {
    return json({ error: 'Product not found' }, 404);
  }
  const baseSlug = row.slug || slugifyStr(row.title);
  let newSlug = baseSlug + '-copy';
  let idx = 1;
  let exists = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(newSlug).first();
  while (exists) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx++;
    exists = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(newSlug).first();
  }

  const r = await env.DB.prepare(
    `INSERT INTO products (
      title, slug, description, normal_price, sale_price,
      instant_delivery, normal_delivery_text, thumbnail_url, video_url,
      addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
      whop_plan, whop_price_map, status, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    (row.title || '') + ' Copy',
    newSlug,
    row.description || '',
    row.normal_price || 0,
    row.sale_price || null,
    row.instant_delivery || 0,
    row.normal_delivery_text || '',
    row.thumbnail_url || '',
    row.video_url || '',
    row.addons_json || '[]',
    row.seo_title || '',
    row.seo_description || '',
    row.seo_keywords || '',
    row.seo_canonical || '',
    row.whop_plan || '',
    row.whop_price_map || '',
    'draft',
    0
  ).run();
  return json({ success: true, id: r.meta?.last_row_id, slug: newSlug });
}
