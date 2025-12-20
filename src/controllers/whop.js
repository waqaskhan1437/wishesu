// Whop integration API controller
import { json } from '../utils/response.js';
import { getWhopApiKey, getWhopWebhookSecret } from '../utils/helpers.js';

/**
 * Create Whop checkout session
 * @param {Object} env - Environment bindings
 * @param {Object} body - Request body
 * @param {URL} url - Request URL
 * @returns {Promise<Response>}
 */
export async function createWhopCheckout(env, body, url) {
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

  // Extract Plan ID from link or use directly
  planId = planId.trim();
  
  // If it's a link, extract the plan ID
  if (planId.startsWith('http')) {
    // Try to extract from various Whop URL formats
    // Format 1: https://whop.com/checkout/plan_xxxxx
    // Format 2: https://whop.com/product-name (contains plan in page)
    const planMatch = planId.match(/plan_[a-zA-Z0-9]+/);
    if (planMatch) {
      planId = planMatch[0];
    } else {
      // If no plan ID in URL, we need to fetch it (not ideal but works)
      // For now, show error - user should provide direct plan ID or proper link
      return json({ 
        error: 'Could not extract Plan ID from link. Please use: https://whop.com/checkout/plan_XXXXX or just plan_XXXXX' 
      }, 400);
    }
  }
  
  // Validate Plan ID format
  if (!planId.startsWith('plan_')) {
    return json({ error: 'Invalid Whop Plan ID format. Should start with plan_' }, 400);
  }
  
  // Get Whop API key from database or environment
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: 'Whop API key not configured. Please add it in admin Settings.' }, 500);
  }

  // Calculate expiry time (15 minutes from now)
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Create Whop checkout session
  try {
    const whopResponse = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id: planId,
        redirect_url: `${url.origin}/success.html?product=${product.id}`,
        metadata: {
          product_id: product.id.toString(),
          product_title: product.title,
          created_at: new Date().toISOString(),
          expires_at: expiryTime
        }
      })
    });
    
    if (!whopResponse.ok) {
      const errorText = await whopResponse.text();
      console.error('Whop API error:', errorText);
      
      // Try to parse error message
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
    
    // Store checkout for cleanup tracking (optional - for 15 min auto-delete)
    try {
      await env.DB.prepare(`
        INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, expires_at, status, created_at)
        VALUES (?, ?, NULL, ?, 'pending', datetime('now'))
      `).bind(checkoutData.id, product.id, expiryTime).run();
    } catch (e) {
      // Table might not exist - that's okay, we'll still return the checkout
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
 * Create dynamic Whop plan and checkout
 * @param {Object} env - Environment bindings
 * @param {Object} body - Request body
 * @param {URL} url - Request URL
 * @returns {Promise<Response>}
 */
export async function createWhopPlanCheckout(env, body, url) {
  const { product_id, amount, email, metadata } = body || {};
  if (!product_id) {
    return json({ error: 'Product ID required' }, 400);
  }
  // Lookup product from database
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(product_id)).first();
  if (!product) {
    return json({ error: 'Product not found' }, 404);
  }
  // Determine the price to charge; prefer sale_price over normal_price
  const priceValue = (product.sale_price !== null && product.sale_price !== undefined && product.sale_price !== '')
    ? Number(product.sale_price)
    : Number(product.normal_price);
  // Allow $0 for testing, but reject negative prices
  if (isNaN(priceValue) || priceValue < 0) {
    return json({ error: 'Invalid price for product' }, 400);
  }
  // Ensure we have the Whop product ID for attaching the plan to the correct product
  // Use the product's specific Whop product ID if available.
  const directProdId = (product.whop_product_id || '').trim();
  let finalProdId = directProdId;
  // If no product-specific ID, fallback to global default_product_id from settings
  if (!finalProdId) {
    try {
      const srow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      let settings = {};
      if (srow && srow.value) {
        try { settings = JSON.parse(srow.value); } catch (e) { settings = {}; }
      }
      if (settings && settings.default_product_id) {
        finalProdId = (settings.default_product_id || '').trim();
      }
    } catch (e) {
      console.log('Failed to load whop settings for default product ID:', e);
    }
  }
  if (!finalProdId) {
    return json({ error: 'whop_product_id not configured for this product and no default_product_id set' }, 400);
  }
  // Company ID must be provided via environment variables
  const companyId = env.WHOP_COMPANY_ID;
  if (!companyId) {
    return json({ error: 'WHOP_COMPANY_ID environment variable not set' }, 500);
  }
  // Get API key from database or environment
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: 'Whop API key not configured. Please add it in admin Settings.' }, 500);
  }
  // Derive currency from environment or fallback to USD
  const currency = env.WHOP_CURRENCY || 'usd';
  // Prepare plan creation request for one-time payment (no renewal)
  // For one_time plans, we should NOT set renewal_price
  const planBody = {
    company_id: companyId,
    product_id: finalProdId,
    plan_type: 'one_time',
    release_method: 'buy_now',
    currency: currency,
    initial_price: priceValue,
    // Do NOT set renewal_price for one_time plans - it causes error
    // Provide a default title for the plan so the seller can see it in their dashboard
    title: `${product.title || 'One-time purchase'} - $${priceValue}`,
    // Set unlimited stock to prevent "out of stock" errors
    stock: 999999,
    internal_notes: `Auto-generated for product ${product.id} - ${new Date().toISOString()}`
  };
  try {
    // Create the plan on Whop
    const planResp = await fetch('https://api.whop.com/api/v2/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(planBody)
    });
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
    // Compute expiry time (15 mins) for cleanup
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store plan for cleanup, no checkout session needed for embedded flow
    try {
      await env.DB.prepare(`
        INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, expires_at, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', datetime('now'))
      `).bind('plan_' + planId, product.id, planId, expiryTime).run();
    } catch (e) {
      console.log('Plan tracking insert failed:', e.message);
    }

    // Create checkout session with email prefill for better UX
    const checkoutBody = {
      plan_id: planId,
      redirect_url: `${url.origin}/success.html?product=${product.id}`,
      metadata: {
        product_id: product.id.toString(),
        product_title: product.title,
        addons: metadata?.addons || [],
        amount: amount || priceValue,
        created_at: new Date().toISOString()
      }
    };

    // Add email prefill if provided
    if (email && email.includes('@')) {
      checkoutBody.prefill = {
        email: email.trim()
      };
    }

    const checkoutResp = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutBody)
    });

    if (!checkoutResp.ok) {
      const errorText = await checkoutResp.text();
      console.error('Whop checkout session error:', errorText);
      // If checkout session fails, still return plan ID for fallback
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

    // Return both plan ID and checkout URL with email prefill
    return json({
      success: true,
      plan_id: planId,
      checkout_id: checkoutData.id,
      checkout_url: checkoutData.purchase_url,
      product_id: product.id,
      email: email,
      metadata: {
        product_id: product.id.toString(),
        product_title: product.title,
        addons: metadata?.addons || [],
        amount: amount || priceValue
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
 * @param {Object} env - Environment bindings
 * @param {Request} req - Request object
 * @returns {Promise<Response>}
 */
export async function handleWhopWebhook(env, req) {
  try {
    const webhookData = await req.json();
    const eventType = webhookData.type;
    
    console.log('Whop webhook received:', eventType);
    
    // Handle payment success
    if (eventType === 'payment.succeeded') {
      const checkoutSessionId = webhookData.data?.checkout_session_id;
      const membershipId = webhookData.data?.id;
      const metadata = webhookData.data?.metadata || {};
      
      console.log('Payment succeeded:', {
        checkoutSessionId,
        membershipId,
        metadata
      });
      
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
      if (checkoutSessionId && env.WHOP_API_KEY) {
        try {
          await fetch(`https://api.whop.com/api/v2/checkout_sessions/${checkoutSessionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${env.WHOP_API_KEY}`
            }
          });
          console.log('✅ Checkout session deleted immediately after payment:', checkoutSessionId);
        } catch (e) {
          console.error('Failed to delete checkout session:', e);
        }
      }
      // If we created a dynamic plan for this checkout, delete the plan as well
      if (checkoutSessionId && env.WHOP_API_KEY) {
        try {
          // Fetch plan_id from checkout_sessions table
          const row = await env.DB.prepare('SELECT plan_id FROM checkout_sessions WHERE checkout_id = ?').bind(checkoutSessionId).first();
          const planId = row && row.plan_id;
          if (planId) {
            await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${env.WHOP_API_KEY}` }
            });
            console.log('🗑️ Plan deleted immediately after payment:', planId);
          }
        } catch (e) {
          console.error('Failed to delete plan:', e);
        }
      }
      
      // Create order in database (optional - for tracking)
      if (metadata.product_id) {
        try {
          const orderId = `WHOP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await env.DB.prepare(
            'INSERT INTO orders (order_id, product_id, status, created_at) VALUES (?, ?, ?, datetime("now"))'
          ).bind(orderId, Number(metadata.product_id), 'completed').run();
          
          console.log('Order created:', orderId);
        } catch (e) {
          console.error('Failed to create order:', e);
        }
      }
    }
    
    // Handle membership validation
    if (eventType === 'membership.went_valid') {
      console.log('Membership validated:', webhookData.data?.id);
    }
    
    // Always return 200 to acknowledge webhook
    return json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return json({ error: 'Webhook processing failed' }, 500);
  }
}

/**
 * Test Whop API connectivity
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
 */
export async function testWhopApi(env) {
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ success: false, error: 'Whop API key not configured. Please add it in Settings.' }, 500);
  }
  try {
    // Test API key by listing plans - this endpoint works with basic plan permissions
    // and doesn't require company ID or special permissions
    const resp = await fetch('https://api.whop.com/api/v2/plans?page=1&per=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Return detailed error info for debugging
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
 * @returns {Promise<Response>}
 */
export async function testWhopWebhook() {
  return json({ success: true, message: 'Webhook endpoint reachable' });
}

/**
 * Cleanup expired checkout sessions
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
 */
export async function cleanupExpiredCheckouts(env) {
  if (!env.WHOP_API_KEY) {
    return json({ error: 'Whop API key not configured' }, 500);
  }
  
  try {
    // Get expired checkouts from database
    const expiredCheckouts = await env.DB.prepare(`
      SELECT checkout_id, product_id, expires_at
      FROM checkout_sessions
      WHERE status = 'pending' 
      AND datetime(expires_at) < datetime('now')
      ORDER BY created_at ASC
      LIMIT 50
    `).all();
    
    let deleted = 0;
    let failed = 0;
    
    for (const checkout of (expiredCheckouts.results || [])) {
      try {
        // Delete the checkout session from Whop (ignore if already gone)
        const deleteSessionResp = await fetch(`https://api.whop.com/api/v2/checkout_sessions/${checkout.checkout_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${env.WHOP_API_KEY}` }
        });
        // Attempt to delete the associated plan if one exists
        let planDeleted = false;
        try {
          const row = await env.DB.prepare('SELECT plan_id FROM checkout_sessions WHERE checkout_id = ?').bind(checkout.checkout_id).first();
          const planId = row && row.plan_id;
          if (planId) {
            const delPlanResp = await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${env.WHOP_API_KEY}` }
            });
            planDeleted = delPlanResp.ok || delPlanResp.status === 404;
          }
        } catch (pe) {
          console.error('Plan deletion error:', pe);
        }
        if (deleteSessionResp.ok || deleteSessionResp.status === 404) {
          // Mark as expired in database regardless of plan deletion outcome
          await env.DB.prepare(`
            UPDATE checkout_sessions 
            SET status = 'expired', completed_at = datetime('now')
            WHERE checkout_id = ?
          `).bind(checkout.checkout_id).run();
          deleted++;
          console.log('🗑️ Expired checkout deleted:', checkout.checkout_id, planDeleted ? 'and plan cleaned up' : '');
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
        console.error('Failed to delete checkout:', checkout.checkout_id, e);
      }
    }
    
    return json({
      success: true,
      deleted: deleted,
      failed: failed,
      message: `Cleaned up ${deleted} expired checkouts`
    });
  } catch (e) {
    console.error('Cleanup error:', e);
    return json({ error: e.message }, 500);
  }
}