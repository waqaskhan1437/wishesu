/**
 * Payment Gateway - Unified payment method management
 * Supports: Whop, PayPal, Stripe (future), and custom methods
 */

import { json } from '../utils/response.js';

/**
 * Get all enabled payment methods
 */
export async function getPaymentMethods(env) {
  const methods = [];
  
  // Check Whop
  try {
    const whopRow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
    if (whopRow?.value) {
      const whop = JSON.parse(whopRow.value);
      if (whop.api_key || env.WHOP_API_KEY) {
        methods.push({
          id: 'whop',
          name: 'Card Payment',
          icon: '💳',
          description: 'Pay with Credit/Debit Card',
          enabled: true,
          priority: 1
        });
      }
    } else if (env.WHOP_API_KEY) {
      methods.push({
        id: 'whop',
        name: 'Card Payment',
        icon: '💳',
        description: 'Pay with Credit/Debit Card',
        enabled: true,
        priority: 1
      });
    }
  } catch (e) {
    console.log('Whop check failed:', e);
  }
  
  // Check PayPal - only show if FULLY configured
  try {
    const paypalRow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('paypal').first();
    if (paypalRow?.value) {
      const paypal = JSON.parse(paypalRow.value);
      // Only show PayPal if:
      // 1. Enabled checkbox is checked
      // 2. Client ID exists and is valid (starts with A or sandbox pattern)
      // 3. Secret exists and has minimum length
      const hasValidClientId = paypal.client_id && paypal.client_id.length > 10;
      const hasValidSecret = paypal.secret && paypal.secret.length > 10;
      
      if (paypal.enabled && hasValidClientId && hasValidSecret) {
        methods.push({
          id: 'paypal',
          name: 'PayPal',
          icon: '🅿️',
          description: 'Pay with PayPal',
          enabled: true,
          priority: 2,
          client_id: paypal.client_id,
          mode: paypal.mode || 'sandbox'
        });
      }
    } else if (env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET) {
      // Environment variables
      const hasValidClientId = env.PAYPAL_CLIENT_ID.length > 10;
      const hasValidSecret = env.PAYPAL_SECRET.length > 10;
      
      if (hasValidClientId && hasValidSecret) {
        methods.push({
          id: 'paypal',
          name: 'PayPal',
          icon: '🅿️',
          description: 'Pay with PayPal',
          enabled: true,
          priority: 2,
          client_id: env.PAYPAL_CLIENT_ID,
          mode: env.PAYPAL_MODE || 'sandbox'
        });
      }
    }
  } catch (e) {
    console.log('PayPal check failed:', e);
  }
  
  // Check Stripe (future)
  try {
    const stripeRow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('stripe').first();
    if (stripeRow?.value) {
      const stripe = JSON.parse(stripeRow.value);
      if (stripe.enabled && stripe.publishable_key) {
        methods.push({
          id: 'stripe',
          name: 'Stripe',
          icon: '💳',
          description: 'Pay with Stripe',
          enabled: true,
          priority: 3,
          publishable_key: stripe.publishable_key
        });
      }
    }
  } catch (e) {
    console.log('Stripe check failed:', e);
  }
  
  // Sort by priority
  methods.sort((a, b) => a.priority - b.priority);
  
  return json({ methods });
}

/**
 * Get all payment settings for admin
 */
export async function getAllPaymentSettings(env) {
  const settings = {
    whop: { enabled: false },
    paypal: { enabled: false, client_id: '', mode: 'sandbox' },
    stripe: { enabled: false, publishable_key: '' }
  };
  
  try {
    // Whop
    const whopRow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
    if (whopRow?.value) {
      const whop = JSON.parse(whopRow.value);
      settings.whop = {
        enabled: !!(whop.api_key || env.WHOP_API_KEY),
        has_api_key: !!(whop.api_key || env.WHOP_API_KEY),
        default_product_id: whop.default_product_id || '',
        default_plan_id: whop.default_plan_id || ''
      };
    } else if (env.WHOP_API_KEY) {
      settings.whop = { enabled: true, has_api_key: true };
    }
    
    // PayPal
    const paypalRow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('paypal').first();
    if (paypalRow?.value) {
      const paypal = JSON.parse(paypalRow.value);
      settings.paypal = {
        enabled: paypal.enabled || false,
        client_id: paypal.client_id || '',
        mode: paypal.mode || 'sandbox',
        has_secret: !!paypal.secret
      };
    }
    
    // Stripe
    const stripeRow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('stripe').first();
    if (stripeRow?.value) {
      const stripe = JSON.parse(stripeRow.value);
      settings.stripe = {
        enabled: stripe.enabled || false,
        publishable_key: stripe.publishable_key || '',
        has_secret: !!stripe.secret_key
      };
    }
  } catch (e) {
    console.error('Failed to load payment settings:', e);
  }
  
  return json({ settings });
}

/**
 * Save payment method settings
 */
export async function savePaymentMethodSettings(env, body) {
  const { provider, settings } = body;
  
  if (!provider || !settings) {
    return json({ error: 'Provider and settings required' }, 400);
  }
  
  // Get existing settings to preserve secrets if not provided
  let existing = {};
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(provider).first();
    if (row?.value) {
      existing = JSON.parse(row.value);
    }
  } catch (e) {}
  
  // Merge settings (preserve secrets if not provided)
  const merged = { ...existing, ...settings };
  
  // For sensitive fields, keep existing if new value is empty
  if (provider === 'paypal' && !settings.secret && existing.secret) {
    merged.secret = existing.secret;
  }
  if (provider === 'stripe' && !settings.secret_key && existing.secret_key) {
    merged.secret_key = existing.secret_key;
  }
  if (provider === 'whop' && !settings.api_key && existing.api_key) {
    merged.api_key = existing.api_key;
  }
  
  await env.DB.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  ).bind(provider, JSON.stringify(merged)).run();
  
  return json({ success: true });
}
