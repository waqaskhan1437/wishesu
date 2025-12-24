/**
 * Product create/update handler.
 */

import { json } from '../../../utils/response.js';
import { slugifyStr } from '../../../utils/formatting.js';

function buildGalleryJson(body) {
  return Array.isArray(body.gallery_images)
    ? JSON.stringify(body.gallery_images)
    : (body.gallery_images || '[]');
}

export async function saveProduct(env, body) {
  const title = (body.title || '').trim();
  if (!title) return json({ error: 'Title required' }, 400);

  const slug = (body.slug || '').trim() || slugifyStr(title);
  const addonsJson = JSON.stringify(body.addons || []);

  if (body.id) {
    const galleryJson = buildGalleryJson(body);
    await env.DB.prepare(`
      UPDATE products SET title=?, slug=?, description=?, normal_price=?, sale_price=?,
      instant_delivery=?, normal_delivery_text=?, thumbnail_url=?, video_url=?,
      gallery_images=?, addons_json=?, seo_title=?, seo_description=?, seo_keywords=?, seo_canonical=?,
      whop_plan=?, whop_price_map=?, whop_product_id=? WHERE id=?
    `).bind(
      title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
      body.instant_delivery ? 1 : 0, body.normal_delivery_text || '',
      body.thumbnail_url || '', body.video_url || '', galleryJson, addonsJson,
      body.seo_title || '', body.seo_description || '', body.seo_keywords || '', body.seo_canonical || '',
      body.whop_plan || '', body.whop_price_map || '', body.whop_product_id || '', Number(body.id)
    ).run();
    return json({ success: true, id: body.id, slug, url: `/product-${body.id}/${encodeURIComponent(slug)}` });
  }

  const galleryJson = buildGalleryJson(body);
  const r = await env.DB.prepare(`
    INSERT INTO products (title, slug, description, normal_price, sale_price,
    instant_delivery, normal_delivery_text, thumbnail_url, video_url,
    gallery_images, addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
    whop_plan, whop_price_map, whop_product_id, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
  `).bind(
    title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
    body.instant_delivery ? 1 : 0, body.normal_delivery_text || '',
    body.thumbnail_url || '', body.video_url || '', galleryJson, addonsJson,
    body.seo_title || '', body.seo_description || '', body.seo_keywords || '', body.seo_canonical || '',
    body.whop_plan || '', body.whop_price_map || '', body.whop_product_id || ''
  ).run();
  const newId = r.meta?.last_row_id;
  return json({ success: true, id: newId, slug, url: `/product-${newId}/${encodeURIComponent(slug)}` });
}
