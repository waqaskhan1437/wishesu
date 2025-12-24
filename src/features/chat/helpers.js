/**
 * Chat helper utilities.
 */

import { escapeHtml } from '../../../utils/formatting.js';

export function normalizeRole(roleRaw) {
  const role = String(roleRaw || 'user').trim().toLowerCase();
  return ['user', 'admin', 'system'].includes(role) ? role : 'user';
}

export function sanitizeContent(content) {
  return escapeHtml(String(content ?? '').trim());
}

export function resolveOrigin(reqUrl) {
  return reqUrl ? new URL(reqUrl).origin : null;
}

export async function updateLastMessage(env, sessionId, content) {
  try {
    await env.DB.prepare(
      `UPDATE chat_sessions
       SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(content, sessionId).run();
  } catch (e) {
    console.error('Failed to update chat_sessions last-message fields:', e);
  }
}
