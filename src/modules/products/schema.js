export async function setupProductTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      price INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      instant INTEGER DEFAULT 0,
      delivery_days INTEGER DEFAULT 2,
      media_json TEXT,
      addons_json TEXT,
      video_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )`
  ).run();
  await db.prepare('ALTER TABLE products ADD COLUMN addons_json TEXT')
    .run()
    .catch(() => {});
  await db.prepare('ALTER TABLE products ADD COLUMN instant INTEGER DEFAULT 0')
    .run()
    .catch(() => {});
  await db.prepare('ALTER TABLE products ADD COLUMN delivery_days INTEGER DEFAULT 2')
    .run()
    .catch(() => {});
}
