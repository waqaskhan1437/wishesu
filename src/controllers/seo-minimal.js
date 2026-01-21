/**
 * Minimal SEO Controller 2025 - Google Requirements Only
 * Based on official Google documentation + 2025 best practices
 * 
 * Essential Requirements:
 * 1. Title & Description tags (MUST)
 * 2. XML Sitemap (MUST - Google requirement)
 * 3. Robots.txt (MUST - crawl control)
 * 4. Open Graph (RECOMMENDED - social sharing)
 */

import { json } from '../utils/response.js';

// Simple cache
let cache = null;
let cacheTime = 0;
const TTL = 60000;

const DEFAULT = {
  site_url: '',
  site_title: '',
  site_description: '',
  sitemap_enabled: 1,
  robots_enabled: 1,
  og_enabled: 0,
  og_image: ''
};

/**
 * Ensure table
 */
async function ensureTable(env) {
  if (!env.DB) return;
  
  try {
    await env.DB.prepare(`
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
    `).run();
  } catch (e) {
    console.error('SEO table error:', e);
  }
}

/**
 * Get settings with cache
 */
async function getSettings(env) {
  const now = Date.now();
  if (cache && (now - cacheTime) < TTL) return cache;

  await ensureTable(env);

  try {
    const row = await env.DB.prepare('SELECT * FROM seo_minimal WHERE id = 1').first();
    cache = row || DEFAULT;
    cacheTime = now;
    return cache;
  } catch (e) {
    return DEFAULT;
  }
}

/**
 * API: Get
 */
export async function getMinimalSEOSettings(env) {
  try {
    const settings = await getSettings(env);
    return json({ success: true, settings });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * API: Save
 */
export async function saveMinimalSEOSettings(env, body) {
  try {
    await ensureTable(env);

    const s = {
      site_url: (body.site_url || '').trim(),
      site_title: (body.site_title || '').trim(),
      site_description: (body.site_description || '').trim().substring(0, 160),
      sitemap_enabled: body.sitemap_enabled ? 1 : 0,
      robots_enabled: body.robots_enabled ? 1 : 0,
      og_enabled: body.og_enabled ? 1 : 0,
      og_image: (body.og_image || '').trim()
    };

    // Validation
    if (!s.site_url || !s.site_title || !s.site_description) {
      return json({ error: 'Site URL, Title, and Description are required' }, 400);
    }

    await env.DB.prepare(`
      INSERT OR REPLACE INTO seo_minimal 
      (id, site_url, site_title, site_description, sitemap_enabled, robots_enabled, og_enabled, og_image)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      s.site_url,
      s.site_title,
      s.site_description,
      s.sitemap_enabled,
      s.robots_enabled,
      s.og_enabled,
      s.og_image
    ).run();

    cache = null; // Clear cache

    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * Generate minimal robots.txt (Google 2025 standards)
 */
export async function buildMinimalRobotsTxt(env, req) {
  const s = await getSettings(env);
  
  if (!s.robots_enabled) {
    return 'User-agent: *\nAllow: /';
  }

  const url = new URL(req.url);
  const sitemap = s.site_url || url.origin;

  return `# Robots.txt - Auto-generated
User-agent: *

# Block sensitive areas
Disallow: /admin/
Disallow: /api/
Disallow: /buyer-order
Disallow: /order-detail
Disallow: /order-success
Disallow: /success

# Sitemap
Sitemap: ${sitemap}/sitemap.xml
`.trim();
}

/**
 * Generate minimal sitemap.xml (Google 2025 requirements)
 * Max 50,000 URLs, UTF-8 encoded, canonical URLs only
 */
export async function buildMinimalSitemapXml(env, req) {
  const s = await getSettings(env);
  
  if (!s.sitemap_enabled) {
    return {
      body: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      contentType: 'application/xml'
    };
  }

  const url = new URL(req.url);
  const base = s.site_url || url.origin;
  const urls = [];

  // Homepage (priority 1.0)
  urls.push({
    loc: base,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: 1.0
  });

  // Products (max 10,000)
  try {
    const products = await env.DB.prepare(
      'SELECT id, slug FROM products WHERE status = ? ORDER BY id DESC LIMIT 10000'
    ).bind('active').all();
    
    for (const p of products.results || []) {
      urls.push({
        loc: `${base}/product-${p.id}/${p.slug || p.id}`,
        changefreq: 'weekly',
        priority: 0.8
      });
    }
  } catch (e) {}

  // Blog posts (max 10,000)
  try {
    const blogs = await env.DB.prepare(
      'SELECT slug FROM blogs WHERE status = ? ORDER BY created_at DESC LIMIT 10000'
    ).bind('published').all();
    
    for (const b of blogs.results || []) {
      urls.push({
        loc: `${base}/blog/${b.slug}`,
        changefreq: 'weekly',
        priority: 0.7
      });
    }
  } catch (e) {}

  // Core pages
  urls.push(
    { loc: `${base}/products`, changefreq: 'daily', priority: 0.9 },
    { loc: `${base}/blog`, changefreq: 'daily', priority: 0.8 }
  );

  // Build XML (UTF-8, Google format)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.slice(0, 50000).map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return {
    body: xml,
    contentType: 'application/xml'
  };
}

/**
 * Get meta tags for HTML injection
 */
export async function getMetaTags(env, pageType, pageData = {}) {
  const s = await getSettings(env);
  
  const title = pageData.title || s.site_title || 'Website';
  const description = pageData.description || s.site_description || '';
  const url = pageData.url || s.site_url || '';
  const image = pageData.image || s.og_image || '';

  let tags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="index, follow">
  `;

  // Open Graph (if enabled)
  if (s.og_enabled) {
    tags += `
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="website">
    ${image ? `<meta property="og:image" content="${image}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    ${image ? `<meta name="twitter:image" content="${image}">` : ''}
    `;
  }

  return tags.trim();
}
