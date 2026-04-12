const fs = require('fs');

let dbCode = fs.readFileSync('src/config/db.js', 'utf8');

const searchDB = '        // API Key usage logs table';
const replaceDB = `        // SEO Visibility tables
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS noindex_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url_pattern TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        \`),
        env.DB.prepare(\`
          CREATE TABLE IF NOT EXISTS index_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url_pattern TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        \`),
        // API Key usage logs table`;

if (!dbCode.includes('CREATE TABLE IF NOT EXISTS noindex_pages')) {
  dbCode = dbCode.replace(searchDB, replaceDB);
  fs.writeFileSync('src/config/db.js', dbCode, 'utf8');
  console.log('db.js updated.');
}

let noindexCode = fs.readFileSync('src/controllers/noindex.js', 'utf8');

// remove ensureTables
const rx = /async function ensureTables\(env\)\s*\{[\s\S]*?tablesEnsured = true;\s*\}\s*catch\s*\(e\)\s*\{\s*console\.error\('.*?',\s*e\);\s*\}\s*\}/;
noindexCode = noindexCode.replace(rx, '');

// remove let tablesEnsured = false;
noindexCode = noindexCode.replace('let tablesEnsured = false;', '');

// update getRulePatterns
const rx2 = /async function getRulePatterns\(env\)\s*\{[\s\S]*?return EMPTY_RULES;\s*\n\s*\}/;
const newGetRules = `async function getRulePatterns(env) {
  const now = Date.now();
  if (rulesCache && (now - cacheTime) < 60000) return rulesCache;

  const cacheKey = 'api_cache:seo_rules';
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(cacheKey, 'json');
      if (cached && cached.noindex) {
        rulesCache = cached;
        cacheTime = now;
        return rulesCache;
      }
    } catch(e) {}
  }

  try {
    const [noindexResult, indexResult] = await Promise.all([
      env.DB.prepare('SELECT url_pattern FROM noindex_pages ORDER BY id').all(),
      env.DB.prepare('SELECT url_pattern FROM index_pages ORDER BY id').all()
    ]);

    rulesCache = {
      noindex: (noindexResult.results || []).map((r) => r.url_pattern).filter(Boolean),
      index: (indexResult.results || []).map((r) => r.url_pattern).filter(Boolean)
    };
    cacheTime = now;
    
    if (env.PAGE_CACHE) {
      try { await env.PAGE_CACHE.put(cacheKey, JSON.stringify(rulesCache), { expirationTtl: 86400 * 7 }); } catch(e) {}
    }
    
    return rulesCache;
  } catch (_) {
    return EMPTY_RULES;
  }
}`;

noindexCode = noindexCode.replace(rx2, newGetRules);

// remove await ensureTables(env);
noindexCode = noindexCode.replace(/\s*await ensureTables\(env\);/g, '');

// update clearRulesCache
const oldClear = `function clearRulesCache() {
  rulesCache = null;
  cacheTime = 0;
}`;

const newClear = `function clearRulesCache(env) {
  rulesCache = null;
  cacheTime = 0;
  if (env?.PAGE_CACHE) {
    try { env.PAGE_CACHE.delete('api_cache:seo_rules'); } catch(e) {}
  }
}`;

noindexCode = noindexCode.replace(oldClear, newClear);
noindexCode = noindexCode.replace(/clearRulesCache\(\);/g, 'clearRulesCache(env);');

fs.writeFileSync('src/controllers/noindex.js', noindexCode, 'utf8');
console.log('noindex.js updated.');
