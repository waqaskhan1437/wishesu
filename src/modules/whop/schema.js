export async function setupWhopTables(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS checkout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkout_id TEXT,
      product_id INTEGER,
      plan_id TEXT,
      metadata TEXT,
      expires_at TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS whop_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
}
