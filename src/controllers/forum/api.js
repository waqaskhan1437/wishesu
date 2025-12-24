/**
 * Forum API Controller
 * Handles forum API operations (submit, list, update, delete)
 */

import { json } from '../../utils/response.js';
import { isCustomerBlocked, normalizeEmail, upsertCustomer } from '../../utils/customers.js';

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

export async function updateForumTopic(env, body) {
  const id = Number(body.id);
  const title = String(body.title || '').trim();
  const text = String(body.body || '').trim();
  if (!id || !title || !text) {
    return json({ success: false, error: 'id, title, and body required' }, 400);
  }
  await env.DB.prepare(
    'UPDATE forum_topics SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(title, text, id).run();
  return json({ success: true });
}

export async function updateForumReply(env, body) {
  const id = Number(body.id);
  const text = String(body.body || '').trim();
  if (!id || !text) {
    return json({ success: false, error: 'id and body required' }, 400);
  }
  await env.DB.prepare(
    'UPDATE forum_replies SET body = ? WHERE id = ?'
  ).bind(text, id).run();
  return json({ success: true });
}

export async function deleteForumTopic(env, body) {
  const id = Number(body.id);
  if (!id) return json({ success: false, error: 'id required' }, 400);
  await env.DB.prepare('DELETE FROM forum_replies WHERE topic_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM forum_topics WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function deleteForumReply(env, body) {
  const id = Number(body.id);
  if (!id) return json({ success: false, error: 'id required' }, 400);
  await env.DB.prepare('DELETE FROM forum_replies WHERE id = ?').bind(id).run();
  return json({ success: true });
}
