/**
 * Settings Service
 * Key-value store for app configuration
 */

export async function getSetting(db, key) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return row?.value || null;
}

export async function setSetting(db, key, value) {
  return db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, strftime('%s', 'now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(key, value).run();
}

export async function getMultipleSettings(db, keys) {
  const placeholders = keys.map(() => '?').join(',');
  const rows = await db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).bind(...keys).all();
  const result = {};
  (rows.results || []).forEach(row => {
    result[row.key] = row.value;
  });
  return result;
}

export async function setMultipleSettings(db, settings) {
  const stmt = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, strftime('%s', 'now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );
  const batch = Object.entries(settings).map(([key, value]) => stmt.bind(key, value || ''));
  return db.batch(batch);
}
