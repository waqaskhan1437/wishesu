/**
 * Poll Chat Messages Action
 * GET /api/chat/poll
 */

import { json, error, serverError } from '../../../core/utils/response.js';

export const pollMessages = async (request, env) => {
  if (!env.DB) {
    return serverError('DB missing');
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return error('Missing session_id');
  }

  const sinceId = Number(url.searchParams.get('since_id') || 0);

  const result = await env.DB.prepare(
    `SELECT id, role, content as message, created_at
     FROM chat_messages
     WHERE session_id = ? AND id > ?
     ORDER BY id ASC`
  ).bind(sessionId, sinceId).all();

  return json({ messages: result.results || [] });
};
