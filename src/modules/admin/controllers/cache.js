/**
 * Admin Cache Controller
 * Cache management operations
 */

import { json } from '../../../core/utils/response.js';
import { VERSION } from '../../../core/config/constants.js';

// Flag to track if version purge check was done
let purgeVersionChecked = false;

/**
 * Purge Cloudflare cache manually
 */
export async function purgeCache(env) {
  const zoneId = env.CF_ZONE_ID;
  const token = env.CF_API_TOKEN;

  if (!zoneId || !token) {
    return json({ error: 'CF_ZONE_ID or CF_API_TOKEN not configured' }, 500);
  }

  try {
    const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
    const cfResp = await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ purge_everything: true })
    });

    const result = await cfResp.json();
    return json(result, cfResp.ok ? 200 : 500);

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Auto-purge cache on version change
 */
export async function maybePurgeCache(env, initDB) {
  if (!env || !env.DB || !env.CF_ZONE_ID || !env.CF_API_TOKEN) return;
  if (purgeVersionChecked) return;

  try {
    await initDB(env);

    let row = null;
    try {
      row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
        .bind('last_purge_version')
        .first();
    } catch (_) {}

    const lastVersion = row && row.value ? row.value.toString() : null;
    const currentVersion = VERSION.toString();

    if (lastVersion === currentVersion) {
      purgeVersionChecked = true;
      return;
    }

    const zoneId = env.CF_ZONE_ID;
    const token = env.CF_API_TOKEN;
    const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;

    const cfResp = await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ purge_everything: true })
    });

    if (cfResp.ok) {
      try {
        await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
          .bind('last_purge_version', currentVersion)
          .run();
      } catch (_) {}
    }

    purgeVersionChecked = true;

  } catch (error) {
    console.error('Auto-purge cache error:', error);
  }
}

export default { purgeCache, maybePurgeCache };
