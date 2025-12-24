/**
 * Whop webhook order helpers.
 */

import { notifyOrderCreated } from './notify.js';

export async function createOrderFromWebhook(env, webhookData, metadata, origin) {
  if (!metadata?.product_id) return;

  try {
    const orderId = `WHOP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const encryptedData = JSON.stringify({
      email: metadata.email || webhookData.data?.email || webhookData.data?.user?.email || '',
      amount: metadata.amount || webhookData.data?.final_amount || 0,
      productId: metadata.product_id,
      addons: metadata.addons || []
    });

    await env.DB.prepare(
      'INSERT INTO orders (order_id, product_id, encrypted_data, status, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
    ).bind(orderId, Number(metadata.product_id), encryptedData, 'completed').run();

    const base = String(origin || '').trim();
    const orderUrl = base ? `${base}/buyer-order.html?id=${encodeURIComponent(orderId)}` : null;

    await notifyOrderCreated(env, {
      order_id: orderId,
      product_id: Number(metadata.product_id),
      email: metadata.email || webhookData.data?.email || webhookData.data?.user?.email || '',
      name: null,
      amount: metadata.amount || webhookData.data?.final_amount || 0,
      status: 'completed',
      origin: base || null,
      order_url: orderUrl
    });
  } catch (e) {
    console.error('Failed to create order:', e);
  }
}
