/**
 * Blog controller - simple HTML + CSS blog posts with archive
 */

import { json } from '../utils/response.js';

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function listBlogPosts(env) {
  const rows = await env.DB.prepare(
    `SELECT id, slug, title, status, created_at, updated_at
     FROM blog_posts
     ORDER BY created_at DESC`
  ).all();
  return json({ success: true, posts: rows.results || [] });
}

export async function getBlogPost(env, slug) {
  const s = String(slug || '').trim();
  if (!s) return json({ success: false, error: 'slug required' }, 400);
  const row = await env.DB.prepare(
    `SELECT id, slug, title, html, css, status, created_at, updated_at
     FROM blog_posts WHERE slug = ?`
  ).bind(s).first();
  if (!row) return json({ success: false, error: 'not found' }, 404);
  return json({ success: true, post: row });
}

export async function saveBlogPost(env, body) {
  const title = String(body.title || '').trim();
  const html = String(body.html || '');
  const css = String(body.css || '');
  const status = (String(body.status || 'published') === 'draft') ? 'draft' : 'published';
  let slug = String(body.slug || '').trim();
  if (!slug) slug = slugify(title) || `post-${Date.now()}`;
  slug = slugify(slug) || `post-${Date.now()}`;

  await env.DB.prepare(
    `INSERT INTO blog_posts (slug, title, html, css, status)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title,
       html = excluded.html,
       css = excluded.css,
       status = excluded.status,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(slug, title, html, css, status).run();

  return json({ success: true, slug });
}

export async function deleteBlogPost(env, slug) {
  const s = String(slug || '').trim();
  if (!s) return json({ success: false, error: 'slug required' }, 400);
  await env.DB.prepare('DELETE FROM blog_posts WHERE slug = ?').bind(s).run();
  return json({ success: true });
}

export async function setBlogStatus(env, body) {
  const slug = String(body.slug || '').trim();
  const status = (String(body.status || 'published') === 'draft') ? 'draft' : 'published';
  if (!slug) return json({ success: false, error: 'slug required' }, 400);
  await env.DB.prepare(
    'UPDATE blog_posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?'
  ).bind(status, slug).run();
  return json({ success: true });
}

// ---- Public rendering helpers ----

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function renderBlogArchive(env, origin) {
  const rows = await env.DB.prepare(
    `SELECT slug, title, created_at
     FROM blog_posts
     WHERE status = 'published'
     ORDER BY created_at DESC`
  ).all();
  const posts = rows.results || [];

  const items = posts.map(p => {
    const d = p.created_at ? new Date(p.created_at).toLocaleDateString() : '';
    return `<a class="post" href="/blog/${encodeURIComponent(p.slug)}"><div class="title">${escapeHtml(p.title || p.slug)}</div><div class="meta">${escapeHtml(d)}</div></a>`;
  }).join('');

  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blog</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;margin:0}
      .wrap{max-width:900px;margin:0 auto;padding:28px 18px}
      h1{margin:0 0 14px;font-size:28px}
      .sub{color:#6b7280;margin:0 0 24px}
      .list{display:flex;flex-direction:column;gap:12px}
      .post{display:block;text-decoration:none;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px}
      .post:hover{border-color:#cbd5e1}
      .title{font-weight:700;color:#111827}
      .meta{color:#6b7280;font-size:13px;margin-top:4px}
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Blog</h1>
      <p class="sub">Latest posts</p>
      <div class="list">${items || '<div style="color:#6b7280">No posts yet.</div>'}</div>
    </div>
  </body>
  </html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // cacheable: public blog archive
      'Cache-Control': 'public, max-age=300'
    }
  });
}

export async function renderBlogPost(env, slug) {
  const row = await env.DB.prepare(
    `SELECT slug, title, html, css
     FROM blog_posts
     WHERE slug = ? AND status = 'published'`
  ).bind(String(slug || '').trim()).first();
  if (!row) return new Response('Not found', { status: 404 });

  const page = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(row.title || row.slug)}</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#111827;margin:0}
      .wrap{max-width:900px;margin:0 auto;padding:28px 18px}
      a{color:inherit}
      .back{display:inline-block;margin-bottom:16px;color:#6b7280;text-decoration:none}
      .back:hover{text-decoration:underline}
    </style>
    <style>${row.css || ''}</style>
  </head>
  <body>
    <div class="wrap">
      <a class="back" href="/blog">← Back to Blog</a>
      ${row.html || ''}
    </div>
  </body>
  </html>`;

  return new Response(page, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // public portfolio-like content; cache aggressively
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
