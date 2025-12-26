/**
 * Start Chat Session Action
 * POST /api/chat/start
 */

import { json, serverError } from '../../../core/utils/response.js';

export const startChat = async (request, env) => {
  if (!env.DB) {
    return serverError('DB missing');
  }

  const sessionId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO chat_sessions (id, name, email, blocked)
     VALUES (?, '', '', 0)`
  ).bind(sessionId).run();

  return json({ session_id: sessionId });
};
