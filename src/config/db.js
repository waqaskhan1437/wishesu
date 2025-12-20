/**
 * Database initialization and schema management
 * OPTIMIZED: Reduced unnecessary column checks, uses batch operations
 */

let dbReady = false;
let migrationsDone = false;

/**
 * Initialize database schema - creates all required tables
 * @param {Object} env - Environment bindings
 */
export async function initDB(env) {
  if (dbReady || !env.DB) return;

  try {
    // Create all tables with batch execution for better performance
    await env.DB.batch([
      // Products table
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT, slug TEXT, description TEXT,
          normal_price REAL, sale_price REAL,
          instant_delivery INTEGER DEFAULT 0,
          normal_delivery_text TEXT,
          thumbnail_url TEXT, video_url TEXT,
          gallery_images TEXT,
          addons_json TEXT,
          seo_title TEXT, seo_description TEXT, seo_keywords TEXT, seo_canonical TEXT,
          whop_plan TEXT, whop_price_map TEXT,
          whop_product_id TEXT,
          status TEXT DEFAULT 'active',
          sort_order INTEGER DEFAULT 0
        )
      `),
      // Orders table
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id TEXT UNIQUE, product_id INTEGER,
          encrypted_data TEXT, iv TEXT,
          archive_url TEXT, archive_data TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          delivered_video_url TEXT, delivered_thumbnail_url TEXT,
          delivered_video_metadata TEXT,
          portfolio_enabled INTEGER DEFAULT 1,
          delivered_at DATETIME,
          delivery_time_minutes INTEGER DEFAULT 60,
          revision_count INTEGER DEFAULT 0,
          revision_requested INTEGER DEFAULT 0
        )
      `),
      // Reviews table
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER, author_name TEXT, rating INTEGER, comment TEXT,
          status TEXT DEFAULT 'approved',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          order_id TEXT, show_on_product INTEGER DEFAULT 1,
          delivered_video_url TEXT, delivered_thumbnail_url TEXT
        )
      `),
      // Settings table
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`),
      // Pages table
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS pages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          slug TEXT UNIQUE, title TEXT, content TEXT,
          meta_description TEXT, status TEXT DEFAULT 'published',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `),
      // Checkout sessions table
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS checkout_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          checkout_id TEXT UNIQUE,
          product_id INTEGER,
          plan_id TEXT,
          expires_at DATETIME,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME
        )
      `),
      // Chat sessions table
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          blocked INTEGER DEFAULT 0,
          last_message_content TEXT,
          last_message_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `),
      // Chat messages table
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
        )
      `),
      // Index for chat messages
      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_id
        ON chat_messages(session_id, id)
      `)
    ]);

    dbReady = true;

    // Run migrations only once per deployment (not per request)
    if (!migrationsDone) {
      runMigrations(env).catch(e => console.error('Migration error:', e));
      migrationsDone = true;
    }
  } catch (e) {
    console.error('DB init error:', e);
  }
}

/**
 * Run migrations asynchronously (non-blocking)
 * These are legacy column additions for older databases
 */
async function runMigrations(env) {
  const migrations = [
    { table: 'products', column: 'gallery_images', type: 'TEXT' },
    { table: 'orders', column: 'delivered_video_metadata', type: 'TEXT' },
    { table: 'reviews', column: 'delivered_video_url', type: 'TEXT' },
    { table: 'reviews', column: 'delivered_thumbnail_url', type: 'TEXT' },
    { table: 'chat_sessions', column: 'blocked', type: 'INTEGER DEFAULT 0' },
    { table: 'chat_sessions', column: 'last_message_content', type: 'TEXT' },
    { table: 'chat_sessions', column: 'last_message_at', type: 'DATETIME' }
  ];

  for (const m of migrations) {
    try {
      await env.DB.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`).run();
    } catch (e) {
      // Column already exists - this is expected
    }
  }
}

/**
 * Check if database is initialized
 * @returns {boolean}
 */
export function isDBReady() {
  return dbReady;
}

/**
 * Reset the database ready flag (for testing)
 */
export function resetDBReady() {
  dbReady = false;
}
