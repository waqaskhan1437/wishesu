/**
 * Admin import/export handlers.
 */

import { json } from '../../utils/response.js';

export async function exportFull(env) {
  try {
    const products = await env.DB.prepare('SELECT * FROM products').all();
    const pages = await env.DB.prepare('SELECT * FROM pages').all();
    const reviews = await env.DB.prepare('SELECT * FROM reviews').all();
    const orders = await env.DB.prepare('SELECT * FROM orders').all();
    const settings = await env.DB.prepare('SELECT * FROM settings').all();
    return json({
      success: true,
      data: {
        products: products.results || [],
        pages: pages.results || [],
        reviews: reviews.results || [],
        orders: orders.results || [],
        settings: settings.results || [],
        exportedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function exportProducts(env) {
  try {
    const products = await env.DB.prepare('SELECT * FROM products').all();
    return json({ success: true, data: products.results || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function exportPages(env) {
  try {
    const pages = await env.DB.prepare('SELECT * FROM pages').all();
    return json({ success: true, data: pages.results || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function exportForGoogleSheets(env) {
  try {
    const products = await env.DB.prepare('SELECT * FROM products').all();
    const orders = await env.DB.prepare('SELECT * FROM orders').all();
    const reviews = await env.DB.prepare('SELECT * FROM reviews').all();
    return json({
      success: true,
      data: {
        products: products.results || [],
        orders: orders.results || [],
        reviews: reviews.results || []
      }
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function importProducts(env, req) {
  try {
    const body = await req.json();
    const products = body.products || body;
    if (!Array.isArray(products)) {
      return json({ error: 'Invalid data format' }, 400);
    }
    let imported = 0;
    for (const p of products) {
      if (!p.title) continue;
      const addonsData = p.addons_json || p.addons || '[]';
      await env.DB.prepare(`
        INSERT OR REPLACE INTO products (id, title, slug, description, normal_price, sale_price, thumbnail_url, video_url, gallery_images, addons_json, status, sort_order, whop_plan, whop_price_map, whop_product_id, normal_delivery_text, instant_delivery, seo_title, seo_description, seo_keywords, seo_canonical)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        p.id || null, p.title, p.slug || '', p.description || '', p.normal_price || 0, p.sale_price || null,
        p.thumbnail_url || '', p.video_url || '', p.gallery_images || '[]', addonsData,
        p.status || 'active', p.sort_order || 0, p.whop_plan || '', p.whop_price_map || '', p.whop_product_id || '',
        p.normal_delivery_text || '', p.instant_delivery || 0,
        p.seo_title || '', p.seo_description || '', p.seo_keywords || '', p.seo_canonical || ''
      ).run();
      imported++;
    }
    return json({ success: true, imported });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function importPages(env, req) {
  try {
    const body = await req.json();
    const pages = body.pages || body;
    if (!Array.isArray(pages)) {
      return json({ error: 'Invalid data format' }, 400);
    }
    let imported = 0;
    for (const p of pages) {
      if (!p.slug && !p.name) continue;
      await env.DB.prepare(`
        INSERT OR REPLACE INTO pages (id, name, slug, content, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        p.id || null, p.name || p.slug, p.slug || p.name, p.content || '', p.status || 'active', p.created_at || Date.now()
      ).run();
      imported++;
    }
    return json({ success: true, imported });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
