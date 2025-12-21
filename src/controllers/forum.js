/**
 * Forum controller - public discussions with admin approval
 */

import { json } from '../utils/response.js';
import { isCustomerBlocked, normalizeEmail, upsertCustomer } from '../utils/customers.js';

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toParagraphs(text) {
  const safe = escapeHtml(text).replace(/\r\n/g, '\n');
  return safe.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

async function hasPendingSubmission(env, email) {
  const row = await env.DB.prepare(
    `SELECT id FROM forum_topics WHERE author_email = ? AND status = 'pending'
     UNION ALL
     SELECT id FROM forum_replies WHERE author_email = ? AND status = 'pending'
     LIMIT 1`
  ).bind(email, email).first();
  return !!row;
}

export async function submitForumTopic(env, body) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const title = String(body.title || '').trim();
  const text = String(body.body || '').trim();
  if (!name || !email || !title || !text) {
    return json({ success: false, error: 'name, email, title, and body required' }, 400);
  }
  if (await isCustomerBlocked(env, email, 'forum')) {
    return json({ success: false, error: 'You are blocked from forum submissions' }, 403);
  }
  if (await hasPendingSubmission(env, email)) {
    return json({ success: false, error: 'Your previous submission is still pending approval' }, 429);
  }

  let slug = slugify(title) || `topic-${Date.now()}`;
  const existing = await env.DB.prepare('SELECT id FROM forum_topics WHERE slug = ?').bind(slug).first();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  await env.DB.prepare(
    `INSERT INTO forum_topics (slug, title, body, author_name, author_email, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  ).bind(slug, title, text, name, email).run();

  await upsertCustomer(env, email, name);

  return json({ success: true, slug });
}

export async function submitForumReply(env, body) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const text = String(body.body || '').trim();
  const slug = String(body.slug || '').trim();
  if (!name || !email || !text || !slug) {
    return json({ success: false, error: 'name, email, body, and slug required' }, 400);
  }
  if (await isCustomerBlocked(env, email, 'forum')) {
    return json({ success: false, error: 'You are blocked from forum submissions' }, 403);
  }
  if (await hasPendingSubmission(env, email)) {
    return json({ success: false, error: 'Your previous submission is still pending approval' }, 429);
  }

  const topic = await env.DB.prepare(
    `SELECT id FROM forum_topics WHERE slug = ? AND status = 'approved'`
  ).bind(slug).first();
  if (!topic) return json({ success: false, error: 'Topic not found' }, 404);

  await env.DB.prepare(
    `INSERT INTO forum_replies (topic_id, body, author_name, author_email, status)
     VALUES (?, ?, ?, ?, 'pending')`
  ).bind(topic.id, text, name, email).run();

  await upsertCustomer(env, email, name);

  return json({ success: true });
}

export async function listForumTopics(env, status) {
  const s = String(status || '').trim().toLowerCase();
  const allowed = ['pending', 'approved', 'rejected'];
  const qStatus = allowed.includes(s) ? s : null;
  const rows = await env.DB.prepare(
    `SELECT id, slug, title, author_name, author_email, status, created_at, updated_at
     FROM forum_topics
     ${qStatus ? 'WHERE status = ?' : ''}
     ORDER BY created_at DESC`
  ).bind(...(qStatus ? [qStatus] : [])).all();
  return json({ success: true, topics: rows.results || [] });
}

export async function listForumReplies(env, status) {
  const s = String(status || '').trim().toLowerCase();
  const allowed = ['pending', 'approved', 'rejected'];
  const qStatus = allowed.includes(s) ? s : null;
  const rows = await env.DB.prepare(
    `SELECT r.id, r.topic_id, r.body, r.author_name, r.author_email, r.status, r.created_at,
            t.slug as topic_slug, t.title as topic_title
     FROM forum_replies r
     LEFT JOIN forum_topics t ON t.id = r.topic_id
     ${qStatus ? 'WHERE r.status = ?' : ''}
     ORDER BY r.created_at DESC`
  ).bind(...(qStatus ? [qStatus] : [])).all();
  return json({ success: true, replies: rows.results || [] });
}

export async function setForumTopicStatus(env, body) {
  const id = Number(body.id);
  const status = String(body.status || '').trim().toLowerCase();
  if (!id || !['pending', 'approved', 'rejected'].includes(status)) {
    return json({ success: false, error: 'id and valid status required' }, 400);
  }
  await env.DB.prepare(
    'UPDATE forum_topics SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(status, id).run();
  return json({ success: true });
}

export async function setForumReplyStatus(env, body) {
  const id = Number(body.id);
  const status = String(body.status || '').trim().toLowerCase();
  if (!id || !['pending', 'approved', 'rejected'].includes(status)) {
    return json({ success: false, error: 'id and valid status required' }, 400);
  }
  await env.DB.prepare(
    'UPDATE forum_replies SET status = ? WHERE id = ?'
  ).bind(status, id).run();
  return json({ success: true });
}

export async function renderForumArchive(env) {
  const rows = await env.DB.prepare(
    `SELECT t.id, t.slug, t.title, t.author_name, t.created_at,
      (SELECT COUNT(*) FROM forum_replies r WHERE r.topic_id = t.id AND r.status = 'approved') as reply_count
     FROM forum_topics t
     WHERE t.status = 'approved'
     ORDER BY t.created_at DESC`
  ).all();
  const topics = rows.results || [];

  const items = topics.map(t => {
    const d = t.created_at ? new Date(t.created_at).toLocaleDateString() : '';
    const replies = Number(t.reply_count || 0);
    return `<a class="topic" href="/forum/${encodeURIComponent(t.slug)}">
      <div class="title">${escapeHtml(t.title || t.slug)}</div>
      <div class="meta">By ${escapeHtml(t.author_name || 'Anonymous')} • ${escapeHtml(d)} • ${replies} replies</div>
    </a>`;
  }).join('');

  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Forum</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;margin:0}
      .wrap{max-width:900px;margin:0 auto;padding:28px 18px}
      h1{margin:0 0 12px;font-size:28px}
      .sub{color:#6b7280;margin:0 0 24px}
      .list{display:flex;flex-direction:column;gap:12px;margin-bottom:28px}
      .topic{display:block;text-decoration:none;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px}
      .topic:hover{border-color:#cbd5e1}
      .title{font-weight:700;color:#111827}
      .meta{color:#6b7280;font-size:13px;margin-top:6px}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
      label{display:block;font-weight:600;margin-bottom:6px}
      input, textarea{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-family:inherit}
      textarea{min-height:120px;resize:vertical}
      .btn{padding:10px 16px;border:0;border-radius:8px;background:#111827;color:#fff;font-weight:600;cursor:pointer}
      .note{color:#6b7280;font-size:13px;margin-top:8px}
      .msg{margin-top:10px;font-size:14px}
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Forum</h1>
      <p class="sub">Start a discussion or ask a question.</p>
      <div class="list">${items || '<div style="color:#6b7280">No topics yet.</div>'}</div>
      <div class="card">
        <h2 style="margin:0 0 12px;font-size:20px">New Discussion</h2>
        <label>Name</label>
        <input id="forum-name" type="text" placeholder="Your name" />
        <label style="margin-top:10px">Email</label>
        <input id="forum-email" type="email" placeholder="you@example.com" />
        <label style="margin-top:10px">Title</label>
        <input id="forum-title" type="text" placeholder="Topic title" />
        <label style="margin-top:10px">Body</label>
        <textarea id="forum-body" placeholder="Write your discussion..."></textarea>
        <button class="btn" id="forum-submit" style="margin-top:12px">Submit for approval</button>
        <div class="note">Every post needs admin approval. Only one pending submission is allowed per email.</div>
        <div class="msg" id="forum-msg"></div>
      </div>
    </div>
    <script>
      const btn = document.getElementById('forum-submit');
      const msg = document.getElementById('forum-msg');
      btn.addEventListener('click', async () => {
        msg.textContent = '';
        const payload = {
          name: document.getElementById('forum-name').value.trim(),
          email: document.getElementById('forum-email').value.trim(),
          title: document.getElementById('forum-title').value.trim(),
          body: document.getElementById('forum-body').value.trim()
        };
        try {
          const res = await fetch('/api/forum/topic/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Failed to submit');
          msg.style.color = '#047857';
          msg.textContent = 'Submitted! Waiting for admin approval.';
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

export async function renderForumTopic(env, slug) {
  const topic = await env.DB.prepare(
    `SELECT id, slug, title, body, author_name, created_at
     FROM forum_topics
     WHERE slug = ? AND status = 'approved'`
  ).bind(String(slug || '').trim()).first();
  if (!topic) return new Response('Not found', { status: 404 });

  const replies = await env.DB.prepare(
    `SELECT body, author_name, created_at
     FROM forum_replies
     WHERE topic_id = ? AND status = 'approved'
     ORDER BY created_at ASC`
  ).bind(topic.id).all();
  const items = (replies.results || []).map(r => {
    const d = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
    return `<div class="reply">
      <div class="meta">${escapeHtml(r.author_name || 'Anonymous')} • ${escapeHtml(d)}</div>
      <div class="body">${toParagraphs(r.body || '')}</div>
    </div>`;
  }).join('');

  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(topic.title || topic.slug)}</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#111827;margin:0}
      .wrap{max-width:900px;margin:0 auto;padding:28px 18px}
      a{color:inherit}
      .back{display:inline-block;margin-bottom:16px;color:#6b7280;text-decoration:none}
      .back:hover{text-decoration:underline}
      .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:16px}
      .meta{color:#6b7280;font-size:13px;margin-top:6px}
      .reply{border-top:1px solid #e5e7eb;padding:12px 0}
      .reply:first-child{border-top:0}
      .form{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:16px}
      label{display:block;font-weight:600;margin-bottom:6px}
      input, textarea{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-family:inherit}
      textarea{min-height:120px;resize:vertical}
      .btn{padding:10px 16px;border:0;border-radius:8px;background:#111827;color:#fff;font-weight:600;cursor:pointer}
      .msg{margin-top:10px;font-size:14px}
      h1{margin:0 0 6px;font-size:26px}
    </style>
  </head>
  <body>
    <div class="wrap">
      <a class="back" href="/forum">← Back to Forum</a>
      <div class="card">
        <h1>${escapeHtml(topic.title || topic.slug)}</h1>
        <div class="meta">By ${escapeHtml(topic.author_name || 'Anonymous')} • ${escapeHtml(topic.created_at ? new Date(topic.created_at).toLocaleDateString() : '')}</div>
        <div style="margin-top:12px">${toParagraphs(topic.body || '')}</div>
      </div>
      <div class="card">
        <h2 style="margin:0 0 12px;font-size:20px">Replies</h2>
        ${items || '<div style="color:#6b7280">No replies yet.</div>'}
      </div>
      <div class="form">
        <h2 style="margin:0 0 12px;font-size:20px">Reply</h2>
        <label>Name</label>
        <input id="reply-name" type="text" placeholder="Your name" />
        <label style="margin-top:10px">Email</label>
        <input id="reply-email" type="email" placeholder="you@example.com" />
        <label style="margin-top:10px">Body</label>
        <textarea id="reply-body" placeholder="Write your reply..."></textarea>
        <button class="btn" id="reply-submit" style="margin-top:12px">Submit for approval</button>
        <div class="msg" id="reply-msg"></div>
      </div>
    </div>
    <script>
      const btn = document.getElementById('reply-submit');
      const msg = document.getElementById('reply-msg');
      btn.addEventListener('click', async () => {
        msg.textContent = '';
        const payload = {
          name: document.getElementById('reply-name').value.trim(),
          email: document.getElementById('reply-email').value.trim(),
          body: document.getElementById('reply-body').value.trim(),
          slug: ${JSON.stringify(topic.slug)}
        };
        try {
          const res = await fetch('/api/forum/reply/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Failed to submit');
          msg.style.color = '#047857';
          msg.textContent = 'Reply submitted for approval.';
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
