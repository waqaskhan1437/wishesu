/**
 * PayPal controller - PayPal Checkout integration
 */

import { json } from '../utils/response.js';

/**
 * Get PayPal credentials from environment/settings
 */
async function getPayPalCredentials(env) {
  // First check environment variables
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET) {
    return {
      clientId: env.PAYPAL_CLIENT_ID,
      secret: env.PAYPAL_SECRET,
      mode: env.PAYPAL_MODE || 'sandbox'
    };
  }
  
  // Fallback to database settings
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('paypal').first();
    if (row && row.value) {
      const settings = JSON.parse(row.value);
      return {
        clientId: settings.client_id || '',
        secret: settings.secret || '',
        mode: settings.mode || 'sandbox'
      };
    }
  } catch (e) {
    console.error('Failed to load PayPal settings:', e);
  }
  
  return null;
}

/**
 * Get PayPal API base URL
 */
function getPayPalBaseUrl(mode) {
  return mode === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
}

/**
 * Get PayPal access token
 */
async function getAccessToken(credentials) {
  const baseUrl = getPayPalBaseUrl(credentials.mode);
  const auth = btoa(`${credentials.clientId}:${credentials.secret}`);
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

/**
 * Create PayPal order
 */
export async function createPayPalOrder(env, body, origin) {
  const { product_id, amount, email, metadata } = body;
  
  if (!product_id) {
    return json({ error: 'Product ID required' }, 400);
  }
  
  const credentials = await getPayPalCredentials(env);
  
  // Detailed validation
  if (!credentials) {
    return json({ 
      error: 'PayPal not configured. Go to Admin → Settings → PayPal and add your credentials.' 
    }, 400);
  }
  
  if (!credentials.clientId || credentials.clientId.length < 10) {
    return json({ 
      error: 'PayPal Client ID missing or invalid. Go to Admin → Settings → PayPal and add your Client ID from PayPal Developer Dashboard.' 
    }, 400);
  }
  
  if (!credentials.secret || credentials.secret.length < 10) {
    return json({ 
      error: 'PayPal Secret missing or invalid. Go to Admin → Settings → PayPal and add your Secret from PayPal Developer Dashboard.' 
    }, 400);
  }
  
  // Get product details
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(product_id)).first();
  if (!product) {
    return json({ error: 'Product not found' }, 404);
  }
  
  // Calculate price
  const basePrice = product.sale_price || product.normal_price || 0;
  const finalAmount = amount || basePrice;
  
  if (finalAmount <= 0) {
    return json({ error: 'Invalid amount. Price must be greater than 0.' }, 400);
  }
  
  try {
    console.log('🅿️ PayPal: Getting access token...');
    console.log('🅿️ Mode:', credentials.mode);
    
    let accessToken;
    try {
      accessToken = await getAccessToken(credentials);
      console.log('🅿️ Access token obtained successfully');
    } catch (authErr) {
      console.error('🅿️ PayPal auth failed:', authErr.message);
      return json({ error: 'PayPal authentication failed: ' + authErr.message }, 500);
    }
    
    const baseUrl = getPayPalBaseUrl(credentials.mode);
    
    // PayPal custom_id has 127 char limit - store minimal data
    const customData = JSON.stringify({
      pid: product_id,
      email: (email || '').substring(0, 50)
    });
    
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `prod_${product_id}_${Date.now()}`,
        description: (product.title || 'Video Order').substring(0, 127),
        amount: {
          currency_code: 'USD',
          value: finalAmount.toFixed(2)
        },
        custom_id: customData.substring(0, 127)
      }],
      application_context: {
        brand_name: 'WishVideo',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${origin}/success.html?provider=paypal&product=${product_id}`,
        cancel_url: `${origin}/product?id=${product_id}&cancelled=1`
      }
    };
    
    console.log('🅿️ Creating PayPal order with payload:', JSON.stringify(orderPayload, null, 2));
    
    // Create order
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });
    
    const responseText = await orderResponse.text();
    console.log('🅿️ PayPal response status:', orderResponse.status);
    console.log('🅿️ PayPal response:', responseText);
    
    if (!orderResponse.ok) {
      let errorMessage = 'Failed to create PayPal order';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error_description || errorData.details?.[0]?.description || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      console.error('🅿️ PayPal order creation failed:', errorMessage);
      return json({ error: errorMessage }, 500);
    }
    
    const orderData = JSON.parse(responseText);
    
    // Store checkout session
    try {
      await env.DB.prepare(`
        INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, metadata, expires_at, status, created_at)
        VALUES (?, ?, ?, ?, datetime('now', '+30 minutes'), 'pending', datetime('now'))
      `).bind(
        orderData.id,
        product_id,
        'paypal',
        JSON.stringify({ email, addons: metadata?.addons || [], amount: finalAmount })
      ).run();
    } catch (e) {
      console.log('Checkout session storage skipped:', e.message);
    }
    
    // Find approval URL
    const approvalLink = orderData.links?.find(l => l.rel === 'approve');
    
    return json({
      success: true,
      order_id: orderData.id,
      checkout_url: approvalLink?.href || null,
      status: orderData.status
    });
    
  } catch (e) {
    console.error('PayPal error:', e);
    return json({ error: e.message || 'PayPal checkout failed' }, 500);
  }
}

/**
 * Capture PayPal order (after approval)
 */
export async function capturePayPalOrder(env, body) {
  const { order_id } = body;
  
  if (!order_id) {
    return json({ error: 'Order ID required' }, 400);
  }
  
  const credentials = await getPayPalCredentials(env);
  if (!credentials) {
    return json({ error: 'PayPal not configured' }, 400);
  }
  
  try {
    console.log('🅿️ Capturing PayPal order:', order_id);
    
    const accessToken = await getAccessToken(credentials);
    const baseUrl = getPayPalBaseUrl(credentials.mode);
    
    // Capture the order
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const responseText = await captureResponse.text();
    console.log('🅿️ Capture response status:', captureResponse.status);
    console.log('🅿️ Capture response:', responseText);
    
    if (!captureResponse.ok) {
      let errorMessage = 'Payment capture failed';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.details?.[0]?.description || errorMessage;
      } catch (e) {}
      console.error('🅿️ PayPal capture failed:', errorMessage);
      return json({ error: errorMessage }, 500);
    }
    
    const captureData = JSON.parse(responseText);
    
    if (captureData.status === 'COMPLETED') {
      // Get stored metadata from our checkout session
      let metadata = {};
      try {
        const sessionRow = await env.DB.prepare(
          'SELECT metadata FROM checkout_sessions WHERE checkout_id = ?'
        ).bind(order_id).first();
        if (sessionRow?.metadata) {
          metadata = JSON.parse(sessionRow.metadata);
        }
      } catch (e) {
        console.log('Failed to get stored metadata:', e);
      }
      
      // Parse custom_id from PayPal response (minimal data)
      let customData = {};
      try {
        const customId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id;
        if (customId) {
          customData = JSON.parse(customId);
        }
      } catch (e) {
        console.log('Failed to parse custom_id:', e);
      }
      
      // Create order in database
      const orderId = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const productId = customData.pid || metadata.product_id;
      const email = customData.email || metadata.email || captureData.payer?.email_address || '';
      const amount = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || metadata.amount || 0;
      const addons = metadata.addons || [];
      
      const encryptedData = JSON.stringify({
        email,
        amount: parseFloat(amount),
        productId,
        addons,
        paypalOrderId: order_id,
        payerId: captureData.payer?.payer_id
      });
      
      await env.DB.prepare(
        'INSERT INTO orders (order_id, product_id, encrypted_data, status, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
      ).bind(orderId, Number(productId), encryptedData, 'PAID').run();
      
      console.log('🅿️ Order created:', orderId);
      
      // Update checkout session
      try {
        await env.DB.prepare(`
          UPDATE checkout_sessions SET status = 'completed', completed_at = datetime('now')
          WHERE checkout_id = ?
        `).bind(order_id).run();
      } catch (e) {}
      
      return json({
        success: true,
        order_id: orderId,
        status: 'completed',
        paypal_order_id: order_id
      });
    }
    
    return json({
      success: false,
      status: captureData.status,
      error: 'Payment not completed'
    });
    
  } catch (e) {
    console.error('🅿️ PayPal capture error:', e);
    return json({ error: e.message || 'Payment capture failed' }, 500);
  }
}

/**
 * Handle PayPal webhook
 */
export async function handlePayPalWebhook(env, body, headers) {
  const eventType = body.event_type;
  console.log('PayPal webhook received:', eventType);
  
  // Verify webhook signature (recommended for production)
  // For now, just process the event
  
  if (eventType === 'CHECKOUT.ORDER.APPROVED') {
    // Order was approved, can auto-capture if needed
    const orderId = body.resource?.id;
    console.log('Order approved:', orderId);
  }
  
  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    // Payment was captured
    const captureId = body.resource?.id;
    console.log('Payment captured:', captureId);
  }
  
  return json({ received: true });
}

/**
 * Get PayPal settings
 */
export async function getPayPalSettings(env) {
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('paypal').first();
    if (row && row.value) {
      const settings = JSON.parse(row.value);
      return json({
        settings: {
          client_id: settings.client_id || '',
          mode: settings.mode || 'sandbox',
          enabled: settings.enabled || false,
          has_secret: !!(settings.secret && settings.secret.length > 10)
          // Don't return actual secret
        }
      });
    }
  } catch (e) {
    console.error('Failed to load PayPal settings:', e);
  }
  return json({ settings: { client_id: '', mode: 'sandbox', enabled: false, has_secret: false } });
}

/**
 * Save PayPal settings
 */
export async function savePayPalSettings(env, body) {
  console.log('🅿️ Saving PayPal settings:', {
    enabled: body.enabled,
    client_id: body.client_id ? '***' + body.client_id.slice(-4) : 'empty',
    secret: body.secret ? '***' + body.secret.slice(-4) : 'empty',
    mode: body.mode
  });
  
  const settings = {
    client_id: body.client_id || '',
    secret: body.secret || '',
    mode: body.mode || 'sandbox',
    enabled: body.enabled === true || body.enabled === 'true'
  };
  
  // If secret not provided, keep existing
  if (!settings.secret) {
    try {
      const existing = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('paypal').first();
      if (existing?.value) {
        const old = JSON.parse(existing.value);
        settings.secret = old.secret || '';
        console.log('🅿️ Keeping existing secret');
      }
    } catch (e) {
      console.log('🅿️ No existing settings found');
    }
  }
  
  console.log('🅿️ Final settings to save:', {
    enabled: settings.enabled,
    client_id: settings.client_id ? '***' + settings.client_id.slice(-4) : 'empty',
    has_secret: !!settings.secret,
    mode: settings.mode
  });
  
  await env.DB.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  ).bind('paypal', JSON.stringify(settings)).run();
  
  console.log('🅿️ PayPal settings saved successfully');
  
  return json({ success: true });
}

/**
 * Test PayPal connection
 */
export async function testPayPalConnection(env) {
  const credentials = await getPayPalCredentials(env);
  if (!credentials || !credentials.clientId) {
    return json({ success: false, error: 'PayPal credentials not configured' });
  }
  
  try {
    const accessToken = await getAccessToken(credentials);
    return json({ 
      success: true, 
      message: 'PayPal connection successful!',
      mode: credentials.mode 
    });
  } catch (e) {
    return json({ success: false, error: e.message });
  }
}

/**
 * Get client ID for frontend SDK
 */
export async function getPayPalClientId(env) {
  const credentials = await getPayPalCredentials(env);
  if (!credentials) {
    return json({ client_id: null, enabled: false });
  }
  
  return json({
    client_id: credentials.clientId,
    mode: credentials.mode,
    enabled: !!credentials.clientId
  });
}
