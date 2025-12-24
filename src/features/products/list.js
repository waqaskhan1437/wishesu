/**
 * Product list handlers.
 */

import { json } from '../../utils/response.js';

export async function getProducts(env) {
  const r = await env.DB.prepare(`
    SELECT
      p.id, p.title, p.slug, p.normal_price, p.sale_price,
      p.thumbnail_url, p.normal_delivery_text,
      COUNT(r.id) as review_count,
      AVG(r.rating) as rating_average
    FROM products p
    LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
    WHERE p.status = ?
    GROUP BY p.id
    ORDER BY p.sort_order ASC, p.id DESC
  `).bind('active').all();

  const products = (r.results || []).map(product => ({
    ...product,
    review_count: product.review_count || 0,
    rating_average: product.rating_average ? Math.round(product.rating_average * 10) / 10 : 0
  }));

  return json({ products });
}

export async function getProductsList(env) {
  const r = await env.DB.prepare(
    'SELECT id, title, slug, normal_price, sale_price, thumbnail_url, normal_delivery_text, status FROM products ORDER BY id DESC'
  ).all();
  return json({ products: r.results || [] });
}
