/**
 * Default pages settings handlers.
 */

import { json } from '../../../../utils/response.js';

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
