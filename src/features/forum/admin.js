/**
 * Forum admin handlers.
 */

import { json } from '../../../utils/response.js';

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
