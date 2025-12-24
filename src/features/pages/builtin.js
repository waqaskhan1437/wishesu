/**
 * Built-in page seeding.
 */

import { initDB } from '../../config/db.js';

const BUILTIN_PAGES = [
  { slug: 'index', title: 'Home', path: '/index.html' },
  { slug: 'products-grid', title: 'Products', path: '/products-grid.html' }
];

export async function seedBuiltInPages(env) {
  if (!env?.DB || !env?.ASSETS) return;
  await initDB(env);
  for (const page of BUILTIN_PAGES) {
    const existing = await env.DB.prepare('SELECT id FROM pages WHERE slug = ?').bind(page.slug).first();
    if (existing) continue;
    let html = '';
    try {
      const req = new Request(`https://assets.local${page.path}`);
      const resp = await env.ASSETS.fetch(req);
      if (resp.ok) html = await resp.text();
    } catch (_) {}
    if (!html) continue;
    await env.DB.prepare(
      'INSERT INTO pages (slug, title, content, status) VALUES (?, ?, ?, ?)'
    ).bind(page.slug, page.title, html, 'published').run();
  }
}
