/**
 * External control webhook (Google Script)
 */

import { json } from '../../../../core/utils/response.js';
import { createManualOrder, deliverOrder, updateOrder } from './orders.js';
import { updateReview } from './reviews.js';
import { setBlogStatus } from './blog.js';
import { setForumTopicStatus, setForumReplyStatus } from './forum.js';

function readSecretHeader(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return req.headers.get('x-control-secret') || '';
}

async function ensureAssignedTeam(env) {
  try {
    await env.DB.prepare('ALTER TABLE orders ADD COLUMN assigned_team TEXT').run();
  } catch (_) {}
}

async function getControlSettings(env) {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
    .bind('control_webhook')
    .first();
  if (!row || !row.value) return { enabled: false, secret: '' };
  try {
    const data = JSON.parse(row.value);
    return {
      enabled: !!data.enabled,
      secret: String(data.secret || '').trim()
    };
  } catch (_) {
    return { enabled: false, secret: '' };
  }
}

async function deleteOrderById(env, body) {
  const id = Number(body.id || 0);
  const orderId = String(body.orderId || '').trim();
  if (!id && !orderId) return json({ success: false, error: 'id or orderId required' }, 400);
  if (id) {
    await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
  } else {
    await env.DB.prepare('DELETE FROM orders WHERE order_id = ?').bind(orderId).run();
  }
  return json({ success: true });
}

async function assignOrder(env, body) {
  await ensureAssignedTeam(env);
  const orderId = String(body.orderId || '').trim();
  const team = String(body.assigned_team || body.team || '').trim();
  if (!orderId || !team) return json({ success: false, error: 'orderId and assigned_team required' }, 400);
  await env.DB.prepare(
    'UPDATE orders SET assigned_team = ? WHERE order_id = ?'
  ).bind(team, orderId).run();
  return json({ success: true });
}

async function setReviewStatus(env, body) {
  const id = Number(body.id || 0);
  const status = String(body.status || '').trim();
  if (!id || !status) return json({ success: false, error: 'id and status required' }, 400);
  return updateReview(env, { id, status });
}

export async function handleControlWebhook(env, req) {
  if (!env.DB) return json({ success: false, error: 'Database not configured' }, 500);
  const settings = await getControlSettings(env);
  if (!settings.enabled || !settings.secret) {
    return json({ success: false, error: 'Webhook disabled' }, 403);
  }
  const incoming = readSecretHeader(req);
  if (!incoming || incoming !== settings.secret) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '').trim().toLowerCase();
  const payload = body.payload || {};

  switch (action) {
    case 'order.create':
      return createManualOrder(env, payload);
    case 'order.delete':
      return deleteOrderById(env, payload);
    case 'order.assign':
      return assignOrder(env, payload);
    case 'order.status':
      return updateOrder(env, payload);
    case 'order.deliver':
      return deliverOrder(env, payload);
    case 'review.approve':
    case 'review.reject':
      return setReviewStatus(env, { id: payload.id, status: action === 'review.approve' ? 'approved' : 'rejected' });
    case 'forum.topic.approve':
    case 'forum.topic.reject':
      return setForumTopicStatus(env, { id: payload.id, status: action === 'forum.topic.approve' ? 'approved' : 'rejected' });
    case 'forum.reply.approve':
    case 'forum.reply.reject':
      return setForumReplyStatus(env, { id: payload.id, status: action === 'forum.reply.approve' ? 'approved' : 'rejected' });
    case 'blog.approve':
    case 'blog.reject':
      return setBlogStatus(env, { slug: payload.slug, status: action === 'blog.approve' ? 'published' : 'rejected' });
    default:
      return json({ success: false, error: 'Unknown action' }, 400);
  }
}
