/**
 * Chat message handler.
 */

import { json } from '../../../utils/response.js';
import { enforceUserRateLimit } from '../../../utils/validation.js';
import { normalizeRole, sanitizeContent, updateLastMessage } from './helpers.js';
import { checkDuplicateMessage } from './dedup.js';
import { notifyFirstCustomerMessage } from './alerts.js';
import { maybeAutoReply } from './replies.js';

async function isSessionBlocked(env, sessionId) {
  const sess = await env.DB.prepare(
    `SELECT blocked FROM chat_sessions WHERE id = ?`
  ).bind(sessionId).first();
  return Number(sess?.blocked || 0) === 1;
}

async function isFirstUserMessage(env, sessionId) {
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as c
     FROM chat_messages
     WHERE session_id = ? AND role = 'user'`
  ).bind(sessionId).first();
  return Number(countRow?.c || 0) === 0;
}

export async function sendMessage(env, body, reqUrl) {
  const sessionId = String(body.sessionId || '').trim();
  const role = normalizeRole(body.role);
  const rawContent = String(body.content ?? body.message ?? '');

  if (!sessionId) return json({ error: 'sessionId is required' }, 400);

  if (role === 'user' && await isSessionBlocked(env, sessionId)) {
    return json({ success: false, error: 'You have been blocked by support.' }, 403);
  }

  const trimmed = rawContent.trim();
  if (!trimmed) return json({ error: 'content is required' }, 400);
  if (trimmed.length > 500) return json({ error: 'Message too long (max 500 characters)' }, 400);

  const safeContent = sanitizeContent(trimmed);
  const duplicate = await checkDuplicateMessage(env, sessionId, role, safeContent);
  if (duplicate) return duplicate;

  try {
    if (role === 'user') await enforceUserRateLimit(env, sessionId);
  } catch (e) {
    if (e?.status === 429) return json({ error: 'Too many messages. Please wait a moment.' }, 429);
    throw e;
  }

  const firstUserMessage = role === 'user' ? await isFirstUserMessage(env, sessionId) : false;

  const insertRes = await env.DB.prepare(
    `INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)`
  ).bind(sessionId, role, safeContent).run();

  await updateLastMessage(env, sessionId, safeContent);

  if (firstUserMessage) {
    await notifyFirstCustomerMessage(env, sessionId, trimmed, reqUrl);
  }

  if (role === 'user') {
    await maybeAutoReply(env, sessionId, trimmed, reqUrl);
  }

  return json({ success: true, messageId: insertRes?.meta?.last_row_id || null });
}
