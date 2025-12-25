/**
 * Quick action auto-replies.
 */

import { escapeHtml, normalizeQuickAction } from '../../utils/formatting.js';
import { getLatestOrderForEmail } from '../../utils/order-helpers.js';

export async function maybeAutoReply(env, sessionId, message, reqUrl) {
  const normalized = normalizeQuickAction(message);
  const session = await env.DB.prepare(
    `SELECT email FROM chat_sessions WHERE id = ?`
  ).bind(sessionId).first();

  const email = String(session?.email || '').trim();
  const origin = new URL(reqUrl).origin;

  if (normalized === 'my order status') {
    let replyText = "We couldn't find any recent orders for this email.";
    if (email) {
      const lastOrder = await getLatestOrderForEmail(env, email);
      if (lastOrder) {
        const link = `${origin}/buyer-order.html?id=${encodeURIComponent(lastOrder.order_id)}`;
        replyText = `Your last order #${lastOrder.order_id} is currently ${lastOrder.status || 'unknown'}. Track it here: ${link}`;
      }
    }
    await insertSystemReply(env, sessionId, replyText);
  }

  if (normalized === 'check delivery status') {
    let replyText = "No recent orders found for this email.";
    if (email) {
      const lastOrder = await getLatestOrderForEmail(env, email);
      if (lastOrder) {
        const link = `${origin}/buyer-order.html?id=${encodeURIComponent(lastOrder.order_id)}`;
        replyText = `Your last order is ${lastOrder.status || 'unknown'}. View details here: ${link}`;
      }
    }
    await insertSystemReply(env, sessionId, replyText);
  }
}

async function insertSystemReply(env, sessionId, replyText) {
  const safeReply = escapeHtml(replyText);
  await env.DB.prepare(
    `INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'system', ?)`
  ).bind(sessionId, safeReply).run();

  try {
    await env.DB.prepare(
      `UPDATE chat_sessions
       SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(safeReply, sessionId).run();
  } catch (_) {}
}
