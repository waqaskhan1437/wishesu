/**
 * Orders controller - Order management
 */

import { json } from '../../../../core/utils/response.js';
import { normalizeEmail, upsertCustomer } from '../../../../core/utils/customers.js';
import { toISO8601 } from '../../../../core/utils/formatting.js';
import { getGoogleScriptUrl } from '../config/secrets.js';

let ordersColumnsChecked = false;

async function ensureOrderColumns(env) {
  if (ordersColumnsChecked) return;
  try {
    await env.DB.prepare('ALTER TABLE orders ADD COLUMN assigned_team TEXT').run();
  } catch (_) {}
  ordersColumnsChecked = true;
}

async function notifyOrderCreated(env, order) {
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (!googleScriptUrl) return;
  await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order.created',
        order
      })
    }).catch(err => console.error('Failed to send order.created webhook:', err));
  } catch (err) {
    console.error('Error triggering order.created webhook:', err);
  }
}

// Re-export from shared utility for backwards compatibility
export { getLatestOrderForEmail } from '../../../../core/utils/order-helpers.js';

/**
 * Get all orders (admin)
 */
export async function getOrders(env) {
  const r = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const orders = (r.results || []).map(row => {
    let email = row.customer_email || '', amount = null, addons = [];
    try {
      if (row.encrypted_data && row.encrypted_data[0] === '{') {
        const d = JSON.parse(row.encrypted_data);
        email = email || d.email || '';
        amount = d.amount;
        addons = d.addons || [];
      }
    } catch(e) {
      console.error('Failed to parse order encrypted_data for order:', row.order_id, e.message);
    }
    return { ...row, email, amount, addons };
  });
  return json({ orders });
}

/**
 * Create order (from checkout)
 */
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
  const base = String(origin || '').trim();
  const orderUrl = base ? `${base}/buyer-order.html?id=${encodeURIComponent(orderId)}` : null;
  await notifyOrderCreated(env, {
    order_id: orderId,
    product_id: Number(body.productId),
    email,
    name: String(body.name || '').trim() || null,
    amount: body.amount || null,
    status: 'PAID',
    assigned_team: String(body.assigned_team || '').trim() || null,
    origin: base || null,
    order_url: orderUrl
  });
  
  return json({ success: true, orderId });
}

/**
 * Create manual order (admin)
 */
export async function createManualOrder(env, body, origin) {
  await ensureOrderColumns(env);
  if (!body.productId || !body.email) {
    return json({ error: 'productId and email required' }, 400);
  }
  
  const orderId = 'MO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  const encryptedData = JSON.stringify({
    email: body.email,
    amount: body.amount || 0,
    // Use body.addons if provided, otherwise fall back to notes
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
  const base = String(origin || '').trim();
  const orderUrl = base ? `${base}/buyer-order.html?id=${encodeURIComponent(orderId)}` : null;
  await notifyOrderCreated(env, {
    order_id: orderId,
    product_id: Number(body.productId),
    email,
    name: String(body.name || '').trim() || null,
    amount: body.amount || null,
    status: body.status || 'paid',
    assigned_team: String(body.assigned_team || '').trim() || null,
    manual: true,
    origin: base || null,
    order_url: orderUrl
  });
  
  return json({ success: true, orderId });
}

/**
 * Get buyer order view
 */
export async function getBuyerOrder(env, orderId) {
  const row = await env.DB.prepare(
    'SELECT o.*, p.title as product_title, p.thumbnail_url as product_thumbnail FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_id = ?'
  ).bind(orderId).first();

  if (!row) return json({ error: 'Order not found' }, 404);

  // Check if review already exists for this order
  const reviewCheck = await env.DB.prepare(
    'SELECT id FROM reviews WHERE order_id = ? LIMIT 1'
  ).bind(orderId).first();
  const hasReview = !!reviewCheck;

  let addons = [], email = '', amount = null;
  try {
    if (row.encrypted_data && row.encrypted_data[0] === '{') {
      const d = JSON.parse(row.encrypted_data);
      addons = d.addons || [];
      email = d.email || '';
      amount = d.amount;
    }
  } catch(e) {
    console.error('Failed to parse order encrypted_data for buyer order:', orderId, e.message);
  }

  // Convert SQLite datetime to ISO 8601 format
  const orderData = { ...row, addons, email, amount, has_review: hasReview };
  if (orderData.created_at && typeof orderData.created_at === 'string') {
    orderData.created_at = toISO8601(orderData.created_at);
  }

  return json({ order: orderData });
}

/**
 * Delete order
 */
export async function deleteOrder(env, id) {
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

/**
 * Update order
 */
export async function updateOrder(env, body) {
  const orderId = body.orderId;
  
  if (!orderId) return json({ error: 'orderId required' }, 400);
  
  const updates = [];
  const values = [];
  
  if (body.status !== undefined) {
    updates.push('status = ?');
    values.push(body.status);
  }
  if (body.delivery_time_minutes !== undefined) {
    updates.push('delivery_time_minutes = ?');
    values.push(Number(body.delivery_time_minutes));
  }
  
  if (updates.length === 0) {
    return json({ error: 'No fields to update' }, 400);
  }
  
  values.push(orderId);
  await env.DB.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`).bind(...values).run();
  return json({ success: true });
}

/**
 * Deliver order
 */
export async function deliverOrder(env, body) {
  if (!body.orderId || !body.videoUrl) return json({ error: 'orderId and videoUrl required' }, 400);

  // Get order data before updating
  const orderResult = await env.DB.prepare(
    'SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?'
  ).bind(body.orderId).first();

  // Prepare additional metadata for delivered videos
  const deliveredVideoMetadata = JSON.stringify({
    embedUrl: body.embedUrl,
    itemId: body.itemId,
    subtitlesUrl: body.subtitlesUrl,
    tracks: Array.isArray(body.tracks) ? body.tracks : undefined,
    deliveredAt: new Date().toISOString()
  });

  await env.DB.prepare(
    'UPDATE orders SET delivered_video_url=?, delivered_thumbnail_url=?, status=?, delivered_at=CURRENT_TIMESTAMP, delivered_video_metadata=? WHERE order_id=?'
  ).bind(body.videoUrl, body.thumbnailUrl || null, 'delivered', deliveredVideoMetadata, body.orderId).run();
  
  // Trigger email webhook if configured
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl && orderResult) {
      let customerEmail = '';
      try {
        const decrypted = JSON.parse(orderResult.encrypted_data);
        customerEmail = decrypted.email || '';
      } catch (e) {
        console.warn('Could not decrypt order data for email');
      }
      
      await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order.delivered',
          order: {
            order_id: body.orderId,
            product_title: orderResult.product_title || 'Your Order',
            email: customerEmail,
            delivered_video_url: body.videoUrl,
            status: 'delivered'
          }
        })
      }).catch(err => console.error('Failed to send delivery webhook:', err));
    }
  } catch (err) {
    console.error('Error triggering delivery webhook:', err);
  }
  
  return json({ success: true });
}

/**
 * Request revision
 */
export async function requestRevision(env, body) {
  if (!body.orderId) return json({ error: 'orderId required' }, 400);
  
  // Get order data before updating
  const orderResult = await env.DB.prepare(
    'SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?'
  ).bind(body.orderId).first();
  
  await env.DB.prepare(
    'UPDATE orders SET revision_requested=1, revision_count=revision_count+1, status=? WHERE order_id=?'
  ).bind('revision', body.orderId).run();
  
  // Trigger revision notification webhook if configured
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl && orderResult) {
      let customerEmail = '';
      try {
        const decrypted = JSON.parse(orderResult.encrypted_data);
        customerEmail = decrypted.email || '';
      } catch (e) {
        console.warn('Could not decrypt order data for email');
      }
      
      await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order.revision_requested',
          order: {
            order_id: body.orderId,
            product_title: orderResult.product_title || 'Your Order',
            email: customerEmail,
            revision_reason: body.reason || 'No reason provided',
            revision_count: (orderResult.revision_count || 0) + 1,
            status: 'revision'
          }
        })
      }).catch(err => console.error('Failed to send revision webhook:', err));
    }
  } catch (err) {
    console.error('Error triggering revision webhook:', err);
  }
  
  return json({ success: true });
}

/**
 * Update portfolio flag
 */
export async function updatePortfolio(env, body) {
  await env.DB.prepare(
    'UPDATE orders SET portfolio_enabled=? WHERE order_id=?'
  ).bind(body.portfolioEnabled ? 1 : 0, body.orderId).run();
  return json({ success: true });
}

/**
 * Update archive link
 */
export async function updateArchiveLink(env, body) {
  await env.DB.prepare('UPDATE orders SET archive_url=? WHERE order_id=?').bind(body.archiveUrl, body.orderId).run();
  return json({ success: true });
}
