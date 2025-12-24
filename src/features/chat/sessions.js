/**
 * Chat session handlers.
 */

import { json } from '../../../utils/response.js';
import { escapeHtml } from '../../../utils/formatting.js';

export async function startChat(env, body) {
  const nameIn = String(body.name || '').trim();
  const emailIn = String(body.email || '').trim();

  if (!nameIn || !emailIn) return json({ error: 'Name and email are required' }, 400);

  const email = emailIn.toLowerCase();
  const name = nameIn;

  const canonical = await env.DB.prepare(
    `SELECT id, name, created_at
     FROM chat_sessions
     WHERE lower(email) = lower(?)
     ORDER BY datetime(created_at) ASC
     LIMIT 1`
  ).bind(email).first();

  if (canonical?.id) {
    const canonicalId = String(canonical.id);

    if (name && canonical.name !== name) {
      await env.DB.prepare(
        `UPDATE chat_sessions SET name = ? WHERE id = ?`
      ).bind(name, canonicalId).run();
    }

    const others = await env.DB.prepare(
      `SELECT id FROM chat_sessions
       WHERE lower(email) = lower(?) AND id != ?`
    ).bind(email, canonicalId).all();

    const otherIds = (others?.results || []).map(r => String(r.id));
    for (const sid of otherIds) {
      await env.DB.prepare(
        `UPDATE chat_messages SET session_id = ? WHERE session_id = ?`
      ).bind(canonicalId, sid).run();

      await env.DB.prepare(
        `DELETE FROM chat_sessions WHERE id = ?`
      ).bind(sid).run();
    }

    return json({ sessionId: canonicalId, reused: true });
  }

  const sessionId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO chat_sessions (id, name, email) VALUES (?, ?, ?)`
  ).bind(sessionId, escapeHtml(name), escapeHtml(email)).run();

  return json({ sessionId, reused: false });
}

export async function blockSession(env, body) {
  const sessionId = String(body.sessionId || '').trim();
  const blocked = body.blocked === true || body.blocked === 1 || body.blocked === 'true';

  if (!sessionId) return json({ error: 'sessionId is required' }, 400);

  await env.DB.prepare(
    `UPDATE chat_sessions SET blocked = ? WHERE id = ?`
  ).bind(blocked ? 1 : 0, sessionId).run();

  return json({ success: true, blocked: blocked ? 1 : 0 });
}

export async function deleteSession(env, sessionId) {
  if (!sessionId) return json({ error: 'sessionId is required' }, 400);

  await env.DB.prepare(`DELETE FROM chat_messages WHERE session_id = ?`).bind(sessionId).run();
  await env.DB.prepare(`DELETE FROM chat_sessions WHERE id = ?`).bind(sessionId).run();

  return json({ success: true });
}

export async function getSessions(env) {
  const rows = await env.DB.prepare(
    `SELECT
       s.id,
       s.name,
       s.email,
       s.blocked,
       s.last_message_at,
       s.last_message_content AS last_message,
       s.created_at
     FROM chat_sessions s
     JOIN (
       SELECT lower(email) AS em, MIN(datetime(created_at)) AS min_created
       FROM chat_sessions
       GROUP BY lower(email)
     ) x
       ON lower(s.email) = x.em AND datetime(s.created_at) = x.min_created
     ORDER BY COALESCE(s.last_message_at, s.created_at) DESC
     LIMIT 200`
  ).all();

  return json({ sessions: rows?.results || [] });
}
