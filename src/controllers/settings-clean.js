/**
 * Clean Settings Controller 2025 - Essential Settings Only
 * Research-based minimal configuration
 */

import { json } from '../utils/response.js';

// Simple cache
let settingsCache = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

const DEFAULT_SETTINGS = {
  site_title: '',
  site_description: '',
  admin_email: '',
  enable_paypal: false,
  enable_stripe: false,
  paypal_client_id: '',
  paypal_secret: '',
  stripe_pub_key: '',
  stripe_secret_key: '',
  enable_rate_limit: true,
  rate_limit: 10
};

/**
 * Ensure settings table exists
 */
async function ensureTable(env) {
  if (!env.DB) return;
  
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS clean_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        site_title TEXT NOT NULL,
        site_description TEXT NOT NULL,
        admin_email TEXT NOT NULL,
        enable_paypal INTEGER DEFAULT 0,
        enable_stripe INTEGER DEFAULT 0,
        paypal_client_id TEXT,
        paypal_secret TEXT,
        stripe_pub_key TEXT,
        stripe_secret_key TEXT,
        enable_rate_limit INTEGER DEFAULT 1,
        rate_limit INTEGER DEFAULT 10
      )
    `).run();
  } catch (e) {
    console.error('Settings table error:', e);
  }
}

/**
 * Get clean settings with cache
 */
export async function getCleanSettings(env) {
  const now = Date.now();
  if (settingsCache && (now - cacheTime) < CACHE_TTL) {
    return settingsCache;
  }

  await ensureTable(env);

  try {
    const row = await env.DB.prepare('SELECT * FROM clean_settings WHERE id = 1').first();
    settingsCache = { ...DEFAULT_SETTINGS, ...(row || {}) };
    cacheTime = now;
    return settingsCache;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

/**
 * API: Get clean settings
 */
export async function getCleanSettingsApi(env) {
  try {
    const settings = await getCleanSettings(env);
    // Mask sensitive data
    const safeSettings = {
      ...settings,
      paypal_secret: settings.paypal_secret ? '••••••••' : '',
      stripe_secret_key: settings.stripe_secret_key ? '••••••••' : ''
    };
    return json({ success: true, settings: safeSettings });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * API: Save clean settings
 */
export async function saveCleanSettingsApi(env, body) {
  try {
    await ensureTable(env);

    const current = await getCleanSettings(env);
    
    const settings = {
      site_title: (body.site_title || '').trim(),
      site_description: (body.site_description || '').trim().substring(0, 160),
      admin_email: (body.admin_email || '').trim(),
      enable_paypal: body.enable_paypal ? 1 : 0,
      enable_stripe: body.enable_stripe ? 1 : 0,
      paypal_client_id: (body.paypal_client_id || '').trim(),
      paypal_secret: (body.paypal_secret || '').trim(),
      stripe_pub_key: (body.stripe_pub_key || '').trim(),
      stripe_secret_key: (body.stripe_secret_key || '').trim(),
      enable_rate_limit: body.enable_rate_limit ? 1 : 0,
      rate_limit: Math.max(1, Math.min(100, parseInt(body.rate_limit) || 10))
    };

    // Preserve masked values
    if (settings.paypal_secret === '••••••••') {
      settings.paypal_secret = current.paypal_secret;
    }
    if (settings.stripe_secret_key === '••••••••') {
      settings.stripe_secret_key = current.stripe_secret_key;
    }

    await env.DB.prepare(`
      INSERT OR REPLACE INTO clean_settings (
        id, site_title, site_description, admin_email, enable_paypal, enable_stripe,
        paypal_client_id, paypal_secret, stripe_pub_key, stripe_secret_key,
        enable_rate_limit, rate_limit
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      settings.site_title,
      settings.site_description,
      settings.admin_email,
      settings.enable_paypal,
      settings.enable_stripe,
      settings.paypal_client_id,
      settings.paypal_secret,
      settings.stripe_pub_key,
      settings.stripe_secret_key,
      settings.enable_rate_limit,
      settings.rate_limit
    ).run();

    settingsCache = null; // Clear cache

    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
