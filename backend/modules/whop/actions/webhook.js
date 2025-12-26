/**
 * Whop Webhook Handler
 * POST /api/whop/webhook - Handles payment.succeeded events
 */
import { json } from '../../../core/utils/response/response.js';
import { CORS } from '../../../core/config/cors/cors.js';
import {
  insertEvent,
  getCheckoutMetadata,
  markCheckoutCompleted,
  deleteCheckoutSession,
  deletePlan,
  getProductSnapshot
} from '../service/service.js';
import { calcDueAt, normalizeDeliveryDays } from '../../../core/utils/delivery/delivery.js';

const uid = () => `WHOP-${Date.now().toString(36).toUpperCase()}`;

export const webhook = async (request, env, origin) => {
  const body = await request.json().catch(() => ({}));
  const eventType = body.type || '';
  const eventId = String(body.id || body.event_id || 'unknown');

  // Log event
  await insertEvent(env.DB, eventId, JSON.stringify(body));

  if (eventType !== 'payment.succeeded') {
    return json({ ok: true, skipped: true }, 200, CORS);
  }

  const checkoutId = body.data?.checkout_session_id;
  let metadata = body.data?.metadata || {};

  // Fallback: get metadata from DB if Whop didn't include it
  if (checkoutId && (!metadata.addons || !metadata.product_id)) {
    try {
      const row = await getCheckoutMetadata(env.DB, checkoutId);
      if (row?.metadata) {
        const stored = JSON.parse(row.metadata);
        metadata = { ...metadata, ...stored, addons: stored.addons || metadata.addons || [] };
      }
    } catch (e) {
      console.log('Metadata lookup failed:', e.message);
    }
  }

  // Mark checkout as completed
  if (checkoutId) {
    await markCheckoutCompleted(env.DB, checkoutId);
    await deleteCheckoutSession(env, checkoutId);
    
    // Delete the dynamic plan
    try {
      const row = await env.DB.prepare('SELECT plan_id FROM checkout_sessions WHERE checkout_id = ?').bind(checkoutId).first();
      if (row?.plan_id) await deletePlan(env, row.plan_id);
    } catch (e) {
      console.log('Plan cleanup failed:', e.message);
    }
  }

  // Create order if we have product info
  const productId = Number(metadata.product_id || 0);
  if (!productId) {
    return json({ ok: true, warning: 'No product_id in metadata' }, 200, CORS);
  }

  const product = await getProductSnapshot(env.DB, productId);
  const email = metadata.email || body.data?.email || body.data?.user?.email || '';
  const addons = metadata.addons || [];
  const orderId = uid();

  // Calculate delivery time
  const baseInstant = metadata.instant ?? product?.instant ?? 0;
  const baseDays = metadata.delivery_days ?? product?.delivery_days ?? 2;
  const { instant, days } = normalizeDeliveryDays(baseInstant, baseDays);
  const dueAt = calcDueAt(Date.now(), instant, days);

  await env.DB.prepare(
    `INSERT INTO orders (order_id, email, product_id, product_title, status, delivery_days, instant, addons_json, due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(orderId, email, productId, product?.title || '', 'paid', days, instant, JSON.stringify(addons), dueAt).run();

  console.log('Order created:', orderId, 'Product:', productId, 'Addons:', addons.length);

  return json({ ok: true, order_id: orderId }, 200, CORS);
};
