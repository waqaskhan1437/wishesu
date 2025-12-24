/**
 * Product routing helpers.
 */

import { slugifyStr } from '../../utils/formatting.js';

export async function handleProductRouting(env, url, path) {
  const legacyId = (path === '/product') ? url.searchParams.get('id') : null;
  if (legacyId) {
    const p = await env.DB.prepare('SELECT id, title, slug FROM products WHERE id = ? LIMIT 1').bind(Number(legacyId)).first();
    if (p) {
      const slug = p.slug ? String(p.slug) : slugifyStr(p.title);
      if (!p.slug) {
        try {
          await env.DB.prepare('UPDATE products SET slug = ? WHERE id = ?').bind(slug, Number(p.id)).run();
        } catch (_) {}
      }
      const canonical = `/product-${p.id}/${encodeURIComponent(slug)}`;
      return Response.redirect(`${url.origin}${canonical}`, 301);
    }
  }

  if (path.startsWith('/product/') && path.length > '/product/'.length) {
    const slugIn = decodeURIComponent(path.slice('/product/'.length));
    const row = await env.DB.prepare('SELECT id, title, slug FROM products WHERE slug = ? LIMIT 1').bind(slugIn).first();
    if (row) {
      const canonicalSlug = row.slug ? String(row.slug) : slugifyStr(row.title);
      if (!row.slug) {
        try {
          await env.DB.prepare('UPDATE products SET slug = ? WHERE id = ?').bind(canonicalSlug, Number(row.id)).run();
        } catch (_) {}
      }
      const canonical = `/product-${row.id}/${encodeURIComponent(canonicalSlug)}`;
      return Response.redirect(`${url.origin}${canonical}`, 301);
    }
  }

  return null;
}
