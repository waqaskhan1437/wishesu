
// Secrets cache to avoid repeated DB queries
let secretsCache = null;
let secretsCacheTime = 0;
const SECRETS_CACHE_TTL = 300000; // 5 minutes

/**
 * Helper functions for fetching API keys and secrets from DB/environment
 */

/**
 * Get Whop API key from database settings or environment variable
 * @param {Object} env - Environment bindings
 * @returns {Promise<string|null>}
 */
export async function getWhopApiKey(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.api_key) {
          return settings.api_key;
        }
      }
    }
  } catch (e) {
    console.error('Error reading API key from database:', e);
  }
  // Fallback to environment variable
  return env.WHOP_API_KEY || null;
}

/**
 * Get Whop webhook secret from database settings or environment variable
 * @param {Object} env - Environment bindings
 * @returns {Promise<string|null>}
 */
export async function getWhopWebhookSecret(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.webhook_secret) {
          return settings.webhook_secret;
        }
      }
    }
  } catch (e) {
    console.error('Error reading webhook secret from database:', e);
  }
  // Fallback to environment variable
  return env.WHOP_WEBHOOK_SECRET || null;
}

/**
 * Get Google Apps Script URL for email webhooks from database settings
 * @param {Object} env - Environment bindings
 * @returns {Promise<string|null>}
 */
export async function getGoogleScriptUrl(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.google_webapp_url) {
          return settings.google_webapp_url;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading Google Script URL from database:', e);
  }
  return null;
}
