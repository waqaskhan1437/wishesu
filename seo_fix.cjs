const fs = require('fs');

// 1. Update db.js
let dbCode = fs.readFileSync('src/config/db.js', 'utf8');
const searchDB = '        // SEO Visibility tables';
const replaceDB = `        // SEO Minimal settings table
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS seo_minimal (
            id INTEGER PRIMARY KEY DEFAULT 1,
            site_url TEXT NOT NULL,
            site_title TEXT NOT NULL,
            site_description TEXT NOT NULL,
            sitemap_enabled INTEGER DEFAULT 1,
            robots_enabled INTEGER DEFAULT 1,
            og_enabled INTEGER DEFAULT 0,
            og_image TEXT
          )
        \`),
        // SEO Visibility tables`;

if (!dbCode.includes('CREATE TABLE IF NOT EXISTS seo_minimal')) {
  dbCode = dbCode.replace(searchDB, replaceDB);
  fs.writeFileSync('src/config/db.js', dbCode, 'utf8');
  console.log('db.js updated with seo_minimal.');
}

// 2. Update seo-minimal.js
let seoCode = fs.readFileSync('src/controllers/seo-minimal.js', 'utf8');

// remove ensureTable
const rx = /async function ensureTable\(env\)\s*\{[\s\S]*?seoTableEnsured = true;\s*\}\s*catch\s*\(e\)\s*\{\s*console\.error\('.*?',\s*e\);\s*\}\s*\}/;
seoCode = seoCode.replace(rx, '');

// remove let seoTableEnsured = false; (if it exists)
seoCode = seoCode.replace(/let seoTableEnsured = false;/g, '');

// remove await ensureTable(env);
seoCode = seoCode.replace(/\s*await ensureTable\(env\);/g, '');

fs.writeFileSync('src/controllers/seo-minimal.js', seoCode, 'utf8');
console.log('seo-minimal.js updated.');
