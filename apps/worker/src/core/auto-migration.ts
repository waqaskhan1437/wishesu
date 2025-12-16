export class AutoMigration {
  constructor(private env: any) {}

  async autoSetup() {
    try {
      const tablesExist = await this.checkTables();
      if (!tablesExist) {
        await this.createTables();
      }
      return { success: true };
    } catch (error: any) {
      console.error("Migration error:", error);
      return { success: false, error: error.message };
    }
  }

  private async checkTables(): Promise<boolean> {
    try {
      const result = await this.env.DB
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
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
        price REAL NOT NULL,
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
    
    console.log("✅ Tables created");
  }
}
