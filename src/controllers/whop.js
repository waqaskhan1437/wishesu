/**
 * Whop controller - Checkout and webhook handling
 */

import { json } from '../utils/response.js';
import { getWhopApiKey } from '../config/secrets.js';
import { fetchWithTimeout } from '../utils/fetch-timeout.js';

// API timeout constants
const WHOP_API_TIMEOUT = 10000; // 10 seconds

/**
 * Calculate addon prices from product's addon configuration
 * Returns total addon price based on selected values
 */
function calculateAddonPrice(productAddonsJson, selectedAddons) {
  if (!productAddonsJson || !selectedAddons || !Array.isArray(selectedAddons)) {
    return 0;
  }

  let totalAddonPrice = 0;

  try {
    // Parse product addon configuration
    const addonConfig = typeof productAddonsJson === 'string'
      ? JSON.parse(productAddonsJson)
      : productAddonsJson;

    if (!Array.isArray(addonConfig)) return 0;

    // Create a lookup map for addon fields and their options
    const addonMap = {};
    addonConfig.forEach(addon => {
      // Map by field name, label, and ID for maximum compatibility
      if (addon.field) addonMap[addon.field.toLowerCase().trim()] = addon;
      if (addon.label) addonMap[addon.label.toLowerCase().trim()] = addon;
      if (addon.id) addonMap[addon.id.toLowerCase().trim()] = addon;
    });

    // Calculate price for each selected addon
    selectedAddons.forEach(selected => {
      const fieldName = (selected.field || '').toLowerCase().trim();
      const fieldId = fieldName.replace(/[^a-z0-9]+/g, '-');
      
      // Try to find addon definition by field name, ID, or normalized ID
      const addonDef = addonMap[fieldName] || addonMap[fieldId] || 
                       Object.values(addonMap).find(a => 
                         (a.id && a.id.toLowerCase() === fieldId) || 
                         (a.field && a.field.toLowerCase() === fieldName)
                       );

      if (addonDef && addonDef.options && Array.isArray(addonDef.options)) {
        // Support multiple values (for checkboxes)
        const rawValue = (selected.value || '').trim();
        const selectedValues = rawValue.includes(',') 
          ? rawValue.split(',').map(v => v.trim().toLowerCase())
          : [rawValue.toLowerCase()];

        selectedValues.forEach(val => {
          const option = addonDef.options.find(opt => {
            const optLabel = (opt.label || '').toLowerCase().trim();
            const optValue = (opt.value || '').toLowerCase().trim();
            return optLabel === val || optValue === val || 
                   optLabel.replace(/[^a-z0-9]+/g, '-') === val.replace(/[^a-z0-9]+/g, '-');
          });

          if (option && option.price) {
            totalAddonPrice += Number(option.price) || 0;
          }
        });
      }
    });
  } catch (e) {
    console.error('Failed to calculate addon price:', e);
  }

  return totalAddonPrice;
}

/**
 * Calculate final price server-side from product and addons
 * SECURITY: This prevents price manipulation from client side
 */
async function calculateServerSidePrice(env, productId, selectedAddons, couponCode) {
  // Get product from database
  const product = await env.DB.prepare(
    'SELECT normal_price, sale_price, addons_json FROM products WHERE id = ?'
  ).bind(Number(productId)).first();

  if (!product) {
    throw new Error('Product not found');
  }

  // Calculate base price
  const basePrice = (product.sale_price !== null && product.sale_price !== undefined && product.sale_price !== '')
    ? Number(product.sale_price)
    : Number(product.normal_price);

  if (isNaN(basePrice) || basePrice < 0) {
    throw new Error('Invalid product price');
  }

  // Calculate addon prices from product configuration
  const addonPrice = calculateAddonPrice(product.addons_json, selectedAddons);

  let finalPrice = basePrice + addonPrice;

  // Apply coupon if provided
  if (couponCode) {
    try {
      const coupon = await env.DB.prepare(
        'SELECT discount_type, discount_value, min_order_amount FROM coupons WHERE code = ? AND status = ?'
      ).bind(couponCode.toUpperCase(), 'active').first();

      if (coupon) {
        const minAmount = Number(coupon.min_order_amount) || 0;
        if (finalPrice >= minAmount) {
          if (coupon.discount_type === 'percentage') {
            const discount = (finalPrice * Number(coupon.discount_value)) / 100;
            finalPrice = Math.max(0, finalPrice - discount);
          } else if (coupon.discount_type === 'fixed') {
            finalPrice = Math.max(0, finalPrice - Number(coupon.discount_value));
          }
        }
      }
    } catch (e) {
      console.error('Coupon validation failed:', e);
    }
  }

  // Round to 2 decimal places
  return Math.round(finalPrice * 100) / 100;
}

/**
 * Create checkout session using existing plan
 */
export async function createCheckout(env, body, origin) {
  const { product_id } = body;
  
  if (!product_id) {
    return json({ error: 'Product ID required' }, 400);
  }
  
  // Get product details
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(product_id)).first();
  if (!product) {
    return json({ error: 'Product not found' }, 404);
  }

  // Get global Whop settings for fallback
  let globalSettings = {};
  try {
    const settingsRow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
    if (settingsRow && settingsRow.value) {
      globalSettings = JSON.parse(settingsRow.value);
    }
  } catch (e) {
    console.error('Failed to load global settings:', e);
  }

  // Use product's whop_plan or fall back to global default
  let planId = product.whop_plan || globalSettings.default_plan_id || globalSettings.default_plan || '';

  if (!planId) {
    return json({
      error: 'Whop not configured. Please set a plan for this product or configure a default plan in Settings.'
    }, 400);
  }

  planId = planId.trim();
  
  // If it's a link, extract the plan ID
  if (planId.startsWith('http')) {
    const planMatch = planId.match(/plan_[a-zA-Z0-9]+/);
    if (planMatch) {
      planId = planMatch[0];
    } else {
      return json({ 
        error: 'Could not extract Plan ID from link. Please use: https://whop.com/checkout/plan_XXXXX or just plan_XXXXX' 
      }, 400);
    }
  }
  
  // Validate Plan ID format
  if (!planId.startsWith('plan_')) {
    return json({ error: 'Invalid Whop Plan ID format. Should start with plan_' }, 400);
  }
  
  // Get Whop API key
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: 'Whop API key not configured. Please add it in admin Settings.' }, 500);
  }

  // Calculate expiry time (15 minutes from now)
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Create Whop checkout session
  try {
    const whopResponse = await fetchWithTimeout('https://api.whop.com/api/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id: planId,
        redirect_url: `${origin}/success.html?product=${product.id}`,
        metadata: {
          product_id: product.id.toString(),
          product_title: product.title,
          created_at: new Date().toISOString(),
          expires_at: expiryTime
        }
      })
    }, WHOP_API_TIMEOUT);
    
    if (!whopResponse.ok) {
      const errorText = await whopResponse.text();
      console.error('Whop API error:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        return json({ 
          error: errorData.message || errorData.error || 'Failed to create checkout' 
        }, whopResponse.status);
      } catch (e) {
        return json({ error: 'Failed to create checkout session' }, whopResponse.status);
      }
    }
    
    const checkoutData = await whopResponse.json();
    
    // Store checkout for cleanup tracking
    try {
      await env.DB.prepare(`
        INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, expires_at, status, created_at)
        VALUES (?, ?, NULL, ?, 'pending', datetime('now'))
      `).bind(checkoutData.id, product.id, expiryTime).run();
    } catch (e) {
      console.log('Checkout tracking skipped:', e.message);
    }
    
    return json({
      success: true,
      checkout_id: checkoutData.id,
      checkout_url: checkoutData.purchase_url,
      expires_in: '15 minutes'
    });
  } catch (e) {
    console.error('Whop checkout error:', e);
    return json({ error: e.message || 'Failed to create checkout' }, 500);
  }
}

/**
 * Create dynamic plan + checkout session
 */
export async function createPlanCheckout(env, body, origin) {
  const { product_id, email, metadata, deliveryTimeMinutes: bodyDeliveryTime, couponCode } = body || {};
  if (!product_id) {
    return json({ error: 'Product ID required' }, 400);
  }

  // Lookup product from database
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(product_id)).first();
  if (!product) {
    return json({ error: 'Product not found' }, 404);
  }

  // Calculate delivery time: use provided value, or calculate from product
  let deliveryTimeMinutes = bodyDeliveryTime || metadata?.deliveryTimeMinutes;
  if (!deliveryTimeMinutes) {
    // Calculate from product settings
    if (product.instant_delivery) {
      deliveryTimeMinutes = 60; // 60 minutes for instant
    } else {
      const days = parseInt(product.normal_delivery_text) || 1;
      deliveryTimeMinutes = days * 24 * 60; // Convert days to minutes
    }
  }
  deliveryTimeMinutes = Number(deliveryTimeMinutes) || 60;
  console.log('📦 Delivery time calculated:', deliveryTimeMinutes, 'minutes');

  // SECURITY: Calculate price server-side, ignoring client-provided amount
  // This prevents price manipulation attacks
  let priceValue = 0;
  try {
    const selectedAddons = metadata?.addons || body?.addons || [];
    priceValue = await calculateServerSidePrice(env, product_id, selectedAddons, couponCode);
  } catch (e) {
    console.error('Failed to calculate server-side price:', e);
    return json({ error: 'Failed to calculate order price' }, 400);
  }

  if (isNaN(priceValue) || priceValue < 0) {
    return json({ error: 'Invalid price' }, 400);
  }

  // Get Whop product ID - check multiple sources in order:
  // 1. Product-specific whop_product_id
  // 2. Payment gateway (from payment_gateways table)
  // 3. Legacy whop settings (from settings table)
  const directProdId = (product.whop_product_id || '').trim();
  let finalProdId = directProdId;

  if (!finalProdId) {
    // Try payment_gateways table first (new universal payment system)
    try {
      const gateway = await env.DB.prepare(
        'SELECT whop_product_id FROM payment_gateways WHERE gateway_type = ? AND is_enabled = 1 LIMIT 1'
      ).bind('whop').first();
      if (gateway && gateway.whop_product_id) {
        finalProdId = (gateway.whop_product_id || '').trim();
        console.log('Using Whop product ID from payment_gateways:', finalProdId);
      }
    } catch (e) {
      console.log('Failed to load whop settings from payment_gateways:', e);
    }
  }

  if (!finalProdId) {
    // Fallback to legacy settings table
    try {
      const srow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      let settings = {};
      if (srow && srow.value) {
        try { settings = JSON.parse(srow.value); } catch (e) { settings = {}; }
      }
      if (settings && settings.default_product_id) {
        finalProdId = (settings.default_product_id || '').trim();
        console.log('Using Whop product ID from legacy settings:', finalProdId);
      }
    } catch (e) {
      console.log('Failed to load whop settings for default product ID:', e);
    }
  }

  if (!finalProdId) {
    return json({ error: 'whop_product_id not configured. Please set it in Payment Settings (Payment tab > Whop gateway)' }, 400);
  }

  const companyId = env.WHOP_COMPANY_ID;
  if (!companyId) {
    return json({ error: 'WHOP_COMPANY_ID environment variable not set' }, 500);
  }

  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: 'Whop API key not configured. Please add it in admin Settings.' }, 500);
  }

  const currency = env.WHOP_CURRENCY || 'usd';

  // First, update Product to allow multiple purchases
  try {
    await fetchWithTimeout(`https://api.whop.com/api/v2/products/${finalProdId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ one_per_user: false })
    }, WHOP_API_TIMEOUT);
    console.log('✅ Product updated: one_per_user = false');
  } catch (e) {
    console.log('Product update skipped:', e.message);
  }

  // Create one-time plan with unlimited purchases allowed
  // one_per_user: false = same user can buy multiple times
  // allow_multiple_quantity: true = can buy multiple in one checkout
  const planBody = {
    company_id: companyId,
    product_id: finalProdId,
    plan_type: 'one_time',
    release_method: 'buy_now',
    currency: currency,
    initial_price: priceValue,
    renewal_price: 0,
    title: `${product.title || 'One‑time purchase'} - $${priceValue}`,
    stock: 999999,
    one_per_user: false,
    allow_multiple_quantity: true,
    internal_notes: `Auto-generated for product ${product.id} - ${new Date().toISOString()}`
  };

  try {
    // Create the plan
    const planResp = await fetchWithTimeout('https://api.whop.com/api/v2/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(planBody)
    }, WHOP_API_TIMEOUT);

    if (!planResp.ok) {
      const errorText = await planResp.text();
      console.error('Whop plan create error:', errorText);
      let msg = 'Failed to create plan';
      try {
        const j = JSON.parse(errorText);
        msg = j.message || j.error || msg;
      } catch (_) {}
      return json({ error: msg }, planResp.status);
    }

    const planData = await planResp.json();
    const planId = planData.id;
    if (!planId) {
      return json({ error: 'Plan ID missing from Whop response' }, 500);
    }

    const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Prepare metadata to store locally for webhook fallback
    // SECURITY: Store server-side calculated price, not client-provided amount
    const checkoutMetadata = {
      product_id: product.id.toString(),
      product_title: product.title,
      addons: metadata?.addons || [],
      email: email || '',
      amount: priceValue, // Use server-side calculated price
      deliveryTimeMinutes: deliveryTimeMinutes,
      created_at: new Date().toISOString()
    };

    // Store plan for cleanup (with metadata for webhook fallback)
    try {
      await env.DB.prepare(`
        INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, metadata, expires_at, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).bind('plan_' + planId, product.id, planId, JSON.stringify(checkoutMetadata), expiryTime).run();
    } catch (e) {
      console.log('Plan tracking insert failed:', e.message);
    }

    // Create checkout session
    const checkoutBody = {
      plan_id: planId,
      redirect_url: `${origin}/success.html?product=${product.id}`,
      metadata: checkoutMetadata
    };

    if (email && email.includes('@')) {
      checkoutBody.prefill = { email: email.trim() };
    }

    const checkoutResp = await fetchWithTimeout('https://api.whop.com/api/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutBody)
    }, WHOP_API_TIMEOUT);

    if (!checkoutResp.ok) {
      const errorText = await checkoutResp.text();
      console.error('Whop checkout session error:', errorText);
      return json({
        success: true,
        plan_id: planId,
        product_id: product.id,
        email: email,
        metadata: {
          product_id: product.id.toString(),
          product_title: product.title,
          addons: metadata?.addons || [],
          amount: amount || priceValue
        },
        expires_in: '15 minutes',
        warning: 'Email prefill not available'
      });
    }

    const checkoutData = await checkoutResp.json();

    // Update database record with checkout session ID
    try {
      await env.DB.prepare(`
        UPDATE checkout_sessions 
        SET checkout_id = ?
        WHERE checkout_id = ?
      `).bind(checkoutData.id, 'plan_' + planId).run();
    } catch (e) {
      console.log('Checkout session tracking update failed:', e.message);
    }

    return json({
      success: true,
      plan_id: planId,
      checkout_id: checkoutData.id,
      checkout_url: checkoutData.purchase_url,
      product_id: product.id,
      email: email,
      amount: priceValue, // Return server-side calculated price
      metadata: {
        product_id: product.id.toString(),
        product_title: product.title,
        addons: metadata?.addons || [],
        amount: priceValue // Use server-side calculated price
      },
      expires_in: '15 minutes',
      email_prefilled: !!(email && email.includes('@'))
    });
  } catch (e) {
    console.error('Dynamic checkout error:', e);
    return json({ error: e.message || 'Failed to create plan/checkout' }, 500);
  }
}

/**
 * Handle Whop webhook
 * RELIABILITY: Order creation happens ONLY here, not on client redirect
 * This ensures orders are created even if user closes browser during redirect
 */
export async function handleWebhook(env, webhookData) {
  try {
    const eventType = webhookData.type;

    console.log('Whop webhook received:', eventType);

    // Handle payment success - this is the ONLY place orders are created
    if (eventType === 'payment.succeeded') {
      const checkoutSessionId = webhookData.data?.checkout_session_id;
      const membershipId = webhookData.data?.id;
      let metadata = webhookData.data?.metadata || {};

      console.log('Payment succeeded:', { checkoutSessionId, membershipId, metadata });

      // Get email from webhook data for duplicate checking
      const customerEmail = metadata.email ||
        webhookData.data?.email ||
        webhookData.data?.user?.email ||
        '';
      const productId = metadata.product_id || metadata.productId;

      // Check if order already exists for this checkout session or email+product (idempotency)
      if (checkoutSessionId || (customerEmail && productId)) {
        try {
          let existingOrder = null;

          // First, try to find by checkout_session_id in encrypted_data
          if (checkoutSessionId) {
            existingOrder = await env.DB.prepare(`
              SELECT o.id, o.encrypted_data FROM orders o
              WHERE o.encrypted_data LIKE ?
              LIMIT 1
            `).bind(`%"whop_checkout_id":"${checkoutSessionId}"%`).first();
          }

          // If not found, check by email + product_id (within last 5 minutes)
          if (!existingOrder && customerEmail && productId) {
            existingOrder = await env.DB.prepare(`
              SELECT o.id, o.encrypted_data FROM orders o
              WHERE o.product_id = ?
              AND o.created_at > datetime('now', '-5 minutes')
              AND o.encrypted_data LIKE ?
              LIMIT 1
            `).bind(Number(productId), `%${customerEmail}%`).first();
          }

          if (existingOrder) {
            console.log('Order already exists, skipping duplicate creation');
            return json({ received: true, duplicate: true, message: 'Order already processed' });
          }
        } catch (e) {
          console.log('Order existence check failed:', e.message);
        }
      }

      // Fallback: If metadata from Whop is empty/incomplete, try to get from our database
      // This ensures we have all order details even if Whop's metadata is stripped
      if (checkoutSessionId && (!metadata.addons || !metadata.addons.length || !metadata.amount)) {
        try {
          const sessionRow = await env.DB.prepare(
            'SELECT metadata FROM checkout_sessions WHERE checkout_id = ?'
          ).bind(checkoutSessionId).first();

          if (sessionRow?.metadata) {
            const storedMetadata = JSON.parse(sessionRow.metadata);
            console.log('Retrieved stored metadata from DB:', storedMetadata);
            // Merge stored metadata with webhook metadata (prefer stored for addons, amount)
            metadata = {
              ...metadata,
              ...storedMetadata,
              // Ensure addons come from stored metadata if available
              addons: storedMetadata.addons || metadata.addons || [],
              // Ensure amount comes from stored metadata (server-side calculated)
              amount: storedMetadata.amount || metadata.amount || 0
            };
          }
        } catch (e) {
          console.log('Failed to retrieve stored metadata:', e.message);
        }
      }

      // Mark checkout as completed in database
      if (checkoutSessionId) {
        try {
          await env.DB.prepare(`
            UPDATE checkout_sessions
            SET status = 'completed', completed_at = datetime('now')
            WHERE checkout_id = ?
          `).bind(checkoutSessionId).run();
        } catch (e) {
          console.log('Checkout tracking update skipped:', e.message);
        }
      }

      // Delete the temporary checkout session from Whop
      const apiKey = await getWhopApiKey(env);
      if (checkoutSessionId && apiKey) {
        try {
          await fetchWithTimeout(`https://api.whop.com/api/v2/checkout_sessions/${checkoutSessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${apiKey}` }
          }, WHOP_API_TIMEOUT);
          console.log('Checkout session deleted immediately after payment:', checkoutSessionId);
        } catch (e) {
          console.error('Failed to delete checkout session:', e);
        }

        // Delete dynamic plan if exists
        try {
          const row = await env.DB.prepare('SELECT plan_id FROM checkout_sessions WHERE checkout_id = ?').bind(checkoutSessionId).first();
          const planId = row && row.plan_id;
          if (planId) {
            await fetchWithTimeout(`https://api.whop.com/api/v2/plans/${planId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${apiKey}` }
            }, WHOP_API_TIMEOUT);
            console.log('Plan deleted immediately after payment:', planId);
          }
        } catch (e) {
          console.error('Failed to delete plan:', e);
        }
      }

      // Handle tip payment
      if (metadata.type === 'tip' && metadata.orderId) {
        try {
          await env.DB.prepare(
            'UPDATE orders SET tip_paid = 1, tip_amount = ? WHERE order_id = ?'
          ).bind(Number(metadata.tipAmount) || Number(metadata.amount) || 0, metadata.orderId).run();
          console.log('Tip marked as paid for order:', metadata.orderId);
        } catch (e) {
          console.error('Failed to update tip status:', e);
        }
        // Don't create a new order for tips, just mark tip as paid
        return json({ received: true });
      }

      // Create order in database (for regular purchases, not tips)
      // RELIABILITY: This is the ONLY place order creation happens
      // Client-side redirects cannot create orders - only webhook can
      if (metadata.product_id) {
        try {
          // Generate unique order ID
          const orderId = `WHOP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Get delivery time from metadata or product default
          let deliveryTimeMinutes = Number(metadata.deliveryTimeMinutes) || 0;
          if (!deliveryTimeMinutes || deliveryTimeMinutes <= 0) {
            try {
              const product = await env.DB.prepare('SELECT instant_delivery, normal_delivery_text FROM products WHERE id = ?')
                .bind(Number(metadata.product_id)).first();
              if (product) {
                if (product.instant_delivery) {
                  deliveryTimeMinutes = 60; // 60 minutes for instant
                } else {
                  const days = parseInt(product.normal_delivery_text) || 1;
                  deliveryTimeMinutes = days * 24 * 60; // Convert days to minutes
                }
              } else {
                deliveryTimeMinutes = 60; // Default fallback
              }
            } catch (e) {
              console.log('Could not get product delivery time:', e);
              deliveryTimeMinutes = 60;
            }
          }
          console.log('Final delivery time for order:', deliveryTimeMinutes, 'minutes');

          // Get email from multiple sources (whop webhook data is authoritative)
          const customerEmail = metadata.email ||
            webhookData.data?.email ||
            webhookData.data?.user?.email ||
            '';

          // Get amount from stored metadata (server-side calculated, not client-provided)
          const orderAmount = metadata.amount || 0;

          // Build encrypted_data with addons and other details
          const encryptedData = JSON.stringify({
            email: customerEmail,
            amount: orderAmount,
            productId: metadata.product_id,
            addons: metadata.addons || [],
            whop_membership_id: membershipId || null,
            whop_checkout_id: checkoutSessionId || null
          });

          await env.DB.prepare(
            'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))'
          ).bind(orderId, Number(metadata.product_id), encryptedData, 'completed', deliveryTimeMinutes).run();

          console.log('Order created via webhook:', orderId, 'Delivery:', deliveryTimeMinutes, 'minutes', 'Amount:', orderAmount);
        } catch (e) {
          console.error('Failed to create order:', e);
          // Still return success to Whop so they don't retry
          // Order can be recovered manually if needed
        }
      }
    }

    // Handle membership validation
    if (eventType === 'membership.went_valid') {
      console.log('Membership validated:', webhookData.data?.id);
    }

    return json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return json({ error: 'Webhook processing failed' }, 500);
  }
}

/**
 * Test Whop API connection
 */
export async function testApi(env) {
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ success: false, error: 'Whop API key not configured. Please add it in Settings.' }, 500);
  }
  try {
    const resp = await fetchWithTimeout('https://api.whop.com/api/v2/plans?page=1&per=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, WHOP_API_TIMEOUT);

    if (!resp.ok) {
      const text = await resp.text();
      let errMsg = 'Whop API call failed';
      let errorDetails = null;
      try {
        errorDetails = JSON.parse(text);
        errMsg = errorDetails.message || errorDetails.error || errMsg;
      } catch (_) {
        errMsg = text || errMsg;
      }
      return json({
        success: false,
        error: errMsg,
        status: resp.status,
        details: errorDetails,
        debug: {
          apiKeyLength: apiKey?.length || 0,
          apiKeyPrefix: apiKey?.substring(0, 10) + '...'
        }
      }, resp.status);
    }

    const data = await resp.json();
    return json({
      success: true,
      message: 'API connection successful!',
      plansCount: data.data?.length || 0,
      apiKeyValid: true
    });
  } catch (e) {
    return json({ success: false, error: e.message || 'API test error' }, 500);
  }
}

/**
 * Test webhook endpoint reachability
 */
export function testWebhook() {
  return json({ success: true, message: 'Webhook endpoint reachable' });
}

/**
 * Cleanup expired checkout sessions
 * Archive plans so users cannot repurchase (handles "already purchased" error)
 */
export async function cleanupExpired(env) {
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: 'Whop API key not configured' }, 500);
  }

  try {
    const expiredCheckouts = await env.DB.prepare(`
      SELECT checkout_id, product_id, plan_id, expires_at
      FROM checkout_sessions
      WHERE status = 'pending'
      AND datetime(expires_at) < datetime('now')
      ORDER BY created_at ASC
      LIMIT 50
    `).all();

    const checkouts = expiredCheckouts.results || [];
    if (checkouts.length === 0) {
      return json({ success: true, archived: 0, failed: 0, message: 'No expired checkouts' });
    }

    // Process in parallel batches of 5 to avoid rate limiting
    const batchSize = 5;
    let archived = 0;
    let failed = 0;

    for (let i = 0; i < checkouts.length; i += batchSize) {
      const batch = checkouts.slice(i, i + batchSize);

      const results = await Promise.allSettled(batch.map(async (checkout) => {
        const headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };

        let success = false;

        // Archive plan (hide it so users cannot buy again)
        if (checkout.plan_id) {
          try {
            // Try to archive by setting visibility to hidden
            const archiveResp = await fetchWithTimeout(`https://api.whop.com/api/v2/plans/${checkout.plan_id}`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ visibility: 'hidden' })
            }, WHOP_API_TIMEOUT);

            if (archiveResp.ok) {
              success = true;
              console.log('✅ Plan archived (hidden):', checkout.plan_id);
            } else {
              // Fallback: try DELETE
              const deleteResp = await fetchWithTimeout(`https://api.whop.com/api/v2/plans/${checkout.plan_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${apiKey}` }
              }, WHOP_API_TIMEOUT);
              success = deleteResp.ok || deleteResp.status === 404;
              if (success) console.log('✅ Plan deleted:', checkout.plan_id);
            }
          } catch (e) {
            console.error('Plan archive failed:', checkout.plan_id, e.message);
          }
        } else {
          success = true;
        }

        // Update database
        if (success) {
          await env.DB.prepare(`
            UPDATE checkout_sessions
            SET status = 'archived', completed_at = datetime('now')
            WHERE checkout_id = ?
          `).bind(checkout.checkout_id).run();
          return { success: true, id: checkout.checkout_id };
        }
        return { success: false, id: checkout.checkout_id };
      }));

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.success) archived++;
        else failed++;
      });
    }

    return json({
      success: true,
      archived,
      failed,
      message: `Archived ${archived} plans - users cannot repurchase these`
    });
  } catch (e) {
    console.error('Cleanup error:', e);
    return json({ error: e.message }, 500);
  }
}
