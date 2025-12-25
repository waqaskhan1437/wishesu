/**
 * Chat de-duplication helpers.
 */

import { json } from '../../utils/response.js';

export async function checkDuplicateMessage(env, sessionId, role, content) {
  try {
    const last = await env.DB.prepare(
      `SELECT id, role, content, created_at
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY id DESC
       LIMIT 1`
    ).bind(sessionId).first();
    if (last && String(last.role) === role && String(last.content) === content) {
      const lastTs = new Date(last.created_at).getTime();
      if (!Number.isNaN(lastTs) && (Date.now() - lastTs) < 10000) {
        return json({ success: true, messageId: last.id, deduped: true });
      }
    }
  } catch (_) {}
  return null;
}
