/**
 * Orders controller - Order management
 */

import { json } from '../utils/response.js';
import { toISO8601 } from '../utils/formatting.js';
import { getGoogleScriptUrl } from '../config/secrets.js';
import { 
  notifyNewOrder, 
  notifyNewTip, 
  notifyCustomerOrderConfirmed,
  notifyCustomerOrderDelivered 
} from './automation.js';

// Re-export from shared utility for backwards compatibility
export { getLatestOrderForEmail } from '../utils/order-helpers.js';

// Character limits for addon validation
const ADDON_LIMITS = {
  field: 100,      // Field name max length
  value: 2000,     // Value max length
  email: 100,      // Email max length
  totalAddons: 50  // Max number of addons
};

/**
 * Validate and sanitize addons array
 */
function validateAddons(addons) {
  if (!Array.isArray(addons)) return [];
  
  // Limit number of addons
  const limited = addons.slice(0, ADDON_LIMITS.totalAddons);
  
  return limited.map(addon => {
    if (!addon || typeof addon !== 'object') return null;
    
    let field = String(addon.field || '').trim();
    let value = String(addon.value || '').trim();
    
    // Truncate if too long
    if (field.length > ADDON_LIMITS.field) {
      field = field.substring(0, ADDON_LIMITS.field);
    }
    if (value.length > ADDON_LIMITS.value) {
      value = value.substring(0, ADDON_LIMITS.value);
    }
    
    return { field, value };
  }).filter(Boolean);
}

/**
 * Validate email
 */
function validateEmail(email) {
  if (!email) return '';
  const trimmed = String(email).trim().substring(0, ADDON_LIMITS.email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Get all orders (admin)
 */
export async function getOrders(env) {
  const r = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const orders = (r.results || []).map(row => {
    let email = '', amount = null, addons = [];
    try {
      if (row.encrypted_data && row.encrypted_data[0] === '{') {
        const d = JSON.parse(row.encrypted_data);
        email = d.email || '';
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
export async function createOrder(env, body) {
  if (!body.productId) return json({ error: 'productId required' }, 400);
  
  // Validate and sanitize inputs
  const email = validateEmail(body.email);
  const addons = validateAddons(body.addons);
  const amount = parseFloat(body.amount) || 0;
  
  const orderId = body.orderId || crypto.randomUUID().split('-')[0].toUpperCase();
  const data = JSON.stringify({
    email: email,
    amount: amount,
    productId: body.productId,
    addons: addons
  });
  
  await env.DB.prepare(
    'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes) VALUES (?, ?, ?, ?, ?)'
  ).bind(orderId, Number(body.productId), data, 'PAID', Number(body.deliveryTime) || 60).run();
  
  // Get product title for notification
  let productTitle = '';
  try {
    const product = await env.DB.prepare('SELECT title FROM products WHERE id = ?').bind(Number(body.productId)).first();
    productTitle = product?.title || '';
  } catch (e) {}
  
  // Send notifications (async, don't wait)
  const deliveryMinutes = Number(body.deliveryTime) || 60;
  const deliveryTime = deliveryMinutes < 1440 ? `${Math.round(deliveryMinutes / 60)} hour(s)` : `${Math.round(deliveryMinutes / 1440)} day(s)`;
  
  notifyNewOrder(env, { orderId, email, amount, productTitle }).catch(() => {});
  notifyCustomerOrderConfirmed(env, { orderId, email, amount, productTitle, deliveryTime }).catch(() => {});
  
  return json({ success: true, orderId });
}

/**
 * Create manual order (admin)
 */
export async function createManualOrder(env, body) {
  if (!body.productId || !body.email) {
    return json({ error: 'productId and email required' }, 400);
  }
  
  // Validate inputs
  const email = validateEmail(body.email);
  if (!email) {
    return json({ error: 'Invalid email format' }, 400);
  }
  
  const orderId = 'MO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // Validate addons or notes
  let addons = [];
  if (body.addons) {
    addons = validateAddons(body.addons);
  } else if (body.notes) {
    const notes = String(body.notes).trim().substring(0, ADDON_LIMITS.value);
    addons = [{ field: 'Admin Notes', value: notes }];
  }
  
  const encryptedData = JSON.stringify({
    email: email,
    amount: parseFloat(body.amount) || 0,
    addons: addons,
    manualOrder: true
  });
  
  await env.DB.prepare(
    'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    orderId,
    Number(body.productId),
    encryptedData,
    body.status || 'paid',
    Number(body.deliveryTime) || 60
  ).run();
  
  return json({ success: true, orderId });
}

/**
 * Get buyer order view
 */
export async function getBuyerOrder(env, orderId) {
  const row = await env.DB.prepare(
    'SELECT o.*, p.title as product_title, p.thumbnail_url as product_thumbnail, p.whop_product_id FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_id = ?'
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
  const orderData = { 
    ...row, 
    addons, 
    email, 
    amount, 
    has_review: hasReview,
    tip_paid: !!row.tip_paid,
    tip_amount: row.tip_amount || 0
  };
  if (orderData.created_at && typeof orderData.created_at === 'string') {
    orderData.created_at = toISO8601(orderData.created_at);
  }

  return json({ order: orderData });
}

/**
 * Delete order
 */
export async function deleteOrder(env, id) {
  if (!id) return json({ error: 'Missing id' }, 400);

  // Support deleting by numeric row id OR by public order_id
  const asNumber = Number(id);
  if (!Number.isNaN(asNumber) && String(id).trim() === String(asNumber)) {
    await env.DB.prepare('DELETE FROM reviews WHERE order_id IN (SELECT order_id FROM orders WHERE id = ?)').bind(asNumber).run();
    await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(asNumber).run();
    return json({ success: true });
  }

  const orderId = String(id).trim();
  await env.DB.prepare('DELETE FROM reviews WHERE order_id = ?').bind(orderId).run();
  await env.DB.prepare('DELETE FROM orders WHERE order_id = ?').bind(orderId).run();
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
  
  // Get customer email for notification
  let customerEmail = '';
  try {
    if (orderResult?.encrypted_data) {
      const decrypted = JSON.parse(orderResult.encrypted_data);
      customerEmail = decrypted.email || '';
    }
  } catch (e) {}
  
  // Send customer delivery notification (async)
  notifyCustomerOrderDelivered(env, {
    orderId: body.orderId,
    email: customerEmail,
    productTitle: orderResult?.product_title || 'Your Order'
  }).catch(() => {});
  
  // Trigger email webhook if configured (legacy support)
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl && orderResult) {
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

/**
 * Mark tip as paid
 */
export async function markTipPaid(env, body) {
  const { orderId, amount } = body;
  if (!orderId) return json({ error: 'orderId required' }, 400);
  
  await env.DB.prepare(
    'UPDATE orders SET tip_paid = 1, tip_amount = ? WHERE order_id = ?'
  ).bind(Number(amount) || 0, orderId).run();
  
  // Get customer email for notification
  let email = '';
  try {
    const order = await env.DB.prepare('SELECT encrypted_data FROM orders WHERE order_id = ?').bind(orderId).first();
    if (order?.encrypted_data) {
      const data = JSON.parse(order.encrypted_data);
      email = data.email || '';
    }
  } catch (e) {}
  
  // Notify admin about tip (async)
  notifyNewTip(env, { orderId, amount: Number(amount) || 0, email }).catch(() => {});
  
  return json({ success: true });
}
