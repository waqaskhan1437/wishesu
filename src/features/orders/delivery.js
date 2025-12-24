/**
 * Delivery handlers.
 */

import { json } from '../../../utils/response.js';
import { notifyOrderDelivered, notifyRevisionRequested } from './notifications.js';

function buildDeliveredMetadata(body) {
  return JSON.stringify({
    embedUrl: body.embedUrl,
    itemId: body.itemId,
    subtitlesUrl: body.subtitlesUrl,
    tracks: Array.isArray(body.tracks) ? body.tracks : undefined,
    deliveredAt: new Date().toISOString()
  });
}

async function resolveCustomerEmail(orderResult) {
  if (!orderResult) return '';
  try {
    const decrypted = JSON.parse(orderResult.encrypted_data);
    return decrypted.email || '';
  } catch (_) {
    console.warn('Could not decrypt order data for email');
    return '';
  }
}

export async function deliverOrder(env, body) {
  if (!body.orderId || !body.videoUrl) return json({ error: 'orderId and videoUrl required' }, 400);

  const orderResult = await env.DB.prepare(
    'SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?'
  ).bind(body.orderId).first();

  const deliveredVideoMetadata = buildDeliveredMetadata(body);

  await env.DB.prepare(
    'UPDATE orders SET delivered_video_url=?, delivered_thumbnail_url=?, status=?, delivered_at=CURRENT_TIMESTAMP, delivered_video_metadata=? WHERE order_id=?'
  ).bind(body.videoUrl, body.thumbnailUrl || null, 'delivered', deliveredVideoMetadata, body.orderId).run();

  if (orderResult) {
    const email = await resolveCustomerEmail(orderResult);
    await notifyOrderDelivered(env, {
      order_id: body.orderId,
      product_title: orderResult.product_title || 'Your Order',
      email,
      delivered_video_url: body.videoUrl,
      status: 'delivered'
    });
  }

  return json({ success: true });
}

export async function requestRevision(env, body) {
  if (!body.orderId) return json({ error: 'orderId required' }, 400);

  const orderResult = await env.DB.prepare(
    'SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?'
  ).bind(body.orderId).first();

  await env.DB.prepare(
    'UPDATE orders SET revision_requested=1, revision_count=revision_count+1, status=? WHERE order_id=?'
  ).bind('revision', body.orderId).run();

  if (orderResult) {
    const email = await resolveCustomerEmail(orderResult);
    await notifyRevisionRequested(env, {
      order_id: body.orderId,
      product_title: orderResult.product_title || 'Your Order',
      email,
      revision_reason: body.reason || 'No reason provided',
      revision_count: (orderResult.revision_count || 0) + 1,
      status: 'revision'
    });
  }

  return json({ success: true });
}
