// Auto-Migration & Setup System
// This file automatically sets up everything on first run!

export class AutoMigration {
  constructor(env) {
    this.env = env;
  }

  // Check if tables exist
  async tablesExist() {
    try {
      const result = await this.env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).first();
      return !!result;
    } catch {
      return false;
    }
  }

  // Get current schema version
  async getSchemaVersion() {
    try {
      const versionTable = await this.env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_version'"
      ).first();
      
      if (!versionTable) return 0;
      
      const version = await this.env.DB.prepare(
        "SELECT version FROM _schema_version ORDER BY version DESC LIMIT 1"
      ).first();
      
      return version?.version || 0;
    } catch {
      return 0;
    }
  }

  // Create schema version table
  async createVersionTable() {
    await this.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS _schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL,
        description TEXT
      )
    `).run();
  }

  // Record migration
  async recordMigration(version, description) {
    await this.env.DB.prepare(`
      INSERT INTO _schema_version (version, applied_at, description)
      VALUES (?, ?, ?)
    `).bind(version, Date.now(), description).run();
  }

  // Initial schema (v1)
  async applyInitialSchema() {
    console.log("🔧 Creating initial database schema...");
    
    const migrations = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        price INTEGER,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'draft',
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS product_media (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        r2_key TEXT NOT NULL,
        kind TEXT NOT NULL,
        alt TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS product_addons (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        price_delta INTEGER DEFAULT 0,
        is_required INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS product_seo (
        product_id TEXT PRIMARY KEY,
        meta_title TEXT,
        meta_description TEXT,
        og_image_r2_key TEXT,
        canonical_url TEXT
      )`
    ];

    for (const sql of migrations) {
      await this.env.DB.prepare(sql).run();
    }

    await this.recordMigration(1, "Initial schema");
    console.log("✅ Initial schema created!");
  }

  // Auto-detect and add missing columns
  async autoAddMissingColumns() {
    console.log("🔍 Checking for schema updates...");
    
    // Define expected schema
    const expectedSchema = {
      users: ['id', 'email', 'password_hash', 'role', 'created_at', 'full_name', 'phone'],
      products: ['id', 'title', 'slug', 'description', 'price', 'currency', 'status', 'created_by', 'created_at', 'updated_at', 'stock_quantity', 'sku'],
      product_media: ['id', 'product_id', 'r2_key', 'kind', 'alt', 'sort_order', 'created_at', 'file_size', 'mime_type'],
      product_addons: ['id', 'product_id', 'name', 'price_delta', 'is_required', 'created_at', 'stock_quantity'],
      product_seo: ['product_id', 'meta_title', 'meta_description', 'og_image_r2_key', 'canonical_url', 'keywords']
    };

    for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
      try {
        // Get current columns
        const tableInfo = await this.env.DB.prepare(
          `PRAGMA table_info(${tableName})`
        ).all();
        
        if (!tableInfo.results || tableInfo.results.length === 0) continue;
        
        const existingColumns = tableInfo.results.map(col => col.name);
        const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
        
        // Add missing columns
        for (const column of missingColumns) {
          console.log(`➕ Adding column ${tableName}.${column}`);
          
          let columnDef = `${column} TEXT`;
          if (column.includes('quantity')) columnDef = `${column} INTEGER DEFAULT 0`;
          if (column.includes('size')) columnDef = `${column} INTEGER`;
          
          try {
            await this.env.DB.prepare(
              `ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`
            ).run();
            console.log(`✅ Added ${tableName}.${column}`);
          } catch (err) {
            console.warn(`⚠️ Could not add ${tableName}.${column}: ${err.message}`);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Schema check failed for ${tableName}: ${err.message}`);
      }
    }
    
    const currentVersion = await this.getSchemaVersion();
    if (currentVersion === 1) {
      await this.recordMigration(2, "Auto-added extended columns");
    }
  }

  // Main auto-setup function
  async autoSetup() {
    try {
      console.log("🚀 Starting auto-setup...");
      
      // Step 1: Create version table
      await this.createVersionTable();
      
      // Step 2: Check if initial schema exists
      const tablesExist = await this.tablesExist();
      
      if (!tablesExist) {
        console.log("📦 No tables found - creating initial schema...");
        await this.applyInitialSchema();
      } else {
        console.log("✅ Tables exist - checking for updates...");
      }
      
      // Step 3: Auto-add missing columns
      await this.autoAddMissingColumns();
      
      console.log("✅ Auto-setup complete!");
      return { success: true, message: "Database ready!" };
      
    } catch (error) {
      console.error("❌ Auto-setup failed:", error);
      return { success: false, error: error.message };
    }
  }
}

// Helper: Check and create R2 bucket if needed
export async function ensureR2Bucket(env) {
  try {
    // Try to list objects - if it fails, bucket doesn't exist
    await env.MEDIA.list({ limit: 1 });
    console.log("✅ R2 bucket exists");
    return true;
  } catch (error) {
    console.warn("⚠️ R2 bucket check:", error.message);
    // Note: R2 buckets must be created via Wrangler or Dashboard
    // We can't create them via API in Worker
    return false;
  }
}
