/**
 * Blog admin handlers.
 */

import { json } from '../../utils/response.js';
import { normalizeEmail } from '../../utils/customers.js';
import { ensureBlogColumns } from './columns.js';
import { normalizeStatus, slugify } from './helpers.js';

export async function listBlogPosts(env) {
  const rows = await env.DB.prepare(
    `SELECT id, slug, title, author_name, author_email, status, created_at, updated_at
     FROM blog_posts
     ORDER BY created_at DESC`
  ).all();
  return json({ success: true, posts: rows.results || [] });
}

export async function getBlogPost(env, slug) {
  const s = String(slug || '').trim();
  if (!s) return json({ success: false, error: 'slug required' }, 400);
  const row = await env.DB.prepare(
    `SELECT id, slug, title, html, css, author_name, author_email, status, created_at, updated_at
     FROM blog_posts WHERE slug = ?`
  ).bind(s).first();
  if (!row) return json({ success: false, error: 'not found' }, 404);
  return json({ success: true, post: row });
}

export async function saveBlogPost(env, body) {
  await ensureBlogColumns(env);
  const title = String(body.title || '').trim();
  const html = String(body.html || '');
  const css = String(body.css || '');
  const status = normalizeStatus(body.status);
  const authorName = String(body.author_name || '').trim();
  const authorEmail = normalizeEmail(body.author_email);
  let slug = String(body.slug || '').trim();
  if (!slug) slug = slugify(title) || `post-${Date.now()}`;
  slug = slugify(slug) || `post-${Date.now()}`;

  await env.DB.prepare(
    `INSERT INTO blog_posts (slug, title, html, css, author_name, author_email, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title,
       html = excluded.html,
       css = excluded.css,
       author_name = CASE
         WHEN excluded.author_name IS NOT NULL AND excluded.author_name != '' THEN excluded.author_name
         ELSE blog_posts.author_name
       END,
       author_email = CASE
         WHEN excluded.author_email IS NOT NULL AND excluded.author_email != '' THEN excluded.author_email
         ELSE blog_posts.author_email
       END,
       status = excluded.status,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(
    slug,
    title,
    html,
    css,
    authorName || null,
    authorEmail,
    status
  ).run();

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
  const status = normalizeStatus(body.status);
  if (!slug) return json({ success: false, error: 'slug required' }, 400);
  await env.DB.prepare(
    'UPDATE blog_posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?'
  ).bind(status, slug).run();
  return json({ success: true });
}
