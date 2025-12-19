/**
 * Complete Cloudflare Worker - All Features
 * Version: Fixed with Number() conversions
 */

// The CORS and cache configuration for all API responses.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
};

// A build/version identifier that can be set at publish time via environment
// variables.  If none is provided Wrangler will default to the current
// timestamp.  This value is returned via the `/api/debug` endpoint and
// embedded in a custom header on all static asset responses.  Use this
// identifier to verify that new versions of your worker and static assets
// are being served.  You can set VERSION in wrangler.toml under [vars].
const VERSION = globalThis.VERSION || "15";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}


function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeQuickAction(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

async function enforceUserRateLimit(env, sessionId) {
  const row = await env.DB.prepare(
    `SELECT strftime('%s', created_at) AS ts
     FROM chat_messages
     WHERE session_id = ? AND role = 'user'
     ORDER BY id DESC
     LIMIT 1`
  ).bind(sessionId).first();

  if (!row?.ts) return;

  const lastTs = Number(row.ts) || 0;
  const nowTs = Math.floor(Date.now() / 1000);

  if (nowTs - lastTs < 1) {
    const err = new Error('Rate limited');
    err.status = 429;
    throw err;
  }
}

async function getLatestOrderForEmail(env, email) {
  const candidates = await env.DB.prepare(
    `SELECT order_id, status, archive_url, encrypted_data, created_at
     FROM orders
     ORDER BY datetime(created_at) DESC
     LIMIT 80`
  ).all();

  const list = candidates?.results || [];
  const target = String(email || '').trim().toLowerCase();
  if (!target) return null;

  for (const o of list) {
    try {
      if (!o.encrypted_data) continue;
      const data = JSON.parse(o.encrypted_data);
      const e = String(data.email || '').trim().toLowerCase();
      if (e && e === target) {
        return {
          order_id: o.order_id,
          status: o.status,
          trackLink: `/buyer-order.html?id=${encodeURIComponent(o.order_id)}`
        };
      }
    } catch {}
  }
  return null;
}


function getMimeTypeFromFilename(filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'm4v':
      return 'video/x-m4v';
    case 'mkv':
      return 'video/x-matroska';
    case 'avi':
      return 'video/x-msvideo';
    case 'wmv':
      return 'video/x-ms-wmv';
    case 'flv':
      return 'video/x-flv';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'zip':
      return 'application/zip';
    default:
      return '';
  }
}

function resolveContentType(req, filename) {
  const headerContentType = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (headerContentType && headerContentType !== 'application/octet-stream') {
    return headerContentType;
  }
  return getMimeTypeFromFilename(filename) || headerContentType || 'application/octet-stream';
}

function normalizeArchiveMetaValue(value) {
  return (value || '').toString().replace(/[\r\n\t]+/g, ' ').trim();
}

// ========================================
// SERVER-SIDE SCHEMA GENERATION FOR SEO
// ========================================
// These functions generate JSON-LD structured data server-side to prevent
// duplicate schema issues and improve SEO performance. Schemas are injected
// directly into HTML before it's sent to the client.

/**
 * Helper function to generate Offer object for Product schemas
 * @param {Object} product - Product data
 * @param {string} baseUrl - Site base URL
 * @returns {Object} Offer schema
 */
function generateOfferObject(product, baseUrl) {
  const price = parseFloat(product.sale_price || product.normal_price || 0);
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const priceValidUntil = date.toISOString().split('T')[0];
  
  // Check if product is digital (instant_delivery = 1 means digital/no shipping)
  const isDigital = product.instant_delivery === 1;

  const offer = {
    "@type": "Offer",
    "url": `${baseUrl}/product?id=${product.id}`,
    "priceCurrency": "USD",
    "price": price.toString(),
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition",
    "priceValidUntil": priceValidUntil,
    "seller": {
      "@type": "Organization",
      "name": "WishVideo"
    }
  };

  // Only add shipping details for physical products (non-digital)
  if (!isDigital) {
    offer.shippingDetails = {
      "@type": "OfferShippingDetails",
      "shippingDestination": [
        {
          "@type": "DefinedRegion",
          "addressCountry": "US"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "GB"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "CA"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "AU"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "DE"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "FR"
        }
      ],
      "shippingRate": {
        "@type": "MonetaryAmount",
        "currency": "USD",
        "value": "0"
      },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
          "@type": "QuantitativeValue",
          "minValue": 0,
          "maxValue": 1,
          "unitCode": "DAY"
        },
        "transitTime": {
          "@type": "QuantitativeValue",
          "minValue": 1,
          "maxValue": 3,
          "unitCode": "DAY"
        }
      }
    };
    
    offer.hasMerchantReturnPolicy = {
      "@type": "MerchantReturnPolicy",
      "applicableCountry": "US",
      "returnPolicyCategory": "MerchantReturnNotPermitted",
      "merchantReturnDays": 0
    };
  }

  return offer;
}

/**
 * Generate Product schema for individual product pages
 * @param {Object} product - Product data from database
 * @param {string} baseUrl - Site base URL
 * @param {Array} reviews - Individual reviews for this product
 * @returns {string} JSON-LD schema as string
 */
function generateProductSchema(product, baseUrl, reviews = []) {
  const sku = product.slug ? `WV-${product.id}-${product.slug.toUpperCase().replace(/-/g, '')}` : `WV-${product.id}`;

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "@id": `${baseUrl}/product?id=${product.id}`,
    "name": product.title,
    "description": product.seo_description || product.description || product.title,
    "sku": sku,
    "mpn": sku,
    "image": product.thumbnail_url ? [product.thumbnail_url] : [],
    "brand": {
      "@type": "Brand",
      "name": "WishVideo",
      "logo": `${baseUrl}/favicon.ico`
    },
    "manufacturer": {
      "@type": "Organization",
      "name": "WishVideo",
      "url": baseUrl
    },
    "category": "Digital Goods > Personalized Videos",
    "offers": generateOfferObject(product, baseUrl)
  };

   // Add aggregateRating (always present, even with 0 reviews for better Rich Results)
   schema.aggregateRating = {
     "@type": "AggregateRating",
     "ratingValue": parseFloat(product.rating_average) || 5.0,
     "reviewCount": Math.max(1, parseInt(product.review_count) || 1),
     "bestRating": 5,
     "worstRating": 1
   };

   // Add individual reviews (first 5 for Rich Results)
   if (reviews && reviews.length > 0) {
     const limitedReviews = reviews.slice(0, 5);
     schema.review = limitedReviews.map(review => ({
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": 5,
        "worstRating": 1
      },
      "author": {
        "@type": "Person",
        "name": review.author_name || "Customer"
      },
      "reviewBody": review.comment || "",
      "datePublished": review.created_at ? new Date(review.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }));
  }

  return JSON.stringify(schema);
}

/**
 * Generate ItemList schema for product collection pages
 * @param {Array} products - Array of product data
 * @param {string} baseUrl - Site base URL
 * @returns {string} JSON-LD schema as string
 */
function generateCollectionSchema(products, baseUrl) {
  if (!products || products.length === 0) {
    return '{}';
  }

  const itemListElement = products.map((product, index) => {
    const item = {
      "@type": "ListItem",
      "position": index + 1,
      "url": `${baseUrl}/product?id=${product.id}`,
      "item": {
        "@type": "Product",
        "@id": `${baseUrl}/product?id=${product.id}`,
        "name": product.title,
        "description": product.description || product.title,
        "image": product.thumbnail_url || `${baseUrl}/placeholder.jpg`,
        "brand": {
          "@type": "Brand",
          "name": "WishVideo"
        },
        "offers": generateOfferObject(product, baseUrl)
      }
    };

    // Add aggregateRating (always present for better Rich Results)
    item.item.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": parseFloat(product.rating_average) || 5.0,
      "reviewCount": Math.max(1, parseInt(product.review_count) || 1),
      "bestRating": 5,
      "worstRating": 1
    };

    return item;
  });

  const schema = {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    "itemListElement": itemListElement
  };

  return JSON.stringify(schema);
}

/**
 * Inject schema into HTML by replacing placeholder
 * @param {string} html - Original HTML content
 * @param {string} schemaId - ID of schema tag (product-schema or collection-schema)
 * @param {string} schemaJson - JSON-LD schema string
 * @returns {string} Modified HTML with schema injected
 */
function injectSchemaIntoHTML(html, schemaId, schemaJson) {
  // Replace empty schema placeholder with actual data
  const placeholder = `<script type="application/ld+json" id="${schemaId}">{}</script>`;
  const replacement = `<script type="application/ld+json" id="${schemaId}">${schemaJson}</script>`;
  return html.replace(placeholder, replacement);
}

let dbReady = false;

// Internal flag used to ensure the automatic cache purge check only runs
// once per worker instance.  Without this, every request would attempt to
// read from the database to determine if a purge is needed, which can
// unnecessarily slow down static asset delivery.  Once `maybePurgeCache`
// runs for the first time, this flag is set to true and subsequent calls
// will immediately return.
let purgeVersionChecked = false;

async function initDB(env) {
  if (dbReady || !env.DB) return;
  
  try {
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
    
    // Auto-migration: Add delivery columns if missing
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

    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
    
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE, title TEXT, content TEXT,
      meta_description TEXT, status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();

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

    
    // Chat tables
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

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_id
      ON chat_messages(session_id, id)
    `).run();

dbReady = true;
  } catch (e) {
    console.error('DB init error:', e);
  }
}

/*
 * Automatically purge Cloudflare's edge cache when a new version of the
 * worker is deployed.  On the first request of a new deployment, this
 * function checks a value in the settings table (`last_purge_version`). If
 * it differs from the current VERSION, the worker will call the Cloudflare
 * API to purge all cached assets for the configured zone.  This ensures
 * that outdated static assets are never served from the edge when a new
 * version is published.  To enable this feature, define `CF_ZONE_ID` and
 * `CF_API_TOKEN` in your wrangler.toml or via secrets.  The purge will
 * silently skip if those variables are missing.
 */
async function maybePurgeCache(env) {
  // Only purge if we have the necessary bindings and tokens
  if (!env || !env.DB || !env.CF_ZONE_ID || !env.CF_API_TOKEN) return;
  // If we've already performed this check during the lifetime of this
  // worker instance, skip further processing to avoid repeated DB calls.
  if (purgeVersionChecked) return;
  try {
    // Ensure the database schema exists
    await initDB(env);
    // Fetch the last version that triggered a purge
    let row = null;
    try {
      row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('last_purge_version').first();
    } catch (_) {
      // Table might not exist; ignore
    }
    const lastVersion = row && row.value ? row.value.toString() : null;
    const currentVersion = VERSION.toString();
    if (lastVersion === currentVersion) {
      // Mark that we've checked this version; no need to re-check on future requests
      purgeVersionChecked = true;
      return; // Already purged for this version
    }
    // Call Cloudflare API to purge everything
    const zoneId = env.CF_ZONE_ID;
    const token = env.CF_API_TOKEN;
    const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
    const response = await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ purge_everything: true })
    });
    // Even if the purge fails, we update the version to avoid repeated attempts
    await env.DB.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).bind('last_purge_version', currentVersion).run();
    // Set the flag to avoid repeated attempts in this instance
    purgeVersionChecked = true;
    if (!response.ok) {
      const text = await response.text();
      console.warn('Cache purge request failed:', text);
    }
  } catch (e) {
    console.error('maybePurgeCache error:', e);
  }
}

/**
 * Helper function to get Whop API key.
 * First checks database settings (from admin panel), then falls back to env variable.
 * This allows users to configure API key via admin UI.
 */
async function getWhopApiKey(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.api_key) {
          return settings.api_key;
        }
      }
    }
  } catch (e) {
    console.error('Error reading API key from database:', e);
  }
  // Fallback to environment variable
  return env.WHOP_API_KEY || null;
}

/**
 * Helper function to get Whop webhook secret.
 * First checks database settings, then falls back to env variable.
 */
async function getWhopWebhookSecret(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.webhook_secret) {
          return settings.webhook_secret;
        }
      }
    }
  } catch (e) {
    console.error('Error reading webhook secret from database:', e);
  }
  // Fallback to environment variable
  return env.WHOP_WEBHOOK_SECRET || null;
}

/**
 * Helper function to get Google Apps Script URL for email webhooks.
 * Retrieves from database settings.
 */
async function getGoogleScriptUrl(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.google_webapp_url) {
          return settings.google_webapp_url;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading Google Script URL from database:', e);
  }
  return null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    // Normalize the request path.  Collapse multiple consecutive slashes
    // into a single slash (e.g. //api/debug -> /api/debug) to avoid
    // accidental 404s or redirect loops when users include double
    // slashes in the URL.【979016842149196†L0-L1】
    let path = url.pathname.replace(/\/+/g, '/');
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    const method = req.method;

    // Before processing any request, trigger a cache purge if this is the
    // first request on a new version.  The purge will run only once per
    // deployment and only if the necessary environment variables are set.
    // Only run cache purge checks for admin surfaces or webhook calls (avoid DB hits for every customer page view)
    const shouldPurgeCache = path.startsWith('/admin/') || path.startsWith('/api/admin/') || path.startsWith('/api/whop/webhook');
    if (shouldPurgeCache) {
      await maybePurgeCache(env);
    }

    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      if (path === '/api/health') {
        return json({ ok: true, time: Date.now() });
      }

      // Server time endpoint for accurate countdown calculations
      if (path === '/api/time') {
        return json({ serverTime: Date.now() });
      }



            // ------------------------------
      // Chat APIs (Customer + Admin)
      // ------------------------------
      if (path === '/api/chat/start' && method === 'POST') {
        if (!env.DB) return json({ error: 'Database not configured' }, 500);
        await initDB(env);

        let body;
        try { body = await req.json(); } catch { body = {}; }

        const nameIn = String(body.name || '').trim();
        const emailIn = String(body.email || '').trim();

        if (!nameIn || !emailIn) return json({ error: 'Name and email are required' }, 400);

        // Basic normalization
        const email = emailIn.toLowerCase();
        const name = nameIn;

        // One email = one session (reuse + cleanup)
        const canonical = await env.DB.prepare(
          `SELECT id, name, created_at
           FROM chat_sessions
           WHERE lower(email) = lower(?)
           ORDER BY datetime(created_at) ASC
           LIMIT 1`
        ).bind(email).first();

        if (canonical?.id) {
          const canonicalId = String(canonical.id);

          // Update name if it changed (optional but keeps admin tidy)
          if (name && canonical.name !== name) {
            await env.DB.prepare(
              `UPDATE chat_sessions SET name = ? WHERE id = ?`
            ).bind(name, canonicalId).run();
          }

          // Migrate any stray sessions/messages for this email into the canonical session
          const others = await env.DB.prepare(
            `SELECT id FROM chat_sessions
             WHERE lower(email) = lower(?) AND id != ?`
          ).bind(email, canonicalId).all();

          const otherIds = (others?.results || []).map(r => String(r.id));
          for (const sid of otherIds) {
            await env.DB.prepare(
              `UPDATE chat_messages SET session_id = ? WHERE session_id = ?`
            ).bind(canonicalId, sid).run();

            await env.DB.prepare(
              `DELETE FROM chat_sessions WHERE id = ?`
            ).bind(sid).run();
          }

          return json({ sessionId: canonicalId, reused: true });
        }

        // Create new session
        const sessionId = crypto.randomUUID();

        await env.DB.prepare(
          `INSERT INTO chat_sessions (id, name, email) VALUES (?, ?, ?)`
        ).bind(sessionId, escapeHtml(name), escapeHtml(email)).run();

        return json({ sessionId, reused: false });
      }

      if (path === '/api/chat/sync' && method === 'GET') {
        if (!env.DB) return json({ error: 'Database not configured' }, 500);
        await initDB(env);

        const sessionId = url.searchParams.get('sessionId');
        const sinceIdRaw = url.searchParams.get('sinceId') || '0';
        const sinceId = Number(sinceIdRaw) || 0;

        if (!sessionId) return json({ error: 'sessionId is required' }, 400);

        const rows = await env.DB.prepare(
          `SELECT id, role, content, created_at
           FROM chat_messages
           WHERE session_id = ? AND id > ?
           ORDER BY id ASC
           LIMIT 100`
        ).bind(sessionId, sinceId).all();

        const messages = rows?.results || [];
        const lastId = messages.length ? messages[messages.length - 1].id : sinceId;

        return json({ messages, lastId });
      }

      if (path === '/api/chat/send' && method === 'POST') {
        if (!env.DB) return json({ error: 'Database not configured' }, 500);
        await initDB(env);

        let body;
        try { body = await req.json(); } catch { body = {}; }

        const sessionId = String(body.sessionId || '').trim();
        const roleRaw = String(body.role || 'user').trim().toLowerCase();

        // accept content or message
        const rawContent = String(body.content ?? body.message ?? '');

        const role = ['user', 'admin', 'system'].includes(roleRaw) ? roleRaw : 'user';

        if (!sessionId) return json({ error: 'sessionId is required' }, 400);

        // Strict blocking: do not allow blocked sessions to send customer messages
        const sess = await env.DB.prepare(
          `SELECT blocked FROM chat_sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (role === 'user' && Number(sess?.blocked || 0) === 1) {
          return json({ success: false, error: "You have been blocked by support." }, 403);
        }

        const trimmed = rawContent.trim();
        if (!trimmed) return json({ error: 'content is required' }, 400);

        // 500 char limit (backend)
        if (trimmed.length > 500) return json({ error: 'Message too long (max 500 characters)' }, 400);

        // Rate limit customers only (1 msg/sec)
        try {
          if (role === 'user') await enforceUserRateLimit(env, sessionId);
        } catch (e) {
          if (e?.status === 429) return json({ error: 'Too many messages. Please wait a moment.' }, 429);
          throw e;
        }

        // Determine if this is the user's first message BEFORE inserting
        let isFirstUserMessage = false;
        if (role === 'user') {
          const countRow = await env.DB.prepare(
            `SELECT COUNT(*) as c
             FROM chat_messages
             WHERE session_id = ? AND role = 'user'`
          ).bind(sessionId).first();
          isFirstUserMessage = Number(countRow?.c || 0) === 0;
        }

        // XSS protection: escape before storing
        const safeContent = escapeHtml(trimmed);

        const insertRes = await env.DB.prepare(
          `INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)`
        ).bind(sessionId, role, safeContent).run();

        // Update denormalized last-message fields for fast admin listing
        try {
          await env.DB.prepare(
            `UPDATE chat_sessions
             SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
             WHERE id = ?`
          ).bind(safeContent, sessionId).run();
        } catch (e) {
          console.error('Failed to update chat_sessions last-message fields:', e);
        }

        // Trigger email alert webhook on first customer message
        if (isFirstUserMessage) {
          try {
            const setting = await env.DB.prepare(
              `SELECT value FROM settings WHERE key = ?`
            ).bind('GOOGLE_SCRIPT_URL').first();

            const scriptUrl = String(setting?.value || '').trim();

            if (scriptUrl) {
              const session = await env.DB.prepare(
                `SELECT id, name, email, created_at FROM chat_sessions WHERE id = ?`
              ).bind(sessionId).first();

              await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'first_customer_message',
                  sessionId,
                  name: session?.name || null,
                  email: session?.email || null,
                  created_at: session?.created_at || null,
                  message: trimmed
                })
              });
            }
          } catch (e) {
            console.error('Chat webhook trigger failed:', e);
          }
        }

        // ------------------------------
        // Smart Quick Action Auto-Replies
        // ------------------------------
        if (role === 'user') {
          const normalized = normalizeQuickAction(trimmed);
          const session = await env.DB.prepare(
            `SELECT email FROM chat_sessions WHERE id = ?`
          ).bind(sessionId).first();

          const email = String(session?.email || '').trim();
          const origin = new URL(req.url).origin;

          // "My Order Status"
          if (normalized === 'my order status') {
            let replyText = "We couldn't find any recent orders for this email.";

            if (email) {
              const lastOrder = await getLatestOrderForEmail(env, email);
              if (lastOrder) {
                const link = `${origin}/buyer-order.html?id=${encodeURIComponent(lastOrder.order_id)}`;
                replyText = `Your last order #${lastOrder.order_id} is currently ${lastOrder.status || 'unknown'}. Track it here: ${link}`;
              }
            }

            const safeReply = escapeHtml(replyText);
            await env.DB.prepare(
              `INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'system', ?)`
            ).bind(sessionId, safeReply).run();

            // Update denormalized last-message fields
            try {
              await env.DB.prepare(
                `UPDATE chat_sessions
                 SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
                 WHERE id = ?`
              ).bind(safeReply, sessionId).run();
            } catch (e) {
              console.error('Failed to update chat_sessions last-message fields:', e);
            }
          }

          // "Check Delivery Status"
          if (normalized === 'check delivery status') {
            let replyText = "No recent orders found for this email.";

            if (email) {
              const lastOrder = await getLatestOrderForEmail(env, email);
              if (lastOrder) {
                const link = `${origin}/buyer-order.html?id=${encodeURIComponent(lastOrder.order_id)}`;
                replyText = `Your last order is ${lastOrder.status || 'unknown'}. View details here: ${link}`;
              }
            }

            const safeReply = escapeHtml(replyText);
            await env.DB.prepare(
              `INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'system', ?)`
            ).bind(sessionId, safeReply).run();

            // Update denormalized last-message fields
            try {
              await env.DB.prepare(
                `UPDATE chat_sessions
                 SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
                 WHERE id = ?`
              ).bind(safeReply, sessionId).run();
            } catch (e) {
              console.error('Failed to update chat_sessions last-message fields:', e);
            }
          }
        }

        return json({ success: true, messageId: insertRes?.meta?.last_row_id || null });
      }

      // ----- ADMIN CHAT API -----
      // ----- ADMIN CHAT API -----
      if (path === '/api/admin/chats/block' && method === 'POST') {
        if (!env.DB) return json({ error: 'Database not configured' }, 500);
        await initDB(env);

        let body;
        try { body = await req.json(); } catch { body = {}; }

        const sessionId = String(body.sessionId || '').trim();
        const blocked = body.blocked === true || body.blocked === 1 || body.blocked === 'true';

        if (!sessionId) return json({ error: 'sessionId is required' }, 400);

        await env.DB.prepare(
          `UPDATE chat_sessions SET blocked = ? WHERE id = ?`
        ).bind(blocked ? 1 : 0, sessionId).run();

        return json({ success: true, blocked: blocked ? 1 : 0 });
      }

      if (path === '/api/admin/chats/delete' && method === 'DELETE') {
        if (!env.DB) return json({ error: 'Database not configured' }, 500);
        await initDB(env);

        let sessionId = url.searchParams.get('sessionId');
        if (!sessionId) {
          let body;
          try { body = await req.json(); } catch { body = {}; }
          sessionId = String(body.sessionId || '').trim();
        } else {
          sessionId = String(sessionId).trim();
        }

        if (!sessionId) return json({ error: 'sessionId is required' }, 400);

        // Delete messages first, then session
        await env.DB.prepare(`DELETE FROM chat_messages WHERE session_id = ?`).bind(sessionId).run();
        await env.DB.prepare(`DELETE FROM chat_sessions WHERE id = ?`).bind(sessionId).run();

        return json({ success: true });
      }

if (path === '/api/admin/chats/sessions' && method === 'GET') {
        if (!env.DB) return json({ error: 'Database not configured' }, 500);
        await initDB(env);

        // One row per email (canonical session = oldest created_at for that email)
        // Denormalized fields on chat_sessions let us avoid heavy subqueries.
        const rows = await env.DB.prepare(
          `SELECT
             s.id,
             s.name,
             s.email,
             s.blocked,
             s.last_message_at,
             s.last_message_content AS last_message,
             s.created_at
           FROM chat_sessions s
           JOIN (
             SELECT lower(email) AS em, MIN(datetime(created_at)) AS min_created
             FROM chat_sessions
             GROUP BY lower(email)
           ) x
             ON lower(s.email) = x.em AND datetime(s.created_at) = x.min_created
           ORDER BY COALESCE(s.last_message_at, s.created_at) DESC
           LIMIT 200`
        ).all();

        return json({ sessions: rows?.results || [] });
      }


return new Response(assetResp.body, { status: 200, headers });
        }
      }
      if (path === '/api/debug') {
        return json({
          status: 'running',
          bindings: {
            DB: !!env.DB,
            R2_BUCKET: !!env.R2_BUCKET,
            PRODUCT_MEDIA: !!env.PRODUCT_MEDIA,
            ASSETS: !!env.ASSETS
          },
          // Include the current version and a timestamp to assist with
          // debugging deployments.  The version is injected at build time
          // through the VERSION constant defined above.
          version: VERSION,
          timestamp: new Date().toISOString()
        });
      }

      if (path.startsWith('/api/')) {
        if (!env.DB) return json({ error: 'Database not configured' }, 500);
        await initDB(env);

        // ----- CACHE PURGE -----
        // Endpoint to purge Cloudflare cache via API.  Requires CF_ZONE_ID and CF_API_TOKEN
        // environment variables to be configured in wrangler.toml or via secrets.  The
        // route expects a POST request and will call the Cloudflare API to purge
        // everything for the configured zone.  This allows the admin UI to force
        // invalidation of stale static assets on demand.
        if (method === 'POST' && path === '/api/purge-cache') {
          const zoneId = env.CF_ZONE_ID;
          const token = env.CF_API_TOKEN;
          if (!zoneId || !token) {
            return json({ error: 'CF_ZONE_ID or CF_API_TOKEN not configured' }, 500);
          }
          try {
            const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
            const cfResp = await fetch(purgeUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ purge_everything: true })
            });
            const result = await cfResp.json();
            return json(result, cfResp.ok ? 200 : 500);
          } catch (e) {
            return json({ error: e.message }, 500);
          }
        }

        // ----- PRODUCTS -----
        if (method === 'GET' && path === '/api/products') {
          const r = await env.DB.prepare(
            'SELECT id, title, slug, normal_price, sale_price, thumbnail_url, normal_delivery_text FROM products WHERE status = ? ORDER BY sort_order ASC, id DESC'
          ).bind('active').all();
          
          // Fetch review statistics for each product
          const products = r.results || [];
          const productsWithReviews = await Promise.all(products.map(async (product) => {
            const stats = await env.DB.prepare(
              'SELECT COUNT(*) as cnt, AVG(rating) as avg FROM reviews WHERE product_id = ? AND status = ?'
            ).bind(product.id, 'approved').first();
            
            return {
              ...product,
              review_count: stats?.cnt || 0,
              rating_average: stats?.avg ? Math.round(stats.avg * 10) / 10 : 0
            };
          }));
          
          return json({ products: productsWithReviews });
        }

        // ----- WHOP CHECKOUT -----
        // Create temporary Whop checkout session for a product
        if (method === 'POST' && path === '/api/whop/create-checkout') {
          const body = await req.json();
          const { product_id } = body;
          
          if (!product_id) {
            return json({ error: 'Product ID required' }, 400);
          }
          
          // Get product details
          const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(product_id)).first();
          if (!product) {
            return json({ error: 'Product not found' }, 404);
          }

          // Get global Whop settings for fallback
          let globalSettings = {};
          try {
            const settingsRow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
            if (settingsRow && settingsRow.value) {
              globalSettings = JSON.parse(settingsRow.value);
            }
          } catch (e) {
            console.error('Failed to load global settings:', e);
          }

          // Use product's whop_plan or fall back to global default
          let planId = product.whop_plan || globalSettings.default_plan_id || globalSettings.default_plan || '';

          if (!planId) {
            return json({
              error: 'Whop not configured. Please set a plan for this product or configure a default plan in Settings.'
            }, 400);
          }

          // Extract Plan ID from link or use directly
          planId = planId.trim();
          
          // If it's a link, extract the plan ID
          if (planId.startsWith('http')) {
            // Try to extract from various Whop URL formats
            // Format 1: https://whop.com/checkout/plan_xxxxx
            // Format 2: https://whop.com/product-name (contains plan in page)
            const planMatch = planId.match(/plan_[a-zA-Z0-9]+/);
            if (planMatch) {
              planId = planMatch[0];
            } else {
              // If no plan ID in URL, we need to fetch it (not ideal but works)
              // For now, show error - user should provide direct plan ID or proper link
              return json({ 
                error: 'Could not extract Plan ID from link. Please use: https://whop.com/checkout/plan_XXXXX or just plan_XXXXX' 
              }, 400);
            }
          }
          
          // Validate Plan ID format
          if (!planId.startsWith('plan_')) {
            return json({ error: 'Invalid Whop Plan ID format. Should start with plan_' }, 400);
          }
          
          // Get Whop API key from database or environment
          const apiKey = await getWhopApiKey(env);
          if (!apiKey) {
            return json({ error: 'Whop API key not configured. Please add it in admin Settings.' }, 500);
          }

          // Calculate expiry time (15 minutes from now)
          const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

          // Create Whop checkout session
          try {
            const whopResponse = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                plan_id: planId,
                redirect_url: `${url.origin}/success.html?product=${product.id}`,
                metadata: {
                  product_id: product.id.toString(),
                  product_title: product.title,
                  created_at: new Date().toISOString(),
                  expires_at: expiryTime
                }
              })
            });
            
            if (!whopResponse.ok) {
              const errorText = await whopResponse.text();
              console.error('Whop API error:', errorText);
              
              // Try to parse error message
              try {
                const errorData = JSON.parse(errorText);
                return json({ 
                  error: errorData.message || errorData.error || 'Failed to create checkout' 
                }, whopResponse.status);
              } catch (e) {
                return json({ error: 'Failed to create checkout session' }, whopResponse.status);
              }
            }
            
            const checkoutData = await whopResponse.json();
            
            // Store checkout for cleanup tracking (optional - for 15 min auto-delete)
            try {
              await env.DB.prepare(`
                INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, expires_at, status, created_at)
                VALUES (?, ?, NULL, ?, 'pending', datetime('now'))
              `).bind(checkoutData.id, product.id, expiryTime).run();
            } catch (e) {
              // Table might not exist - that's okay, we'll still return the checkout
              console.log('Checkout tracking skipped:', e.message);
            }
            
            return json({
              success: true,
              checkout_id: checkoutData.id,
              checkout_url: checkoutData.purchase_url,
              expires_in: '15 minutes'
            });
          } catch (e) {
            console.error('Whop checkout error:', e);
            return json({ error: e.message || 'Failed to create checkout' }, 500);
          }
        }

        // ----- WHOP DYNAMIC PLAN + CHECKOUT -----
        // Create a temporary plan on Whop for the given product price and immediately
        // create a checkout session for that plan.  After payment, the webhook
        // handler will delete both the checkout session and the plan.  This can be
        // used when you need to charge custom one‑time amounts per customer
        // without pre‑creating plans in the Whop dashboard.  Requires
        // `plan:create` and `plan:delete` permissions on the API key as well as a
        // configured `WHOP_COMPANY_ID`.  Each product should store the
        // corresponding Whop `product_id` in the `whop_product_id` column.
        if (method === 'POST' && path === '/api/whop/create-plan-checkout') {
          const body = await req.json();
          const { product_id, amount, email, metadata } = body || {};
          if (!product_id) {
            return json({ error: 'Product ID required' }, 400);
          }
          // Lookup product from database
          const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(product_id)).first();
          if (!product) {
            return json({ error: 'Product not found' }, 404);
          }
          // Determine the price to charge; prefer sale_price over normal_price
          const priceValue = (product.sale_price !== null && product.sale_price !== undefined && product.sale_price !== '')
            ? Number(product.sale_price)
            : Number(product.normal_price);
          // Allow $0 for testing, but reject negative prices
          if (isNaN(priceValue) || priceValue < 0) {
            return json({ error: 'Invalid price for product' }, 400);
          }
          // Ensure we have the Whop product ID for attaching the plan to the correct product
          // Use the product's specific Whop product ID if available.
          const directProdId = (product.whop_product_id || '').trim();
          let finalProdId = directProdId;
          // If no product-specific ID, fallback to global default_product_id from settings
          if (!finalProdId) {
            try {
              const srow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
              let settings = {};
              if (srow && srow.value) {
                try { settings = JSON.parse(srow.value); } catch (e) { settings = {}; }
              }
              if (settings && settings.default_product_id) {
                finalProdId = (settings.default_product_id || '').trim();
              }
            } catch (e) {
              console.log('Failed to load whop settings for default product ID:', e);
            }
          }
          if (!finalProdId) {
            return json({ error: 'whop_product_id not configured for this product and no default_product_id set' }, 400);
          }
          // Company ID must be provided via environment variables
          const companyId = env.WHOP_COMPANY_ID;
          if (!companyId) {
            return json({ error: 'WHOP_COMPANY_ID environment variable not set' }, 500);
          }
          // Get API key from database or environment
          const apiKey = await getWhopApiKey(env);
          if (!apiKey) {
            return json({ error: 'Whop API key not configured. Please add it in admin Settings.' }, 500);
          }
          // Derive currency from environment or fallback to USD
          const currency = env.WHOP_CURRENCY || 'usd';
          // Prepare plan creation request for one-time payment (no renewal)
          // For one_time plans, we should NOT set renewal_price
          const planBody = {
            company_id: companyId,
            product_id: finalProdId,
            plan_type: 'one_time',
            release_method: 'buy_now',
            currency: currency,
            initial_price: priceValue,
            // Do NOT set renewal_price for one_time plans - it causes error
            // Provide a default title for the plan so the seller can see it in their dashboard
            title: `${product.title || 'One‑time purchase'} - $${priceValue}`,
            // Set unlimited stock to prevent "out of stock" errors
            stock: 999999,
            internal_notes: `Auto-generated for product ${product.id} - ${new Date().toISOString()}`
          };
          try {
            // Create the plan on Whop
            const planResp = await fetch('https://api.whop.com/api/v2/plans', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(planBody)
            });
            if (!planResp.ok) {
              const errorText = await planResp.text();
              console.error('Whop plan create error:', errorText);
              let msg = 'Failed to create plan';
              try {
                const j = JSON.parse(errorText);
                msg = j.message || j.error || msg;
              } catch (_) {}
              return json({ error: msg }, planResp.status);
            }
            const planData = await planResp.json();
            const planId = planData.id;
            if (!planId) {
              return json({ error: 'Plan ID missing from Whop response' }, 500);
            }
            // Compute expiry time (15 mins) for cleanup
            const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

            // Store plan for cleanup, no checkout session needed for embedded flow
            try {
              await env.DB.prepare(`
                INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, expires_at, status, created_at)
                VALUES (?, ?, ?, ?, 'pending', datetime('now'))
              `).bind('plan_' + planId, product.id, planId, expiryTime).run();
            } catch (e) {
              console.log('Plan tracking insert failed:', e.message);
            }

            // Create checkout session with email prefill for better UX
            const checkoutBody = {
              plan_id: planId,
              redirect_url: `${url.origin}/success.html?product=${product.id}`,
              metadata: {
                product_id: product.id.toString(),
                product_title: product.title,
                addons: metadata?.addons || [],
                amount: amount || priceValue,
                created_at: new Date().toISOString()
              }
            };

            // Add email prefill if provided
            if (email && email.includes('@')) {
              checkoutBody.prefill = {
                email: email.trim()
              };
            }

            const checkoutResp = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(checkoutBody)
            });

            if (!checkoutResp.ok) {
              const errorText = await checkoutResp.text();
              console.error('Whop checkout session error:', errorText);
              // If checkout session fails, still return plan ID for fallback
              return json({
                success: true,
                plan_id: planId,
                product_id: product.id,
                email: email,
                metadata: {
                  product_id: product.id.toString(),
                  product_title: product.title,
                  addons: metadata?.addons || [],
                  amount: amount || priceValue
                },
                expires_in: '15 minutes',
                warning: 'Email prefill not available'
              });
            }

            const checkoutData = await checkoutResp.json();

            // Update database record with checkout session ID
            try {
              await env.DB.prepare(`
                UPDATE checkout_sessions 
                SET checkout_id = ?
                WHERE checkout_id = ?
              `).bind(checkoutData.id, 'plan_' + planId).run();
            } catch (e) {
              console.log('Checkout session tracking update failed:', e.message);
            }

            // Return both plan ID and checkout URL with email prefill
            return json({
              success: true,
              plan_id: planId,
              checkout_id: checkoutData.id,
              checkout_url: checkoutData.purchase_url,
              product_id: product.id,
              email: email,
              metadata: {
                product_id: product.id.toString(),
                product_title: product.title,
                addons: metadata?.addons || [],
                amount: amount || priceValue
              },
              expires_in: '15 minutes',
              email_prefilled: !!(email && email.includes('@'))
            });
          } catch (e) {
            console.error('Dynamic checkout error:', e);
            return json({ error: e.message || 'Failed to create plan/checkout' }, 500);
          }
        }
        
        // ----- WHOP WEBHOOK -----
        // Handle Whop payment webhooks
        if (method === 'POST' && path === '/api/whop/webhook') {
          try {
            const webhookData = await req.json();
            const eventType = webhookData.type;
            
            console.log('Whop webhook received:', eventType);
            
            // Handle payment success
            if (eventType === 'payment.succeeded') {
              const checkoutSessionId = webhookData.data?.checkout_session_id;
              const membershipId = webhookData.data?.id;
              const metadata = webhookData.data?.metadata || {};
              
              console.log('Payment succeeded:', {
                checkoutSessionId,
                membershipId,
                metadata
              });
              
              // Mark checkout as completed in database
              if (checkoutSessionId) {
                try {
                  await env.DB.prepare(`
                    UPDATE checkout_sessions 
                    SET status = 'completed', completed_at = datetime('now')
                    WHERE checkout_id = ?
                  `).bind(checkoutSessionId).run();
                } catch (e) {
                  console.log('Checkout tracking update skipped:', e.message);
                }
              }
              
              // Delete the temporary checkout session from Whop
              if (checkoutSessionId && env.WHOP_API_KEY) {
                try {
                  await fetch(`https://api.whop.com/api/v2/checkout_sessions/${checkoutSessionId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${env.WHOP_API_KEY}`
                    }
                  });
                  console.log('✅ Checkout session deleted immediately after payment:', checkoutSessionId);
                } catch (e) {
                  console.error('Failed to delete checkout session:', e);
                }
              }
              // If we created a dynamic plan for this checkout, delete the plan as well
              if (checkoutSessionId && env.WHOP_API_KEY) {
                try {
                  // Fetch plan_id from checkout_sessions table
                  const row = await env.DB.prepare('SELECT plan_id FROM checkout_sessions WHERE checkout_id = ?').bind(checkoutSessionId).first();
                  const planId = row && row.plan_id;
                  if (planId) {
                    await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${env.WHOP_API_KEY}` }
                    });
                    console.log('🗑️ Plan deleted immediately after payment:', planId);
                  }
                } catch (e) {
                  console.error('Failed to delete plan:', e);
                }
              }
              
              // Create order in database (optional - for tracking)
              if (metadata.product_id) {
                try {
                  const orderId = `WHOP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  await env.DB.prepare(
                    'INSERT INTO orders (order_id, product_id, status, created_at) VALUES (?, ?, ?, datetime("now"))'
                  ).bind(orderId, Number(metadata.product_id), 'completed').run();
                  
                  console.log('Order created:', orderId);
                } catch (e) {
                  console.error('Failed to create order:', e);
                }
              }
            }
            
            // Handle membership validation
            if (eventType === 'membership.went_valid') {
              console.log('Membership validated:', webhookData.data?.id);
            }
            
            // Always return 200 to acknowledge webhook
            return json({ received: true });
          } catch (e) {
            console.error('Webhook error:', e);
            return json({ error: 'Webhook processing failed' }, 500);
          }
        }
        // ----- WHOP TEST API -----
        // Simple endpoint to verify Whop API connectivity and permissions.  This
        // GET call attempts to fetch the current company details using
        // WHOP_COMPANY_ID and WHOP_API_KEY.  A successful response means the
        // API key is valid and has at least `company:basic:read` permissions.
        if (method === 'GET' && path === '/api/whop/test-api') {
          const apiKey = await getWhopApiKey(env);
          if (!apiKey) {
            return json({ success: false, error: 'Whop API key not configured. Please add it in Settings.' }, 500);
          }
          try {
            // Test API key by listing plans - this endpoint works with basic plan permissions
            // and doesn't require company ID or special permissions
            const resp = await fetch('https://api.whop.com/api/v2/plans?page=1&per=1', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              }
            });

            // Return detailed error info for debugging
            if (!resp.ok) {
              const text = await resp.text();
              let errMsg = 'Whop API call failed';
              let errorDetails = null;
              try {
                errorDetails = JSON.parse(text);
                errMsg = errorDetails.message || errorDetails.error || errMsg;
              } catch (_) {
                errMsg = text || errMsg;
              }
              return json({
                success: false,
                error: errMsg,
                status: resp.status,
                details: errorDetails,
                debug: {
                  apiKeyLength: apiKey?.length || 0,
                  apiKeyPrefix: apiKey?.substring(0, 10) + '...'
                }
              }, resp.status);
            }

            const data = await resp.json();
            return json({
              success: true,
              message: 'API connection successful!',
              plansCount: data.data?.length || 0,
              apiKeyValid: true
            });
          } catch (e) {
            return json({ success: false, error: e.message || 'API test error' }, 500);
          }
        }

        // ----- WHOP TEST WEBHOOK -----
        // Endpoint to verify that the webhook endpoint is reachable.  This
        // simply returns a success object.  It does not call the external
        // Whop service.  Use this to check that your domain and Cloudflare
        // routing are configured correctly.
        if (method === 'GET' && path === '/api/whop/test-webhook') {
          return json({ success: true, message: 'Webhook endpoint reachable' });
        }
        
        // ----- CLEANUP EXPIRED CHECKOUTS -----
        // Endpoint to cleanup expired checkout sessions (call this from a cron job)
        if (method === 'POST' && path === '/api/whop/cleanup') {
          if (!env.WHOP_API_KEY) {
            return json({ error: 'Whop API key not configured' }, 500);
          }
          
          try {
            // Get expired checkouts from database
            const expiredCheckouts = await env.DB.prepare(`
              SELECT checkout_id, product_id, expires_at
              FROM checkout_sessions
              WHERE status = 'pending' 
              AND datetime(expires_at) < datetime('now')
              ORDER BY created_at ASC
              LIMIT 50
            `).all();
            
            let deleted = 0;
            let failed = 0;
            
            for (const checkout of (expiredCheckouts.results || [])) {
              try {
                // Delete the checkout session from Whop (ignore if already gone)
                const deleteSessionResp = await fetch(`https://api.whop.com/api/v2/checkout_sessions/${checkout.checkout_id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${env.WHOP_API_KEY}` }
                });
                // Attempt to delete the associated plan if one exists
                let planDeleted = false;
                try {
                  const row = await env.DB.prepare('SELECT plan_id FROM checkout_sessions WHERE checkout_id = ?').bind(checkout.checkout_id).first();
                  const planId = row && row.plan_id;
                  if (planId) {
                    const delPlanResp = await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${env.WHOP_API_KEY}` }
                    });
                    planDeleted = delPlanResp.ok || delPlanResp.status === 404;
                  }
                } catch (pe) {
                  console.error('Plan deletion error:', pe);
                }
                if (deleteSessionResp.ok || deleteSessionResp.status === 404) {
                  // Mark as expired in database regardless of plan deletion outcome
                  await env.DB.prepare(`
                    UPDATE checkout_sessions 
                    SET status = 'expired', completed_at = datetime('now')
                    WHERE checkout_id = ?
                  `).bind(checkout.checkout_id).run();
                  deleted++;
                  console.log('🗑️ Expired checkout deleted:', checkout.checkout_id, planDeleted ? 'and plan cleaned up' : '');
                } else {
                  failed++;
                }
              } catch (e) {
                failed++;
                console.error('Failed to delete checkout:', checkout.checkout_id, e);
              }
            }
            
            return json({
              success: true,
              deleted: deleted,
              failed: failed,
              message: `Cleaned up ${deleted} expired checkouts`
            });
          } catch (e) {
            console.error('Cleanup error:', e);
            return json({ error: e.message }, 500);
          }
        }

        if (method === 'GET' && path.startsWith('/api/product/')) {
          const id = path.split('/').pop();
          let row;
          if (isNaN(Number(id))) {
            row = await env.DB.prepare('SELECT * FROM products WHERE slug = ?').bind(id).first();
          } else {
            row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(id)).first();
          }
          if (!row) return json({ error: 'Product not found' }, 404);
          
          let addons = [];
          try {
            addons = JSON.parse(row.addons_json || '[]');
          } catch(e) {
            console.error('Failed to parse addons_json for product', row.id, ':', e.message);
          }
          
          const stats = await env.DB.prepare(
            'SELECT COUNT(*) as cnt, AVG(rating) as avg FROM reviews WHERE product_id = ? AND status = ?'
          ).bind(row.id, 'approved').first();
          
          // Fetch reviews for rich results schema (directly use review's own video URLs)
          const reviewsResult = await env.DB.prepare(
            `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url 
             FROM reviews 
             LEFT JOIN orders ON reviews.order_id = orders.order_id 
             WHERE reviews.product_id = ? AND reviews.status = ? 
             ORDER BY reviews.created_at DESC`
          ).bind(row.id, 'approved').all();

          // Convert created_at to ISO 8601 format with Z suffix for UTC
          const reviews = (reviewsResult.results || []).map(review => {
            if (review.created_at && typeof review.created_at === 'string') {
              review.created_at = review.created_at.replace(' ', 'T') + 'Z';
            }
            if (review.updated_at && typeof review.updated_at === 'string') {
              review.updated_at = review.updated_at.replace(' ', 'T') + 'Z';
            }
            return review;
          });
          
          return json({
            product: {
              ...row,
              addons,
              review_count: stats?.cnt || 0,
              rating_average: stats?.avg ? Math.round(stats.avg * 10) / 10 : 5.0,
              reviews: reviews
            },
            addons
          });
        }

        if (method === 'POST' && path === '/api/product/save') {
          const body = await req.json();
          const title = (body.title || '').trim();
          if (!title) return json({ error: 'Title required' }, 400);
          
          const slug = (body.slug || '').trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const addonsJson = JSON.stringify(body.addons || []);
          
          if (body.id) {
            // Prepare gallery_images as JSON string if it's an array
            const galleryJson = Array.isArray(body.gallery_images) 
              ? JSON.stringify(body.gallery_images) 
              : (body.gallery_images || '[]');
            
            await env.DB.prepare(`
              UPDATE products SET title=?, slug=?, description=?, normal_price=?, sale_price=?,
              instant_delivery=?, normal_delivery_text=?, thumbnail_url=?, video_url=?,
              gallery_images=?, addons_json=?, seo_title=?, seo_description=?, seo_keywords=?, seo_canonical=?,
              whop_plan=?, whop_price_map=?, whop_product_id=? WHERE id=?
            `).bind(
              title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
              body.instant_delivery ? 1 : 0, body.normal_delivery_text || '',
              body.thumbnail_url || '', body.video_url || '', galleryJson, addonsJson,
              body.seo_title || '', body.seo_description || '', body.seo_keywords || '', body.seo_canonical || '',
              body.whop_plan || '', body.whop_price_map || '', body.whop_product_id || '', Number(body.id)
            ).run();
            return json({ success: true, id: body.id, slug });
          }
          
          // Prepare gallery_images as JSON string if it's an array
          const galleryJson = Array.isArray(body.gallery_images) 
            ? JSON.stringify(body.gallery_images) 
            : (body.gallery_images || '[]');
          
          const r = await env.DB.prepare(`
            INSERT INTO products (title, slug, description, normal_price, sale_price,
            instant_delivery, normal_delivery_text, thumbnail_url, video_url,
            gallery_images, addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
            whop_plan, whop_price_map, whop_product_id, status, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
          `).bind(
            title, slug, body.description || '', Number(body.normal_price) || 0, body.sale_price ? Number(body.sale_price) : null,
            body.instant_delivery ? 1 : 0, body.normal_delivery_text || '',
            body.thumbnail_url || '', body.video_url || '', galleryJson, addonsJson,
            body.seo_title || '', body.seo_description || '', body.seo_keywords || '', body.seo_canonical || '',
            body.whop_plan || '', body.whop_price_map || '', body.whop_product_id || ''
          ).run();
          return json({ success: true, id: r.meta?.last_row_id, slug });
        }

        if (method === 'DELETE' && path === '/api/product/delete') {
          const id = url.searchParams.get('id');
          if (!id) return json({ error: 'ID required' }, 400);
          await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(Number(id)).run();
          return json({ success: true });
        }

        // ----- PRODUCTS LIST (admin) -----
        // Return all products regardless of status.  Used by the admin UI to
        // manage published and draft products.  Includes the status column to
        // drive publish/unpublish toggles.
        if (method === 'GET' && path === '/api/products/list') {
          const r = await env.DB.prepare(
            'SELECT id, title, slug, normal_price, sale_price, thumbnail_url, normal_delivery_text, status FROM products ORDER BY id DESC'
          ).all();
          return json({ products: r.results || [] });
        }

        // ----- PRODUCTS STATUS UPDATE -----
        // Update the status of a product (active for published, draft for draft).
        // Accepts JSON with `id` and `status`.  Status must be 'active' or 'draft'.
        if (method === 'POST' && path === '/api/products/status') {
          const body = await req.json().catch(() => ({}));
          const id = body.id;
          const status = (body.status || '').trim().toLowerCase();
          if (!id || !status) {
            return json({ error: 'id and status required' }, 400);
          }
          if (status !== 'active' && status !== 'draft') {
            return json({ error: 'invalid status' }, 400);
          }
          await env.DB.prepare('UPDATE products SET status = ? WHERE id = ?').bind(status, Number(id)).run();
          return json({ success: true });
        }

        // ----- PRODUCTS DUPLICATE -----
        // Duplicate an existing product.  Accepts JSON with `id`.  Copies
        // all fields and inserts a new product with slug suffixed by '-copy'
        // and status set to 'draft'.  Ensures slug uniqueness by adding
        // numerical suffixes when needed.  Returns the new product id and slug.
        if (method === 'POST' && path === '/api/products/duplicate') {
          const body = await req.json().catch(() => ({}));
          const id = body.id;
          if (!id) {
            return json({ error: 'id required' }, 400);
          }
          const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(id)).first();
          if (!row) {
            return json({ error: 'Product not found' }, 404);
          }
          const baseSlug = row.slug || row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          // Determine unique new slug
          let newSlug = baseSlug + '-copy';
          let idx = 1;
          let exists = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(newSlug).first();
          while (exists) {
            newSlug = `${baseSlug}-copy${idx}`;
            idx++;
            exists = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(newSlug).first();
          }
          // Copy all relevant fields into a new product row
          const r = await env.DB.prepare(
            `INSERT INTO products (
              title, slug, description, normal_price, sale_price,
              instant_delivery, normal_delivery_text, thumbnail_url, video_url,
              addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
              whop_plan, whop_price_map, status, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            (row.title || '') + ' Copy',
            newSlug,
            row.description || '',
            row.normal_price || 0,
            row.sale_price || null,
            row.instant_delivery || 0,
            row.normal_delivery_text || '',
            row.thumbnail_url || '',
            row.video_url || '',
            row.addons_json || '[]',
            row.seo_title || '',
            row.seo_description || '',
            row.seo_keywords || '',
            row.seo_canonical || '',
            row.whop_plan || '',
            row.whop_price_map || '',
            'draft',
            0
          ).run();
          return json({ success: true, id: r.meta?.last_row_id, slug: newSlug });
        }

        // ----- ORDERS -----
        if (method === 'GET' && path === '/api/orders') {
          const r = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
          const orders = (r.results || []).map(row => {
            let email = '', amount = null, addons = [];
            try {
              if (row.encrypted_data && row.encrypted_data[0] === '{') {
                const d = JSON.parse(row.encrypted_data);
                email = d.email || '';
                amount = d.amount;
                addons = d.addons || [];
              }
            } catch(e) {
              console.error('Failed to parse order encrypted_data for order:', row.order_id, e.message);
            }
            return { ...row, email, amount, addons };
          });
          return json({ orders });
        }

        if (method === 'POST' && (path === '/api/order/create' || path === '/submit-order')) {
          const body = await req.json();
          if (!body.productId) return json({ error: 'productId required' }, 400);
          
          const orderId = body.orderId || crypto.randomUUID().split('-')[0].toUpperCase();
          const data = JSON.stringify({
            email: body.email,
            amount: body.amount,
            productId: body.productId,
            addons: body.addons || []
          });
          
          await env.DB.prepare(
            'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes) VALUES (?, ?, ?, ?, ?)'
          ).bind(orderId, Number(body.productId), data, 'PAID', Number(body.deliveryTime) || 60).run();
          
          return json({ success: true, orderId });
        }

        if (method === 'GET' && path.startsWith('/api/order/buyer/')) {
           const orderId = path.split('/').pop();
           const row = await env.DB.prepare(
             'SELECT o.*, p.title as product_title, p.thumbnail_url as product_thumbnail FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_id = ?'
           ).bind(orderId).first();

           if (!row) return json({ error: 'Order not found' }, 404);

           // Check if review already exists for this order
           const reviewCheck = await env.DB.prepare(
             'SELECT id FROM reviews WHERE order_id = ? LIMIT 1'
           ).bind(orderId).first();
           const hasReview = !!reviewCheck;

           let addons = [], email = '', amount = null;
           try {
             if (row.encrypted_data && row.encrypted_data[0] === '{') {
               const d = JSON.parse(row.encrypted_data);
               addons = d.addons || [];
               email = d.email || '';
               amount = d.amount;
             }
           } catch(e) {
             console.error('Failed to parse order encrypted_data for buyer order:', orderId, e.message);
           }

           // Convert SQLite datetime to ISO 8601 format with Z suffix for UTC
           const orderData = { ...row, addons, email, amount, has_review: hasReview };
           if (orderData.created_at && typeof orderData.created_at === 'string') {
             // SQLite format: YYYY-MM-DD HH:MM:SS -> ISO 8601: YYYY-MM-DDTHH:MM:SSZ
             orderData.created_at = orderData.created_at.replace(' ', 'T') + 'Z';
           }

           return json({ order: orderData });
         }

        if (method === 'DELETE' && path === '/api/order/delete') {
          const id = url.searchParams.get('id');
          await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(Number(id)).run();
          return json({ success: true });
        }

        // Update order (status, delivery time, etc.)
        if (method === 'POST' && path === '/api/order/update') {
          const body = await req.json();
          const orderId = body.orderId;
          
          if (!orderId) return json({ error: 'orderId required' }, 400);
          
          const updates = [];
          const values = [];
          
          if (body.status !== undefined) {
            updates.push('status = ?');
            values.push(body.status);
          }
          if (body.delivery_time_minutes !== undefined) {
            updates.push('delivery_time_minutes = ?');
            values.push(Number(body.delivery_time_minutes));
          }
          
          if (updates.length === 0) {
            return json({ error: 'No fields to update' }, 400);
          }
          
          values.push(orderId);
          await env.DB.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`).bind(...values).run();
          return json({ success: true });
        }

        // Create order manually (admin)
        if (method === 'POST' && path === '/api/order/create') {
          const body = await req.json();
          
          if (!body.productId || !body.email) {
            return json({ error: 'productId and email required' }, 400);
          }
          
          // Generate unique order ID
          const orderId = 'MO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
          
          // Store order data
          const encryptedData = JSON.stringify({
            email: body.email,
            amount: body.amount || 0,
            addons: body.notes ? [{ field: 'Admin Notes', value: body.notes }] : [],
            manualOrder: true
          });
          
          await env.DB.prepare(
            'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes) VALUES (?, ?, ?, ?, ?)'
          ).bind(
            orderId,
            Number(body.productId),
            encryptedData,
            body.status || 'paid',
            Number(body.deliveryTime) || 60
          ).run();
          
          return json({ success: true, orderId });
        }

        if (method === 'POST' && path === '/api/order/deliver') {
                  const body = await req.json();
                  if (!body.orderId || !body.videoUrl) return json({ error: 'orderId and videoUrl required' }, 400);

                  // Get order data before updating
                  const orderResult = await env.DB.prepare(
                    'SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?'
                  ).bind(body.orderId).first();

                  // Prepare additional metadata for delivered videos (Archive.org + subtitles, etc)
                  const deliveredVideoMetadata = JSON.stringify({
                    embedUrl: body.embedUrl,
                    itemId: body.itemId,
                    subtitlesUrl: body.subtitlesUrl,
                    tracks: Array.isArray(body.tracks) ? body.tracks : undefined,
                    deliveredAt: new Date().toISOString()
                  });

                  await env.DB.prepare(
                    'UPDATE orders SET delivered_video_url=?, delivered_thumbnail_url=?, status=?, delivered_at=CURRENT_TIMESTAMP, delivered_video_metadata=? WHERE order_id=?'
                  ).bind(body.videoUrl, body.thumbnailUrl || null, 'delivered', deliveredVideoMetadata, body.orderId).run();
          
          // Trigger email webhook if configured
          try {
            const googleScriptUrl = await getGoogleScriptUrl(env);
            if (googleScriptUrl && orderResult) {
              // Extract email from encrypted data
              let customerEmail = '';
              try {
                const decrypted = JSON.parse(orderResult.encrypted_data);
                customerEmail = decrypted.email || '';
              } catch (e) {
                console.warn('Could not decrypt order data for email');
              }
              
              // Send delivery notification webhook
              await fetch(googleScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'order.delivered',
                  order: {
                    order_id: body.orderId,
                    product_title: orderResult.product_title || 'Your Order',
                    email: customerEmail,
                    delivered_video_url: body.videoUrl,
                    status: 'delivered'
                  }
                })
              }).catch(err => console.error('Failed to send delivery webhook:', err));
            }
          } catch (err) {
            console.error('Error triggering delivery webhook:', err);
          }
          
          return json({ success: true });
        }

        if (method === 'POST' && path === '/api/order/revision') {
          const body = await req.json();
          if (!body.orderId) return json({ error: 'orderId required' }, 400);
          
          // Get order data before updating
          const orderResult = await env.DB.prepare(
            'SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?'
          ).bind(body.orderId).first();
          
          await env.DB.prepare(
            'UPDATE orders SET revision_requested=1, revision_count=revision_count+1, status=? WHERE order_id=?'
          ).bind('revision', body.orderId).run();
          
          // Trigger revision notification webhook if configured
          try {
            const googleScriptUrl = await getGoogleScriptUrl(env);
            if (googleScriptUrl && orderResult) {
              // Extract email from encrypted data
              let customerEmail = '';
              try {
                const decrypted = JSON.parse(orderResult.encrypted_data);
                customerEmail = decrypted.email || '';
              } catch (e) {
                console.warn('Could not decrypt order data for email');
              }
              
              // Send revision notification webhook
              await fetch(googleScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'order.revision_requested',
                  order: {
                    order_id: body.orderId,
                    product_title: orderResult.product_title || 'Your Order',
                    email: customerEmail,
                    revision_reason: body.reason || 'No reason provided',
                    revision_count: (orderResult.revision_count || 0) + 1,
                    status: 'revision'
                  }
                })
              }).catch(err => console.error('Failed to send revision webhook:', err));
            }
          } catch (err) {
            console.error('Error triggering revision webhook:', err);
          }
          
          return json({ success: true });
        }

        if (method === 'POST' && path === '/api/order/portfolio') {
          const body = await req.json();
          await env.DB.prepare(
            'UPDATE orders SET portfolio_enabled=? WHERE order_id=?'
          ).bind(body.portfolioEnabled ? 1 : 0, body.orderId).run();
          return json({ success: true });
        }

        if (method === 'POST' && path === '/api/order/archive-link') {
          const body = await req.json();
          await env.DB.prepare('UPDATE orders SET archive_url=? WHERE order_id=?').bind(body.archiveUrl, body.orderId).run();
          return json({ success: true });
        }

        // ----- REVIEWS -----
        if (method === 'GET' && path === '/api/reviews') {
          // Support filtering by productId(s), ids and rating via query parameters.
          const params = url.searchParams;
          const rating = params.get('rating');
          const productId = params.get('productId');
          const productIds = params.get('productIds');
          const ids = params.get('ids');
          let sql = 'SELECT r.*, p.title as product_title FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.status = ?';
          /**
           * Bind values can be strings or numbers.  TypeScript incorrectly infers
           * this array as `string[]` because the first value is a string, which causes
           * type errors when numbers are pushed.  Annotate the type explicitly to
           * avoid type errors in the Cloudflare editor.
           * @type {(string|number)[]}
           */
          const binds = ['approved'];
          // Filter by rating
          if (rating) {
            sql += ' AND r.rating = ?';
            binds.push(Number(rating));
          }
          // Filter by single product
          if (productId) {
            sql += ' AND r.product_id = ?';
            binds.push(Number(productId));
          }
          // Filter by multiple products
          if (productIds) {
            const idsArr = productIds.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
            if (idsArr.length > 0) {
              sql += ` AND r.product_id IN (${idsArr.map(() => '?').join(',')})`;
              binds.push(...idsArr);
            }
          }
          // Filter by specific review IDs
          if (ids) {
            const idsArr2 = ids.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
            if (idsArr2.length > 0) {
              sql += ` AND r.id IN (${idsArr2.map(() => '?').join(',')})`;
              binds.push(...idsArr2);
            }
          }
          sql += ' ORDER BY r.created_at DESC';
          const stmt = await env.DB.prepare(sql);
          const r = await stmt.bind(...binds).all();

          // Convert created_at to ISO 8601 format with Z suffix for UTC
          const reviews = (r.results || []).map(review => {
            if (review.created_at && typeof review.created_at === 'string') {
              review.created_at = review.created_at.replace(' ', 'T') + 'Z';
            }
            return review;
          });

          return json({ reviews });
        }

        if (method === 'POST' && path === '/api/reviews/add') {
          const body = await req.json();
          if (!body.productId || !body.rating) return json({ error: 'productId and rating required' }, 400);
          
          await env.DB.prepare(
            'INSERT INTO reviews (product_id, author_name, rating, comment, status, order_id, show_on_product) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(Number(body.productId), body.author || 'Customer', Number(body.rating), body.comment || '', 'approved', body.orderId || null, body.showOnProduct !== undefined ? (body.showOnProduct ? 1 : 0) : 1).run();
          
          return json({ success: true });
        }

        if (method === 'GET' && path.startsWith('/api/reviews/')) {
           const productId = path.split('/').pop();
           const r = await env.DB.prepare(
             `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url 
              FROM reviews 
              LEFT JOIN orders ON reviews.order_id = orders.order_id 
              WHERE reviews.product_id = ? AND reviews.status = ? 
              ORDER BY reviews.created_at DESC`
           ).bind(Number(productId), 'approved').all();

           // Convert created_at to ISO 8601 format with Z suffix for UTC
           const reviews = (r.results || []).map(review => {
             if (review.created_at && typeof review.created_at === 'string') {
               review.created_at = review.created_at.replace(' ', 'T') + 'Z';
             }
             return review;
           });

           return json({ reviews });
         }

        if (method === 'POST' && path === '/api/reviews/update') {
          const body = await req.json();
          const id = Number(body.id);
          
          // Build dynamic update query based on provided fields
          const updates = [];
          const values = [];
          
          if (body.status !== undefined) {
            updates.push('status = ?');
            values.push(body.status);
          }
          if (body.author_name !== undefined) {
            updates.push('author_name = ?');
            values.push(body.author_name);
          }
          if (body.rating !== undefined) {
            updates.push('rating = ?');
            values.push(Number(body.rating));
          }
          if (body.comment !== undefined) {
            updates.push('comment = ?');
            values.push(body.comment);
          }
          if (body.show_on_product !== undefined) {
            updates.push('show_on_product = ?');
            values.push(Number(body.show_on_product));
          }
          
          if (updates.length === 0) {
            return json({ error: 'No fields to update' }, 400);
          }
          
          values.push(id);
          await env.DB.prepare(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
          return json({ success: true });
        }


        // REMOVED: Review migration endpoint no longer needed with JOIN-based fetching
        // Migration endpoint removed as reviews now fetch delivery URLs dynamically from orders table


        if (method === 'DELETE' && path === '/api/reviews/delete') {
          const id = url.searchParams.get('id');
          await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(Number(id)).run();
          return json({ success: true });
        }

        // ----- SETTINGS -----
        if (method === 'GET' && path === '/api/settings/whop') {
          const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
          let settings = {};
          try { if (row?.value) settings = JSON.parse(row.value); } catch(e) {}
          return json({ settings });
        }

        if (method === 'POST' && path === '/api/settings/whop') {
          const body = await req.json();
          await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind('whop', JSON.stringify(body)).run();
          return json({ success: true });
        }


        // ----- PAGES -----
        if (method === 'GET' && path === '/api/pages') {
           const r = await env.DB.prepare('SELECT id, slug, title, status, created_at, updated_at FROM pages ORDER BY id DESC').all();

           // Convert created_at and updated_at to ISO 8601 format with Z suffix for UTC
           const pages = (r.results || []).map(page => {
             if (page.created_at && typeof page.created_at === 'string') {
               page.created_at = page.created_at.replace(' ', 'T') + 'Z';
             }
             if (page.updated_at && typeof page.updated_at === 'string') {
               page.updated_at = page.updated_at.replace(' ', 'T') + 'Z';
             }
             return page;
           });

           return json({ pages });
         }

        if (method === 'GET' && path.startsWith('/api/page/')) {
           const slug = path.split('/').pop();
           const row = await env.DB.prepare('SELECT * FROM pages WHERE slug = ?').bind(slug).first();
           if (!row) return json({ error: 'Page not found' }, 404);

           // Convert created_at and updated_at to ISO 8601 format with Z suffix for UTC
           if (row.created_at && typeof row.created_at === 'string') {
             row.created_at = row.created_at.replace(' ', 'T') + 'Z';
           }
           if (row.updated_at && typeof row.updated_at === 'string') {
             row.updated_at = row.updated_at.replace(' ', 'T') + 'Z';
           }

           return json({ page: row });
         }

        if (method === 'POST' && path === '/api/page/save') {
          const body = await req.json();
          if (!body.slug || !body.title) return json({ error: 'slug and title required' }, 400);
          
          if (body.id) {
            await env.DB.prepare(
              'UPDATE pages SET slug=?, title=?, content=?, meta_description=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
            ).bind(body.slug, body.title, body.content || '', body.meta_description || '', body.status || 'published', Number(body.id)).run();
            return json({ success: true, id: body.id });
          }
          
          const r = await env.DB.prepare(
            'INSERT INTO pages (slug, title, content, meta_description, status) VALUES (?, ?, ?, ?, ?)'
          ).bind(body.slug, body.title, body.content || '', body.meta_description || '', body.status || 'published').run();
          return json({ success: true, id: r.meta?.last_row_id });
        }

        if (method === 'DELETE' && path === '/api/page/delete') {
          const id = url.searchParams.get('id');
          await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(Number(id)).run();
          return json({ success: true });
        }

        // ----- R2 UPLOAD -----
        if (method === 'POST' && path === '/api/upload/temp-file') {
          try {
            if (!env.R2_BUCKET) {
              console.error('R2_BUCKET not configured');
              return json({ error: 'R2 storage not configured' }, 500);
            }

            const sessionId = url.searchParams.get('sessionId');
            const filename = url.searchParams.get('filename');

            if (!sessionId || !filename) {
              console.error('Missing sessionId or filename');
              return json({ error: 'sessionId and filename required' }, 400);
            }

            console.log('Uploading file:', filename, 'for session:', sessionId);

            const buf = await req.arrayBuffer();

            // Validate file size (max 500MB for videos, 10MB for other files)
            const isVideo = filename.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/);
            const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024; // 500MB for videos, 10MB for others
            const maxSizeLabel = isVideo ? '500MB' : '10MB';
            
            if (buf.byteLength > maxSize) {
              console.error('File too large:', buf.byteLength, 'bytes (max', maxSizeLabel, ')');
              return json({
                error: `File too large. Maximum file size is ${maxSizeLabel} for ${isVideo ? 'videos' : 'files'}.`,
                fileSize: buf.byteLength,
                maxSize: maxSize,
                fileType: isVideo ? 'video' : 'file'
              }, 400);
            }

            if (!buf || buf.byteLength === 0) {
              console.error('Empty file buffer');
              return json({ error: 'Empty file - please select a valid file' }, 400);
            }

            console.log('File size:', (buf.byteLength / 1024 / 1024).toFixed(2), 'MB');

            const key = `temp/${sessionId}/${filename}`;

            await env.R2_BUCKET.put(key, buf, {
              httpMetadata: { contentType: req.headers.get('content-type') || 'application/octet-stream' }
            });

            console.log('File uploaded successfully:', key);

            return json({ success: true, tempUrl: `r2://${key}` });
          } catch (err) {
            console.error('Upload error:', err);
            return json({
              error: 'Upload failed: ' + err.message,
              details: err.stack
            }, 500);
          }
        }

        if (method === 'GET' && path === '/api/r2/file') {
          if (!env.R2_BUCKET) return json({ error: 'R2 not configured' }, 500);
          
          const key = url.searchParams.get('key');
          if (!key) return json({ error: 'key required' }, 400);
          
          const obj = await env.R2_BUCKET.get(key);
          if (!obj) return json({ error: 'File not found' }, 404);
          
          return new Response(obj.body, {
            headers: {
              'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }

        // ----- DELIVERY VIDEO UPLOAD -----
        // Two-stage upload process:
        // 1. Upload to R2 temp bucket for verification
        // 2. Upload to Archive.org for public access
        // 3. Verify both uploads succeeded before returning URL
        if (method === 'POST' && path === '/api/upload/customer-file') {
          try {
            if (!env.R2_BUCKET) {
              console.error('R2_BUCKET not configured');
              return json({ error: 'R2 storage not configured' }, 500);
            }

            if (!env.ARCHIVE_ACCESS_KEY || !env.ARCHIVE_SECRET_KEY) {
              console.error('Archive.org credentials not configured');
              return json({ error: 'Archive.org credentials not configured' }, 500);
            }

            const itemId = (url.searchParams.get('itemId') || '').replace(/[^a-zA-Z0-9_.-]/g, '-');
            const filename = (url.searchParams.get('filename') || '').replace(/[^a-zA-Z0-9_.-]/g, '-');
            const originalFilename = url.searchParams.get('originalFilename');

            if (!itemId || !filename) {
              console.error('Missing itemId or filename');
              return json({ error: 'itemId and filename required' }, 400);
            }

            console.log('Starting two-stage upload:', filename, 'Item:', itemId);

            const buf = await req.arrayBuffer();

            // Validate file size (max 500MB for videos, 10MB for other files)
            const videoExtensions = /\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/i;
            const isVideo = videoExtensions.test(filename);
            const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
            const maxSizeLabel = isVideo ? '500MB' : '10MB';
            
            if (buf.byteLength > maxSize) {
              console.error('File too large:', buf.byteLength, 'bytes (max', maxSizeLabel, ')');
              return json({
                error: `File too large. Maximum file size is ${maxSizeLabel} for ${isVideo ? 'videos' : 'files'}.`,
                fileSize: buf.byteLength,
                maxSize: maxSize,
                fileType: isVideo ? 'video' : 'file'
              }, 400);
            }

            if (buf.byteLength === 0) {
              console.error('Empty file');
              return json({ error: 'Empty file - please select a valid file' }, 400);
            }

            console.log('File size:', (buf.byteLength / 1024 / 1024).toFixed(2), 'MB');

            // Force video MIME type for video files
            const contentType = isVideo 
              ? (getMimeTypeFromFilename(filename) || 'video/mp4')
              : resolveContentType(req, filename);
            const isVideoUpload = isVideo;

            // STAGE 1: Upload to R2 temp bucket for verification
            console.log('STAGE 1: Uploading to R2 temp bucket...');
            const r2TempKey = `temp/${itemId}/${filename}`;
            try {
              await env.R2_BUCKET.put(r2TempKey, buf, {
                httpMetadata: { contentType: contentType }
              });
              console.log('R2 temp upload successful:', r2TempKey);
            } catch (r2Err) {
              console.error('R2 temp upload failed:', r2Err);
              return json({
                error: 'Failed to upload to temp storage: ' + r2Err.message,
                stage: 'r2-temp',
                details: r2Err.stack
              }, 500);
            }

            // Verify R2 file exists
            console.log('Verifying R2 temp upload...');
            let r2File;
            try {
              r2File = await env.R2_BUCKET.get(r2TempKey);
              if (!r2File) {
                throw new Error('File not found in R2 after upload');
              }
              console.log('R2 verification successful');
            } catch (verifyErr) {
              console.error('R2 verification failed:', verifyErr);
              return json({
                error: 'R2 upload verification failed: ' + verifyErr.message,
                stage: 'r2-verify',
                details: verifyErr.stack
              }, 500);
            }

            // Get order details for Archive.org metadata
            const orderIdFromQuery = url.searchParams.get('orderId');
            let resolvedOrderId = orderIdFromQuery;
            if (!resolvedOrderId) {
              const match = itemId.match(/^delivery_(.+?)_\d+$/);
              if (match) {
                resolvedOrderId = match[1];
              }
            }

            let archiveDescription = '';
            if (resolvedOrderId) {
              try {
                const orderRow = await env.DB.prepare(
                  'SELECT o.order_id, p.title AS product_title, p.description AS product_description FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_id = ?'
                ).bind(resolvedOrderId).first();

                if (orderRow) {
                  const productTitle = orderRow.product_title || '';
                  const productDescription = orderRow.product_description || '';

                  if (productDescription) {
                    archiveDescription = productTitle
                      ? `${productTitle} - ${productDescription}`
                      : productDescription;
                  } else {
                    archiveDescription = `Order #${orderRow.order_id} - ${productTitle || 'Video Delivery'}`;
                  }
                } else {
                  archiveDescription = `Order #${resolvedOrderId} video delivery`;
                }
              } catch (dbErr) {
                console.warn('Could not fetch order details:', dbErr);
                archiveDescription = `Order #${resolvedOrderId} video delivery`;
              }
            } else {
              archiveDescription = `${isVideoUpload ? 'Video' : 'File'} uploaded via order delivery system`;
            }

            const archiveHeaders = {
              Authorization: `LOW ${env.ARCHIVE_ACCESS_KEY}:${env.ARCHIVE_SECRET_KEY}`,
              'Content-Type': contentType,
              'x-archive-auto-make-bucket': '1',
              'x-archive-meta-mediatype': isVideoUpload ? 'movies' : 'data',
              'x-archive-meta-collection': isVideoUpload ? 'opensource_movies' : 'opensource',
              'x-archive-meta-title': normalizeArchiveMetaValue(originalFilename || filename),
              'x-archive-meta-description': normalizeArchiveMetaValue(archiveDescription),
              'x-archive-meta-subject': 'video; delivery',
              'x-archive-meta-language': 'eng'
            };

            console.log('Archive.org Upload Metadata:', {
              isVideo: isVideo,
              isVideoUpload: isVideoUpload,
              contentType: contentType,
              mediatype: archiveHeaders['x-archive-meta-mediatype'],
              filename: filename,
              itemId: itemId
            });

            // STAGE 2: Upload to Archive.org
            console.log('STAGE 2: Uploading to Archive.org...');
            const archiveUrl = `https://s3.us.archive.org/${itemId}/${filename}`;
            let archiveResp;
            try {
              archiveResp = await fetch(archiveUrl, {
                method: 'PUT',
                headers: archiveHeaders,
                body: buf
              });

              if (!archiveResp.ok) {
                const errorText = await archiveResp.text().catch(() => 'Unknown error');
                console.error('Archive.org upload failed:', archiveResp.status, errorText);
                return json({
                  error: 'Archive.org upload failed',
                  status: archiveResp.status,
                  details: errorText,
                  stage: 'archive-upload',
                  r2Uploaded: true
                }, 502);
              }
              console.log('Archive.org upload successful, status:', archiveResp.status);
            } catch (archiveErr) {
              console.error('Archive.org upload network error:', archiveErr);
              return json({
                error: 'Failed to connect to Archive.org: ' + archiveErr.message,
                stage: 'archive-connect',
                details: archiveErr.message,
                r2Uploaded: true
              }, 502);
            }

            // STAGE 3: Wait for Archive.org to index the file
            console.log('STAGE 3: Waiting for Archive.org indexing...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // STAGE 4: Verify Archive.org file is accessible
            console.log('STAGE 4: Verifying Archive.org file...');
            const downloadUrl = `https://archive.org/download/${itemId}/${filename}`;
            const embedUrl = `https://archive.org/details/${itemId}`;
            
            let verifyAttempts = 0;
            const maxVerifyAttempts = 3;
            let archiveVerified = false;

            while (verifyAttempts < maxVerifyAttempts && !archiveVerified) {
              verifyAttempts++;
              try {
                const verifyResp = await fetch(downloadUrl, { method: 'HEAD' });
                if (verifyResp.ok) {
                  console.log('Archive.org file verified at attempt', verifyAttempts);
                  archiveVerified = true;
                  break;
                } else if (verifyResp.status === 404 && verifyAttempts < maxVerifyAttempts) {
                  console.log(`Archive.org file not yet available (attempt ${verifyAttempts}/${maxVerifyAttempts}), waiting...`);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                  console.warn(`Archive.org verification returned status ${verifyResp.status}`);
                  break;
                }
              } catch (verifyErr) {
                console.warn(`Archive.org verification attempt ${verifyAttempts} failed:`, verifyErr.message);
                if (verifyAttempts < maxVerifyAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
            }

            if (!archiveVerified) {
              console.warn('Archive.org file could not be verified, but upload was successful');
            }

            console.log('Upload complete - both R2 and Archive.org successful');
            return json({ 
              success: true, 
              url: downloadUrl,
              embedUrl: embedUrl,
              itemId: itemId,
              filename: filename,
              r2Verified: true,
              archiveVerified: archiveVerified,
              isVideo: isVideoUpload
            });

          } catch (err) {
            console.error('Customer file upload error:', err);
            return json({
              error: 'Upload failed: ' + err.message,
              details: err.stack,
              stage: 'unknown'
            }, 500);
          }
        }

        // ----- ORDER ENCRYPTED FILE UPLOAD -----
        // This endpoint allows the admin UI to upload a file for a specific order.
        // The file will be stored in the configured R2 bucket and the order record
        // can be updated with a link to the uploaded file. This mirrors the
        // expectation of the admin/orders.js front‑end which calls
        // `/api/order/upload-encrypted-file`.
        if (method === 'POST' && path === '/api/order/upload-encrypted-file') {
          if (!env.R2_BUCKET) {
            return json({ error: 'R2 not configured' }, 500);
          }
          const orderId = url.searchParams.get('orderId');
          const itemId = url.searchParams.get('itemId');
          const filename = url.searchParams.get('filename');
          if (!orderId || !itemId || !filename) {
            return json({ error: 'orderId, itemId and filename required' }, 400);
          }
          // Read the request body into a buffer
          const fileBuf = await req.arrayBuffer();
          const key = `orders/${orderId}/${itemId}/${filename}`;
          await env.R2_BUCKET.put(key, fileBuf, {
            httpMetadata: { contentType: req.headers.get('content-type') || 'application/octet-stream' }
          });
          // You could update the orders table with the uploaded file key or URL here.
          // We return the R2 key so the caller can take further action if needed.
          return json({ success: true, r2Key: key });
        }

        // ----- PAGE BUILDER SAVE (plural) -----
        // The page builder UI posts to /api/pages/save with a JSON body containing a
        // `name` (used as slug/title) and `html` (the full HTML document). Because the
        // existing API only exposes singular `/api/page/save`, we implement this
        // convenience endpoint here. If a page with the same slug already exists,
        // it is updated instead of inserted. The HTML is stored verbatim in the
        // pages table's content column.
        if (method === 'POST' && path === '/api/pages/save') {
          const body = await req.json();
          const name = (body.name || '').trim();
          const html = (body.html || '').trim();
          if (!name || !html) {
            return json({ error: 'name and html required' }, 400);
          }
          // Sanitize the slug: lower‑case and replace non‑alphanumeric characters with dashes
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          // Check if page already exists
          const existing = await env.DB.prepare('SELECT id FROM pages WHERE slug = ?').bind(slug).first();
          if (existing) {
            await env.DB.prepare(
              'UPDATE pages SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            ).bind(name, html, existing.id).run();
          } else {
            await env.DB.prepare(
              'INSERT INTO pages (slug, title, content, meta_description, status) VALUES (?, ?, ?, ?, ?)'
            ).bind(slug, name, html, '', 'published').run();
          }
          return json({ success: true, slug });
        }

        // ----- PAGES LIST (plural) -----
        // Returns a list of pages stored in the pages table, formatted for the
        // admin UI. Each entry includes a `name` (slug), `url` (path to the
        // generated static file), `uploaded` timestamp, and estimated `size`
        // (length of the HTML content). This endpoint exists to support
        // admin/pages.html which expects `/api/pages/list`.
        if (method === 'GET' && path === '/api/pages/list') {
          // Return all pages with their publish status. The admin UI uses this to
          // display published/draft pages and provide actions.  Selecting the
          // status column allows distinguishing between published and draft.
          const r = await env.DB.prepare(
            'SELECT slug, title, content, created_at, status FROM pages ORDER BY id DESC'
          ).all();
          const pages = (r.results || []).map(p => {
            const size = p.content ? p.content.length : 0;
            // Convert created_at to ISO 8601 format with Z suffix for UTC
            let createdAt = p.created_at;
            if (createdAt && typeof createdAt === 'string') {
              createdAt = createdAt.replace(' ', 'T') + 'Z';
            }
            return {
              name: p.slug,
              slug: p.slug,
              title: p.title,
              url: `/${p.slug}.html`,
              uploaded: createdAt,
              size: size,
              status: p.status || 'published'
            };
          });
          return json({ success: true, pages });
        }

        // ----- PAGES DELETE (plural) -----
        // Deletes a page by slug/name. Accepts a JSON body with a `name` field.
        // Returns success if the page was removed. This mirrors the admin UI
        // expectation that deletion happens via POST to `/api/pages/delete`.
        if (method === 'POST' && path === '/api/pages/delete') {
          const body = await req.json().catch(() => ({}));
          const name = (body.name || '').trim();
          if (!name) {
            return json({ error: 'name required' }, 400);
          }
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          await env.DB.prepare('DELETE FROM pages WHERE slug = ?').bind(slug).run();
          return json({ success: true });
        }

        // ----- PAGES STATUS UPDATE -----
        // Update the publish status of a page. Accepts JSON with `name` (slug)
        // and `status` ('published' or 'draft'). Updates the status column
        // accordingly. Returns an error if the page does not exist.
        if (method === 'POST' && path === '/api/pages/status') {
          const body = await req.json().catch(() => ({}));
          const name = (body.name || '').trim();
          const status = (body.status || '').trim().toLowerCase();
          if (!name || !status) {
            return json({ error: 'name and status required' }, 400);
          }
          if (status !== 'published' && status !== 'draft') {
            return json({ error: 'invalid status' }, 400);
          }
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const existing = await env.DB.prepare('SELECT id FROM pages WHERE slug = ?').bind(slug).first();
          if (!existing) {
            return json({ error: 'Page not found' }, 404);
          }
          await env.DB.prepare('UPDATE pages SET status = ? WHERE slug = ?').bind(status, slug).run();
          return json({ success: true });
        }

        // ----- PAGES DUPLICATE -----
        // Duplicate an existing page into a draft. Accepts JSON with `name`
        // (slug of the existing page). Copies title, content and meta description,
        // derives a new slug by appending '-copy' and ensures uniqueness.
        if (method === 'POST' && path === '/api/pages/duplicate') {
          const body = await req.json().catch(() => ({}));
          const name = (body.name || '').trim();
          if (!name) {
            return json({ error: 'name required' }, 400);
          }
          const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const row = await env.DB.prepare('SELECT title, content, meta_description FROM pages WHERE slug = ?').bind(baseSlug).first();
          if (!row) {
            return json({ error: 'Page not found' }, 404);
          }
          // Determine new slug by adding '-copy' and ensuring uniqueness
          let newSlug = baseSlug + '-copy';
          let idx = 1;
          let exists = await env.DB.prepare('SELECT slug FROM pages WHERE slug = ?').bind(newSlug).first();
          while (exists) {
            newSlug = `${baseSlug}-copy${idx}`;
            idx++;
            exists = await env.DB.prepare('SELECT slug FROM pages WHERE slug = ?').bind(newSlug).first();
          }
          const newTitle = (row.title || baseSlug) + ' Copy';
          const metaDesc = row.meta_description || '';
          await env.DB.prepare(
            'INSERT INTO pages (slug, title, content, meta_description, status) VALUES (?, ?, ?, ?, ?)'
          ).bind(newSlug, newTitle, row.content || '', metaDesc, 'draft').run();
          return json({ success: true, slug: newSlug });
        }

        // ----- PAGE BUILDER LOAD (plural) -----
        // Fetch and parse a saved landing page for editing in the builder. The
        // builder expects separate `html` (the body content) and `css` (style) fields.
        if (method === 'GET' && path === '/api/pages/load') {
          const name = url.searchParams.get('name');
          if (!name) {
            return json({ error: 'name required' }, 400);
          }
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const row = await env.DB.prepare('SELECT content FROM pages WHERE slug = ?').bind(slug).first();
          if (!row) {
            return json({ error: 'Page not found' }, 404);
          }
          let full = row.content || '';
          let css = '';
          let htmlBody = '';
          try {
            // Extract CSS between <style> tags
            const styleMatch = full.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
            if (styleMatch) {
              css = styleMatch[1];
            }
            // Extract body content between <body> tags
            const bodyMatch = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            htmlBody = bodyMatch ? bodyMatch[1] : full;
          } catch (e) {
            htmlBody = full;
          }
          return json({ success: true, html: htmlBody.trim(), css: css.trim() });
        }

        // ----- WEBHOOK -----
        if (method === 'POST' && path === '/api/whop/webhook') {
          const body = await req.text();
          console.log('Webhook received:', body.substring(0, 200));
          return new Response('OK', { status: 200 });
        }

        return json({ error: 'API endpoint not found', path, method }, 404);
      }

      // ===== SECURE DOWNLOAD =====
      if (path.startsWith('/download/')) {
        const orderId = path.split('/').pop();
        const order = await env.DB.prepare(
          'SELECT archive_url, delivered_video_url FROM orders WHERE order_id = ?'
        ).bind(orderId).first();

        const sourceUrl = (order?.delivered_video_url || order?.archive_url || '').toString().trim();

        if (!sourceUrl) {
          return new Response('Download link expired or not found', { status: 404 });
        }

        const lowered = sourceUrl.toLowerCase();
        const openOnly =
          lowered.includes('youtube.com') ||
          lowered.includes('youtu.be') ||
          lowered.includes('vimeo.com') ||
          lowered.includes('iframe.mediadelivery.net/embed/') ||
          lowered.includes('video.bunnycdn.com/play/') ||
          (lowered.includes('archive.org/details/') && !lowered.includes('/download/'));

        if (openOnly) {
          return Response.redirect(sourceUrl, 302);
        }

        const fileResp = await fetch(sourceUrl);
        if (!fileResp.ok) {
          return new Response('File not available', { status: 404 });
        }

        const srcUrl = new URL(sourceUrl, url.origin);
        let filename = srcUrl.pathname.split('/').pop() || 'video.mp4';
        try {
          filename = decodeURIComponent(filename);
        } catch (_) {}
        filename = filename.replace(/"/g, '');

        const contentTypeHeader = (fileResp.headers.get('content-type') || '').split(';')[0].trim();
        const contentType = contentTypeHeader || getMimeTypeFromFilename(filename) || 'application/octet-stream';

        const headers = new Headers({ ...CORS });
        headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);

        const contentLength = fileResp.headers.get('content-length');
        if (contentLength) {
          headers.set('Content-Length', contentLength);
        }

        return new Response(fileResp.body, {
          status: 200,
          headers
        });
      }

      // ===== ADMIN SPA ROUTING =====
      // All /admin/* routes (except API endpoints) serve the unified dashboard.html
      // This enables the Single Page Application (SPA) structure for the admin panel
      if (path.startsWith('/admin/') && !path.startsWith('/api/')) {
        // Special handling for standalone pages that remain separate
        if (path.endsWith('/page-builder.html') || 
            path.endsWith('/landing-builder.html') ||
            path.endsWith('/product-form.html')) {
          // These pages are served directly as they are complex standalone apps
          // Let them fall through to the asset serving logic below
        } else if (path === '/admin/' || path === '/admin' || path.endsWith('/dashboard.html')) {
          // Serve the main dashboard.html for root admin path
          if (env.ASSETS) {
            const assetResp = await env.ASSETS.fetch(new Request(new URL('/admin/dashboard.html', req.url)));
            const headers = new Headers(assetResp.headers);
            headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('X-Worker-Version', VERSION);
            return new Response(assetResp.body, {
              status: assetResp.status,
              headers
            });
          }
        } else if (path.endsWith('.html')) {
          // For any other /admin/*.html requests, redirect to dashboard.html
          // This ensures all old fragmented pages load as the unified dashboard
          if (env.ASSETS) {
            const assetResp = await env.ASSETS.fetch(new Request(new URL('/admin/dashboard.html', req.url)));
            const headers = new Headers(assetResp.headers);
            headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('X-Worker-Version', VERSION);
            return new Response(assetResp.body, {
              status: assetResp.status,
              headers
            });
          }
        }
      }

      // ===== DYNAMIC PAGES =====
      // Serve saved landing pages from the pages table. If the request path ends
      // with `.html` and a corresponding page exists in the database, return its
      // HTML content. This allows pages saved via the page builder to be
      // accessed at `/{slug}.html`.
      if (path.endsWith('.html') && !path.includes('/admin/')) {
        const slug = path.slice(1).replace(/\.html$/, '');
        try {
          const row = await env.DB.prepare('SELECT content FROM pages WHERE slug = ? AND status = ?').bind(slug, 'published').first();
          if (row && row.content) {
            return new Response(row.content, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }
        } catch (e) {
          // continue to static assets
        }
      }

      // ===== STATIC ASSETS WITH SERVER-SIDE SCHEMA INJECTION =====
      if (env.ASSETS) {
        /*
         * Serve static assets from the bound ASSETS namespace.  We wrap the
         * returned response to add headers that prevent stale caching on the
         * Cloudflare edge and include a custom version header.  Without these
         * headers it is possible for older builds to persist at the edge or in
         * the browser cache.  See https://developers.cloudflare.com/workers/
         * for guidance on controlling caching behavior.
         */
        const assetResp = await env.ASSETS.fetch(req);
        
        // For HTML pages with schema placeholders, inject server-side schemas
        const contentType = assetResp.headers.get('content-type') || '';
        const isHTML = contentType.includes('text/html');
        const isSuccess = assetResp.status === 200;
        
        if (isHTML && isSuccess) {
          try {
            const baseUrl = url.origin;
            let html = await assetResp.text();
            
            // Product detail page - inject individual product schema
            if (path === '/product.html' || path === '/product') {
              const productId = url.searchParams.get('id');
              if (productId && env.DB) {
                await initDB(env);
                const product = await env.DB.prepare(`
                  SELECT p.*, 
                    COUNT(r.id) as review_count, 
                    AVG(r.rating) as rating_average
                  FROM products p
                  LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                  WHERE p.id = ?
                  GROUP BY p.id
                `).bind(Number(productId)).first();
                
                if (product) {
                  // Fetch individual reviews for schema
                  const reviewsResult = await env.DB.prepare(`
                    SELECT * FROM reviews
                    WHERE product_id = ? AND status = 'approved'
                    ORDER BY created_at DESC
                    LIMIT 5
                  `).bind(Number(productId)).all();
                  let reviews = reviewsResult.results || [];

                  // Convert created_at to ISO 8601 format with Z suffix for UTC
                  reviews = reviews.map(review => {
                    if (review.created_at && typeof review.created_at === 'string') {
                      review.created_at = review.created_at.replace(' ', 'T') + 'Z';
                    }
                    return review;
                  });

                  const schemaJson = generateProductSchema(product, baseUrl, reviews);
                  html = injectSchemaIntoHTML(html, 'product-schema', schemaJson);
                }
              }
            }
            // Product listing pages - inject collection schema
            else if (path === '/index.html' || path === '/' || 
                     path === '/products-grid.html' ||
                     path === '/all-products' || path === '/all-products.html') {
              if (env.DB) {
                await initDB(env);
                const result = await env.DB.prepare(`
                  SELECT p.id, p.title, p.slug, p.description, 
                    p.thumbnail_url, p.normal_price, p.sale_price,
                    COUNT(r.id) as review_count, 
                    AVG(r.rating) as rating_average
                  FROM products p
                  LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                  WHERE p.status = 'active'
                  GROUP BY p.id
                  ORDER BY p.sort_order ASC, p.id DESC
                  LIMIT 50
                `).all();
                
                const products = result.results || [];
                if (products.length > 0) {
                  const schemaJson = generateCollectionSchema(products, baseUrl);
                  html = injectSchemaIntoHTML(html, 'collection-schema', schemaJson);
                }
              }
            }
            
            const headers = new Headers(assetResp.headers);
            headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('X-Worker-Version', VERSION);
            headers.set('Content-Type', 'text/html; charset=utf-8');
            
            return new Response(html, {
              status: assetResp.status,
              headers
            });
          } catch (err) {
            console.error('Schema injection error:', err);
            // Fall through to default asset serving on error
          }
        }
        
        // For non-HTML assets or on error, serve normally
        const headers = new Headers(assetResp.headers);
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        headers.set('Pragma', 'no-cache');
        headers.set('X-Worker-Version', VERSION);
        return new Response(assetResp.body, {
          status: assetResp.status,
          headers
        });
      }

      return new Response('Worker is running', { headers: { 'Content-Type': 'text/plain' } });

    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: err.message, stack: err.stack }, 500);
    }
  },

  // Scheduled handler for Cloudflare Cron Triggers
  // This runs automatically based on cron schedule in wrangler.toml
  async scheduled(event, env, ctx) {
    console.log('🕒 Scheduled cleanup running...');
    
    try {
      // Initialize database
      await initDB(env);
      
      if (!env.WHOP_API_KEY) {
        console.error('WHOP_API_KEY not configured, skipping cleanup');
        return;
      }
      
      // Get expired checkouts
      const expiredCheckouts = await env.DB.prepare(`
        SELECT checkout_id, product_id, expires_at
        FROM checkout_sessions
        WHERE status = 'pending' 
        AND datetime(expires_at) < datetime('now')
        ORDER BY created_at ASC
        LIMIT 50
      `).all();
      
      let deleted = 0;
      let failed = 0;
      
      for (const checkout of (expiredCheckouts.results || [])) {
        try {
          // Delete from Whop
          const deleteResponse = await fetch(`https://api.whop.com/api/v2/checkout_sessions/${checkout.checkout_id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${env.WHOP_API_KEY}`
            }
          });
          
          if (deleteResponse.ok || deleteResponse.status === 404) {
            // Mark as expired in database
            await env.DB.prepare(`
              UPDATE checkout_sessions 
              SET status = 'expired', completed_at = datetime('now')
              WHERE checkout_id = ?
            `).bind(checkout.checkout_id).run();
            
            deleted++;
            console.log('🗑️ Expired checkout deleted:', checkout.checkout_id);
          } else {
            failed++;
            console.error('Failed to delete checkout:', checkout.checkout_id, deleteResponse.status);
          }
        } catch (e) {
          failed++;
          console.error('Error deleting checkout:', checkout.checkout_id, e.message);
        }
      }
      
      console.log(`✅ Cleanup complete: ${deleted} deleted, ${failed} failed`);
    } catch (err) {
      console.error('Scheduled cleanup error:', err);
    }
  }
};
