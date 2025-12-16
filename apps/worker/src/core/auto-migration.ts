export class AutoMigration {
  constructor(private env: any) {}

  async autoSetup() {
    try {
      console.log("🚀 Starting auto-migration...");
      
      const tablesExist = await this.checkTables();
      
      if (!tablesExist) {
        console.log("📦 Creating fresh tables...");
        await this.createTables();
      } else {
        console.log("✅ Tables exist - checking columns...");
        await this.addMissingColumns();
      }
      
      console.log("✅ Auto-migration complete!");
      return { success: true };
    } catch (error: any) {
      console.error("❌ Migration error:", error);
      return { success: false, error: error.message };
    }
  }

  private async checkTables(): Promise<boolean> {
    try {
      const result = await this.env.DB
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'")
        .first();
      return !!result;
    } catch {
      return false;
    }
  }

  private async createTables() {
    const tables = [
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
        price REAL NOT NULL DEFAULT 0,
        sale_price REAL,
        currency TEXT DEFAULT 'USD',
        stock INTEGER DEFAULT 0,
        sku TEXT,
        status TEXT DEFAULT 'draft',
        galleries TEXT,
        videos TEXT,
        addons TEXT,
        seo TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    ];

    for (const sql of tables) {
      await this.env.DB.prepare(sql).run();
    }
    
    console.log("✅ All tables created with complete schema");
  }

  private async addMissingColumns() {
    console.log("🔍 Checking products table columns...");
    
    try {
      const tableInfo = await this.env.DB
        .prepare("PRAGMA table_info(products)")
        .all();
      
      const existingColumns = tableInfo.results.map((col: any) => col.name);
      console.log("📋 Existing columns:", existingColumns.join(', '));
      
      const requiredColumns: Record<string, string> = {
        description: "TEXT",
        price: "REAL NOT NULL DEFAULT 0",
        sale_price: "REAL",
        currency: "TEXT DEFAULT 'USD'",
        stock: "INTEGER DEFAULT 0",
        sku: "TEXT",
        status: "TEXT DEFAULT 'draft'",
        galleries: "TEXT",
        videos: "TEXT",
        addons: "TEXT",
        seo: "TEXT",
        created_at: "INTEGER",
        updated_at: "INTEGER"
      };
      
      let addedCount = 0;
      
      for (const [columnName, columnType] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(columnName)) {
          console.log(`➕ Adding missing column: ${columnName} (${columnType})`);
          
          try {
            await this.env.DB
              .prepare(`ALTER TABLE products ADD COLUMN ${columnName} ${columnType}`)
              .run();
            
            console.log(`✅ Successfully added: ${columnName}`);
            addedCount++;
          } catch (err: any) {
            console.warn(`⚠️ Could not add ${columnName}: ${err.message}`);
          }
        }
      }
      
      if (addedCount > 0) {
        console.log(`✅ Added ${addedCount} missing columns`);
      } else {
        console.log("✅ All columns present - no changes needed");
      }
      
    } catch (error: any) {
      console.error("❌ Column check failed:", error.message);
    }
  }
}
