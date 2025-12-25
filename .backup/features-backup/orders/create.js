/**
 * Order creation handlers.
 */

import { json } from '../../utils/response.js';
import { normalizeEmail, upsertCustomer } from '../../utils/customers.js';
import { ensureOrderColumns } from './columns.js';
import { notifyOrderCreated } from './notifications.js';

function buildOrderUrl(origin, orderId) {
  const base = String(origin || '').trim();
  return base ? `${base}/buyer-order.html?id=${encodeURIComponent(orderId)}` : null;
}

export async function createOrder(env, body, origin) {
  await ensureOrderColumns(env);
  if (!body.productId || !body.email) return json({ error: 'productId and email required' }, 400);

  const orderId = body.orderId || crypto.randomUUID().split('-')[0].toUpperCase();
  const data = JSON.stringify({
    email: body.email,
    amount: body.amount,
    productId: body.productId,
    addons: body.addons || []
  });

  const email = normalizeEmail(body.email);
  await env.DB.prepare(
    'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes, customer_email, customer_name, assigned_team) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    orderId,
    Number(body.productId),
    data,
    'PAID',
    Number(body.deliveryTime) || 60,
    email,
    String(body.name || '').trim() || null,
    String(body.assigned_team || '').trim() || null
  ).run();

  await upsertCustomer(env, email, body.name);
  const orderUrl = buildOrderUrl(origin, orderId);
  await notifyOrderCreated(env, {
    order_id: orderId,
    product_id: Number(body.productId),
    email,
    name: String(body.name || '').trim() || null,
    amount: body.amount || null,
    status: 'PAID',
    assigned_team: String(body.assigned_team || '').trim() || null,
    origin: String(origin || '').trim() || null,
    order_url: orderUrl
  });

  return json({ success: true, orderId });
}

export async function createManualOrder(env, body, origin) {
  await ensureOrderColumns(env);
  if (!body.productId || !body.email) {
    return json({ error: 'productId and email required' }, 400);
  }

  const orderId = 'MO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

  const encryptedData = JSON.stringify({
    email: body.email,
    amount: body.amount || 0,
    addons: body.addons || (body.notes ? [{ field: 'Admin Notes', value: body.notes }] : []),
    manualOrder: true
  });

  const email = normalizeEmail(body.email);
  await env.DB.prepare(
    'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes, customer_email, customer_name, assigned_team) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    orderId,
    Number(body.productId),
    encryptedData,
    body.status || 'paid',
    Number(body.deliveryTime) || 60,
    email,
    String(body.name || '').trim() || null,
    String(body.assigned_team || '').trim() || null
  ).run();

  await upsertCustomer(env, email, body.name);
  const orderUrl = buildOrderUrl(origin, orderId);
  await notifyOrderCreated(env, {
    order_id: orderId,
    product_id: Number(body.productId),
    email,
    name: String(body.name || '').trim() || null,
    amount: body.amount || null,
    status: body.status || 'paid',
    assigned_team: String(body.assigned_team || '').trim() || null,
    manual: true,
    origin: String(origin || '').trim() || null,
    order_url: orderUrl
  });

  return json({ success: true, orderId });
}
