/**
 * Control webhook settings handlers.
 */

import { json } from '../../utils/response.js';

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
