/**
 * Database initialization and schema management
 */

let dbReady = false;

/**
 * Initialize database schema - creates all required tables and migrations
 * @param {Object} env - Environment bindings
 */
export async function initDB(env) {
  if (dbReady || !env.DB) return;
  
  try {
    // Products table
    await env.DB.prepare(`
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
    `).run();

    // Add gallery_images column to existing products table if it doesn't exist
    try {
      await env.DB.prepare('SELECT gallery_images FROM products LIMIT 1').run();
    } catch (e) {
      try {
        console.log('Adding gallery_images column to products table...');
        await env.DB.prepare('ALTER TABLE products ADD COLUMN gallery_images TEXT').run();
      } catch (alterError) {
        console.log('Column might already exist:', alterError.message);
      }
    }

    // Orders table
    await env.DB.prepare(`
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
    `).run();

    // Add delivered_video_metadata column to existing orders table if it doesn't exist
    try {
      await env.DB.prepare('SELECT delivered_video_metadata FROM orders LIMIT 1').run();
    } catch (e) {
      try {
        console.log('Adding delivered_video_metadata column to orders table...');
        await env.DB.prepare('ALTER TABLE orders ADD COLUMN delivered_video_metadata TEXT').run();
      } catch (alterError) {
        console.log('Column might already exist:', alterError.message);
      }
    }

    // Reviews table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER, author_name TEXT, rating INTEGER, comment TEXT,
        status TEXT DEFAULT 'approved',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        order_id TEXT, show_on_product INTEGER DEFAULT 1,
        delivered_video_url TEXT, delivered_thumbnail_url TEXT
      )
    `).run();
    
    // Auto-migration: Add delivery columns to reviews if missing
    try {
      const tableInfo = await env.DB.prepare(`PRAGMA table_info(reviews)`).all();
      const columns = tableInfo.results.map(col => col.name);
      if (!columns.includes('delivered_video_url')) {
        await env.DB.prepare(`ALTER TABLE reviews ADD COLUMN delivered_video_url TEXT`).run();
      }
      if (!columns.includes('delivered_thumbnail_url')) {
        await env.DB.prepare(`ALTER TABLE reviews ADD COLUMN delivered_thumbnail_url TEXT`).run();
      }
    } catch (e) { /* ignore */ }

    // Settings table
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
    
    // Pages table
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE, title TEXT, content TEXT,
      meta_description TEXT, status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // Checkout sessions table
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS checkout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkout_id TEXT UNIQUE,
      product_id INTEGER,
      plan_id TEXT,
      expires_at DATETIME,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )`).run();

    // Chat sessions table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        blocked INTEGER DEFAULT 0,
        last_message_content TEXT,
        last_message_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Add blocked column to existing chat_sessions table if it doesn't exist
    try {
      await env.DB.prepare('SELECT blocked FROM chat_sessions LIMIT 1').run();
    } catch (e) {
      try {
        console.log('Adding blocked column to chat_sessions table...');
        await env.DB.prepare('ALTER TABLE chat_sessions ADD COLUMN blocked INTEGER DEFAULT 0').run();
      } catch (alterError) {
        console.log('Column might already exist:', alterError.message);
      }
    }

    // Add last_message_content column to existing chat_sessions table if it doesn't exist
    try {
      await env.DB.prepare('SELECT last_message_content FROM chat_sessions LIMIT 1').run();
    } catch (e) {
      try {
        console.log('Adding last_message_content column to chat_sessions table...');
        await env.DB.prepare('ALTER TABLE chat_sessions ADD COLUMN last_message_content TEXT').run();
      } catch (alterError) {
        console.log('Column might already exist:', alterError.message);
      }
    }

    // Add last_message_at column to existing chat_sessions table if it doesn't exist
    try {
      await env.DB.prepare('SELECT last_message_at FROM chat_sessions LIMIT 1').run();
    } catch (e) {
      try {
        console.log('Adding last_message_at column to chat_sessions table...');
        await env.DB.prepare('ALTER TABLE chat_sessions ADD COLUMN last_message_at DATETIME').run();
      } catch (alterError) {
        console.log('Column might already exist:', alterError.message);
      }
    }

    // Chat messages table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
      )
    `).run();

    // Index for chat messages
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_id
      ON chat_messages(session_id, id)
    `).run();

    dbReady = true;
  } catch (e) {
    console.error('DB init error:', e);
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
