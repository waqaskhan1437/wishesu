/**
 * Whop Checkout Controller
 * Handles checkout session creation
 */

import { json } from '../../utils/response.js';
import { getWhopApiKey } from '../../config/secrets.js';

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
    const whopResponse = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
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
    });

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
  const { product_id, amount, email, metadata } = body || {};
  if (!product_id) {
    return json({ error: 'Product ID required' }, 400);
  }

  // Lookup product from database
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(product_id)).first();
  if (!product) {
    return json({ error: 'Product not found' }, 404);
  }

  // Determine the base price
  const basePrice = (product.sale_price !== null && product.sale_price !== undefined && product.sale_price !== '')
    ? Number(product.sale_price)
    : Number(product.normal_price);

  // Use the amount from frontend (includes addons) if provided, otherwise use base price
  // Frontend sends window.currentTotal which is basePrice + addon prices
  const priceValue = (amount !== null && amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0)
    ? Number(amount)
    : basePrice;

  if (isNaN(priceValue) || priceValue < 0) {
    return json({ error: 'Invalid price' }, 400);
  }

  // Get Whop product ID
  const directProdId = (product.whop_product_id || '').trim();
  let finalProdId = directProdId;

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
    await fetch(`https://api.whop.com/api/v2/products/${finalProdId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ one_per_user: false })
    });
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

    const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Prepare metadata to store locally for webhook fallback
    const checkoutMetadata = {
      product_id: product.id.toString(),
      product_title: product.title,
      addons: metadata?.addons || [],
      email: email || '',
      amount: amount || priceValue,
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
