export async function setupOrderTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      email TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_title TEXT,
      status TEXT DEFAULT 'pending',
      delivery_days INTEGER DEFAULT 2,
      instant INTEGER DEFAULT 0,
      addons_json TEXT,
      due_at TEXT,
      archive_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )`
  ).run();
  await db.prepare('ALTER TABLE orders ADD COLUMN product_title TEXT')
    .run()
    .catch(() => {});
  await db.prepare('ALTER TABLE orders ADD COLUMN addons_json TEXT')
    .run()
    .catch(() => {});
}
