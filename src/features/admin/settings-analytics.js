/**
 * Analytics settings handlers.
 */

import { json } from '../../../../utils/response.js';

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
