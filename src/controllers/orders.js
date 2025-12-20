// Orders API controller
import { json } from '../utils/response.js';
import { getGoogleScriptUrl } from '../utils/helpers.js';

/**
 * Get all orders
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
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
 * Create a new order
 * @param {Object} env - Environment bindings
 * @param {Object} body - Order data
 * @returns {Promise<Response>}
 */
export async function createOrder(env, body) {
  if (!body.productId) return json({ error: 'productId required' }, 400);
  
  const orderId = body.orderId || crypto.randomUUID().split('-')[0].toUpperCase();
  const data = JSON.stringify({
    email: body.email,
    amount: body.amount,
    productId: body.productId,
    addons: body.addons || []
  });
  
  await env.DB.prepare(
    'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes) VALUES (?, ?, ?, ?, ?)'
  ).bind(orderId, Number(body.productId), data, 'PAID', Number(body.deliveryTime) || 60).run();
  
  return json({ success: true, orderId });
}

/**
 * Get buyer order details
 * @param {Object} env - Environment bindings
 * @param {string} orderId - Order ID
 * @returns {Promise<Response>}
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

   // Convert SQLite datetime to ISO 8601 format with Z suffix for UTC
   const orderData = { ...row, addons, email, amount, has_review: hasReview };
   if (orderData.created_at && typeof orderData.created_at === 'string') {
     // SQLite format: YYYY-MM-DD HH:MM:SS -> ISO 8601: YYYY-MM-DDTHH:MM:SSZ
     orderData.created_at = orderData.created_at.replace(' ', 'T') + 'Z';
   }

   return json({ order: orderData });
}

/**
 * Delete an order
 * @param {Object} env - Environment bindings
 * @param {string} id - Order ID
 * @returns {Promise<Response>}
 */
export async function deleteOrder(env, id) {
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

/**
 * Update an order
 * @param {Object} env - Environment bindings
 * @param {Object} body - Update data
 * @returns {Promise<Response>}
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
 * Create manual order (admin)
 * @param {Object} env - Environment bindings
 * @param {Object} body - Order data
 * @returns {Promise<Response>}
 */
export async function createManualOrder(env, body) {
  if (!body.productId || !body.email) {
    return json({ error: 'productId and email required' }, 400);
  }
  
  // Generate unique order ID
  const orderId = 'MO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // Store order data
  const encryptedData = JSON.stringify({
    email: body.email,
    amount: body.amount || 0,
    addons: body.notes ? [{ field: 'Admin Notes', value: body.notes }] : [],
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
 * Deliver video to order
 * @param {Object} env - Environment bindings
 * @param {Object} body - Delivery data
 * @returns {Promise<Response>}
 */
export async function deliverOrder(env, body) {
  if (!body.orderId || !body.videoUrl) return json({ error: 'orderId and videoUrl required' }, 400);

  // Get order data before updating
  const orderResult = await env.DB.prepare(
    'SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?'
  ).bind(body.orderId).first();

  // Prepare additional metadata for delivered videos (Archive.org + subtitles, etc)
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
      // Extract email from encrypted data
      let customerEmail = '';
      try {
        const decrypted = JSON.parse(orderResult.encrypted_data);
        customerEmail = decrypted.email || '';
      } catch (e) {
        console.warn('Could not decrypt order data for email');
      }
      
      // Send delivery notification webhook
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
 * Request revision for order
 * @param {Object} env - Environment bindings
 * @param {Object} body - Revision data
 * @returns {Promise<Response>}
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
      // Extract email from encrypted data
      let customerEmail = '';
      try {
        const decrypted = JSON.parse(orderResult.encrypted_data);
        customerEmail = decrypted.email || '';
      } catch (e) {
        console.warn('Could not decrypt order data for email');
      }
      
      // Send revision notification webhook
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
 * Update portfolio settings for order
 * @param {Object} env - Environment bindings
 * @param {Object} body - Portfolio data
 * @returns {Promise<Response>}
 */
export async function updatePortfolio(env, body) {
  await env.DB.prepare(
    'UPDATE orders SET portfolio_enabled=? WHERE order_id=?'
  ).bind(body.portfolioEnabled ? 1 : 0, body.orderId).run();
  return json({ success: true });
}

/**
 * Update archive URL for order
 * @param {Object} env - Environment bindings
 * @param {Object} body - Archive data
 * @returns {Promise<Response>}
 */
export async function updateArchiveUrl(env, body) {
  await env.DB.prepare('UPDATE orders SET archive_url=? WHERE order_id=?').bind(body.archiveUrl, body.orderId).run();
  return json({ success: true });
}

/**
 * Upload encrypted file for order
 * @param {Object} env - Environment bindings
 * @param {Request} req - Request object
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Response>}
 */
export async function uploadEncryptedFile(env, req, queryParams) {
  if (!env.R2_BUCKET) {
    return json({ error: 'R2 not configured' }, 500);
  }
  const orderId = queryParams.get('orderId');
  const itemId = queryParams.get('itemId');
  const filename = queryParams.get('filename');
  if (!orderId || !itemId || !filename) {
    return json({ error: 'orderId, itemId and filename required' }, 400);
  }
  // Read the request body into a buffer
  const fileBuf = await req.arrayBuffer();
  const key = `orders/${orderId}/${itemId}/${filename}`;
  await env.R2_BUCKET.put(key, fileBuf, {
    httpMetadata: { contentType: req.headers.get('content-type') || 'application/octet-stream' }
  });
  // You could update the orders table with the uploaded file key or URL here.
  // We return the R2 key so the caller can take further action if needed.
  return json({ success: true, r2Key: key });
}