/**
 * Blog controller - simple HTML + CSS blog posts with archive
 */

import { json } from '../utils/response.js';
import { isCustomerBlocked, normalizeEmail, upsertCustomer } from '../utils/customers.js';

let blogColumnsChecked = false;

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
    `SELECT slug, title, html, created_at
     FROM blog_posts
     WHERE status = 'published'
     ORDER BY created_at DESC`
  ).all();
  const posts = rows.results || [];

  const items = posts.map(p => {
    const d = p.created_at ? new Date(p.created_at).toLocaleDateString() : '';
    const desc = makeExcerpt(p.html, 240);
    return `<a class="post" href="/blog/${encodeURIComponent(p.slug)}">
      <div class="title">${escapeHtml(p.title || p.slug)}</div>
      <div class="meta">${escapeHtml(d)}</div>
      <div class="desc">${escapeHtml(desc)}</div>
      <div class="read">Read post</div>
    </a>`;
  }).join('');

  const latest = posts.slice(0, 6).map(p => {
    const d = p.created_at ? new Date(p.created_at).toLocaleDateString() : '';
    return `<a class="side-link" href="/blog/${encodeURIComponent(p.slug)}">
      <div class="side-title">${escapeHtml(p.title || p.slug)}</div>
      <div class="side-date">${escapeHtml(d)}</div>
    </a>`;
  }).join('');

  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blog</title>
    <style>
      :root{
        --ink:#0f172a;
        --muted:#6b7280;
        --card:#ffffff;
        --border:#e5e7eb;
        --accent:#0ea5e9;
        --accent-2:#e2e8f0;
      }
      body{
        font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;
        background:
          radial-gradient(1200px 600px at 10% -10%, #f8fafc 0%, #f1f5f9 40%, #ffffff 100%);
        color:var(--ink);
        margin:0;
      }
      .wrap{max-width:1200px;margin:0 auto;padding:40px 20px}
      h1{margin:0 0 10px;font-size:36px;font-family:'Cormorant Garamond',serif;letter-spacing:0.5px}
      .sub{color:var(--muted);margin:0 0 28px;font-size:16px}
      .layout{display:grid;grid-template-columns:1.2fr 0.8fr;gap:28px;align-items:start}
      .list{display:flex;flex-direction:column;gap:16px}
      .post{
        display:block;text-decoration:none;background:var(--card);
        border:1px solid var(--border);border-radius:18px;padding:18px 20px;
        box-shadow:0 6px 20px rgba(15,23,42,0.06);transition:transform .2s,border-color .2s,box-shadow .2s;
      }
      .post:hover{border-color:#bae6fd;transform:translateY(-2px);box-shadow:0 12px 24px rgba(15,23,42,0.12)}
      .title{font-weight:700;color:var(--ink);font-size:20px}
      .meta{color:var(--muted);font-size:13px;margin-top:6px}
      .desc{color:#334155;font-size:15px;line-height:1.5;margin-top:10px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
      .read{margin-top:12px;color:var(--accent);font-weight:600;font-size:14px}
      .side{
        background:var(--card);border:1px solid var(--border);border-radius:18px;padding:18px 18px;
        position:sticky;top:20px;box-shadow:0 6px 20px rgba(15,23,42,0.06);
      }
      .side h3{margin:0 0 12px;font-size:18px}
      .side-links{display:flex;flex-direction:column;gap:12px}
      .side-link{text-decoration:none;border:1px solid var(--accent-2);border-radius:12px;padding:10px 12px;display:block}
      .side-link:hover{border-color:#bae6fd;background:#f8fafc}
      .side-title{font-weight:600;color:var(--ink);font-size:14px}
      .side-date{color:var(--muted);font-size:12px;margin-top:4px}
      .cta{
        margin-top:16px;padding:12px 14px;border-radius:12px;border:1px dashed #bae6fd;background:#f0f9ff;
        color:#0f172a;font-size:14px;
      }
      .cta a{color:var(--accent);text-decoration:none;font-weight:600}
      .hero{
        display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:12px;flex-wrap:wrap;
      }
      .submit{display:inline-block;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;text-decoration:none;color:#0f172a;background:#fff}
      .submit:hover{border-color:#bae6fd}
      @media (max-width: 900px){
        .layout{grid-template-columns:1fr}
        .side{position:static}
      }
      @media (max-width: 600px){
        h1{font-size:30px}
      }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div class="wrap">
      <div class="hero">
        <div>
          <h1>Blog</h1>
          <p class="sub">Fresh thoughts, stories, and updates. Explore the latest posts.</p>
        </div>
        <a href="/blog/submit" class="submit">Submit a post</a>
      </div>
      <div class="layout">
        <div class="list">${items || '<div style="color:#6b7280">No posts yet.</div>'}</div>
        <aside class="side">
          <h3>Latest posts</h3>
          <div class="side-links">${latest || '<div style="color:#6b7280">No posts yet.</div>'}</div>
          <div class="cta">Want to contribute? <a href="/blog/submit">Submit your post</a></div>
        </aside>
      </div>
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

function makeExcerpt(html, limit) {
  const text = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.slice(0, limit).replace(/\s+\S*$/, '') + '...';
}

export async function renderBlogSubmit() {
  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Submit a Blog Post</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;margin:0}
      .wrap{max-width:900px;margin:0 auto;padding:28px 18px}
      a{color:inherit}
      .back{display:inline-block;margin-bottom:16px;color:#6b7280;text-decoration:none}
      .back:hover{text-decoration:underline}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
      label{display:block;font-weight:600;margin-bottom:6px}
      input, textarea{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-family:inherit}
      textarea{min-height:160px;resize:vertical}
      .btn{padding:10px 16px;border:0;border-radius:8px;background:#111827;color:#fff;font-weight:600;cursor:pointer}
      .note{color:#6b7280;font-size:13px;margin-top:8px}
      .msg{margin-top:10px;font-size:14px}
    </style>
  </head>
  <body>
    <div class="wrap">
      <a class="back" href="/blog">← Back to Blog</a>
      <div class="card">
        <h1 style="margin:0 0 12px;font-size:24px">Submit a blog post</h1>
        <label>Name</label>
        <input id="blog-name" type="text" placeholder="Your name" />
        <label style="margin-top:10px">Email</label>
        <input id="blog-email" type="email" placeholder="you@example.com" />
        <label style="margin-top:10px">Title</label>
        <input id="blog-title" type="text" placeholder="Post title" />
        <label style="margin-top:10px">Body</label>
        <textarea id="blog-body" placeholder="Write your post..."></textarea>
        <button class="btn" id="blog-submit" type="button" style="margin-top:12px">Submit for approval</button>
        <div class="note">Every submission needs admin approval. Only one pending submission is allowed per email.</div>
        <div class="msg" id="blog-msg"></div>
      </div>
    </div>
    <script>
      const btn = document.getElementById('blog-submit');
      const msg = document.getElementById('blog-msg');
      btn.addEventListener('click', async () => {
        msg.textContent = '';
        const payload = {
          name: document.getElementById('blog-name').value.trim(),
          email: document.getElementById('blog-email').value.trim(),
          title: document.getElementById('blog-title').value.trim(),
          body: document.getElementById('blog-body').value.trim()
        };
        try {
          const res = await fetch('/api/blog/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Failed to submit');
          msg.style.color = '#047857';
          msg.textContent = 'Submitted! Waiting for admin approval.';
          document.getElementById('blog-title').value = '';
          document.getElementById('blog-body').value = '';
        } catch (e) {
          msg.style.color = '#b91c1c';
          msg.textContent = e.message || 'Failed to submit';
        }
      });
    </script>
  </body>
  </html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
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

function normalizeStatus(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'draft' || v === 'pending' || v === 'rejected' || v === 'published') {
    return v;
  }
  return 'published';
}

async function ensureBlogColumns(env) {
  if (blogColumnsChecked) return;
  try {
    await env.DB.prepare('ALTER TABLE blog_posts ADD COLUMN author_name TEXT').run();
  } catch (_) {}
  try {
    await env.DB.prepare('ALTER TABLE blog_posts ADD COLUMN author_email TEXT').run();
  } catch (_) {}
  blogColumnsChecked = true;
}
