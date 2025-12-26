/**
 * Send Chat Message Action
 * POST /api/chat/send
 */

import { json, error, serverError } from '../../../core/utils/response.js';

export const sendMessage = async (request, env) => {
  if (!env.DB) {
    return serverError('DB missing');
  }

  const body = await request.json().catch(() => ({}));
  const sessionId = String(body.session_id || '').trim();
  const message = String(body.message || '').trim();

  if (!sessionId || !message) {
    return error('Missing session_id or message');
  }

  await env.DB.prepare(
    `INSERT INTO chat_messages (session_id, role, content, payload_json)
     VALUES (?, 'user', ?, '')`
  ).bind(sessionId, message).run();

  await env.DB.prepare(
    `UPDATE chat_sessions
     SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(message, sessionId).run();

  return json({ ok: true });
};
