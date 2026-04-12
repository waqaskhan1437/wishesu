const fs = require('fs');

// 1. db.js
let dbCode = fs.readFileSync('src/config/db.js', 'utf8');
const searchDB = '        // API Key usage logs table';
const replaceDB = `        // Additional integrations
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS payment_gateways (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            api_key TEXT,
            api_secret TEXT,
            is_active INTEGER DEFAULT 0,
            webhook_secret TEXT
          )
        \`),
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS webhook_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gateway TEXT NOT NULL,
            event_id TEXT UNIQUE NOT NULL,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        \`),
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS analytics_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            ga_id TEXT,
            fb_pixel TEXT,
            tiktok_pixel TEXT,
            snapchat_pixel TEXT,
            twitter_pixel TEXT,
            pinterest_pixel TEXT,
            custom_head TEXT,
            custom_body TEXT
          )
        \`),
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS email_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT UNIQUE,
            subject TEXT,
            body TEXT,
            is_active INTEGER DEFAULT 1
          )
        \`),
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            source TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        \`),
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS clean_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            site_title TEXT NOT NULL,
            site_description TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            footer_text TEXT NOT NULL,
            logo_url TEXT,
            favicon_url TEXT,
            primary_color TEXT DEFAULT '#3b82f6'
          )
        \`),
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS settings_media_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            r2_key TEXT NOT NULL UNIQUE,
            size_bytes INTEGER DEFAULT 0,
            content_type TEXT DEFAULT 'video/mp4',
            uploaded_at INTEGER NOT NULL
          )
        \`),
        // API Key usage logs table`;

if (!dbCode.includes('CREATE TABLE IF NOT EXISTS payment_gateways')) {
  dbCode = dbCode.replace(searchDB, replaceDB);
  fs.writeFileSync('src/config/db.js', dbCode, 'utf8');
  console.log('db.js updated.');
}

// 2. Controllers
const files = [
  'src/controllers/admin.js',
  'src/controllers/analytics.js',
  'src/controllers/backup.js',
  'src/controllers/email.js',
  'src/controllers/payment-universal.js',
  'src/controllers/settings-clean.js',
  'src/controllers/settings-media.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Regex for general ensureTables with try...catch
  const regex1 = /async function ensure[A-Za-z0-9_]+\(env\)\s*\{[\s\S]*?(?:console\.error\([^)]+\);\s*\}\s*\}|\}\s*catch\s*\([^\)]+\)\s*\{\s*\})/g;
  content = content.replace(regex1, '');
  
  // Regex specifically for ensureMediaTable loop in settings-media
  const regex2 = /async function ensureMediaTable\(env\)\s*\{[\s\S]*?catch\s*\(_\)\s*\{\s*\/\/\s*Column.*?\s*\}\s*\}\s*\}/g;
  content = content.replace(regex2, '');

  // Regex specifically for ensurePaymentGatewaysTable loop in admin.js
  const regex3 = /async function ensurePaymentGatewaysTable\(env\)\s*\{[\s\S]*?catch\s*\(_\)\s*\{\s*\/\/\s*Column.*?\s*\}\s*\}\s*\}/g;
  content = content.replace(regex3, '');

  // Regex for boolean flags like `let tableEnsured = false;`
  content = content.replace(/let\s+[a-zA-Z0-9_]+(?:Table|Tables)?Ensured\s*=\s*false;\n?/g, '');

  // Regex for calls `await ensureSomethingTable(env);`
  content = content.replace(/\s*await\s+ensure[a-zA-Z0-9_]+(?:Table|Tables)?\(env\);/g, '');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log(file + ' updated.');
});
