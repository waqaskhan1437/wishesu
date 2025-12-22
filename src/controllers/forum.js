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
    `SELECT t.id, t.slug, t.title, t.body, t.author_name, t.created_at,
      (SELECT COUNT(*) FROM forum_replies r WHERE r.topic_id = t.id AND r.status = 'approved') as reply_count
     FROM forum_topics t
     WHERE t.status = 'approved'
     ORDER BY t.created_at DESC`
  ).all();
  const topics = rows.results || [];

  const items = topics.map(t => {
    const d = t.created_at ? new Date(t.created_at).toLocaleDateString() : '';
    const replies = Number(t.reply_count || 0);
    const excerpt = makeExcerpt(t.body, 220);
    return `<a class="topic-card" href="/forum/${encodeURIComponent(t.slug)}" data-search="${escapeHtml((t.title || '') + ' ' + (t.body || ''))}">
      <div class="topic-head">
        <div class="title">${escapeHtml(t.title || t.slug)}</div>
        <div class="pill">${replies} replies</div>
      </div>
      <div class="meta">By ${escapeHtml(t.author_name || 'Anonymous')} • ${escapeHtml(d)}</div>
      <div class="desc">${escapeHtml(excerpt)}</div>
      <div class="read-more">Read more →</div>
    </a>`;
  }).join('');

  const latest = topics.slice(0, 6).map(t => {
    const d = t.created_at ? new Date(t.created_at).toLocaleDateString() : '';
    return `<a class="side-link" href="/forum/${encodeURIComponent(t.slug)}">
      <div class="side-title">${escapeHtml(t.title || t.slug)}</div>
      <div class="side-date">${escapeHtml(d)}</div>
    </a>`;
  }).join('');

  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Forum</title>
    <style>
      :root{
        --bg:#0b0f19;
        --card:#0f172a;
        --ink:#f8fafc;
        --muted:#94a3b8;
        --accent:#f97316;
        --accent-2:#22d3ee;
        --border:rgba(148,163,184,0.25);
      }
      *{box-sizing:border-box}
      body{
        font-family:'Sora',system-ui,-apple-system,sans-serif;
        background:
          radial-gradient(900px 500px at 10% -10%, rgba(34,211,238,0.18), transparent 60%),
          radial-gradient(900px 500px at 90% -10%, rgba(249,115,22,0.2), transparent 60%),
          var(--bg);
        color:var(--ink);
        margin:0;
      }
      .wrap{max-width:1200px;margin:0 auto;padding:40px 20px}
      h1{margin:0 0 10px;font-size:38px;letter-spacing:0.5px}
      .sub{color:var(--muted);margin:0 0 26px;font-size:16px}
      .hero{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap;margin-bottom:20px}
      .hero-actions{display:flex;gap:10px;flex-wrap:wrap}
      .chip{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;border:1px solid var(--border);color:var(--ink);background:rgba(15,23,42,0.6);font-size:13px}
      .chip span{color:var(--accent-2)}
      .layout{display:grid;grid-template-columns:1.3fr 0.7fr;gap:24px;align-items:start}
      .search{
        display:flex;gap:10px;align-items:center;background:rgba(15,23,42,0.7);
        border:1px solid var(--border);border-radius:14px;padding:10px 14px;margin-bottom:16px;
      }
      .search input{
        flex:1;background:transparent;border:0;color:var(--ink);font-size:15px;outline:none;
      }
      .search input::placeholder{color:var(--muted)}
      .list{display:flex;flex-direction:column;gap:14px}
      .topic-card{
        display:block;text-decoration:none;background:rgba(15,23,42,0.8);
        border:1px solid var(--border);border-radius:18px;padding:18px 20px;
        box-shadow:0 10px 30px rgba(2,6,23,0.35);transition:transform .2s,border-color .2s,box-shadow .2s;
      }
      .topic-card:hover{border-color:rgba(34,211,238,0.7);transform:translateY(-2px);box-shadow:0 14px 36px rgba(2,6,23,0.5)}
      .topic-head{display:flex;justify-content:space-between;gap:12px;align-items:center}
      .title{font-weight:700;color:var(--ink);font-size:20px}
      .pill{font-size:12px;padding:6px 10px;border-radius:999px;background:rgba(249,115,22,0.16);color:#fdba74;border:1px solid rgba(249,115,22,0.35)}
      .meta{color:var(--muted);font-size:13px;margin-top:6px}
      .desc{color:#cbd5f5;margin-top:10px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
      .read-more{color:var(--accent-2);font-weight:600;margin-top:12px;font-size:14px}
      .side{
        background:rgba(15,23,42,0.85);border:1px solid var(--border);border-radius:18px;padding:18px 18px;
        position:sticky;top:20px;box-shadow:0 10px 30px rgba(2,6,23,0.35);
      }
      .side h3{margin:0 0 12px;font-size:18px}
      .side-links{display:flex;flex-direction:column;gap:12px}
      .side-link{text-decoration:none;border:1px solid var(--border);border-radius:12px;padding:10px 12px;display:block;background:rgba(2,6,23,0.3)}
      .side-link:hover{border-color:rgba(249,115,22,0.6)}
      .side-title{font-weight:600;color:var(--ink);font-size:14px}
      .side-date{color:var(--muted);font-size:12px;margin-top:4px}
      .card{
        margin-top:16px;background:rgba(2,6,23,0.5);border:1px solid var(--border);border-radius:16px;padding:16px
      }
      label{display:block;font-weight:600;margin-bottom:6px;color:#e2e8f0}
      input, textarea{
        width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-family:inherit;
        background:rgba(15,23,42,0.8);color:var(--ink)
      }
      textarea{min-height:120px;resize:vertical}
      .btn{
        padding:10px 16px;border:0;border-radius:10px;background:linear-gradient(135deg,var(--accent),#fb7185);
        color:#0b0f19;font-weight:700;cursor:pointer
      }
      .note{color:var(--muted);font-size:13px;margin-top:8px}
      .msg{margin-top:10px;font-size:14px}
      @media (max-width: 900px){
        .layout{grid-template-columns:1fr}
        .side{position:static}
      }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div class="wrap">
      <div class="hero">
        <div>
          <h1>Community Forum</h1>
          <p class="sub">Ask questions, share ideas, and help each other grow.</p>
          <div class="chip"><span>●</span> Moderated community</div>
        </div>
        <div class="hero-actions">
          <div class="chip"><span>★</span> Respectful discussions</div>
        </div>
      </div>
      <div class="layout">
        <div>
          <div class="search">
            <input id="forum-search" type="text" placeholder="Search discussions..." />
          </div>
          <div class="list" id="forum-list">${items || '<div style="color:#94a3b8">No topics yet.</div>'}</div>
          <div class="card">
            <h2 style="margin:0 0 12px;font-size:20px">Start a discussion</h2>
            <label>Name</label>
            <input id="forum-name" type="text" placeholder="Your name" />
            <label style="margin-top:10px">Email</label>
            <input id="forum-email" type="email" placeholder="you@example.com" />
            <label style="margin-top:10px">Title</label>
            <input id="forum-title" type="text" placeholder="Topic title" />
            <label style="margin-top:10px">Body</label>
            <textarea id="forum-body" placeholder="Write your discussion..."></textarea>
            <button class="btn" id="forum-submit" type="button" style="margin-top:12px">Submit for approval</button>
            <div class="note">Every post needs admin approval. Only one pending submission is allowed per email.</div>
            <div class="msg" id="forum-msg"></div>
          </div>
        </div>
        <aside class="side">
          <h3>Trending now</h3>
          <div class="side-links">${latest || '<div style="color:#94a3b8">No topics yet.</div>'}</div>
          <div class="card">
            <strong>Community links</strong>
            <div style="margin-top:8px;color:#94a3b8;font-size:13px">Be kind • Stay on topic • Help others</div>
          </div>
        </aside>
      </div>
    </div>
    <script>
      const btn = document.getElementById('forum-submit');
      const msg = document.getElementById('forum-msg');
      const search = document.getElementById('forum-search');
      const list = document.getElementById('forum-list');
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
          document.getElementById('forum-title').value = '';
          document.getElementById('forum-body').value = '';
        } catch (e) {
          msg.style.color = '#b91c1c';
          msg.textContent = e.message || 'Failed to submit';
        }
      });

      if (search && list) {
        search.addEventListener('input', () => {
          const q = search.value.trim().toLowerCase();
          const cards = list.querySelectorAll('.topic-card');
          cards.forEach(c => {
            const hay = (c.getAttribute('data-search') || '').toLowerCase();
            c.style.display = !q || hay.includes(q) ? '' : 'none';
          });
        });
      }
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

  const latest = await env.DB.prepare(
    `SELECT slug, title, created_at
     FROM forum_topics
     WHERE status = 'approved'
     ORDER BY created_at DESC
     LIMIT 6`
  ).all();
  const latestItems = (latest.results || []).map(t => {
    const d = t.created_at ? new Date(t.created_at).toLocaleDateString() : '';
    return `<a class="side-link" href="/forum/${encodeURIComponent(t.slug)}">
      <div class="side-title">${escapeHtml(t.title || t.slug)}</div>
      <div class="side-date">${escapeHtml(d)}</div>
    </a>`;
  }).join('');

  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(topic.title || topic.slug)}</title>
    <style>
      :root{
        --bg:#0b0f19;
        --card:#0f172a;
        --ink:#f8fafc;
        --muted:#94a3b8;
        --accent:#f97316;
        --accent-2:#22d3ee;
        --border:rgba(148,163,184,0.25);
      }
      *{box-sizing:border-box}
      body{
        font-family:'Sora',system-ui,-apple-system,sans-serif;
        background:
          radial-gradient(900px 500px at 10% -10%, rgba(34,211,238,0.18), transparent 60%),
          radial-gradient(900px 500px at 90% -10%, rgba(249,115,22,0.2), transparent 60%),
          var(--bg);
        color:var(--ink);
        margin:0;
      }
      .wrap{max-width:1200px;margin:0 auto;padding:40px 20px}
      a{color:inherit}
      .back{display:inline-block;margin-bottom:16px;color:var(--muted);text-decoration:none}
      .back:hover{text-decoration:underline}
      .layout{display:grid;grid-template-columns:1.3fr 0.7fr;gap:24px;align-items:start}
      .card{
        background:rgba(15,23,42,0.85);border:1px solid var(--border);border-radius:18px;padding:18px;margin-bottom:16px;
        box-shadow:0 10px 30px rgba(2,6,23,0.35);
      }
      .meta{color:var(--muted);font-size:13px;margin-top:6px}
      .reply{border-top:1px solid var(--border);padding:12px 0}
      .reply:first-child{border-top:0}
      .form{border:1px solid var(--border);border-radius:16px;padding:16px;margin-top:16px;background:rgba(2,6,23,0.5)}
      label{display:block;font-weight:600;margin-bottom:6px;color:#e2e8f0}
      input, textarea{width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;font-family:inherit;background:rgba(15,23,42,0.8);color:var(--ink)}
      textarea{min-height:120px;resize:vertical}
      .btn{padding:10px 16px;border:0;border-radius:10px;background:linear-gradient(135deg,var(--accent),#fb7185);color:#0b0f19;font-weight:700;cursor:pointer}
      .msg{margin-top:10px;font-size:14px}
      h1{margin:0 0 6px;font-size:28px}
      .side{
        background:rgba(15,23,42,0.85);border:1px solid var(--border);border-radius:18px;padding:18px 18px;
        position:sticky;top:20px;box-shadow:0 10px 30px rgba(2,6,23,0.35);
      }
      .side h3{margin:0 0 12px;font-size:18px}
      .side-links{display:flex;flex-direction:column;gap:12px}
      .side-link{text-decoration:none;border:1px solid var(--border);border-radius:12px;padding:10px 12px;display:block;background:rgba(2,6,23,0.3)}
      .side-title{font-weight:600;color:var(--ink);font-size:14px}
      .side-date{color:var(--muted);font-size:12px;margin-top:4px}
      @media (max-width: 900px){
        .layout{grid-template-columns:1fr}
        .side{position:static}
      }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div class="wrap">
      <a class="back" href="/forum">← Back to Forum</a>
      <div class="layout">
        <div>
          <div class="card">
            <h1>${escapeHtml(topic.title || topic.slug)}</h1>
            <div class="meta">By ${escapeHtml(topic.author_name || 'Anonymous')} • ${escapeHtml(topic.created_at ? new Date(topic.created_at).toLocaleDateString() : '')}</div>
            <div style="margin-top:12px">${toParagraphs(topic.body || '')}</div>
          </div>
          <div class="card">
            <h2 style="margin:0 0 12px;font-size:20px">Replies</h2>
            ${items || '<div style="color:#94a3b8">No replies yet.</div>'}
          </div>
          <div class="form">
            <h2 style="margin:0 0 12px;font-size:20px">Reply</h2>
            <label>Name</label>
            <input id="reply-name" type="text" placeholder="Your name" />
            <label style="margin-top:10px">Email</label>
            <input id="reply-email" type="email" placeholder="you@example.com" />
            <label style="margin-top:10px">Body</label>
            <textarea id="reply-body" placeholder="Write your reply..."></textarea>
            <button class="btn" id="reply-submit" type="button" style="margin-top:12px">Submit for approval</button>
            <div class="msg" id="reply-msg"></div>
          </div>
        </div>
        <aside class="side">
          <h3>Latest discussions</h3>
          <div class="side-links">${latestItems || '<div style="color:#94a3b8">No topics yet.</div>'}</div>
          <div class="card" style="margin-top:14px;">
            <strong>Ask better questions</strong>
            <div style="margin-top:8px;color:#94a3b8;font-size:13px">Share context • Be specific • Stay kind</div>
          </div>
        </aside>
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
          document.getElementById('reply-body').value = '';
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
