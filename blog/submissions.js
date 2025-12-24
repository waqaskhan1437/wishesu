/**
 * Public blog submission handler.
 */

import { json } from '../../utils/response.js';
import { isCustomerBlocked, normalizeEmail, upsertCustomer } from '../../utils/customers.js';
import { ensureBlogColumns } from './columns.js';
import { escapeHtml, slugify } from './helpers.js';

export async function submitBlogPost(env, body) {
  await ensureBlogColumns(env);
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const title = String(body.title || '').trim();
  const content = String(body.body || '').trim();
  if (!name || !email || !title || !content) {
    return json({ success: false, error: 'name, email, title, and body required' }, 400);
  }
  if (await isCustomerBlocked(env, email, 'blog')) {
    return json({ success: false, error: 'You are blocked from blog submissions' }, 403);
  }
  const pending = await env.DB.prepare(
    `SELECT id FROM blog_posts WHERE author_email = ? AND status = 'pending' LIMIT 1`
  ).bind(email).first();
  if (pending) {
    return json({ success: false, error: 'Your previous blog post is still pending approval' }, 429);
  }

  let slug = slugify(title) || `post-${Date.now()}`;
  slug = slugify(slug) || `post-${Date.now()}`;

  const safe = escapeHtml(content).replace(/\r\n/g, '\n');
  const paragraphs = safe.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  const html = paragraphs || `<p>${safe}</p>`;

  const existing = await env.DB.prepare('SELECT id FROM blog_posts WHERE slug = ?').bind(slug).first();
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  await env.DB.prepare(
    `INSERT INTO blog_posts (slug, title, html, css, author_name, author_email, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(slug, title, html, '', name, email).run();

  await upsertCustomer(env, email, name);

  return json({ success: true, slug });
}
