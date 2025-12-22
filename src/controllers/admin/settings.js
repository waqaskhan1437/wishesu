/**
 * Admin Settings Controller
 * Application settings management
 */

import { json } from '../../utils/response.js';

/**
 * Get Whop settings
 */
export async function getWhopSettings(env) {
  try {
    const apiKey = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('whop_api_key')
      .first();

    const planId = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('whop_plan_id')
      .first();

    return json({
      success: true,
      settings: {
        apiKey: apiKey?.value || '',
        planId: planId?.value || ''
      }
    });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Save Whop settings
 */
export async function saveWhopSettings(env, body) {
  try {
    const { apiKey, planId } = body;

    if (apiKey !== undefined) {
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .bind('whop_api_key', apiKey)
        .run();
    }

    if (planId !== undefined) {
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .bind('whop_plan_id', planId)
        .run();
    }

    return json({ success: true });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Get Analytics settings
 */
export async function getAnalyticsSettings(env) {
  try {
    const gtmId = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('analytics_gtm_id')
      .first();

    const gaId = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('analytics_ga_id')
      .first();

    return json({
      success: true,
      settings: {
        gtmId: gtmId?.value || '',
        gaId: gaId?.value || ''
      }
    });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Save Analytics settings
 */
export async function saveAnalyticsSettings(env, body) {
  try {
    const { gtmId, gaId } = body;

    if (gtmId !== undefined) {
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .bind('analytics_gtm_id', gtmId)
        .run();
    }

    if (gaId !== undefined) {
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .bind('analytics_ga_id', gaId)
        .run();
    }

    return json({ success: true });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Get Control Webhook settings
 */
export async function getControlWebhookSettings(env) {
  try {
    const url = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('control_webhook_url')
      .first();

    const secret = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('control_webhook_secret')
      .first();

    return json({
      success: true,
      settings: {
        url: url?.value || '',
        secret: secret?.value || ''
      }
    });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Save Control Webhook settings
 */
export async function saveControlWebhookSettings(env, body) {
  try {
    const { url, secret } = body;

    if (url !== undefined) {
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .bind('control_webhook_url', url)
        .run();
    }

    if (secret !== undefined) {
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .bind('control_webhook_secret', secret)
        .run();
    }

    return json({ success: true });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Get Default Pages settings
 */
export async function getDefaultPages(env) {
  try {
    const homepage = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('default_homepage')
      .first();

    return json({
      success: true,
      settings: {
        homepage: homepage?.value || ''
      }
    });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Save Default Pages settings
 */
export async function saveDefaultPages(env, body) {
  try {
    const { homepage } = body;

    if (homepage !== undefined) {
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .bind('default_homepage', homepage)
        .run();
    }

    return json({ success: true });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export default {
  getWhopSettings,
  saveWhopSettings,
  getAnalyticsSettings,
  saveAnalyticsSettings,
  getControlWebhookSettings,
  saveControlWebhookSettings,
  getDefaultPages,
  saveDefaultPages
};
