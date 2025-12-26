import { json } from '../../../core/utils/response/response.js';
import { CORS } from '../../../core/config/cors/cors.js';

export async function start(req, env) {
  if (!env.DB) return json({ error: 'DB missing' }, 500, CORS);
  const sessionId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO chat_sessions (id, name, email, blocked)
     VALUES (?, '', '', 0)`
  ).bind(sessionId).run();
  return json({ session_id: sessionId }, 200, CORS);
}

export async function send(req, env) {
  if (!env.DB) return json({ error: 'DB missing' }, 500, CORS);
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.session_id || '').trim();
  const message = String(body.message || '').trim();
  if (!sessionId || !message) return json({ error: 'Missing session_id or message' }, 400, CORS);
  await env.DB.prepare(
    `INSERT INTO chat_messages (session_id, role, content, payload_json)
     VALUES (?, 'user', ?, '')`
  ).bind(sessionId, message).run();
  await env.DB.prepare(
    `UPDATE chat_sessions
     SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(message, sessionId).run();
  return json({ ok: true }, 200, CORS);
}

export async function poll(req, env, url) {
  if (!env.DB) return json({ error: 'DB missing' }, 500, CORS);
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) return json({ error: 'Missing session_id' }, 400, CORS);
  const sinceId = Number(url.searchParams.get('since_id') || 0);
  const result = await env.DB.prepare(
    `SELECT id, role, content as message, created_at
     FROM chat_messages
     WHERE session_id = ? AND id > ?
     ORDER BY id ASC`
  ).bind(sessionId, sinceId).all();
  return json({ messages: result.results || [] }, 200, CORS);
}
