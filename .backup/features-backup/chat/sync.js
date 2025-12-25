/**
 * Chat sync handler.
 */

import { json } from '../../utils/response.js';

export async function syncChat(env, url) {
  const sessionId = url.searchParams.get('sessionId');
  const sinceIdRaw = url.searchParams.get('sinceId') || '0';
  const sinceId = Number(sinceIdRaw) || 0;

  if (!sessionId) return json({ error: 'sessionId is required' }, 400);

  const rows = await env.DB.prepare(
    `SELECT id, role, content, created_at
     FROM chat_messages
     WHERE session_id = ? AND id > ?
     ORDER BY id ASC
     LIMIT 100`
  ).bind(sessionId, sinceId).all();

  const messages = rows?.results || [];
  const lastId = messages.length ? messages[messages.length - 1].id : sinceId;

  return json({ messages, lastId });
}
