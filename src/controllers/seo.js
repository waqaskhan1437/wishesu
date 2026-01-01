/**
 * SEO Controller - Admin SEO settings + robots/sitemap + meta injection
 * Keeps SEO controls in DB so indexing can be managed from Admin panel.
 */

import { json } from '../utils/response.js';

const DEFAULT_SETTINGS = {
  id: 1,
  base_url: '',
  sitemap_enabled: 1,
  sitemap_include_pages: 1,
  sitemap_include_products: 1,
  sitemap_max_urls: 45000,
  product_url_template: '/product-{id}/{slug}',
  force_noindex_on_workers_dev: 1,
  robots_enabled: 1,
  robots_extra: ''
};

// Seed rules only once if empty (keeps sensitive pages safe by default but still editable)
const DEFAULT_PAGE_RULES = [
  // Main pages - clean URLs
  { path: '/', allow_index: 1, allow_follow: 1, include_in_sitemap: 1, canonical_override: '', changefreq: 'daily', priority: 1.0 },
  { path: '/products', allow_index: 1, allow_follow: 1, include_in_sitemap: 1, canonical_override: '', changefreq: 'daily', priority: 0.8 },
  { path: '/blog', allow_index: 1, allow_follow: 1, include_in_sitemap: 1, canonical_override: '', changefreq: 'daily', priority: 0.7 },
  { path: '/forum', allow_index: 1, allow_follow: 1, include_in_sitemap: 1, canonical_override: '', changefreq: 'daily', priority: 0.6 },

  // Sensitive/system pages - noindex
  { path: '/buyer-order', allow_index: 0, allow_follow: 0, include_in_sitemap: 0, canonical_override: '', changefreq: 'never', priority: 0.0 },
  { path: '/order-detail', allow_index: 0, allow_follow: 0, include_in_sitemap: 0, canonical_override: '', changefreq: 'never', priority: 0.0 },
  { path: '/order-success', allow_index: 0, allow_follow: 0, include_in_sitemap: 0, canonical_override: '', changefreq: 'never', priority: 0.0 },
  { path: '/success', allow_index: 0, allow_follow: 0, include_in_sitemap: 0, canonical_override: '', changefreq: 'never', priority: 0.0 }
];

function normalizePath(p) {
  if (!p) return '/';
  let out = String(p).trim();
  if (!out.startsWith('/')) out = '/' + out;
  out = out.replace(/\/+/g, '/');
  return out;
}

function safeNumber(n, fallback) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

async function ensureSeoTables(env) {
  if (!env?.DB) return;
  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS seo_settings (
        id INTEGER PRIMARY KEY,
        base_url TEXT,
        sitemap_enabled INTEGER DEFAULT 1,
        sitemap_include_pages INTEGER DEFAULT 1,
        sitemap_include_products INTEGER DEFAULT 1,
        sitemap_max_urls INTEGER DEFAULT 45000,
        product_url_template TEXT DEFAULT '/product-{id}/{slug}',
        force_noindex_on_workers_dev INTEGER DEFAULT 1,
        robots_enabled INTEGER DEFAULT 1,
        robots_extra TEXT DEFAULT ''
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS seo_page_rules (
        path TEXT PRIMARY KEY,
        allow_index INTEGER DEFAULT 1,
        allow_follow INTEGER DEFAULT 1,
        include_in_sitemap INTEGER DEFAULT 1,
        canonical_override TEXT,
        changefreq TEXT DEFAULT 'weekly',
        priority REAL DEFAULT 0.6,
        updated_at TEXT
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS seo_product_rules (
        product_id TEXT PRIMARY KEY,
        allow_index INTEGER DEFAULT 1,
        allow_follow INTEGER DEFAULT 1,
        include_in_sitemap INTEGER DEFAULT 1,
        canonical_override TEXT,
        changefreq TEXT DEFAULT 'weekly',
        priority REAL DEFAULT 0.7,
        updated_at TEXT
      )
    `)
  ]);
}

async function ensureSettingsRow(env) {
  await ensureSeoTables(env);
  const row = await env.DB.prepare('SELECT * FROM seo_settings WHERE id = 1').first();
  if (row) return row;

  await env.DB.prepare(`
    INSERT INTO seo_settings
      (id, base_url, sitemap_enabled, sitemap_include_pages, sitemap_include_products, sitemap_max_urls,
       product_url_template, force_noindex_on_workers_dev, robots_enabled, robots_extra)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    DEFAULT_SETTINGS.base_url,
    DEFAULT_SETTINGS.sitemap_enabled,
    DEFAULT_SETTINGS.sitemap_include_pages,
    DEFAULT_SETTINGS.sitemap_include_products,
    DEFAULT_SETTINGS.sitemap_max_urls,
    DEFAULT_SETTINGS.product_url_template,
    DEFAULT_SETTINGS.force_noindex_on_workers_dev,
    DEFAULT_SETTINGS.robots_enabled,
    DEFAULT_SETTINGS.robots_extra
  ).run();

  return (await env.DB.prepare('SELECT * FROM seo_settings WHERE id = 1').first()) || { ...DEFAULT_SETTINGS };
}

async function seedDefaultRulesIfEmpty(env) {
  await ensureSeoTables(env);
  const countRow = await env.DB.prepare('SELECT COUNT(1) as c FROM seo_page_rules').first();
  const c = countRow?.c ? Number(countRow.c) : 0;
  if (c > 0) return;

  const now = new Date().toISOString();
  const batch = DEFAULT_PAGE_RULES.map((r) =>
    env.DB.prepare(`
      INSERT INTO seo_page_rules
        (path, allow_index, allow_follow, include_in_sitemap, canonical_override, changefreq, priority, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO NOTHING
    `).bind(
      normalizePath(r.path),
      r.allow_index ? 1 : 0,
      r.allow_follow ? 1 : 0,
      r.include_in_sitemap ? 1 : 0,
      r.canonical_override || null,
      r.changefreq || 'weekly',
      safeNumber(r.priority, 0.6),
      now
    )
  );

  await env.DB.batch(batch);
}

/**
 * Get SEO settings (computed flags included)
 */
export async function getSeoSettings(env, request) {
  if (!env?.DB) return { ...DEFAULT_SETTINGS, __force_noindex: 0 };
  const row = await ensureSettingsRow(env);
  await seedDefaultRulesIfEmpty(env);

  const url = new URL(request.url);
  const host = url.hostname || '';
  const forceNoindex = row.force_noindex_on_workers_dev && host.endsWith('workers.dev');

  return {
    ...DEFAULT_SETTINGS,
    ...row,
    __force_noindex: forceNoindex ? 1 : 0
  };
}

/**
 * Admin API: GET/POST settings
 */
export async function adminGetSeoSettings(env, request) {
  const s = await getSeoSettings(env, request);
  return json(s);
}

export async function adminSaveSeoSettings(env, request) {
  const body = await request.json();
  await ensureSeoTables(env);

  const baseUrl = (body.base_url || '').trim();
  const templ = (body.product_url_template || DEFAULT_SETTINGS.product_url_template).trim() || DEFAULT_SETTINGS.product_url_template;

  await env.DB.prepare(`
    UPDATE seo_settings SET
      base_url=?,
      sitemap_enabled=?,
      sitemap_include_pages=?,
      sitemap_include_products=?,
      sitemap_max_urls=?,
      product_url_template=?,
      force_noindex_on_workers_dev=?,
      robots_enabled=?,
      robots_extra=?
    WHERE id=1
  `).bind(
    baseUrl || null,
    body.sitemap_enabled ? 1 : 0,
    body.sitemap_include_pages ? 1 : 0,
    body.sitemap_include_products ? 1 : 0,
    Math.min(Math.max(parseInt(body.sitemap_max_urls || DEFAULT_SETTINGS.sitemap_max_urls, 10), 1000), 50000),
    templ,
    body.force_noindex_on_workers_dev ? 1 : 0,
    body.robots_enabled ? 1 : 0,
    (body.robots_extra || '')
  ).run();

  return json({ success: true });
}

/**
 * Admin API: Page rules list/upsert/delete
 */
export async function adminListPageRules(env) {
  await ensureSeoTables(env);
  const rows = await env.DB.prepare('SELECT * FROM seo_page_rules ORDER BY path ASC').all();
  return json(rows.results || []);
}

export async function adminUpsertPageRules(env, request) {
  await ensureSeoTables(env);
  const body = await request.json();
  const pages = Array.isArray(body.pages) ? body.pages : [];
  const now = new Date().toISOString();

  const batch = [];
  for (const p of pages.slice(0, 800)) {
    const path = normalizePath(p.path);
    if (!path || !path.startsWith('/')) continue;

    const allowIndex = p.allow_index !== 0 ? 1 : 0;
    const allowFollow = p.allow_follow !== 0 ? 1 : 0;
    const inSitemap = p.include_in_sitemap !== 0 ? 1 : 0;

    const changefreq = (p.changefreq || 'weekly').toLowerCase();
    const priority = safeNumber(p.priority, 0.6);

    batch.push(
      env.DB.prepare(`
        INSERT INTO seo_page_rules
          (path, allow_index, allow_follow, include_in_sitemap, canonical_override, changefreq, priority, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          allow_index=excluded.allow_index,
          allow_follow=excluded.allow_follow,
          include_in_sitemap=excluded.include_in_sitemap,
          canonical_override=excluded.canonical_override,
          changefreq=excluded.changefreq,
          priority=excluded.priority,
          updated_at=excluded.updated_at
      `).bind(
        path,
        allowIndex,
        allowFollow,
        inSitemap,
        (p.canonical_override || null),
        changefreq,
        priority,
        now
      )
    );
  }

  if (batch.length) await env.DB.batch(batch);
  return json({ success: true });
}

export async function adminDeletePageRule(env, request) {
  await ensureSeoTables(env);
  const url = new URL(request.url);
  const path = normalizePath(url.searchParams.get('path') || '');
  if (!path) return json({ error: 'Missing path' }, 400);

  await env.DB.prepare('DELETE FROM seo_page_rules WHERE path=?').bind(path).run();
  return json({ success: true });
}

/**
 * Admin API: Products list (with current rules) + patch rule
 */
export async function adminListProductsWithRules(env, request) {
  await ensureSeoTables(env);
  const url = new URL(request.url);
  const search = (url.searchParams.get('search') || '').trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '60', 10), 1), 120);

  // products table has: id, title, slug, status
  let prodRows = [];
  if (search) {
    const rs = await env.DB.prepare(
      `SELECT id, title, slug, status FROM products
       WHERE title LIKE ? OR slug LIKE ?
       ORDER BY id DESC LIMIT ?`
    ).bind(`%${search}%`, `%${search}%`, limit).all();
    prodRows = rs.results || [];
  } else {
    const rs = await env.DB.prepare(
      `SELECT id, title, slug, status FROM products ORDER BY id DESC LIMIT ?`
    ).bind(limit).all();
    prodRows = rs.results || [];
  }

  const ids = prodRows.map((p) => String(p.id));
  const rulesMap = {};
  if (ids.length) {
    const inQ = ids.map(() => '?').join(',');
    const rr = await env.DB.prepare(`SELECT * FROM seo_product_rules WHERE product_id IN (${inQ})`).bind(...ids).all();
    (rr.results || []).forEach((r) => { rulesMap[String(r.product_id)] = r; });
  }

  const out = prodRows.map((p) => {
    const r = rulesMap[String(p.id)] || {};
    return {
      id: String(p.id),
      title: p.title || '',
      slug: p.slug || '',
      status: p.status || 'active',
      rule_allow_index: (r.allow_index ?? 1),
      rule_allow_follow: (r.allow_follow ?? 1),
      rule_include_in_sitemap: (r.include_in_sitemap ?? 1),
      rule_canonical_override: (r.canonical_override ?? '')
    };
  });

  return json(out);
}

export async function adminPatchProductRule(env, request) {
  await ensureSeoTables(env);
  const body = await request.json();
  const productId = body.product_id ? String(body.product_id) : '';
  const patch = body.patch || {};
  if (!productId) return json({ error: 'Missing product_id' }, 400);

  const existing = await env.DB.prepare('SELECT * FROM seo_product_rules WHERE product_id=?').bind(productId).first();
  const now = new Date().toISOString();

  const allowIndex = (patch.allow_index ?? existing?.allow_index ?? 1) !== 0 ? 1 : 0;
  const allowFollow = (patch.allow_follow ?? existing?.allow_follow ?? 1) !== 0 ? 1 : 0;
  const inSitemap = (patch.include_in_sitemap ?? existing?.include_in_sitemap ?? 1) !== 0 ? 1 : 0;
  const canonical = (patch.canonical_override ?? existing?.canonical_override ?? null);

  await env.DB.prepare(`
    INSERT INTO seo_product_rules
      (product_id, allow_index, allow_follow, include_in_sitemap, canonical_override, changefreq, priority, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(product_id) DO UPDATE SET
      allow_index=excluded.allow_index,
      allow_follow=excluded.allow_follow,
      include_in_sitemap=excluded.include_in_sitemap,
      canonical_override=excluded.canonical_override,
      updated_at=excluded.updated_at
  `).bind(
    productId,
    allowIndex,
    allowFollow,
    inSitemap,
    canonical || null,
    existing?.changefreq || 'weekly',
    typeof existing?.priority === 'number' ? existing.priority : 0.7,
    now
  ).run();

  return json({ success: true });
}

async function getPageRule(env, path) {
  await ensureSeoTables(env);
  const row = await env.DB.prepare('SELECT * FROM seo_page_rules WHERE path = ?').bind(normalizePath(path)).first();
  return row || null;
}

async function getProductRule(env, productId) {
  await ensureSeoTables(env);
  if (!productId) return null;
  const row = await env.DB.prepare('SELECT * FROM seo_product_rules WHERE product_id = ?').bind(String(productId)).first();
  return row || null;
}

function stripHeadTag(html, regex) {
  try {
    return html.replace(regex, '');
  } catch (e) {
    return html;
  }
}

export function applySeoToHtml(html, robots, canonicalUrl) {
  if (!html || typeof html !== 'string') return html;

  let out = html;

  // remove existing robots meta and canonical link (keeps things predictable)
  out = stripHeadTag(out, /<meta\s+name=["']robots["'][^>]*>\s*/ig);
  out = stripHeadTag(out, /<link\s+rel=["']canonical["'][^>]*>\s*/ig);

  const inject = [
    `<meta name="robots" content="${escapeAttr(robots)}">`,
    canonicalUrl ? `<link rel="canonical" href="${escapeAttr(canonicalUrl)}">` : ''
  ].filter(Boolean).join('\n');

  if (out.includes('</head>')) {
    out = out.replace('</head>', inject + '\n</head>');
  }
  return out;
}

export function computeRobotsValue(allowIndex, allowFollow) {
  const idx = allowIndex ? 'index' : 'noindex';
  const fol = allowFollow ? 'follow' : 'nofollow';
  return `${idx},${fol}`;
}

function canonicalFromTemplate(baseUrl, template, product) {
  const id = encodeURIComponent(String(product.id));
  const slug = encodeURIComponent(String(product.slug || ''));
  const path = (template || DEFAULT_SETTINGS.product_url_template)
    .replaceAll('{id}', id)
    .replaceAll('{slug}', slug)
    .replaceAll('{ID}', id)
    .replaceAll('{SLUG}', slug)
    .replaceAll('{Id}', id)
    .replaceAll('{Slug}', slug);
  return baseUrl + (path.startsWith('/') ? path : '/' + path);
}

export async function getSeoForRequest(env, request, context) {
  const settings = await getSeoSettings(env, request);
  const baseUrl = (settings.base_url || new URL(request.url).origin).replace(/\/+$/, '');

  // Staging force noindex
  if (settings.__force_noindex) {
    return {
      robots: 'noindex,nofollow',
      canonical: baseUrl + normalizePath(new URL(request.url).pathname)
    };
  }

  if (!env?.DB) {
    return { robots: 'index,follow', canonical: baseUrl + normalizePath(new URL(request.url).pathname) };
  }

  if (context?.product) {
    const product = context.product;
    const rule = await getProductRule(env, String(product.id));
    const allowIndex = rule ? (rule.allow_index !== 0) : true;
    const allowFollow = rule ? (rule.allow_follow !== 0) : true;

    const canonical = (rule?.canonical_override || product.seo_canonical || '').trim()
      ? String(rule?.canonical_override || product.seo_canonical).trim()
      : canonicalFromTemplate(baseUrl, settings.product_url_template, product);

    return {
      robots: computeRobotsValue(allowIndex, allowFollow),
      canonical
    };
  }

  // Path rule
  const path = normalizePath(context?.path || new URL(request.url).pathname);
  const rule = await getPageRule(env, path);
  const allowIndex = rule ? (rule.allow_index !== 0) : true;
  const allowFollow = rule ? (rule.allow_follow !== 0) : true;
  const canonical = (rule?.canonical_override || '').trim()
    ? String(rule.canonical_override).trim()
    : baseUrl + path;

  return {
    robots: computeRobotsValue(allowIndex, allowFollow),
    canonical
  };
}

export async function buildRobotsTxt(env, request) {
  const s = await getSeoSettings(env, request);
  const baseUrl = (s.base_url || new URL(request.url).origin).replace(/\/+$/, '');

  if (!s.robots_enabled) {
    return `User-agent: *\nDisallow:\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
  }

  let txt = '';
  txt += 'User-agent: *\n';

  if (s.__force_noindex) {
    txt += 'Disallow: /\n';
  } else {
    // Default safe disallows
    const disallows = [
      '/admin/',
      '/api/',
      '/buyer-order',
      '/buyer-order.html',
      '/order-detail',
      '/order-detail.html',
      '/order-success.html',
      '/success.html'
    ];
    for (const d of disallows) txt += `Disallow: ${d}\n`;
  }

  if (s.robots_extra && String(s.robots_extra).trim()) {
    txt += '\n' + String(s.robots_extra).trim() + '\n';
  }

  txt += `\nSitemap: ${baseUrl}/sitemap.xml\n`;
  return txt;
}

function escapeXml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapeAttr(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function urlsetXml(urls) {
  let out = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  out += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const u of urls) {
    out += `  <url>\n`;
    out += `    <loc>${escapeXml(u.loc)}</loc>\n`;
    if (u.lastmod) out += `    <lastmod>${escapeXml(u.lastmod)}</lastmod>\n`;
    if (u.changefreq) out += `    <changefreq>${escapeXml(u.changefreq)}</changefreq>\n`;
    if (typeof u.priority === 'number') out += `    <priority>${u.priority.toFixed(1)}</priority>\n`;
    out += `  </url>\n`;
  }
  out += `</urlset>`;
  return out;
}

function sitemapIndexXml(baseUrl, count) {
  const now = new Date().toISOString();
  let out = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  out += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (let i = 1; i <= count; i++) {
    out += `  <sitemap>\n`;
    out += `    <loc>${escapeXml(baseUrl + `/sitemap-${i}.xml`)}</loc>\n`;
    out += `    <lastmod>${escapeXml(now)}</lastmod>\n`;
    out += `  </sitemap>\n`;
  }
  out += `</sitemapindex>`;
  return out;
}

function toIsoDate(d) {
  try {
    return new Date(d).toISOString();
  } catch (e) {
    return null;
  }
}

export async function buildSitemapXml(env, request, partIndex = null) {
  const s = await getSeoSettings(env, request);
  const baseUrl = (s.base_url || new URL(request.url).origin).replace(/\/+$/, '');

  if (!s.sitemap_enabled) return { status: 404, body: 'Sitemap disabled', contentType: 'text/plain' };

  // Staging: return empty urlset (safe)
  if (s.__force_noindex) {
    return { status: 200, body: urlsetXml([]), contentType: 'application/xml' };
  }

  await ensureSeoTables(env);

  const pageRulesRes = await env.DB.prepare('SELECT * FROM seo_page_rules').all();
  const pageRuleMap = {};
  (pageRulesRes.results || []).forEach((r) => { pageRuleMap[normalizePath(r.path)] = r; });
  const getPR = (p) => pageRuleMap[normalizePath(p)] || null;

  const urls = [];

  // Pages: include default main routes + published custom pages from DB
  if (s.sitemap_include_pages) {
    // include default routes only if not blocked by rules - use clean URLs
    const defaultPaths = ['/', '/products', '/blog', '/forum'];
    for (const p of defaultPaths) {
      const rule = getPR(p) || getPR(p + '/'); // Check both clean and trailing slash rules
      const allowIndex = rule ? (rule.allow_index !== 0) : true;
      const inSitemap = rule ? (rule.include_in_sitemap !== 0) : true;
      if (allowIndex && inSitemap) {
        const loc = (rule?.canonical_override && String(rule.canonical_override).trim())
          ? String(rule.canonical_override).trim()
          : baseUrl + p;
        urls.push({ loc, lastmod: null, changefreq: rule?.changefreq || 'daily', priority: typeof rule?.priority === 'number' ? rule.priority : 0.7 });
      }
    }

    // custom pages from pages table - use clean URLs (no .html)
    const pagesRes = await env.DB.prepare(
      `SELECT slug, updated_at, created_at, status FROM pages WHERE status = 'published'`
    ).all();
    const pageRows = pagesRes.results || [];
    for (const row of pageRows) {
      const slug = String(row.slug || '').trim();
      if (!slug) continue;
      // avoid duplicates: default pages are handled above
      if (slug === 'index' || slug === 'home') continue;

      // Use clean URL without .html extension
      const path = normalizePath(`/${slug}`);
      const rule = getPR(path) || getPR(`/${slug}.html`); // Check both clean and .html rules
      const allowIndex = rule ? (rule.allow_index !== 0) : true;
      const inSitemap = rule ? (rule.include_in_sitemap !== 0) : true;
      if (!allowIndex || !inSitemap) continue;

      const loc = (rule?.canonical_override && String(rule.canonical_override).trim())
        ? String(rule.canonical_override).trim()
        : baseUrl + path;

      const lastmod = row.updated_at ? toIsoDate(row.updated_at) : (row.created_at ? toIsoDate(row.created_at) : null);

      urls.push({
        loc,
        lastmod,
        changefreq: rule?.changefreq || 'weekly',
        priority: typeof rule?.priority === 'number' ? rule.priority : 0.6
      });
    }
  }

  // Products: include active products
  if (s.sitemap_include_products) {
    const prodRes = await env.DB.prepare(
      `SELECT id, title, slug, status, seo_canonical FROM products WHERE status = 'active' ORDER BY id DESC`
    ).all();
    const prodRows = prodRes.results || [];

    // rules: load all? could be big; load in chunks if needed
    const rulesRes = await env.DB.prepare('SELECT * FROM seo_product_rules').all();
    const rulesMap = {};
    (rulesRes.results || []).forEach((r) => { rulesMap[String(r.product_id)] = r; });

    for (const p of prodRows) {
      const id = String(p.id);
      const rule = rulesMap[id];
      const allowIndex = rule ? (rule.allow_index !== 0) : true;
      const inSitemap = rule ? (rule.include_in_sitemap !== 0) : true;
      if (!allowIndex || !inSitemap) continue;

      // ensure slug exists
      const slug = String(p.slug || '').trim();
      const product = { id, slug, seo_canonical: p.seo_canonical || '' };

      const loc = (rule?.canonical_override && String(rule.canonical_override).trim())
        ? String(rule.canonical_override).trim()
        : ((product.seo_canonical || '').trim()
            ? String(product.seo_canonical).trim()
            : canonicalFromTemplate(baseUrl, s.product_url_template, product));

      urls.push({
        loc,
        lastmod: null,
        changefreq: rule?.changefreq || 'weekly',
        priority: typeof rule?.priority === 'number' ? rule.priority : 0.7
      });
    }
  }

  const maxUrls = Math.min(Math.max(parseInt(s.sitemap_max_urls || DEFAULT_SETTINGS.sitemap_max_urls, 10), 1000), 50000);

  if (partIndex && Number.isFinite(Number(partIndex))) {
    const idx = Math.max(1, parseInt(partIndex, 10));
    const start = (idx - 1) * maxUrls;
    const slice = urls.slice(start, start + maxUrls);
    return { status: 200, body: urlsetXml(slice), contentType: 'application/xml' };
  }

  if (urls.length > maxUrls) {
    const parts = Math.ceil(urls.length / maxUrls);
    return { status: 200, body: sitemapIndexXml(baseUrl, parts), contentType: 'application/xml' };
  }

  return { status: 200, body: urlsetXml(urls), contentType: 'application/xml' };
}
