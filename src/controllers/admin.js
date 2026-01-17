
// ========== SITE COMPONENTS (HEADERS/FOOTERS) ==========

/**
 * Get Site Components (Header/Footer/etc.)
 */
export async function getSiteComponents(env) {
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('site_components').first();
    if (row && row.value) {
      try {
        const components = JSON.parse(row.value);
        return json({ components });
      } catch (e) {
        return json({ components: null });
      }
    }
    return json({ components: null });
  } catch (e) {
    console.error('Failed to get components:', e);
    // Return null components if table doesn't exist yet or query fails
    return json({ components: null, error: e.message });
  }
}

/**
 * Save Site Components
 */
export async function saveSiteComponents(env, body) {
  try {
    // If body has a 'data' wrapper, unwrap it, otherwise use body directly
    const dataToSave = body.data || body;
    const value = JSON.stringify(dataToSave);

    await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind('site_components', value).run();

    // Also try to purge cache if possible
    try {
      const zoneId = env.CF_ZONE_ID;
      const token = env.CF_API_TOKEN;
      if (zoneId && token) {
        // Purge cache so new header/footer shows up immediately
        await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ purge_everything: true })
        });
      }
    } catch(e) { console.error('Cache purge failed', e); }

    return json({ success: true });
  } catch (e) {
    console.error('Failed to save components:', e);
    return json({ error: e.message }, 500);
  }
}
