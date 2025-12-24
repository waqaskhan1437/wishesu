/**
 * Whop settings handlers.
 */

import { json } from '../../../../utils/response.js';

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
