var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/config/cors.js
var DEFAULT_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-API-Key",
  "Accept",
  "Origin"
];
function mergeAllowedHeaders(requestedHeaders = "") {
  const headers = new Set(DEFAULT_ALLOWED_HEADERS);
  for (const rawHeader of String(requestedHeaders || "").split(",")) {
    const header = rawHeader.trim();
    if (header) headers.add(header);
  }
  return Array.from(headers).join(", ");
}
__name(mergeAllowedHeaders, "mergeAllowedHeaders");
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": mergeAllowedHeaders(),
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin, Access-Control-Request-Headers",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache"
};
function handleOptions(req) {
  const requestHeaders = req?.headers?.get("Access-Control-Request-Headers") || "";
  return new Response(null, {
    headers: {
      ...CORS,
      "Access-Control-Allow-Headers": mergeAllowedHeaders(requestHeaders)
    }
  });
}
__name(handleOptions, "handleOptions");

// src/utils/product-visibility.js
var PUBLIC_PRODUCT_COLUMN_CACHE_TTL_MS = 60 * 1e3;
var PUBLIC_PRODUCT_STATUSES = Object.freeze(["active", "published", "live", "public"]);
var productColumnsCache = null;
var productColumnsCacheTime = 0;
function buildPublicProductStatusWhere(columnRef = "status") {
  const column = String(columnRef || "status").trim() || "status";
  const visibleStatuses = PUBLIC_PRODUCT_STATUSES.map((status) => `'${status}'`).join(", ");
  return `(${column} IS NULL OR TRIM(${column}) = '' OR LOWER(TRIM(${column})) IN (${visibleStatuses}))`;
}
__name(buildPublicProductStatusWhere, "buildPublicProductStatusWhere");
async function getProductTableColumns(env) {
  if (!env?.DB) return /* @__PURE__ */ new Set();
  const now = Date.now();
  if (productColumnsCache && now - productColumnsCacheTime < PUBLIC_PRODUCT_COLUMN_CACHE_TTL_MS) {
    return new Set(productColumnsCache);
  }
  try {
    const result = await env.DB.prepare("PRAGMA table_info(products)").all();
    const cols = new Set(
      (result.results || []).map((row) => String(row.name || "").trim().toLowerCase()).filter(Boolean)
    );
    productColumnsCache = Array.from(cols);
    productColumnsCacheTime = now;
    return cols;
  } catch (_) {
    return new Set(productColumnsCache || []);
  }
}
__name(getProductTableColumns, "getProductTableColumns");
function clearProductTableColumnsCache() {
  productColumnsCache = null;
  productColumnsCacheTime = 0;
}
__name(clearProductTableColumnsCache, "clearProductTableColumnsCache");

// src/config/db.js
var dbReady = false;
var migrationsDone = false;
var pagesMigrationDone = false;
var initPromise = null;
var initStartTime = 0;
var DB_INIT_TIMEOUT_MS = 5e3;
async function initDB(env, ctx2) {
  if (dbReady || !env.DB) return;
  if (env.PAGE_CACHE) {
    try {
      const isInit = await env.PAGE_CACHE.get("sys_db_init_v1");
      if (isInit === "true") {
        dbReady = true;
        migrationsDone = true;
        pagesMigrationDone = true;
        return;
      }
    } catch (e) {
    }
  }
  try {
    const check = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").first();
    if (check) {
      dbReady = true;
      migrationsDone = true;
      pagesMigrationDone = true;
      if (env.PAGE_CACHE && ctx2 && ctx2.waitUntil) {
        ctx2.waitUntil(env.PAGE_CACHE.put("sys_db_init_v1", "true", { expirationTtl: 86400 * 30 }));
      }
      return;
    }
  } catch (e) {
  }
  if (initPromise) {
    if (initStartTime && Date.now() - initStartTime > DB_INIT_TIMEOUT_MS) {
      console.warn("DB init timeout - proceeding without waiting");
      return;
    }
    return await initPromise;
  }
  initStartTime = Date.now();
  initPromise = (async () => {
    try {
      await env.DB.batch([
        // Products table
        env.DB.prepare(`
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
            featured INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `),
        // Orders table
        env.DB.prepare(`
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
        `),
        // Reviews table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER, author_name TEXT, rating INTEGER, comment TEXT,
            status TEXT DEFAULT 'approved',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            order_id TEXT, show_on_product INTEGER DEFAULT 1,
            delivered_video_url TEXT, delivered_thumbnail_url TEXT
          )
        `),
        // Index for reviews by product
        env.DB.prepare(`
          CREATE INDEX IF NOT EXISTS idx_reviews_product_id
          ON reviews(product_id)
        `),
        // Settings table
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`),
        // Backups table (JSON exports)
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, size INTEGER DEFAULT 0, media_count INTEGER DEFAULT 0, data TEXT, r2_key TEXT)`),
        // Pages table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE, title TEXT, content TEXT,
            meta_description TEXT, 
            page_type TEXT DEFAULT 'custom',
            is_default INTEGER DEFAULT 0,
            status TEXT DEFAULT 'published',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `),
        // Checkout sessions table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS checkout_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checkout_id TEXT UNIQUE,
            product_id INTEGER,
            plan_id TEXT,
            metadata TEXT,
            expires_at DATETIME,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
          )
        `),
        // Chat sessions table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            blocked INTEGER DEFAULT 0,
            last_message_content TEXT,
            last_message_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `),
        // Chat messages table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
          )
        `),
        // Index for chat messages
        env.DB.prepare(`
          CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_id
          ON chat_messages(session_id, id)
        `),
        // Blogs table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS blogs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE,
            description TEXT,
            content TEXT,
            thumbnail_url TEXT,
            custom_css TEXT,
            custom_js TEXT,
            seo_title TEXT,
            seo_description TEXT,
            seo_keywords TEXT,
            status TEXT DEFAULT 'draft',
            created_at INTEGER,
            updated_at INTEGER
          )
        `),
        // Blog comments table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS blog_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blog_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            comment TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at INTEGER,
            FOREIGN KEY (blog_id) REFERENCES blogs(id)
          )
        `),
        // Forum questions table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS forum_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE,
            content TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            reply_count INTEGER DEFAULT 0,
            created_at INTEGER,
            updated_at INTEGER
          )
        `),
        // Forum replies table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS forum_replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at INTEGER,
            FOREIGN KEY (question_id) REFERENCES forum_questions(id)
          )
        `),
        // Coupons table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            discount_type TEXT DEFAULT 'percentage',
            discount_value REAL NOT NULL,
            min_order_amount REAL DEFAULT 0,
            max_uses INTEGER DEFAULT 0,
            used_count INTEGER DEFAULT 0,
            valid_from INTEGER,
            valid_until INTEGER,
            product_ids TEXT,
            status TEXT DEFAULT 'active',
            created_at INTEGER
          )
        `),
        // API Keys table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key_name TEXT NOT NULL,
            key_value TEXT UNIQUE NOT NULL,
            permissions TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            usage_count INTEGER DEFAULT 0,
            last_used_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME
          )
        `),
        // SEO Minimal settings table
        env.DB.prepare(`
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
        `),
        // SEO Visibility tables
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS noindex_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url_pattern TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `),
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS index_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url_pattern TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `),
        // Additional integrations
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS payment_gateways (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            gateway_type TEXT DEFAULT '',
            webhook_url TEXT,
            webhook_secret TEXT,
            custom_code TEXT,
            is_enabled INTEGER DEFAULT 1,
            whop_product_id TEXT DEFAULT '',
            whop_api_key TEXT DEFAULT '',
            whop_theme TEXT DEFAULT 'light',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `),
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS webhook_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gateway TEXT NOT NULL,
            event_id TEXT UNIQUE NOT NULL,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `),
        env.DB.prepare(`
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
        `),
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS email_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT UNIQUE,
            subject TEXT,
            body TEXT,
            is_active INTEGER DEFAULT 1
          )
        `),
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            source TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `),
        env.DB.prepare(`
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
        `),
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS settings_media_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            r2_key TEXT NOT NULL UNIQUE,
            size_bytes INTEGER DEFAULT 0,
            content_type TEXT DEFAULT 'video/mp4',
            uploaded_at INTEGER NOT NULL
          )
        `),
        // API Key usage logs table
        env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS api_key_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            api_key_id INTEGER NOT NULL,
            endpoint TEXT NOT NULL,
            method TEXT NOT NULL,
            status_code INTEGER,
            response_time_ms INTEGER,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
          )
        `),
        // Index for API key usage logs
        env.DB.prepare(`
          CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id
          ON api_key_usage(api_key_id)
        `)
      ]);
      dbReady = true;
      if (env.PAGE_CACHE && ctx2 && ctx2.waitUntil) {
        ctx2.waitUntil(env.PAGE_CACHE.put("sys_db_init_v1", "true", { expirationTtl: 86400 * 30 }));
      }
      console.log(`DB init completed in ${Date.now() - initStartTime}ms`);
      if (!migrationsDone) {
        const migPromise = runMigrations(env).then(() => {
          migrationsDone = true;
        }).catch((e) => console.error("DB Migration error:", e));
        if (ctx2 && ctx2.waitUntil) ctx2.waitUntil(migPromise);
      }
      if (!pagesMigrationDone) {
        const pageMigPromise = runPagesMigration(env).then(() => {
          pagesMigrationDone = true;
        }).catch((e) => console.error("DB Page migration error:", e));
        if (ctx2 && ctx2.waitUntil) ctx2.waitUntil(pageMigPromise);
      }
    } catch (e) {
      console.error("DB init error:", e);
      initPromise = null;
      initStartTime = 0;
    }
  })();
  return await initPromise;
}
__name(initDB, "initDB");
async function runPagesMigration(env) {
  const pagesMigrations = [
    { column: "page_type", type: "TEXT DEFAULT 'custom'" },
    { column: "is_default", type: "INTEGER DEFAULT 0" },
    { column: "feature_image_url", type: "TEXT" }
  ];
  for (const m of pagesMigrations) {
    try {
      await env.DB.prepare(`ALTER TABLE pages ADD COLUMN ${m.column} ${m.type}`).run();
      console.log(`Added pages.${m.column}`);
    } catch (e) {
    }
  }
}
__name(runPagesMigration, "runPagesMigration");
async function runMigrations(env) {
  const migrations = [
    { table: "products", column: "gallery_images", type: "TEXT" },
    { table: "products", column: "featured", type: "INTEGER DEFAULT 0" },
    { table: "products", column: "created_at", type: "DATETIME" },
    { table: "products", column: "updated_at", type: "DATETIME" },
    { table: "orders", column: "delivered_video_metadata", type: "TEXT" },
    { table: "orders", column: "tip_paid", type: "INTEGER DEFAULT 0" },
    { table: "orders", column: "tip_amount", type: "REAL" },
    { table: "reviews", column: "delivered_video_url", type: "TEXT" },
    { table: "reviews", column: "delivered_thumbnail_url", type: "TEXT" },
    { table: "chat_sessions", column: "blocked", type: "INTEGER DEFAULT 0" },
    { table: "chat_sessions", column: "last_message_content", type: "TEXT" },
    { table: "chat_sessions", column: "last_message_at", type: "DATETIME" },
    { table: "checkout_sessions", column: "metadata", type: "TEXT" },
    { table: "orders", column: "revision_reason", type: "TEXT" },
    { table: "payment_gateways", column: "gateway_type", type: "TEXT DEFAULT ''" },
    { table: "payment_gateways", column: "whop_product_id", type: "TEXT DEFAULT ''" },
    { table: "payment_gateways", column: "whop_api_key", type: "TEXT DEFAULT ''" },
    { table: "payment_gateways", column: "whop_theme", type: "TEXT DEFAULT 'light'" }
  ];
  for (const m of migrations) {
    try {
      await env.DB.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`).run();
    } catch (e) {
    }
  }
  try {
    await env.DB.prepare(`
      UPDATE products
      SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
      WHERE created_at IS NULL
    `).run();
  } catch (_) {
  }
  try {
    await env.DB.prepare(`
      UPDATE products
      SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
      WHERE updated_at IS NULL
    `).run();
  } catch (_) {
  }
  try {
    const dups = await env.DB.prepare("SELECT slug FROM products WHERE slug IS NOT NULL GROUP BY slug HAVING COUNT(*) > 1").all();
    if (dups && dups.results && dups.results.length > 0) {
      for (const d of dups.results) {
        const rows = await env.DB.prepare("SELECT id FROM products WHERE slug = ? ORDER BY id ASC").bind(d.slug).all();
        if (rows && rows.results && rows.results.length > 1) {
          for (let i = 1; i < rows.results.length; i++) {
            const rowId = rows.results[i].id;
            await env.DB.prepare("UPDATE products SET slug = ? WHERE id = ?").bind(`${d.slug}-${rowId}`, rowId).run();
          }
        }
      }
    }
  } catch (e) {
    console.error("Slug deduplication error:", e);
  }
  try {
    await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug)").run();
  } catch (e) {
    console.error("Index creation error:", e);
  }
  clearProductTableColumnsCache();
}
__name(runMigrations, "runMigrations");

// src/config/constants.js
var VERSION = "15";
function setVersion(value) {
  const v = value === void 0 || value === null ? "" : String(value).trim();
  if (v) VERSION = v;
}
__name(setVersion, "setVersion");

// src/utils/response.js
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", ...extraHeaders }
  });
}
__name(json, "json");
function cachedJson(data, maxAge = 60) {
  return json(data, 200, {
    "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge * 2}, stale-while-revalidate=${maxAge * 4}`
  });
}
__name(cachedJson, "cachedJson");
function csvResponse(csvString, filename) {
  return new Response(csvString, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
__name(csvResponse, "csvResponse");

// src/utils/auth.js
var ADMIN_COOKIE = "admin_session";
var ADMIN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
function base64url(bytes) {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64url, "base64url");
async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64url(new Uint8Array(sig));
}
__name(hmacSha256, "hmacSha256");
function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const [k, ...rest] = p.trim().split("=");
    if (k === name) return rest.join("=") || "";
  }
  return null;
}
__name(getCookieValue, "getCookieValue");
async function isAdminAuthed(req, env) {
  const cookieHeader = req.headers.get("Cookie") || "";
  const value = getCookieValue(cookieHeader, ADMIN_COOKIE);
  if (!value) return false;
  const [tsStr, sig] = value.split(".");
  if (!tsStr || !sig) return false;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.floor((Date.now() - ts) / 1e3);
  if (ageSec < 0 || ageSec > ADMIN_MAX_AGE_SECONDS) return false;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const expected = await hmacSha256(secret, tsStr);
  return expected === sig;
}
__name(isAdminAuthed, "isAdminAuthed");
async function createAdminSessionCookie(env) {
  if (!env.ADMIN_SESSION_SECRET) return null;
  const tsStr = String(Date.now());
  const sig = await hmacSha256(env.ADMIN_SESSION_SECRET, tsStr);
  const cookieVal = `${tsStr}.${sig}`;
  return `${ADMIN_COOKIE}=${cookieVal}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_MAX_AGE_SECONDS}`;
}
__name(createAdminSessionCookie, "createAdminSessionCookie");
function createLogoutCookie() {
  return `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
__name(createLogoutCookie, "createLogoutCookie");

// src/utils/formatting.js
function escapeHtml(input) {
  return String(input ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
__name(escapeHtml, "escapeHtml");
function slugifyStr(input) {
  return String(input || "").toLowerCase().trim().replace(/['"`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
}
__name(slugifyStr, "slugifyStr");
function canonicalProductPath(product) {
  const id = product && product.id != null ? String(product.id) : "";
  const slug = product && product.slug ? String(product.slug) : slugifyStr(product && product.title ? product.title : "product");
  return `/product-${id}/${encodeURIComponent(slug)}`;
}
__name(canonicalProductPath, "canonicalProductPath");
function normalizeQuickAction(text) {
  return String(text || "").trim().replace(/\s+/g, " ").toLowerCase();
}
__name(normalizeQuickAction, "normalizeQuickAction");
function toISO8601(sqliteDate) {
  if (!sqliteDate) return null;
  const d = /* @__PURE__ */ new Date(sqliteDate.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? sqliteDate : d.toISOString();
}
__name(toISO8601, "toISO8601");
function normalizeArchiveMetaValue(value) {
  return (value || "").toString().replace(/[\r\n\t]+/g, " ").trim();
}
__name(normalizeArchiveMetaValue, "normalizeArchiveMetaValue");

// src/controllers/products.js
var productsCache = null;
var productsCacheTime = 0;
var PRODUCTS_CACHE_TTL = 3e4;
var productSlugCache = /* @__PURE__ */ new Map();
var SLUG_CACHE_TTL = 3e5;
async function getProductTimestampSupport(env) {
  const columns = await getProductTableColumns(env);
  return {
    hasCreatedAt: columns.has("created_at"),
    hasUpdatedAt: columns.has("updated_at")
  };
}
__name(getProductTimestampSupport, "getProductTimestampSupport");
function toCleanString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}
__name(toCleanString, "toCleanString");
function stripUrlQueryHash(raw) {
  const s = toCleanString(raw);
  if (!s) return "";
  return s.split("#")[0].split("?")[0];
}
__name(stripUrlQueryHash, "stripUrlQueryHash");
function isBadMediaValue(raw) {
  const s = stripUrlQueryHash(raw).toLowerCase();
  if (!s) return true;
  if (s === "null" || s === "undefined" || s === "false" || s === "true" || s === "0") return true;
  return false;
}
__name(isBadMediaValue, "isBadMediaValue");
function isLikelyVideoUrl(raw) {
  const s = stripUrlQueryHash(raw).toLowerCase();
  if (!s) return false;
  if (s.includes("youtube.com") || s.includes("youtu.be")) return true;
  return /\.(mp4|webm|mov|mkv|avi|m4v|flv|wmv|m3u8|mpd)(?:$)/i.test(s);
}
__name(isLikelyVideoUrl, "isLikelyVideoUrl");
function isLikelyImageUrl(raw) {
  const s = toCleanString(raw).toLowerCase();
  if (!s) return false;
  if (s.startsWith("data:image/")) return true;
  if (s.startsWith("/")) return true;
  if (s.startsWith("http://") || s.startsWith("https://")) return true;
  if (s.startsWith("//")) return true;
  return false;
}
__name(isLikelyImageUrl, "isLikelyImageUrl");
function coerceGalleryArray(value) {
  if (Array.isArray(value)) return value;
  const s = toCleanString(value);
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  if (s.includes(",")) {
    return s.split(",").map((v) => toCleanString(v)).filter(Boolean);
  }
  return [s];
}
__name(coerceGalleryArray, "coerceGalleryArray");
function normalizeGalleryImages(body) {
  const raw = body && (body.gallery_images ?? body.gallery_urls);
  const input = coerceGalleryArray(raw);
  const normalizedMainThumb = stripUrlQueryHash(body?.thumbnail_url || "");
  const normalizedVideo = stripUrlQueryHash(body?.video_url || "");
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of input) {
    const url = toCleanString(item);
    if (isBadMediaValue(url)) continue;
    if (isLikelyVideoUrl(url)) continue;
    if (!isLikelyImageUrl(url)) continue;
    const normalized = stripUrlQueryHash(url);
    if (!normalized) continue;
    if (normalizedMainThumb && normalized === normalizedMainThumb) continue;
    if (normalizedVideo && normalized === normalizedVideo) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(url);
    if (out.length >= 50) break;
  }
  return out;
}
__name(normalizeGalleryImages, "normalizeGalleryImages");
async function getProducts(env, url) {
  const params = url ? new URL(url).searchParams : { get: /* @__PURE__ */ __name(() => null, "get") };
  const page = parseInt(params.get("page")) || 1;
  const limitStr = params.get("limit");
  const limit = limitStr ? parseInt(limitStr) : 1e3;
  const offset = (page - 1) * limit;
  const filter = params.get("filter") || "all";
  const kvKey = `api_cache:products:list:${page}:${limit}:${filter}`;
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return cachedJson(JSON.parse(cached), 120);
      }
    } catch (e) {
    }
  }
  const now = Date.now();
  if (!limitStr && filter === "all" && productsCache && now - productsCacheTime < PRODUCTS_CACHE_TTL) {
    const defaultData = { products: productsCache, pagination: { page: 1, limit: 1e3, total: productsCache.length, pages: 1 } };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(defaultData), { expirationTtl: 86400 });
      } catch (e) {
      }
    }
    return cachedJson(defaultData, 120);
  }
  let whereClause = `WHERE ${buildPublicProductStatusWhere("p.status")}`;
  if (filter === "featured") {
    whereClause += " AND p.featured = 1";
  }
  const totalRow = await env.DB.prepare(`SELECT COUNT(*) as count FROM products p ${whereClause}`).first();
  const total = totalRow?.count || 0;
  const r = await env.DB.prepare(`
    SELECT
      p.id, p.title, p.slug, p.normal_price, p.sale_price,
      p.thumbnail_url, p.normal_delivery_text, p.instant_delivery,
      p.featured,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') as review_count,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'approved') as rating_average
    FROM products p
    ${whereClause}
    ORDER BY p.sort_order ASC, p.id DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();
  const products = (r.results || []).map((product) => ({
    ...product,
    delivery_time_days: parseInt(product.normal_delivery_text) || 1,
    review_count: product.review_count || 0,
    rating_average: product.rating_average ? Math.round(product.rating_average * 10) / 10 : 0
  }));
  if (!limitStr && filter === "all") {
    productsCache = products;
    productsCacheTime = Date.now();
  }
  const responseData = {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
  if (env.PAGE_CACHE) {
    try {
      await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
    } catch (e) {
    }
  }
  return cachedJson(responseData, 120);
}
__name(getProducts, "getProducts");
async function getProductsList(env) {
  const r = await env.DB.prepare(
    "SELECT id, title, slug, normal_price, sale_price, thumbnail_url, normal_delivery_text, instant_delivery, status FROM products ORDER BY id DESC"
  ).all();
  const products = (r.results || []).map((product) => ({
    ...product,
    delivery_time_days: parseInt(product.normal_delivery_text) || 1
  }));
  return json({ products });
}
__name(getProductsList, "getProductsList");
async function getProduct(env, id, opts = {}) {
  const includeHidden = !!opts.includeHidden;
  const kvKey = `api_cache:products:get:${id}:${includeHidden}`;
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return json(JSON.parse(cached));
      }
    } catch (e) {
    }
  }
  const visibilitySql = includeHidden ? "" : ` AND ${buildPublicProductStatusWhere("status")}`;
  let row;
  if (isNaN(Number(id))) {
    row = await env.DB.prepare(`SELECT * FROM products WHERE slug = ?${visibilitySql}`).bind(id).first();
  } else {
    row = await env.DB.prepare(`SELECT * FROM products WHERE id = ?${visibilitySql}`).bind(Number(id)).first();
  }
  if (!row) return json({ error: "Product not found" }, 404);
  let addons = [];
  try {
    addons = JSON.parse(row.addons_json || "[]");
  } catch (e) {
    console.error("Failed to parse addons_json for product", row.id, ":", e.message);
  }
  const [stats, reviewsResult] = await Promise.all([
    env.DB.prepare(
      "SELECT COUNT(*) as cnt, AVG(rating) as avg FROM reviews WHERE product_id = ? AND status = ?"
    ).bind(row.id, "approved").first(),
    env.DB.prepare(
      `SELECT reviews.*,
              -- Prefer review overrides first; fall back to order delivery links
              COALESCE(reviews.delivered_video_url, orders.delivered_video_url) as delivered_video_url,
              COALESCE(reviews.delivered_thumbnail_url, orders.delivered_thumbnail_url) as delivered_thumbnail_url,
              orders.delivered_video_metadata
       FROM reviews 
       LEFT JOIN orders ON reviews.order_id = orders.order_id 
       WHERE reviews.product_id = ? AND reviews.status = ? 
       ORDER BY reviews.created_at DESC`
    ).bind(row.id, "approved").all()
  ]);
  const reviews = (reviewsResult.results || []).map((review) => {
    if (review.created_at && typeof review.created_at === "string") {
      review.created_at = toISO8601(review.created_at);
    }
    if (review.updated_at && typeof review.updated_at === "string") {
      review.updated_at = toISO8601(review.updated_at);
    }
    return review;
  });
  const deliveryTimeDays = parseInt(row.normal_delivery_text) || 1;
  const responseData = {
    product: {
      ...row,
      delivery_time_days: deliveryTimeDays,
      addons,
      review_count: stats?.cnt || 0,
      rating_average: stats?.avg ? Math.round(stats.avg * 10) / 10 : 5,
      reviews
    },
    addons
  };
  if (env.PAGE_CACHE) {
    try {
      await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
    } catch (e) {
    }
  }
  return json(responseData);
}
__name(getProduct, "getProduct");
async function saveProduct(env, body) {
  const title = (body.title || "").trim();
  if (!title) return json({ error: "Title required" }, 400);
  productsCache = null;
  productsCacheTime = 0;
  let slug = (body.slug || "").trim() || slugifyStr(title);
  const addonsJson = JSON.stringify(body.addons || []);
  const galleryJson = JSON.stringify(normalizeGalleryImages(body));
  const { hasCreatedAt, hasUpdatedAt } = await getProductTimestampSupport(env);
  let baseSlug = slug;
  let slugIdx = 1;
  if (body.id) {
    let exists = await env.DB.prepare("SELECT id FROM products WHERE slug = ? AND id != ?").bind(slug, Number(body.id)).first();
    while (exists) {
      slug = `${baseSlug}-${slugIdx++}`;
      exists = await env.DB.prepare("SELECT id FROM products WHERE slug = ? AND id != ?").bind(slug, Number(body.id)).first();
    }
  } else {
    let exists = await env.DB.prepare("SELECT id FROM products WHERE slug = ?").bind(slug).first();
    while (exists) {
      slug = `${baseSlug}-${slugIdx++}`;
      exists = await env.DB.prepare("SELECT id FROM products WHERE slug = ?").bind(slug).first();
    }
  }
  if (body.id) {
    const deliveryDays2 = body.delivery_time_days || body.normal_delivery_text || "1";
    await env.DB.prepare(`
      UPDATE products SET title=?, slug=?, description=?, normal_price=?, sale_price=?,
      instant_delivery=?, normal_delivery_text=?, thumbnail_url=?, video_url=?,
      gallery_images=?, addons_json=?, seo_title=?, seo_description=?, seo_keywords=?, seo_canonical=?,
      whop_plan=?, whop_price_map=?, whop_product_id=?${hasUpdatedAt ? ", updated_at=CURRENT_TIMESTAMP" : ""} WHERE id=?
    `).bind(
      title,
      slug,
      body.description || "",
      Number(body.normal_price) || 0,
      body.sale_price ? Number(body.sale_price) : null,
      body.instant_delivery ? 1 : 0,
      String(deliveryDays2),
      body.thumbnail_url || "",
      body.video_url || "",
      galleryJson,
      addonsJson,
      body.seo_title || "",
      body.seo_description || "",
      body.seo_keywords || "",
      body.seo_canonical || "",
      body.whop_plan || "",
      body.whop_price_map || "",
      body.whop_product_id || "",
      Number(body.id)
    ).run();
    return json({ success: true, id: body.id, slug, url: `/product-${body.id}/${encodeURIComponent(slug)}` });
  }
  const deliveryDays = body.delivery_time_days || body.normal_delivery_text || "1";
  const r = await env.DB.prepare(`
    INSERT INTO products (title, slug, description, normal_price, sale_price,
    instant_delivery, normal_delivery_text, thumbnail_url, video_url,
    gallery_images, addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
    whop_plan, whop_price_map, whop_product_id, status, sort_order${hasCreatedAt ? ", created_at" : ""}${hasUpdatedAt ? ", updated_at" : ""})
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0${hasCreatedAt ? ", CURRENT_TIMESTAMP" : ""}${hasUpdatedAt ? ", CURRENT_TIMESTAMP" : ""})
  `).bind(
    title,
    slug,
    body.description || "",
    Number(body.normal_price) || 0,
    body.sale_price ? Number(body.sale_price) : null,
    body.instant_delivery ? 1 : 0,
    String(deliveryDays),
    body.thumbnail_url || "",
    body.video_url || "",
    galleryJson,
    addonsJson,
    body.seo_title || "",
    body.seo_description || "",
    body.seo_keywords || "",
    body.seo_canonical || "",
    body.whop_plan || "",
    body.whop_price_map || "",
    body.whop_product_id || ""
  ).run();
  const newId = r.meta?.last_row_id;
  return json({ success: true, id: newId, slug, url: `/product-${newId}/${encodeURIComponent(slug)}` });
}
__name(saveProduct, "saveProduct");
async function deleteProduct(env, id) {
  if (!id) return json({ error: "ID required" }, 400);
  productsCache = null;
  productsCacheTime = 0;
  await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(Number(id)).run();
  return json({ success: true });
}
__name(deleteProduct, "deleteProduct");
async function deleteAllProducts(env) {
  try {
    productsCache = null;
    productsCacheTime = 0;
    const result = await env.DB.prepare("DELETE FROM products").run();
    return json({ success: true, count: result?.changes || 0 });
  } catch (err) {
    return json({ error: err.message || "Failed to delete all products" }, 500);
  }
}
__name(deleteAllProducts, "deleteAllProducts");
async function updateProductStatus(env, body) {
  const id = body.id;
  const status = (body.status || "").trim().toLowerCase();
  if (!id || !status) {
    return json({ error: "id and status required" }, 400);
  }
  if (status !== "active" && status !== "draft") {
    return json({ error: "invalid status" }, 400);
  }
  productsCache = null;
  productsCacheTime = 0;
  const { hasUpdatedAt } = await getProductTimestampSupport(env);
  await env.DB.prepare(
    `UPDATE products SET status = ?${hasUpdatedAt ? ", updated_at = CURRENT_TIMESTAMP" : ""} WHERE id = ?`
  ).bind(status, Number(id)).run();
  return json({ success: true });
}
__name(updateProductStatus, "updateProductStatus");
async function duplicateProduct(env, body) {
  const id = body.id;
  if (!id) {
    return json({ error: "id required" }, 400);
  }
  const row = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(Number(id)).first();
  if (!row) {
    return json({ error: "Product not found" }, 404);
  }
  const baseSlug = row.slug || slugifyStr(row.title);
  let newSlug = baseSlug + "-copy";
  let idx = 1;
  let exists = await env.DB.prepare("SELECT slug FROM products WHERE slug = ?").bind(newSlug).first();
  while (exists) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx++;
    exists = await env.DB.prepare("SELECT slug FROM products WHERE slug = ?").bind(newSlug).first();
  }
  const { hasCreatedAt, hasUpdatedAt } = await getProductTimestampSupport(env);
  const r = await env.DB.prepare(
    `INSERT INTO products (
      title, slug, description, normal_price, sale_price,
      instant_delivery, normal_delivery_text, thumbnail_url, video_url,
      addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
      whop_plan, whop_price_map, whop_product_id, status, sort_order${hasCreatedAt ? ", created_at" : ""}${hasUpdatedAt ? ", updated_at" : ""}
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasCreatedAt ? ", CURRENT_TIMESTAMP" : ""}${hasUpdatedAt ? ", CURRENT_TIMESTAMP" : ""})`
  ).bind(
    (row.title || "") + " Copy",
    newSlug,
    row.description || "",
    row.normal_price || 0,
    row.sale_price || null,
    row.instant_delivery || 0,
    row.normal_delivery_text || "",
    row.thumbnail_url || "",
    row.video_url || "",
    row.addons_json || "[]",
    row.seo_title || "",
    row.seo_description || "",
    row.seo_keywords || "",
    row.seo_canonical || "",
    row.whop_plan || "",
    row.whop_price_map || "",
    row.whop_product_id || "",
    "draft",
    0
  ).run();
  return json({ success: true, id: r.meta?.last_row_id, slug: newSlug });
}
__name(duplicateProduct, "duplicateProduct");
async function getAdjacentProducts(env, id) {
  const productId = Number(id);
  if (!productId) return json({ error: "Product ID required" }, 400);
  const current = await env.DB.prepare(
    `SELECT id, sort_order FROM products WHERE id = ? AND ${buildPublicProductStatusWhere("status")}`
  ).bind(productId).first();
  if (!current) return json({ error: "Product not found" }, 404);
  const [prev, next] = await Promise.all([
    // Get previous product (higher sort_order or lower id if same sort_order)
    env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url 
      FROM products 
      WHERE ${buildPublicProductStatusWhere("status")} 
      AND (
        sort_order < ? 
        OR (sort_order = ? AND id > ?)
      )
      ORDER BY sort_order DESC, id ASC
      LIMIT 1
    `).bind(current.sort_order, current.sort_order, productId).first(),
    // Get next product (lower sort_order or higher id if same sort_order)
    env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url 
      FROM products 
      WHERE ${buildPublicProductStatusWhere("status")} 
      AND (
        sort_order > ? 
        OR (sort_order = ? AND id < ?)
      )
      ORDER BY sort_order ASC, id DESC
      LIMIT 1
    `).bind(current.sort_order, current.sort_order, productId).first()
  ]);
  return json({
    previous: prev ? {
      id: prev.id,
      title: prev.title,
      slug: prev.slug,
      thumbnail_url: prev.thumbnail_url,
      url: `/product-${prev.id}/${encodeURIComponent(prev.slug || "")}`
    } : null,
    next: next ? {
      id: next.id,
      title: next.title,
      slug: next.slug,
      thumbnail_url: next.thumbnail_url,
      url: `/product-${next.id}/${encodeURIComponent(next.slug || "")}`
    } : null
  });
}
__name(getAdjacentProducts, "getAdjacentProducts");
async function handleProductRouting(env, url, path) {
  const now = Date.now();
  const buildCanonicalResponse = /* @__PURE__ */ __name((product) => {
    const canonicalPath = canonicalProductPath({
      id: product.id,
      slug: product.slug,
      title: product.title || `product-${product.id}`
    });
    const target = new URL(url.toString());
    target.pathname = canonicalPath;
    target.search = "";
    return new Response(null, {
      status: 301,
      headers: {
        "Location": target.toString(),
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "noindex, nofollow",
        "Link": `<${target.toString()}>; rel="canonical"`
      }
    });
  }, "buildCanonicalResponse");
  async function getProductById(id) {
    const cacheKey = `id:${id}`;
    const cached = productSlugCache.get(cacheKey);
    if (cached && now - cached.time < SLUG_CACHE_TTL) {
      return cached.data;
    }
    const p = await env.DB.prepare("SELECT id, title, slug FROM products WHERE id = ? LIMIT 1").bind(Number(id)).first();
    if (p) {
      productSlugCache.set(cacheKey, { data: p, time: now });
    }
    return p;
  }
  __name(getProductById, "getProductById");
  async function getProductBySlug(slug) {
    const cacheKey = `slug:${slug}`;
    const cached = productSlugCache.get(cacheKey);
    if (cached && now - cached.time < SLUG_CACHE_TTL) {
      return cached.data;
    }
    const p = await env.DB.prepare("SELECT id, title, slug FROM products WHERE slug = ? LIMIT 1").bind(slug).first();
    if (p) {
      productSlugCache.set(cacheKey, { data: p, time: now });
      productSlugCache.set(`id:${p.id}`, { data: p, time: now });
    }
    return p;
  }
  __name(getProductBySlug, "getProductBySlug");
  const legacyId = path === "/product" ? url.searchParams.get("id") : null;
  if (legacyId) {
    const p = await getProductById(legacyId);
    if (p) {
      return buildCanonicalResponse(p);
    }
  }
  if (path.startsWith("/product/") && path.length > "/product/".length) {
    const slugIn = decodeURIComponent(path.slice("/product/".length));
    const row = await getProductBySlug(slugIn);
    if (row) {
      return buildCanonicalResponse(row);
    }
  }
  const bareCanonicalMatch = path.match(/^\/product-(\d+)\/?$/);
  if (bareCanonicalMatch) {
    const row = await getProductById(bareCanonicalMatch[1]);
    if (row) {
      return buildCanonicalResponse(row);
    }
  }
  return null;
}
__name(handleProductRouting, "handleProductRouting");

// src/config/secrets.js
async function getWhopApiKey(env) {
  if (env.WHOP_API_KEY) {
    return env.WHOP_API_KEY;
  }
  try {
    if (env.DB) {
      const gateway = await env.DB.prepare(
        `SELECT whop_api_key
         FROM payment_gateways
         WHERE gateway_type = ?
           AND is_enabled = 1
           AND whop_api_key IS NOT NULL
           AND TRIM(whop_api_key) != ''
         ORDER BY id DESC
         LIMIT 1`
      ).bind("whop").first();
      if (gateway && gateway.whop_api_key) {
        return gateway.whop_api_key;
      }
    }
  } catch (e) {
    console.error("Error reading API key from payment_gateways:", e);
  }
  try {
    if (env.DB) {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.api_key) {
          return settings.api_key;
        }
      }
    }
  } catch (e) {
    console.error("Error reading API key from legacy settings:", e);
  }
  return null;
}
__name(getWhopApiKey, "getWhopApiKey");
async function getWhopWebhookSecret(env) {
  if (env.WHOP_WEBHOOK_SECRET) {
    return env.WHOP_WEBHOOK_SECRET;
  }
  try {
    if (env.DB) {
      const gateway = await env.DB.prepare(
        `SELECT webhook_secret
         FROM payment_gateways
         WHERE gateway_type = ?
           AND is_enabled = 1
           AND webhook_secret IS NOT NULL
           AND TRIM(webhook_secret) != ''
         ORDER BY id DESC
         LIMIT 1`
      ).bind("whop").first();
      if (gateway && gateway.webhook_secret) {
        return gateway.webhook_secret;
      }
    }
  } catch (e) {
    console.error("Error reading webhook secret from payment_gateways:", e);
  }
  try {
    if (env.DB) {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.webhook_secret) {
          return settings.webhook_secret;
        }
      }
    }
  } catch (e) {
    console.error("Error reading webhook secret from legacy settings:", e);
  }
  return null;
}
__name(getWhopWebhookSecret, "getWhopWebhookSecret");
async function getGoogleScriptUrl(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.google_webapp_url) {
          return settings.google_webapp_url;
        }
      }
    }
  } catch (e) {
    console.warn("Error reading Google Script URL from database:", e);
  }
  return null;
}
__name(getGoogleScriptUrl, "getGoogleScriptUrl");

// src/utils/pricing.js
function calculateAddonPrice(productAddonsJson, selectedAddons) {
  if (!productAddonsJson || !selectedAddons || !Array.isArray(selectedAddons)) {
    return 0;
  }
  let totalAddonPrice = 0;
  try {
    const addonConfig = typeof productAddonsJson === "string" ? JSON.parse(productAddonsJson) : productAddonsJson;
    if (!Array.isArray(addonConfig)) return 0;
    const addonMap = {};
    addonConfig.forEach((addon) => {
      if (addon.field) addonMap[addon.field.toLowerCase().trim()] = addon;
      if (addon.label) addonMap[addon.label.toLowerCase().trim()] = addon;
      if (addon.id) addonMap[addon.id.toLowerCase().trim()] = addon;
    });
    selectedAddons.forEach((selected) => {
      const fieldName = (selected.field || "").toLowerCase().trim();
      const fieldId = fieldName.replace(/[^a-z0-9]+/g, "-");
      const addonDef = addonMap[fieldName] || addonMap[fieldId] || Object.values(addonMap).find(
        (a) => a.id && a.id.toLowerCase() === fieldId || a.field && a.field.toLowerCase() === fieldName
      );
      if (addonDef && addonDef.options && Array.isArray(addonDef.options)) {
        const rawValue = (selected.value || "").trim();
        const selectedValues = rawValue.includes(",") ? rawValue.split(",").map((v) => v.trim().toLowerCase()) : [rawValue.toLowerCase()];
        selectedValues.forEach((val) => {
          const option = addonDef.options.find((opt) => {
            const optLabel = (opt.label || "").toLowerCase().trim();
            const optValue = (opt.value || "").toLowerCase().trim();
            return optLabel === val || optValue === val || optLabel.replace(/[^a-z0-9]+/g, "-") === val.replace(/[^a-z0-9]+/g, "-");
          });
          if (option && option.price) {
            totalAddonPrice += Number(option.price) || 0;
          }
        });
      }
    });
  } catch (e) {
    console.error("Failed to calculate addon price:", e);
  }
  return totalAddonPrice;
}
__name(calculateAddonPrice, "calculateAddonPrice");
async function calculateServerSidePrice(env, productId, selectedAddons, couponCode) {
  const product = await env.DB.prepare(
    "SELECT normal_price, sale_price, addons_json FROM products WHERE id = ?"
  ).bind(Number(productId)).first();
  if (!product) {
    throw new Error("Product not found");
  }
  const basePrice = product.sale_price !== null && product.sale_price !== void 0 && product.sale_price !== "" ? Number(product.sale_price) : Number(product.normal_price);
  if (isNaN(basePrice) || basePrice < 0) {
    throw new Error("Invalid product price");
  }
  const addonPrice = calculateAddonPrice(product.addons_json, selectedAddons);
  let finalPrice = basePrice + addonPrice;
  if (couponCode) {
    try {
      const coupon = await env.DB.prepare(
        "SELECT discount_type, discount_value, min_order_amount FROM coupons WHERE code = ? AND status = ?"
      ).bind(couponCode.toUpperCase(), "active").first();
      if (coupon) {
        const minAmount = Number(coupon.min_order_amount) || 0;
        if (finalPrice >= minAmount) {
          if (coupon.discount_type === "percentage") {
            const discount = finalPrice * Number(coupon.discount_value) / 100;
            finalPrice = Math.max(0, finalPrice - discount);
          } else if (coupon.discount_type === "fixed") {
            finalPrice = Math.max(0, finalPrice - Number(coupon.discount_value));
          }
        }
      }
    } catch (e) {
      console.error("Coupon validation failed:", e);
    }
  }
  return Math.round(finalPrice * 100) / 100;
}
__name(calculateServerSidePrice, "calculateServerSidePrice");

// src/utils/order-creation.js
function calculateDeliveryMinutes(product, defaultMinutes = 60) {
  if (!product) return Number(defaultMinutes) || 60;
  const isInstant = product.instant_delivery === 1 || product.instant_delivery === true || product.instant_delivery === "1";
  if (isInstant) return 60;
  let days = 0;
  if (product.normal_delivery_text !== void 0) {
    days = parseInt(product.normal_delivery_text, 10);
  } else if (product.delivery_time_days !== void 0) {
    days = parseInt(product.delivery_time_days, 10);
  }
  if (Number.isFinite(days) && days > 0) {
    return days * 24 * 60;
  }
  return Number(defaultMinutes) || 60;
}
__name(calculateDeliveryMinutes, "calculateDeliveryMinutes");
async function createOrderRecord(env, params) {
  const { orderId, productId, status, deliveryMinutes, encryptedData } = params;
  const dataString = typeof encryptedData === "string" ? encryptedData : JSON.stringify(encryptedData);
  await env.DB.prepare(
    `INSERT INTO orders 
    (order_id, product_id, encrypted_data, status, delivery_time_minutes, created_at) 
    VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    orderId,
    Number(productId),
    dataString,
    status,
    Number(deliveryMinutes)
  ).run();
  console.log(`\u{1F4E6} Order created: ${orderId}, Product: ${productId}, Delivery: ${deliveryMinutes} mins`);
}
__name(createOrderRecord, "createOrderRecord");

// src/utils/fetch-timeout.js
async function fetchWithTimeout(url, options = {}, timeoutMs = 1e4) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
__name(fetchWithTimeout, "fetchWithTimeout");

// src/utils/order-email-notifier.js
var BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
var BREVO_TIMEOUT_MS = 1e4;
var URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : "";
}
__name(normalizeEmail, "normalizeEmail");
function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.origin.replace(/\/+$/, "");
  } catch (e) {
    return "";
  }
}
__name(normalizeBaseUrl, "normalizeBaseUrl");
function resolveBaseUrl(env, orderData) {
  return normalizeBaseUrl(
    orderData.baseUrl || env.PUBLIC_BASE_URL || env.SITE_URL || env.BASE_URL || "https://prankwish.com"
  );
}
__name(resolveBaseUrl, "resolveBaseUrl");
function resolveFromEmail(env) {
  return normalizeEmail(env.BREVO_FROM_EMAIL || env.FROM_EMAIL || "support@prankwish.com");
}
__name(resolveFromEmail, "resolveFromEmail");
function resolveFromName(env) {
  return String(env.BREVO_FROM_NAME || env.FROM_NAME || "Prankwish").trim() || "Prankwish";
}
__name(resolveFromName, "resolveFromName");
function resolveAdminEmail(env, orderData) {
  return normalizeEmail(
    orderData.adminEmail || env.ORDER_ADMIN_EMAIL || env.ADMIN_NOTIFY_EMAIL || env.BREVO_ADMIN_EMAIL || env.ADMIN_EMAIL || ""
  );
}
__name(resolveAdminEmail, "resolveAdminEmail");
function asNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}
__name(asNumber, "asNumber");
function formatMoney(amount, currency = "USD") {
  const safeAmount = asNumber(amount, 0);
  const safeCurrency = String(currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency
    }).format(safeAmount);
  } catch (e) {
    return `$${safeAmount.toFixed(2)}`;
  }
}
__name(formatMoney, "formatMoney");
function formatDeliveryTime(minutesValue) {
  const minutes = Math.max(0, Math.round(asNumber(minutesValue, 0)));
  if (!minutes) return "Standard delivery";
  if (minutes <= 60) return "Instant Delivery (60 minutes)";
  if (minutes < 1440) return `${Math.round(minutes / 60)} hour(s)`;
  const days = Math.max(1, Math.round(minutes / 1440));
  return `${days} day(s)`;
}
__name(formatDeliveryTime, "formatDeliveryTime");
function formatTimestamp(ts) {
  const date = ts ? new Date(ts) : /* @__PURE__ */ new Date();
  if (Number.isNaN(date.getTime())) return (/* @__PURE__ */ new Date()).toISOString();
  return date.toISOString();
}
__name(formatTimestamp, "formatTimestamp");
function coalesceUrl(...values) {
  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch (e) {
    }
  }
  return "";
}
__name(coalesceUrl, "coalesceUrl");
function splitUrlAndTrailingPunctuation(input) {
  let url = String(input || "").trim();
  let trailing = "";
  while (/[),.;!?]$/.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }
  return { url, trailing };
}
__name(splitUrlAndTrailingPunctuation, "splitUrlAndTrailingPunctuation");
function normalizeUrlList(value) {
  const text = String(value || "");
  const out = [];
  let m;
  while ((m = URL_RE.exec(text)) !== null) {
    const match = String(m[0] || "");
    if (!match) continue;
    const { url } = splitUrlAndTrailingPunctuation(match);
    if (url) out.push(url);
  }
  URL_RE.lastIndex = 0;
  return Array.from(new Set(out));
}
__name(normalizeUrlList, "normalizeUrlList");
function isLikelyImageUrl2(url) {
  const value = String(url || "").toLowerCase();
  if (!value) return false;
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(?:[\?#].*)?$/i.test(value)) return true;
  if (value.includes("res.cloudinary.com") && value.includes("/image/")) return true;
  return false;
}
__name(isLikelyImageUrl2, "isLikelyImageUrl");
function isLikelyDownloadableUrl(url) {
  const value = String(url || "").toLowerCase();
  if (!value) return false;
  if (isLikelyImageUrl2(value)) return true;
  if (/(\/download\/|[?&]download=1)/i.test(value)) return true;
  return /\.(mp4|mov|webm|mkv|avi|m3u8|mp3|wav|pdf|zip|rar|7z|docx?|xlsx?|pptx?)(?:[\?#].*)?$/i.test(value);
}
__name(isLikelyDownloadableUrl, "isLikelyDownloadableUrl");
function linkifyPlainText(text) {
  const source = String(text || "");
  if (!source) return "-";
  let out = "";
  let cursor = 0;
  let m;
  while ((m = URL_RE.exec(source)) !== null) {
    const raw = String(m[0] || "");
    const start = m.index;
    out += escapeHtml(source.slice(cursor, start));
    const { url, trailing } = splitUrlAndTrailingPunctuation(raw);
    if (url) {
      const safeUrl = escapeHtml(url);
      const extraAttrs = isLikelyDownloadableUrl(url) ? " download" : "";
      out += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer"${extraAttrs} style="color:#1d4ed8;text-decoration:underline;word-break:break-all;">${safeUrl}</a>`;
    } else {
      out += escapeHtml(raw);
    }
    if (trailing) out += escapeHtml(trailing);
    cursor = start + raw.length;
  }
  out += escapeHtml(source.slice(cursor));
  URL_RE.lastIndex = 0;
  return out;
}
__name(linkifyPlainText, "linkifyPlainText");
function addonValueHtml(value) {
  const normalized = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized ? normalized.split("\n") : ["-"];
  const linkedLines = lines.map((line) => linkifyPlainText(line)).join("<br>");
  const imagePreviews = normalizeUrlList(normalized).filter(isLikelyImageUrl2).slice(0, 3).map((url) => {
    const safe = escapeHtml(url);
    return `
        <div style="margin-top:8px;">
          <a href="${safe}" target="_blank" rel="noopener noreferrer" download style="color:#1d4ed8;text-decoration:underline;font-size:12px;">Open image</a>
          <br>
          <img src="${safe}" alt="Uploaded media" style="margin-top:6px;max-width:220px;max-height:160px;border:1px solid #e2e8f0;border-radius:8px;display:block;">
        </div>
      `.trim();
  }).join("");
  if (!imagePreviews) return linkedLines;
  return `${linkedLines}<div style="margin-top:6px;">${imagePreviews}</div>`;
}
__name(addonValueHtml, "addonValueHtml");
function normalizeAddons(addonsInput) {
  let source = addonsInput;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch (e) {
      source = [];
    }
  }
  if (!Array.isArray(source)) return [];
  return source.map((item, index) => {
    if (item && typeof item === "object") {
      const field = String(item.field || item.label || `Addon ${index + 1}`).trim() || `Addon ${index + 1}`;
      const value = String(item.value ?? item.selected ?? "").trim();
      return { field, value };
    }
    return {
      field: `Addon ${index + 1}`,
      value: String(item || "").trim()
    };
  });
}
__name(normalizeAddons, "normalizeAddons");
function addonsTableHtml(addons) {
  if (!addons.length) {
    return '<p style="margin:0;color:#64748b;font-size:14px;">No add-ons selected.</p>';
  }
  const rows = addons.map((addon, idx) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;width:30%;">${escapeHtml(addon.field || `Addon ${idx + 1}`)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;line-height:1.5;">${addonValueHtml(addon.value || "-")}</td>
    </tr>
  `).join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
      <tbody>${rows}</tbody>
    </table>
  `;
}
__name(addonsTableHtml, "addonsTableHtml");
function addonsText(addons) {
  if (!addons.length) return "No add-ons selected";
  return addons.map((addon, idx) => `${idx + 1}. ${addon.field}: ${addon.value || "-"}`).join("\n");
}
__name(addonsText, "addonsText");
function buildBuyerHtml(data) {
  return `
<div style="margin:0;background:#f1f5f9;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0f172a,#1d4ed8);padding:24px 28px;color:#ffffff;">
      <div style="font-size:13px;opacity:0.9;letter-spacing:0.6px;">PRANKWISH ORDER CONFIRMATION</div>
      <h2 style="margin:8px 0 0;font-size:24px;line-height:1.3;">Thank you for your order</h2>
      <p style="margin:10px 0 0;font-size:14px;opacity:0.95;">Order <strong>#${escapeHtml(data.orderId)}</strong> has been received successfully.</p>
    </div>

    <div style="padding:22px 24px;">
      <div style="display:block;border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#f8fafc;">
        <p style="margin:0 0 8px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;">Product</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(data.productTitle)}</p>
        <p style="margin:10px 0 0;color:#334155;font-size:14px;">Amount: <strong>${escapeHtml(data.amountLabel)}</strong></p>
        <p style="margin:6px 0 0;color:#334155;font-size:14px;">Estimated delivery: <strong>${escapeHtml(data.deliveryLabel)}</strong></p>
      </div>

      <div style="margin-top:18px;">
        <h3 style="margin:0 0 10px;font-size:16px;color:#0f172a;">Your selected add-ons</h3>
        ${addonsTableHtml(data.addons)}
      </div>

      <div style="margin-top:20px;">
        <a href="${escapeHtml(data.buyerLink)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;">Track Your Order</a>
      </div>

      <p style="margin:20px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
        Order placed on ${escapeHtml(data.createdAt)}. If you need help, reply to this email.
      </p>
    </div>
  </div>
</div>
`.trim();
}
__name(buildBuyerHtml, "buildBuyerHtml");
function buildAdminHtml(data) {
  return `
<div style="margin:0;background:#f8fafc;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0b3b8f,#0ea5e9);padding:24px 28px;color:#ffffff;">
      <div style="font-size:13px;opacity:0.95;letter-spacing:0.6px;">NEW ORDER ALERT</div>
      <h2 style="margin:8px 0 0;font-size:24px;line-height:1.25;">Order #${escapeHtml(data.orderId)}</h2>
      <p style="margin:10px 0 0;font-size:14px;opacity:0.95;">Customer: <strong>${escapeHtml(data.customerEmail || "N/A")}</strong></p>
    </div>

    <div style="padding:22px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
        <tbody>
          <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;width:30%;">Product</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(data.productTitle)}</td></tr>
          <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">Product ID</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(data.productIdLabel)}</td></tr>
          <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">Amount</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(data.amountLabel)}</td></tr>
          <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">Payment Method</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(data.paymentMethod)}</td></tr>
          <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">Delivery Target</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(data.deliveryLabel)}</td></tr>
          <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">Created At</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(data.createdAt)}</td></tr>
          <tr><td style="padding:10px 12px;font-weight:600;color:#0f172a;">Source</td><td style="padding:10px 12px;color:#334155;">${escapeHtml(data.orderSource)}</td></tr>
        </tbody>
      </table>

      <div style="margin-top:18px;">
        <h3 style="margin:0 0 10px;font-size:16px;color:#0f172a;">Customer add-ons / requirements</h3>
        ${addonsTableHtml(data.addons)}
      </div>

      <div style="margin-top:16px;padding:14px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
        <p style="margin:0 0 8px;font-size:13px;color:#1e3a8a;font-weight:700;">Raw add-ons JSON</p>
        <pre style="margin:0;font-size:12px;line-height:1.45;color:#1e293b;white-space:pre-wrap;word-break:break-word;">${escapeHtml(data.rawAddonsJson)}</pre>
      </div>

      <div style="margin-top:20px;">
        <a href="${escapeHtml(data.adminLink)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;">Open Admin Order View</a>
      </div>
    </div>
  </div>
</div>
`.trim();
}
__name(buildAdminHtml, "buildAdminHtml");
function buildBuyerText(data) {
  return [
    `Order confirmed: #${data.orderId}`,
    `Product: ${data.productTitle}`,
    `Amount: ${data.amountLabel}`,
    `Estimated delivery: ${data.deliveryLabel}`,
    `Track order: ${data.buyerLink}`,
    "",
    "Add-ons:",
    addonsText(data.addons)
  ].join("\n");
}
__name(buildBuyerText, "buildBuyerText");
function buildAdminText(data) {
  return [
    `New order received: #${data.orderId}`,
    `Customer: ${data.customerEmail || "N/A"}`,
    `Product: ${data.productTitle}`,
    `Product ID: ${data.productIdLabel}`,
    `Amount: ${data.amountLabel}`,
    `Payment Method: ${data.paymentMethod}`,
    `Delivery target: ${data.deliveryLabel}`,
    `Created at: ${data.createdAt}`,
    `Source: ${data.orderSource}`,
    `Admin order view: ${data.adminLink}`,
    "",
    "Add-ons:",
    addonsText(data.addons),
    "",
    "Raw add-ons JSON:",
    data.rawAddonsJson
  ].join("\n");
}
__name(buildAdminText, "buildAdminText");
function buildBuyerDeliveryHtml(data) {
  const primaryDeliveryUrl = data.deliveryUrl || data.videoUrl || data.youtubeUrl || data.buyerLink;
  const secondaryUrl = primaryDeliveryUrl !== data.buyerLink ? data.buyerLink : "";
  const youtubeBlock = data.youtubeUrl && data.youtubeUrl !== primaryDeliveryUrl ? `
      <div style="margin-top:12px;">
        <a href="${escapeHtml(data.youtubeUrl)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;">Watch on YouTube</a>
      </div>
    `.trim() : "";
  return `
<div style="margin:0;background:#f1f5f9;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0f766e,#0ea5e9);padding:24px 28px;color:#ffffff;">
      <div style="font-size:13px;opacity:0.92;letter-spacing:0.6px;">PRANKWISH DELIVERY READY</div>
      <h2 style="margin:8px 0 0;font-size:24px;line-height:1.3;">Your order is ready</h2>
      <p style="margin:10px 0 0;font-size:14px;opacity:0.96;">Order <strong>#${escapeHtml(data.orderId)}</strong> for <strong>${escapeHtml(data.productTitle)}</strong> has been delivered.</p>
    </div>

    <div style="padding:22px 24px;">
      <div style="display:block;border:1px solid #dbeafe;border-radius:14px;padding:16px;background:#f8fafc;">
        <p style="margin:0 0 8px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;">Delivery</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(data.productTitle)}</p>
        <p style="margin:10px 0 0;color:#334155;font-size:14px;">Order ID: <strong>#${escapeHtml(data.orderId)}</strong></p>
      </div>

      <div style="margin-top:20px;">
        <a href="${escapeHtml(primaryDeliveryUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;">Open Delivery</a>
      </div>

      ${secondaryUrl ? `
      <div style="margin-top:12px;">
        <a href="${escapeHtml(secondaryUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;">Track Your Order</a>
      </div>
      `.trim() : ""}

      ${youtubeBlock}

      <p style="margin:20px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
        If the delivery link does not open, use your order page here: <a href="${escapeHtml(data.buyerLink)}" style="color:#1d4ed8;">${escapeHtml(data.buyerLink)}</a>
      </p>
    </div>
  </div>
</div>
`.trim();
}
__name(buildBuyerDeliveryHtml, "buildBuyerDeliveryHtml");
function buildBuyerDeliveryText(data) {
  return [
    `Your order is ready: #${data.orderId}`,
    `Product: ${data.productTitle}`,
    `Open delivery: ${data.deliveryUrl || data.videoUrl || data.youtubeUrl || data.buyerLink}`,
    `Track order: ${data.buyerLink}`,
    data.youtubeUrl ? `YouTube: ${data.youtubeUrl}` : ""
  ].filter(Boolean).join("\n");
}
__name(buildBuyerDeliveryText, "buildBuyerDeliveryText");
function buildAdminRevisionHtml(data) {
  return `
<div style="margin:0;background:#f8fafc;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #fecaca;border-radius:18px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#991b1b,#ef4444);padding:24px 28px;color:#ffffff;">
      <div style="font-size:13px;opacity:0.95;letter-spacing:0.6px;">REVISION REQUESTED</div>
      <h2 style="margin:8px 0 0;font-size:24px;line-height:1.25;">Order #${escapeHtml(data.orderId)}</h2>
      <p style="margin:10px 0 0;font-size:14px;opacity:0.95;">Customer: <strong>${escapeHtml(data.customerEmail || "N/A")}</strong></p>
    </div>

    <div style="padding:22px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
        <tbody>
          <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;width:30%;">Product</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(data.productTitle)}</td></tr>
          <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">Revision Count</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(String(data.revisionCount || 1))}</td></tr>
          <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">Status</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(data.status || "revision")}</td></tr>
          <tr><td style="padding:10px 12px;font-weight:600;color:#0f172a;">Requested At</td><td style="padding:10px 12px;color:#334155;">${escapeHtml(data.createdAt)}</td></tr>
        </tbody>
      </table>

      <div style="margin-top:18px;padding:16px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;">
        <p style="margin:0 0 8px;font-size:13px;color:#991b1b;font-weight:700;">Customer request</p>
        <p style="margin:0;color:#334155;line-height:1.6;">${linkifyPlainText(data.revisionReason || "No reason provided")}</p>
      </div>

      <div style="margin-top:20px;">
        <a href="${escapeHtml(data.adminLink)}" style="display:inline-block;background:#991b1b;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;">Open Admin Order View</a>
      </div>
    </div>
  </div>
</div>
`.trim();
}
__name(buildAdminRevisionHtml, "buildAdminRevisionHtml");
function buildAdminRevisionText(data) {
  return [
    `Revision requested: #${data.orderId}`,
    `Customer: ${data.customerEmail || "N/A"}`,
    `Product: ${data.productTitle}`,
    `Revision count: ${data.revisionCount || 1}`,
    `Status: ${data.status || "revision"}`,
    `Reason: ${data.revisionReason || "No reason provided"}`,
    `Admin order view: ${data.adminLink}`
  ].join("\n");
}
__name(buildAdminRevisionText, "buildAdminRevisionText");
async function sendBrevoEmail(env, message) {
  const apiKey = String(env.BREVO_API_KEY || "").trim();
  if (!apiKey) {
    return { skipped: true, reason: "BREVO_API_KEY missing" };
  }
  const response = await fetchWithTimeout(
    BREVO_API_URL,
    {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(message)
    },
    BREVO_TIMEOUT_MS
  );
  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Brevo send failed (${response.status}): ${errBody || "Unknown error"}`);
  }
  return response.json().catch(() => ({}));
}
__name(sendBrevoEmail, "sendBrevoEmail");
async function enrichOrderData(env, orderData) {
  const productId = Number(orderData.productId || orderData.product_id || 0) || 0;
  let productTitle = String(orderData.productTitle || orderData.product_title || "").trim();
  if (!productTitle && productId && env.DB) {
    try {
      const row = await env.DB.prepare("SELECT title FROM products WHERE id = ?").bind(productId).first();
      if (row?.title) productTitle = String(row.title).trim();
    } catch (e) {
    }
  }
  if (!productTitle) productTitle = "Custom Video Order";
  const addons = normalizeAddons(orderData.addons);
  const rawAddonsJson = (() => {
    try {
      return JSON.stringify(orderData.addons ?? [], null, 2);
    } catch (e) {
      return JSON.stringify(addons, null, 2);
    }
  })();
  const baseUrl = resolveBaseUrl(env, orderData);
  const orderId = String(orderData.orderId || orderData.order_id || "").trim();
  const customerEmail = normalizeEmail(orderData.customerEmail || orderData.customer_email || orderData.email);
  const currency = String(orderData.currency || "USD").toUpperCase();
  const amountLabel = formatMoney(orderData.amount, currency);
  const deliveryUrl = coalesceUrl(
    orderData.deliveryUrl,
    orderData.delivery_url,
    orderData.downloadUrl,
    orderData.download_url,
    orderData.archiveUrl,
    orderData.archive_url,
    orderData.videoUrl,
    orderData.video_url,
    orderData.youtubeUrl,
    orderData.youtube_url
  );
  const videoUrl = coalesceUrl(
    orderData.videoUrl,
    orderData.video_url,
    orderData.embedUrl,
    orderData.embed_url,
    orderData.youtubeUrl,
    orderData.youtube_url,
    deliveryUrl
  );
  const youtubeUrl = coalesceUrl(orderData.youtubeUrl, orderData.youtube_url);
  const revisionReason = String(orderData.revisionReason || orderData.revision_reason || "").trim();
  const revisionCount = Math.max(0, Math.round(asNumber(orderData.revisionCount || orderData.revision_count, 0)));
  return {
    orderId,
    customerEmail,
    productId,
    productIdLabel: productId ? String(productId) : "N/A",
    productTitle,
    addons,
    rawAddonsJson,
    amountLabel,
    deliveryLabel: formatDeliveryTime(orderData.deliveryTimeMinutes || orderData.delivery_minutes),
    paymentMethod: String(orderData.paymentMethod || orderData.payment_method || "Online Checkout"),
    orderSource: String(orderData.orderSource || orderData.source || "website"),
    createdAt: formatTimestamp(orderData.createdAt || orderData.created_at),
    deliveryUrl,
    videoUrl,
    youtubeUrl,
    revisionReason,
    revisionCount,
    status: String(orderData.status || "revision").trim() || "revision",
    buyerLink: `${baseUrl}/buyer-order.html?id=${encodeURIComponent(orderId)}`,
    adminLink: `${baseUrl}/order-detail.html?id=${encodeURIComponent(orderId)}&admin=1`
  };
}
__name(enrichOrderData, "enrichOrderData");
async function sendNotificationBatch(env, messages = []) {
  const apiKey = String(env.BREVO_API_KEY || "").trim();
  if (!apiKey) {
    return { skipped: true, reason: "BREVO_API_KEY missing" };
  }
  const fromEmail = resolveFromEmail(env);
  if (!fromEmail) {
    return { skipped: true, reason: "Missing sender email (BREVO_FROM_EMAIL)" };
  }
  const fromName = resolveFromName(env);
  const validMessages = messages.filter((message) => Array.isArray(message?.to) && message.to.length);
  if (!validMessages.length) {
    return { skipped: true, reason: "No recipients configured" };
  }
  const settled = await Promise.allSettled(
    validMessages.map((message) => sendBrevoEmail(env, {
      ...message,
      sender: { name: fromName, email: fromEmail }
    }))
  );
  const failures = settled.filter((x) => x.status === "rejected");
  if (failures.length) {
    console.error("Order email(s) failed:", failures.map((f) => f.reason?.message || f.reason));
  }
  return {
    attempted: validMessages.length,
    failed: failures.length,
    success: failures.length === 0
  };
}
__name(sendNotificationBatch, "sendNotificationBatch");
async function sendOrderNotificationEmails(env, orderData = {}) {
  const data = await enrichOrderData(env, orderData);
  if (!data.orderId) {
    return { skipped: true, reason: "Missing orderId" };
  }
  const adminEmail = resolveAdminEmail(env, orderData);
  const buyerEmail = data.customerEmail;
  return sendNotificationBatch(env, [
    buyerEmail ? {
      to: [{ email: buyerEmail }],
      subject: `Order Confirmed #${data.orderId} - ${data.productTitle}`,
      htmlContent: buildBuyerHtml(data),
      textContent: buildBuyerText(data),
      tags: ["order", "buyer", "confirmation"]
    } : null,
    adminEmail ? {
      to: [{ email: adminEmail }],
      subject: `New Order #${data.orderId} - ${data.productTitle}`,
      htmlContent: buildAdminHtml(data),
      textContent: buildAdminText(data),
      tags: ["order", "admin", "new-order"]
    } : null
  ]);
}
__name(sendOrderNotificationEmails, "sendOrderNotificationEmails");
async function sendOrderDeliveredNotificationEmails(env, orderData = {}) {
  const data = await enrichOrderData(env, orderData);
  if (!data.orderId) {
    return { skipped: true, reason: "Missing orderId" };
  }
  if (!data.customerEmail) {
    return { skipped: true, reason: "Missing buyer email" };
  }
  return sendNotificationBatch(env, [{
    to: [{ email: data.customerEmail }],
    subject: `Your Order #${data.orderId} Is Ready - ${data.productTitle}`,
    htmlContent: buildBuyerDeliveryHtml(data),
    textContent: buildBuyerDeliveryText(data),
    tags: ["order", "buyer", "delivered"]
  }]);
}
__name(sendOrderDeliveredNotificationEmails, "sendOrderDeliveredNotificationEmails");
async function sendOrderRevisionRequestedNotificationEmails(env, orderData = {}) {
  const data = await enrichOrderData(env, orderData);
  if (!data.orderId) {
    return { skipped: true, reason: "Missing orderId" };
  }
  const adminEmail = resolveAdminEmail(env, orderData);
  if (!adminEmail) {
    return { skipped: true, reason: "Missing admin email" };
  }
  return sendNotificationBatch(env, [{
    to: [{ email: adminEmail }],
    subject: `Revision Requested #${data.orderId} - ${data.productTitle}`,
    htmlContent: buildAdminRevisionHtml(data),
    textContent: buildAdminRevisionText(data),
    tags: ["order", "admin", "revision"]
  }]);
}
__name(sendOrderRevisionRequestedNotificationEmails, "sendOrderRevisionRequestedNotificationEmails");
function logOrderEmailDispatchResult(context, result, details = {}) {
  if (!result || typeof result !== "object") return;
  const detailPairs = Object.entries(details).filter(([, value]) => value !== void 0 && value !== null && value !== "").map(([key, value]) => `${key}=${String(value)}`);
  const detailSuffix = detailPairs.length ? ` (${detailPairs.join(", ")})` : "";
  if (result.skipped) {
    console.warn(`${context} skipped: ${result.reason || "Unknown reason"}${detailSuffix}`);
    return;
  }
  if (Number(result.failed) > 0) {
    const attempted = Number(result.attempted) || 0;
    console.error(`${context} completed with ${result.failed}/${attempted} failed email(s)${detailSuffix}`);
  }
}
__name(logOrderEmailDispatchResult, "logOrderEmailDispatchResult");

// src/controllers/webhooks.js
var EVENT_TYPES = {
  // Admin notifications
  ORDER_RECEIVED: "order.received",
  ORDER_DELIVERED: "order.delivered",
  TIP_RECEIVED: "tip.received",
  REVIEW_SUBMITTED: "review.submitted",
  BLOG_COMMENT: "blog.comment",
  FORUM_QUESTION: "forum.question",
  FORUM_REPLY: "forum.reply",
  CHAT_MESSAGE: "chat.message",
  BACKUP_CREATED: "backup.created",
  // Revision events
  ORDER_REVISION_REQUESTED: "order.revision_requested",
  // Customer notifications
  CUSTOMER_ORDER_CONFIRMED: "customer.order.confirmed",
  CUSTOMER_ORDER_DELIVERED: "customer.order.delivered",
  CUSTOMER_CHAT_REPLY: "customer.chat.reply",
  CUSTOMER_FORUM_REPLY: "customer.forum.reply"
};
var webhooksCache = null;
var cacheTime = 0;
var CACHE_TTL = 6e4;
async function getWebhooksConfig(env, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && webhooksCache && now - cacheTime < CACHE_TTL) {
    return webhooksCache;
  }
  try {
    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = ?"
    ).bind("webhooks_config").first();
    if (row?.value) {
      webhooksCache = JSON.parse(row.value);
    } else {
      webhooksCache = getDefaultConfig();
    }
    cacheTime = now;
    return webhooksCache;
  } catch (e) {
    console.error("Failed to load webhooks config:", e);
    return getDefaultConfig();
  }
}
__name(getWebhooksConfig, "getWebhooksConfig");
function getDefaultConfig() {
  return {
    enabled: false,
    endpoints: []
    // Array of { id, name, url, events[], secret, enabled }
  };
}
__name(getDefaultConfig, "getDefaultConfig");
async function saveWebhooksConfig(env, config) {
  try {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
    ).bind("webhooks_config", JSON.stringify(config)).run();
    webhooksCache = config;
    cacheTime = Date.now();
    return true;
  } catch (e) {
    console.error("Failed to save webhooks config:", e);
    return false;
  }
}
__name(saveWebhooksConfig, "saveWebhooksConfig");
async function getWebhooksSettings(env) {
  try {
    const config = await getWebhooksConfig(env, true);
    const safeConfig = {
      ...config,
      endpoints: (config.endpoints || []).map((e) => ({
        ...e,
        secret: e.secret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
      }))
    };
    return json({ success: true, config: safeConfig });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getWebhooksSettings, "getWebhooksSettings");
async function saveWebhooksSettings(env, body) {
  try {
    const currentConfig = await getWebhooksConfig(env, true);
    const newConfig = body.config || body;
    if (newConfig.endpoints) {
      newConfig.endpoints = newConfig.endpoints.map((e) => {
        if (e.secret === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
          const existing = currentConfig.endpoints?.find((x) => x.id === e.id);
          e.secret = existing?.secret || "";
        }
        return e;
      });
    }
    const success = await saveWebhooksConfig(env, newConfig);
    return json({ success });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(saveWebhooksSettings, "saveWebhooksSettings");
function createPayload(event, data) {
  return {
    event,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    data,
    // Metadata for webhook receivers
    meta: {
      version: "3.0",
      source: "wishesu"
    }
  };
}
__name(createPayload, "createPayload");
async function sendWebhook(endpoint, payload) {
  if (!endpoint.enabled || !endpoint.url) {
    return { success: false, error: "Endpoint disabled or missing URL" };
  }
  try {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "WishesU-Webhook/3.0"
    };
    if (endpoint.secret) {
      headers["X-Webhook-Secret"] = endpoint.secret;
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(payload));
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(endpoint.secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, data);
      const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
      headers["X-Webhook-Signature"] = signatureHex;
    }
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const responseText = await response.text();
    return {
      success: response.ok,
      status: response.status,
      response: responseText
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}
__name(sendWebhook, "sendWebhook");
async function dispatch(env, event, data) {
  const config = await getWebhooksConfig(env);
  if (!config.enabled) {
    return { success: false, error: "Webhooks disabled" };
  }
  const endpoints = (config.endpoints || []).filter(
    (e) => e.enabled && Array.isArray(e.events) && e.events.includes(event)
  );
  if (endpoints.length === 0) {
    return { success: true, message: "No endpoints subscribed to this event" };
  }
  const payload = createPayload(event, data);
  const results = await Promise.allSettled(
    endpoints.map((e) => sendWebhook(e, payload))
  );
  const failures = results.filter(
    (r, i) => r.status === "rejected" || !r.value?.success
  );
  if (failures.length > 0) {
    console.error("Webhook failures:", failures);
  }
  return {
    success: true,
    sent: results.length,
    failed: failures.length
  };
}
__name(dispatch, "dispatch");
async function notifyOrderReceived(env, orderData) {
  return dispatch(env, EVENT_TYPES.ORDER_RECEIVED, {
    orderId: orderData.orderId || orderData.order_id,
    productId: orderData.productId || orderData.product_id,
    productTitle: orderData.productTitle || orderData.product_title,
    customerName: orderData.customerName || orderData.customer_name,
    customerEmail: orderData.customerEmail || orderData.email,
    amount: orderData.amount || orderData.total,
    currency: orderData.currency || "USD",
    paymentMethod: orderData.paymentMethod || orderData.payment_method,
    createdAt: orderData.createdAt || orderData.created_at || (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyOrderReceived, "notifyOrderReceived");
async function notifyOrderDelivered(env, orderData) {
  return dispatch(env, EVENT_TYPES.ORDER_DELIVERED, {
    orderId: orderData.orderId || orderData.order_id,
    productTitle: orderData.productTitle || orderData.product_title,
    customerName: orderData.customerName || orderData.customer_name,
    customerEmail: orderData.customerEmail || orderData.email,
    deliveryUrl: orderData.deliveryUrl || orderData.delivery_url,
    videoUrl: orderData.videoUrl || orderData.video_url,
    youtubeUrl: orderData.youtubeUrl || orderData.youtube_url,
    deliveredAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyOrderDelivered, "notifyOrderDelivered");
async function notifyTipReceived(env, tipData) {
  return dispatch(env, EVENT_TYPES.TIP_RECEIVED, {
    amount: tipData.amount,
    currency: tipData.currency || "USD",
    senderName: tipData.name || tipData.sender_name || "Anonymous",
    message: tipData.message || "",
    receivedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyTipReceived, "notifyTipReceived");
async function notifyReviewSubmitted(env, reviewData) {
  return dispatch(env, EVENT_TYPES.REVIEW_SUBMITTED, {
    productId: reviewData.productId || reviewData.product_id,
    productTitle: reviewData.productTitle || reviewData.product_title,
    customerName: reviewData.customerName || reviewData.author_name,
    rating: reviewData.rating,
    comment: reviewData.comment || reviewData.review_text,
    submittedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyReviewSubmitted, "notifyReviewSubmitted");
async function notifyBlogComment(env, commentData) {
  return dispatch(env, EVENT_TYPES.BLOG_COMMENT, {
    blogId: commentData.blogId || commentData.blog_id,
    blogTitle: commentData.blogTitle || commentData.post_title,
    authorName: commentData.authorName || commentData.author_name,
    authorEmail: commentData.authorEmail || commentData.email,
    comment: commentData.comment || commentData.content,
    submittedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyBlogComment, "notifyBlogComment");
async function notifyForumQuestion(env, questionData) {
  return dispatch(env, EVENT_TYPES.FORUM_QUESTION, {
    questionId: questionData.id,
    title: questionData.title,
    content: questionData.content || questionData.body,
    authorName: questionData.authorName || questionData.author_name || questionData.name,
    authorEmail: questionData.authorEmail || questionData.email,
    url: questionData.url,
    submittedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyForumQuestion, "notifyForumQuestion");
async function notifyForumReply(env, replyData) {
  return dispatch(env, EVENT_TYPES.FORUM_REPLY, {
    questionId: replyData.questionId || replyData.question_id,
    questionTitle: replyData.questionTitle || replyData.question_title,
    replyId: replyData.id,
    content: replyData.content || replyData.body,
    authorName: replyData.authorName || replyData.author_name || replyData.name,
    authorEmail: replyData.authorEmail || replyData.email,
    submittedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyForumReply, "notifyForumReply");
async function notifyChatMessage(env, messageData) {
  return dispatch(env, EVENT_TYPES.CHAT_MESSAGE, {
    sessionId: messageData.sessionId || messageData.session_id,
    senderName: messageData.senderName || messageData.sender_name,
    senderEmail: messageData.senderEmail || messageData.email,
    message: messageData.message || messageData.content,
    sentAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyChatMessage, "notifyChatMessage");
async function notifyCustomerOrderConfirmed(env, orderData) {
  return dispatch(env, EVENT_TYPES.CUSTOMER_ORDER_CONFIRMED, {
    orderId: orderData.orderId || orderData.order_id,
    productTitle: orderData.productTitle || orderData.product_title,
    customerName: orderData.customerName || orderData.customer_name,
    customerEmail: orderData.customerEmail || orderData.email,
    amount: orderData.amount || orderData.total,
    trackingUrl: orderData.trackingUrl || orderData.tracking_url,
    deliveryTime: orderData.deliveryTime || orderData.delivery_time
  });
}
__name(notifyCustomerOrderConfirmed, "notifyCustomerOrderConfirmed");
async function notifyCustomerOrderDelivered(env, orderData) {
  return dispatch(env, EVENT_TYPES.CUSTOMER_ORDER_DELIVERED, {
    orderId: orderData.orderId || orderData.order_id,
    productTitle: orderData.productTitle || orderData.product_title,
    customerName: orderData.customerName || orderData.customer_name,
    customerEmail: orderData.customerEmail || orderData.email,
    deliveryUrl: orderData.deliveryUrl || orderData.delivery_url,
    videoUrl: orderData.videoUrl || orderData.video_url,
    youtubeUrl: orderData.youtubeUrl || orderData.youtube_url,
    trackingUrl: orderData.trackingUrl || orderData.tracking_url,
    deliveredAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyCustomerOrderDelivered, "notifyCustomerOrderDelivered");
async function notifyCustomerChatReply(env, chatData) {
  return dispatch(env, EVENT_TYPES.CUSTOMER_CHAT_REPLY, {
    customerName: chatData.customerName || chatData.customer_name,
    customerEmail: chatData.customerEmail || chatData.customer_email,
    replyMessage: chatData.replyMessage || chatData.reply,
    chatUrl: chatData.chatUrl
  });
}
__name(notifyCustomerChatReply, "notifyCustomerChatReply");
async function notifyCustomerForumReply(env, forumData) {
  return dispatch(env, EVENT_TYPES.CUSTOMER_FORUM_REPLY, {
    questionTitle: forumData.questionTitle || forumData.question_title,
    customerName: forumData.customerName || forumData.customer_name,
    customerEmail: forumData.customerEmail || forumData.customer_email,
    replyContent: forumData.replyContent || forumData.reply,
    questionUrl: forumData.questionUrl
  });
}
__name(notifyCustomerForumReply, "notifyCustomerForumReply");
async function notifyOrderRevisionRequested(env, revisionData) {
  return dispatch(env, EVENT_TYPES.ORDER_REVISION_REQUESTED, {
    orderId: revisionData.orderId || revisionData.order_id,
    productTitle: revisionData.productTitle || revisionData.product_title,
    customerName: revisionData.customerName || revisionData.customer_name,
    customerEmail: revisionData.customerEmail || revisionData.email,
    revisionReason: revisionData.revisionReason || revisionData.revision_reason,
    revisionCount: revisionData.revisionCount || revisionData.revision_count,
    status: revisionData.status || "revision",
    submittedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(notifyOrderRevisionRequested, "notifyOrderRevisionRequested");
async function testWebhook(env, endpointId) {
  const config = await getWebhooksConfig(env, true);
  const endpoint = (config.endpoints || []).find((e) => e.id === endpointId);
  if (!endpoint) {
    return json({ success: false, error: "Endpoint not found" });
  }
  const testPayload = createPayload("test.webhook", {
    message: "This is a test webhook from WishesU",
    testId: Date.now(),
    note: "If you see this, your webhook is working correctly!"
  });
  const result = await sendWebhook({ ...endpoint, enabled: true }, testPayload);
  return json(result);
}
__name(testWebhook, "testWebhook");

// src/utils/order-helpers.js
async function getLatestOrderForEmail(env, email) {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return null;
  const candidates = await env.DB.prepare(
    `SELECT order_id, status, archive_url, encrypted_data, created_at
     FROM orders
     ORDER BY datetime(created_at) DESC
     LIMIT 80`
  ).all();
  const list = candidates?.results || [];
  for (const o of list) {
    try {
      if (!o.encrypted_data) continue;
      const data = JSON.parse(o.encrypted_data);
      const e = String(data.email || "").trim().toLowerCase();
      if (e && e === target) {
        return {
          order_id: o.order_id,
          status: o.status,
          trackLink: `/buyer-order.html?id=${encodeURIComponent(o.order_id)}`
        };
      }
    } catch {
    }
  }
  return null;
}
__name(getLatestOrderForEmail, "getLatestOrderForEmail");

// src/controllers/orders.js
var ADDON_LIMITS = {
  field: 100,
  // Field name max length
  value: 2e3,
  // Value max length
  email: 100,
  // Email max length
  totalAddons: 50
  // Max number of addons
};
function validateAddons(addons) {
  if (!Array.isArray(addons)) return [];
  const limited = addons.slice(0, ADDON_LIMITS.totalAddons);
  return limited.map((addon) => {
    if (!addon || typeof addon !== "object") return null;
    let field = String(addon.field || "").trim();
    let value = String(addon.value || "").trim();
    if (field.length > ADDON_LIMITS.field) {
      field = field.substring(0, ADDON_LIMITS.field);
    }
    if (value.length > ADDON_LIMITS.value) {
      value = value.substring(0, ADDON_LIMITS.value);
    }
    return { field, value };
  }).filter(Boolean);
}
__name(validateAddons, "validateAddons");
function validateEmail(email) {
  if (!email) return "";
  const trimmed = String(email).trim().substring(0, ADDON_LIMITS.email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : "";
}
__name(validateEmail, "validateEmail");
async function getOrders(env) {
  const r = await env.DB.prepare(`
    SELECT
      o.*,
      p.title as product_title,
      p.instant_delivery as product_instant_delivery,
      p.normal_delivery_text as product_normal_delivery_text
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    ORDER BY o.id DESC
  `).all();
  const orders = (r.results || []).map((row) => {
    let email = "", amount = null, addons = [];
    try {
      if (row.encrypted_data && row.encrypted_data[0] === "{") {
        const d = JSON.parse(row.encrypted_data);
        email = d.email || "";
        amount = d.amount;
        addons = d.addons || [];
      }
    } catch (e) {
      console.error("Failed to parse order encrypted_data for order:", row.order_id, e.message);
    }
    if (row.created_at && typeof row.created_at === "string") row.created_at = toISO8601(row.created_at);
    if (row.delivered_at && typeof row.delivered_at === "string") row.delivered_at = toISO8601(row.delivered_at);
    const productRow = {
      instant_delivery: row.product_instant_delivery,
      normal_delivery_text: row.product_normal_delivery_text
    };
    row.delivery_time_minutes = getEffectiveDeliveryMinutes(row, productRow);
    return { ...row, email, amount, addons };
  });
  return json({ orders });
}
__name(getOrders, "getOrders");
function getEffectiveDeliveryMinutes(orderRow, productRow) {
  const stored = Number(orderRow?.delivery_time_minutes);
  const hasProduct = !!productRow && (productRow.instant_delivery !== void 0 || productRow.normal_delivery_text !== void 0);
  const productMinutes = hasProduct ? calculateDeliveryMinutes(productRow) : null;
  if (!stored || !Number.isFinite(stored) || stored <= 0) {
    return hasProduct ? productMinutes : 60;
  }
  if (hasProduct && (stored === 60 || stored === 1440) && stored !== productMinutes) {
    return productMinutes;
  }
  return stored;
}
__name(getEffectiveDeliveryMinutes, "getEffectiveDeliveryMinutes");
async function createOrder(env, body) {
  if (!body.productId) return json({ error: "productId required" }, 400);
  const email = validateEmail(body.email);
  const addons = validateAddons(body.addons);
  let amount = 0;
  let productTitle = "";
  let deliveryMinutes = 0;
  try {
    amount = await calculateServerSidePrice(env, body.productId, addons, body.couponCode);
  } catch (e) {
    console.error("Failed to calculate server-side price:", e);
    return json({ error: "Failed to calculate order price" }, 400);
  }
  try {
    const product = await env.DB.prepare(
      "SELECT title, instant_delivery, normal_delivery_text FROM products WHERE id = ?"
    ).bind(Number(body.productId)).first();
    if (product) {
      productTitle = product.title || "";
      deliveryMinutes = calculateDeliveryMinutes(product);
    }
  } catch (e) {
    console.log("Could not get product details:", e);
  }
  if (!deliveryMinutes || !Number.isFinite(deliveryMinutes) || deliveryMinutes <= 0) {
    deliveryMinutes = 60;
  }
  const orderId = body.orderId || crypto.randomUUID().split("-")[0].toUpperCase();
  const data = {
    email,
    amount,
    productId: body.productId,
    addons,
    whop_checkout_id: body.checkoutSessionId || null,
    source: "frontend"
  };
  await createOrderRecord(env, {
    orderId,
    productId: body.productId,
    status: "PAID",
    deliveryMinutes,
    encryptedData: data
  });
  try {
    const emailResult = await sendOrderNotificationEmails(env, {
      orderId,
      customerEmail: email,
      amount,
      currency: "USD",
      productId: body.productId,
      productTitle,
      addons,
      deliveryTimeMinutes: deliveryMinutes,
      paymentMethod: body.paymentMethod || "Website Checkout",
      orderSource: "frontend"
    });
    logOrderEmailDispatchResult("Order email notification", emailResult, { orderId, source: "frontend" });
  } catch (e) {
    console.error("Order email notification failed:", e?.message || e);
  }
  const deliveryTime = deliveryMinutes < 1440 ? `${Math.round(deliveryMinutes / 60)} hour(s)` : `${Math.round(deliveryMinutes / 1440)} day(s)`;
  notifyOrderReceived(env, { orderId, email, amount, productTitle }).catch(() => {
  });
  notifyCustomerOrderConfirmed(env, { orderId, email, amount, productTitle, deliveryTime }).catch(() => {
  });
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl) {
      const gsPayload = {
        event: "order.received",
        data: {
          orderId,
          productId: body.productId,
          productTitle,
          customerName: "",
          // customer name not available in this context
          customerEmail: email,
          amount,
          currency: "USD",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
      await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gsPayload)
      }).catch((err) => console.error("Failed to send new order webhook:", err));
    }
  } catch (err) {
    console.error("Error triggering new order webhook:", err);
  }
  return json({ success: true, orderId, amount });
}
__name(createOrder, "createOrder");
async function createManualOrder(env, body) {
  if (!body.productId || !body.email) {
    return json({ error: "productId and email required" }, 400);
  }
  const email = validateEmail(body.email);
  if (!email) {
    return json({ error: "Invalid email format" }, 400);
  }
  const orderId = "MO" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
  let addons = [];
  if (body.addons) {
    addons = validateAddons(body.addons);
  } else if (body.notes) {
    const notes = String(body.notes).trim().substring(0, ADDON_LIMITS.value);
    addons = [{ field: "Admin Notes", value: notes }];
  }
  const encryptedData = JSON.stringify({
    email,
    amount: parseFloat(body.amount) || 0,
    addons,
    manualOrder: true
  });
  const manualDeliveryMinutes = Number(body.deliveryTime) || 60;
  await env.DB.prepare(
    "INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes) VALUES (?, ?, ?, ?, ?)"
  ).bind(
    orderId,
    Number(body.productId),
    encryptedData,
    body.status || "paid",
    manualDeliveryMinutes
  ).run();
  let productTitle = "";
  try {
    const product = await env.DB.prepare("SELECT title FROM products WHERE id = ?").bind(Number(body.productId)).first();
    if (product) {
      productTitle = product.title || "";
    }
  } catch (e) {
    console.warn("Could not load product title for manual order notification");
  }
  const manualAmount = parseFloat(body.amount) || 0;
  try {
    const emailResult = await sendOrderNotificationEmails(env, {
      orderId,
      customerEmail: email,
      amount: manualAmount,
      currency: "USD",
      productId: body.productId,
      productTitle,
      addons,
      deliveryTimeMinutes: manualDeliveryMinutes,
      paymentMethod: "Manual Order",
      orderSource: "admin-manual"
    });
    logOrderEmailDispatchResult("Manual order email notification", emailResult, { orderId, source: "admin-manual" });
  } catch (e) {
    console.error("Manual order email notification failed:", e?.message || e);
  }
  notifyOrderReceived(env, {
    orderId,
    productId: body.productId,
    productTitle,
    customerName: "",
    customerEmail: email,
    amount: manualAmount,
    currency: "USD"
  }).catch(() => {
  });
  notifyCustomerOrderConfirmed(env, {
    orderId,
    email,
    amount: manualAmount,
    productTitle
  }).catch(() => {
  });
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl) {
      const gsPayload = {
        event: "order.received",
        data: {
          orderId,
          productId: body.productId,
          productTitle,
          customerName: "",
          customerEmail: email,
          amount: manualAmount,
          currency: "USD",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
      await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gsPayload)
      }).catch((err) => console.error("Failed to send manual order webhook:", err));
    }
  } catch (err) {
    console.error("Error triggering manual order webhook:", err);
  }
  return json({ success: true, orderId });
}
__name(createManualOrder, "createManualOrder");
async function getBuyerOrder(env, orderId) {
  const row = await env.DB.prepare(
    "SELECT o.*, p.title as product_title, p.thumbnail_url as product_thumbnail, p.whop_product_id, p.instant_delivery as product_instant_delivery, p.normal_delivery_text as product_normal_delivery_text FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_id = ?"
  ).bind(orderId).first();
  if (!row) return json({ error: "Order not found" }, 404);
  const reviewCheck = await env.DB.prepare(
    "SELECT id FROM reviews WHERE order_id = ? LIMIT 1"
  ).bind(orderId).first();
  const hasReview = !!reviewCheck;
  let addons = [], email = "", amount = null;
  try {
    if (row.encrypted_data && row.encrypted_data[0] === "{") {
      const d = JSON.parse(row.encrypted_data);
      addons = d.addons || [];
      email = d.email || "";
      amount = d.amount;
    }
  } catch (e) {
    console.error("Failed to parse order encrypted_data for buyer order:", orderId, e.message);
  }
  let buyerSafeVideoMetadata = row.delivered_video_metadata || null;
  if (buyerSafeVideoMetadata) {
    const meta = parseMetadataObject(buyerSafeVideoMetadata);
    if (meta.youtubeUrl) delete meta.youtubeUrl;
    if (meta.reviewYoutubeUrl) delete meta.reviewYoutubeUrl;
    buyerSafeVideoMetadata = Object.keys(meta).length ? JSON.stringify(meta) : null;
  }
  const orderData = {
    ...row,
    delivered_video_metadata: buyerSafeVideoMetadata,
    addons,
    email,
    amount,
    has_review: hasReview,
    tip_paid: !!row.tip_paid,
    tip_amount: row.tip_amount || 0
  };
  if (orderData.created_at && typeof orderData.created_at === "string") {
    orderData.created_at = toISO8601(orderData.created_at);
  }
  if (orderData.delivered_at && typeof orderData.delivered_at === "string") {
    orderData.delivered_at = toISO8601(orderData.delivered_at);
  }
  const productRow = {
    instant_delivery: orderData.product_instant_delivery,
    normal_delivery_text: orderData.product_normal_delivery_text
  };
  orderData.delivery_time_minutes = getEffectiveDeliveryMinutes(orderData, productRow);
  return json({ order: orderData });
}
__name(getBuyerOrder, "getBuyerOrder");
async function deleteOrder(env, id) {
  if (!id) return json({ error: "Missing id" }, 400);
  const asNumber2 = Number(id);
  if (!Number.isNaN(asNumber2) && String(id).trim() === String(asNumber2)) {
    await env.DB.prepare("DELETE FROM reviews WHERE order_id IN (SELECT order_id FROM orders WHERE id = ?)").bind(asNumber2).run();
    await env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(asNumber2).run();
    return json({ success: true });
  }
  const orderId = String(id).trim();
  await env.DB.prepare("DELETE FROM reviews WHERE order_id = ?").bind(orderId).run();
  await env.DB.prepare("DELETE FROM orders WHERE order_id = ?").bind(orderId).run();
  return json({ success: true });
}
__name(deleteOrder, "deleteOrder");
async function deleteAllOrders(env) {
  try {
    const reviewsResult = await env.DB.prepare(
      "DELETE FROM reviews WHERE order_id IN (SELECT order_id FROM orders)"
    ).run();
    const ordersResult = await env.DB.prepare("DELETE FROM orders").run();
    return json({
      success: true,
      count: ordersResult?.changes || 0,
      deleted_order_reviews: reviewsResult?.changes || 0
    });
  } catch (err) {
    return json({ error: err.message || "Failed to delete all orders" }, 500);
  }
}
__name(deleteAllOrders, "deleteAllOrders");
async function updateOrder(env, body) {
  const orderId = body.orderId;
  if (!orderId) return json({ error: "orderId required" }, 400);
  const updates = [];
  const values = [];
  if (body.status !== void 0) {
    updates.push("status = ?");
    values.push(body.status);
  }
  if (body.delivery_time_minutes !== void 0) {
    updates.push("delivery_time_minutes = ?");
    values.push(Number(body.delivery_time_minutes));
  }
  if (updates.length === 0) {
    return json({ error: "No fields to update" }, 400);
  }
  values.push(orderId);
  await env.DB.prepare(`UPDATE orders SET ${updates.join(", ")} WHERE order_id = ?`).bind(...values).run();
  return json({ success: true });
}
__name(updateOrder, "updateOrder");
function parseMetadataObject(raw) {
  if (!raw || typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}
__name(parseMetadataObject, "parseMetadataObject");
async function deliverOrder(env, body) {
  const orderId = String(body?.orderId || "").trim();
  const videoUrl = String(body?.videoUrl || "").trim();
  const downloadUrl = String(body?.downloadUrl || videoUrl || body?.archiveUrl || "").trim();
  const youtubeUrl = String(body?.youtubeUrl || "").trim();
  if (!orderId) return json({ error: "orderId required" }, 400);
  if (!downloadUrl && !youtubeUrl) {
    return json({ error: "downloadUrl or youtubeUrl required" }, 400);
  }
  const deliveredVideoUrl = downloadUrl || youtubeUrl;
  const primaryDeliveryUrl = downloadUrl || deliveredVideoUrl;
  const orderResult = await env.DB.prepare(
    "SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?"
  ).bind(orderId).first();
  const deliveredVideoMetadata = JSON.stringify({
    embedUrl: body.embedUrl,
    itemId: body.itemId,
    subtitlesUrl: body.subtitlesUrl,
    tracks: Array.isArray(body.tracks) ? body.tracks : void 0,
    downloadUrl: downloadUrl || void 0,
    youtubeUrl: youtubeUrl || void 0,
    deliveredAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await env.DB.prepare(
    "UPDATE orders SET delivered_video_url=?, delivered_thumbnail_url=?, archive_url=COALESCE(?, archive_url), status=?, delivered_at=CURRENT_TIMESTAMP, delivered_video_metadata=? WHERE order_id=?"
  ).bind(deliveredVideoUrl, body.thumbnailUrl || null, downloadUrl || null, "delivered", deliveredVideoMetadata, orderId).run();
  let customerEmail = "";
  try {
    if (orderResult?.encrypted_data) {
      const decrypted = JSON.parse(orderResult.encrypted_data);
      customerEmail = decrypted.email || "";
    }
  } catch (e) {
  }
  try {
    const emailResult = await sendOrderDeliveredNotificationEmails(env, {
      orderId,
      customerEmail,
      productTitle: orderResult?.product_title || "Your Order",
      deliveryUrl: primaryDeliveryUrl,
      videoUrl: deliveredVideoUrl,
      youtubeUrl
    });
    logOrderEmailDispatchResult("Order delivery email notification", emailResult, { orderId, source: "delivery" });
  } catch (e) {
    console.error("Order delivery email notification failed:", e?.message || e);
  }
  notifyOrderDelivered(env, {
    orderId,
    productTitle: orderResult?.product_title || "Your Order",
    customerEmail,
    deliveryUrl: primaryDeliveryUrl,
    videoUrl: deliveredVideoUrl,
    youtubeUrl
  }).catch(() => {
  });
  notifyCustomerOrderDelivered(env, {
    orderId,
    email: customerEmail,
    productTitle: orderResult?.product_title || "Your Order",
    deliveryUrl: primaryDeliveryUrl,
    videoUrl: deliveredVideoUrl,
    youtubeUrl
  }).catch(() => {
  });
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl && orderResult) {
      const gsPayload = {
        event: "order.delivered",
        data: {
          orderId,
          productTitle: orderResult.product_title || "Your Order",
          customerEmail,
          // Provide both deliveryUrl and videoUrl for compatibility
          deliveryUrl: primaryDeliveryUrl,
          videoUrl: deliveredVideoUrl,
          youtubeUrl: youtubeUrl || void 0
        }
      };
      await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gsPayload)
      }).catch((err) => console.error("Failed to send delivery webhook:", err));
    }
  } catch (err) {
    console.error("Error triggering delivery webhook:", err);
  }
  return json({ success: true, deliveredVideoUrl, downloadUrl: downloadUrl || null, youtubeUrl: youtubeUrl || null });
}
__name(deliverOrder, "deliverOrder");
async function requestRevision(env, body) {
  if (!body.orderId) return json({ error: "orderId required" }, 400);
  const revisionReason = body.reason || "No reason provided";
  const orderResult = await env.DB.prepare(
    "SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?"
  ).bind(body.orderId).first();
  await env.DB.prepare(
    "UPDATE orders SET revision_requested=1, revision_count=revision_count+1, revision_reason=?, status=? WHERE order_id=?"
  ).bind(revisionReason, "revision", body.orderId).run();
  let customerEmail = "";
  try {
    const decrypted = JSON.parse(orderResult?.encrypted_data || "{}");
    customerEmail = decrypted.email || "";
  } catch (e) {
    console.warn("Could not decrypt order data for revision email");
  }
  const revisionCount = (Number(orderResult?.revision_count) || 0) + 1;
  try {
    const emailResult = await sendOrderRevisionRequestedNotificationEmails(env, {
      orderId: body.orderId,
      customerEmail,
      productTitle: orderResult?.product_title || "Your Order",
      revisionReason,
      revisionCount,
      status: "revision"
    });
    logOrderEmailDispatchResult("Order revision email notification", emailResult, {
      orderId: body.orderId,
      source: "revision"
    });
  } catch (e) {
    console.error("Order revision email notification failed:", e?.message || e);
  }
  notifyOrderRevisionRequested(env, {
    orderId: body.orderId,
    customerEmail,
    productTitle: orderResult?.product_title || "Your Order",
    revisionReason,
    revisionCount,
    status: "revision"
  }).catch(() => {
  });
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl && orderResult) {
      const gsPayload = {
        event: "order.revision_requested",
        data: {
          orderId: body.orderId,
          productTitle: orderResult.product_title || "Your Order",
          customerEmail,
          revisionReason,
          revisionCount,
          status: "revision"
        }
      };
      await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gsPayload)
      }).catch((err) => console.error("Failed to send revision webhook:", err));
    }
  } catch (err) {
    console.error("Error triggering revision webhook:", err);
  }
  return json({ success: true });
}
__name(requestRevision, "requestRevision");
async function updatePortfolio(env, body) {
  await env.DB.prepare(
    "UPDATE orders SET portfolio_enabled=? WHERE order_id=?"
  ).bind(body.portfolioEnabled ? 1 : 0, body.orderId).run();
  return json({ success: true });
}
__name(updatePortfolio, "updatePortfolio");
async function updateArchiveLink(env, body) {
  const orderId = String(body?.orderId || "").trim();
  const archiveUrl = String(body?.archiveUrl || "").trim();
  const youtubeUrl = String(body?.youtubeUrl || "").trim();
  if (!orderId || !archiveUrl) {
    return json({ error: "orderId and archiveUrl required" }, 400);
  }
  const existing = await env.DB.prepare(
    "SELECT delivered_video_metadata FROM orders WHERE order_id = ?"
  ).bind(orderId).first();
  const existingMeta = parseMetadataObject(existing?.delivered_video_metadata || "");
  const nextMeta = {
    ...existingMeta,
    downloadUrl: archiveUrl,
    youtubeUrl: youtubeUrl || existingMeta.youtubeUrl,
    deliveredAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await env.DB.prepare(
    "UPDATE orders SET archive_url=?, delivered_video_url=?, status=?, delivered_at=CURRENT_TIMESTAMP, delivered_video_metadata=? WHERE order_id=?"
  ).bind(archiveUrl, archiveUrl, "delivered", JSON.stringify(nextMeta), orderId).run();
  return json({ success: true });
}
__name(updateArchiveLink, "updateArchiveLink");
async function markTipPaid(env, body) {
  const { orderId, amount } = body;
  if (!orderId) return json({ error: "orderId required" }, 400);
  await env.DB.prepare(
    "UPDATE orders SET tip_paid = 1, tip_amount = ? WHERE order_id = ?"
  ).bind(Number(amount) || 0, orderId).run();
  let email = "";
  try {
    const order = await env.DB.prepare("SELECT encrypted_data FROM orders WHERE order_id = ?").bind(orderId).first();
    if (order?.encrypted_data) {
      const data = JSON.parse(order.encrypted_data);
      email = data.email || "";
    }
  } catch (e) {
  }
  notifyTipReceived(env, { orderId, amount: Number(amount) || 0, email }).catch(() => {
  });
  return json({ success: true });
}
__name(markTipPaid, "markTipPaid");

// src/controllers/reviews.js
var REVIEW_LIMITS = {
  author_name: 50,
  comment: 1e3,
  rating_min: 1,
  rating_max: 5
};
async function getReviews(env, url) {
  const params = url.searchParams;
  const isAdminBypassCache = params.get("admin") === "1" || params.get("nocache") === "1";
  const rating = params.get("rating");
  const productId = params.get("productId");
  const productIds = params.get("productIds");
  const ids = params.get("ids");
  const kvKey = `api_cache:reviews:list:${rating || ""}:${productId || ""}:${productIds || ""}:${ids || ""}`;
  if (!isAdminBypassCache && env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return cachedJson(JSON.parse(cached), 120);
      }
    } catch (e) {
    }
  }
  let sql = "SELECT r.*, p.title as product_title FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE 1 = 1";
  const binds = [];
  if (!isAdminBypassCache) {
    sql += " AND r.status = ?";
    binds.push("approved");
  }
  if (rating) {
    sql += " AND r.rating = ?";
    binds.push(Number(rating));
  }
  if (productId) {
    sql += " AND r.product_id = ?";
    binds.push(Number(productId));
  }
  if (productIds) {
    const idsArr = productIds.split(",").map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
    if (idsArr.length > 0) {
      sql += ` AND r.product_id IN (${idsArr.map(() => "?").join(",")})`;
      binds.push(...idsArr);
    }
  }
  if (ids) {
    const idsArr2 = ids.split(",").map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
    if (idsArr2.length > 0) {
      sql += ` AND r.id IN (${idsArr2.map(() => "?").join(",")})`;
      binds.push(...idsArr2);
    }
  }
  sql += " ORDER BY r.created_at DESC";
  const stmt = await env.DB.prepare(sql);
  const r = await stmt.bind(...binds).all();
  const reviews = (r.results || []).map((review) => {
    if (review.created_at && typeof review.created_at === "string") {
      review.created_at = toISO8601(review.created_at);
    }
    return review;
  });
  const responseData = { reviews };
  if (!isAdminBypassCache && env.PAGE_CACHE) {
    try {
      await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
    } catch (e) {
    }
  }
  return isAdminBypassCache ? json(responseData) : cachedJson(responseData, 120);
}
__name(getReviews, "getReviews");
async function getProductReviews(env, productId) {
  const kvKey = `api_cache:reviews:product:${productId}`;
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return json(JSON.parse(cached));
      }
    } catch (e) {
    }
  }
  const r = await env.DB.prepare(
    `SELECT reviews.*,
            -- Prefer review overrides first; fall back to order delivery links
            COALESCE(reviews.delivered_video_url, orders.delivered_video_url) as delivered_video_url,
            COALESCE(reviews.delivered_thumbnail_url, orders.delivered_thumbnail_url) as delivered_thumbnail_url,
            orders.delivered_video_metadata
     FROM reviews 
     LEFT JOIN orders ON reviews.order_id = orders.order_id 
     WHERE reviews.product_id = ? AND reviews.status = ? 
     ORDER BY reviews.created_at DESC`
  ).bind(Number(productId), "approved").all();
  const reviews = (r.results || []).map((review) => {
    if (review.created_at && typeof review.created_at === "string") {
      review.created_at = toISO8601(review.created_at);
    }
    return review;
  });
  const responseData = { reviews };
  if (env.PAGE_CACHE) {
    try {
      await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
    } catch (e) {
    }
  }
  return json(responseData);
}
__name(getProductReviews, "getProductReviews");
async function getReviewMigrationStatus(env) {
  const row = await env.DB.prepare(`
    SELECT
      COUNT(*) AS total_reviews,
      SUM(CASE WHEN delivered_video_url IS NOT NULL AND TRIM(delivered_video_url) != '' THEN 1 ELSE 0 END) AS reviews_with_videos,
      SUM(CASE WHEN delivered_video_url IS NULL OR TRIM(delivered_video_url) = '' THEN 1 ELSE 0 END) AS reviews_without_videos,
      SUM(CASE WHEN order_id IS NOT NULL AND TRIM(order_id) != '' THEN 1 ELSE 0 END) AS reviews_with_orders,
      SUM(CASE
            WHEN order_id IS NOT NULL AND TRIM(order_id) != '' AND (
              delivered_video_url IS NULL OR TRIM(delivered_video_url) = '' OR
              delivered_thumbnail_url IS NULL OR TRIM(delivered_thumbnail_url) = ''
            )
            THEN 1
            ELSE 0
          END) AS eligible_for_migration
    FROM reviews
  `).first();
  return json({
    success: true,
    stats: {
      totalReviews: Number(row?.total_reviews || 0),
      reviewsWithVideos: Number(row?.reviews_with_videos || 0),
      reviewsWithoutVideos: Number(row?.reviews_without_videos || 0),
      reviewsWithOrders: Number(row?.reviews_with_orders || 0),
      eligibleForMigration: Number(row?.eligible_for_migration || 0)
    }
  });
}
__name(getReviewMigrationStatus, "getReviewMigrationStatus");
async function migrateReviewMediaFromOrders(env) {
  const result = await env.DB.prepare(`
    UPDATE reviews
       SET delivered_video_url = COALESCE(
             NULLIF(TRIM(delivered_video_url), ''),
             (
               SELECT NULLIF(TRIM(o.delivered_video_url), '')
                 FROM orders o
                WHERE o.order_id = reviews.order_id
                LIMIT 1
             )
           ),
           delivered_thumbnail_url = COALESCE(
             NULLIF(TRIM(delivered_thumbnail_url), ''),
             (
               SELECT NULLIF(TRIM(o.delivered_thumbnail_url), '')
                 FROM orders o
                WHERE o.order_id = reviews.order_id
                LIMIT 1
             )
           )
     WHERE order_id IS NOT NULL
       AND TRIM(order_id) != ''
       AND EXISTS (
             SELECT 1
               FROM orders o
              WHERE o.order_id = reviews.order_id
                AND (
                  NULLIF(TRIM(o.delivered_video_url), '') IS NOT NULL OR
                  NULLIF(TRIM(o.delivered_thumbnail_url), '') IS NOT NULL
                )
           )
       AND (
             delivered_video_url IS NULL OR TRIM(delivered_video_url) = '' OR
             delivered_thumbnail_url IS NULL OR TRIM(delivered_thumbnail_url) = ''
           )
  `).run();
  return json({
    success: true,
    rowsUpdated: Number(result?.meta?.changes || result?.changes || 0)
  });
}
__name(migrateReviewMediaFromOrders, "migrateReviewMediaFromOrders");
async function addReview(env, body, options = {}) {
  try {
    const allowStatusOverride = !!options.allowStatusOverride;
    const shouldNotify = options.notify !== false;
    const productId = Number(body.productId ?? body.product_id ?? 0);
    const hasRating = body.rating !== void 0 && body.rating !== null && String(body.rating).trim() !== "";
    if (!productId || !hasRating) return json({ error: "productId and rating required" }, 400);
    const authorInput = body.author ?? body.author_name ?? "Customer";
    const commentInput = body.comment ?? "";
    const showOnProductInput = body.showOnProduct ?? body.show_on_product;
    const deliveredVideoUrlInput = body.deliveredVideoUrl ?? body.delivered_video_url;
    const deliveredThumbnailUrlInput = body.deliveredThumbnailUrl ?? body.delivered_thumbnail_url;
    const orderIdInput = body.orderId ?? body.order_id ?? null;
    const authorName = String(authorInput).trim().substring(0, REVIEW_LIMITS.author_name);
    const comment = String(commentInput).trim().substring(0, REVIEW_LIMITS.comment);
    const rating = Math.min(REVIEW_LIMITS.rating_max, Math.max(REVIEW_LIMITS.rating_min, parseInt(body.rating, 10) || 5));
    const status = allowStatusOverride ? String(body.status || "approved").trim() : "approved";
    const showOnProduct = showOnProductInput !== void 0 ? showOnProductInput === true || showOnProductInput === 1 || showOnProductInput === "1" || String(showOnProductInput).toLowerCase() === "true" ? 1 : 0 : 1;
    const deliveredVideoUrl = String(deliveredVideoUrlInput || "").trim();
    const deliveredThumbnailUrl = String(deliveredThumbnailUrlInput || "").trim();
    if (!["approved", "pending", "rejected"].includes(status)) {
      return json({ error: "Invalid status" }, 400);
    }
    if (authorName.length < 1) {
      return json({ error: "Name is required" }, 400);
    }
    if (comment.length > 0 && comment.length < 3) {
      return json({ error: "Comment must be at least 3 characters" }, 400);
    }
    if (orderIdInput) {
      const existing = await env.DB.prepare(
        "SELECT id FROM reviews WHERE order_id = ? LIMIT 1"
      ).bind(orderIdInput).first();
      if (existing) {
        return json({ error: "A review for this order already exists." }, 409);
      }
    } else {
      const recent = await env.DB.prepare(
        "SELECT id FROM reviews WHERE product_id = ? AND author_name = ? AND comment = ? AND status = ? LIMIT 1"
      ).bind(productId, authorName, comment, status).first();
      if (recent) {
        return json({ error: "This exact review was already submitted.", hasPending: true }, 409);
      }
    }
    await env.DB.prepare(
      "INSERT INTO reviews (product_id, author_name, rating, comment, status, order_id, show_on_product, delivered_video_url, delivered_thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      productId,
      authorName,
      rating,
      comment,
      status,
      orderIdInput || null,
      showOnProduct,
      deliveredVideoUrl || null,
      deliveredThumbnailUrl || null
    ).run();
    let productTitle = "";
    try {
      const product = await env.DB.prepare("SELECT title FROM products WHERE id = ?").bind(productId).first();
      productTitle = product?.title || "";
    } catch (e) {
    }
    if (shouldNotify) {
      notifyReviewSubmitted(env, { productId, productTitle, rating, authorName, comment }).catch(() => {
      });
    }
    return json({ success: true });
  } catch (err) {
    console.error("addReview Error:", err);
    return json({ error: "Failed to add review" }, 500);
  }
}
__name(addReview, "addReview");
async function updateReview(env, body) {
  const id = Number(body.id);
  if (!id) return json({ error: "Review ID required" }, 400);
  const updates = [];
  const values = [];
  if (body.status !== void 0) {
    const status = String(body.status).trim();
    if (!["approved", "pending", "rejected"].includes(status)) {
      return json({ error: "Invalid status" }, 400);
    }
    updates.push("status = ?");
    values.push(status);
  }
  if (body.author_name !== void 0) {
    const name = String(body.author_name).trim().substring(0, REVIEW_LIMITS.author_name);
    updates.push("author_name = ?");
    values.push(name);
  }
  if (body.rating !== void 0) {
    const rating = Math.min(REVIEW_LIMITS.rating_max, Math.max(REVIEW_LIMITS.rating_min, parseInt(body.rating) || 5));
    updates.push("rating = ?");
    values.push(rating);
  }
  if (body.comment !== void 0) {
    const comment = String(body.comment).trim().substring(0, REVIEW_LIMITS.comment);
    updates.push("comment = ?");
    values.push(comment);
  }
  if (body.show_on_product !== void 0) {
    updates.push("show_on_product = ?");
    values.push(body.show_on_product ? 1 : 0);
  }
  if (body.delivered_video_url !== void 0) {
    const v = String(body.delivered_video_url || "").trim();
    updates.push("delivered_video_url = ?");
    values.push(v ? v : null);
  }
  if (body.delivered_thumbnail_url !== void 0) {
    const t = String(body.delivered_thumbnail_url || "").trim();
    updates.push("delivered_thumbnail_url = ?");
    values.push(t ? t : null);
  }
  if (updates.length === 0) {
    return json({ error: "No fields to update" }, 400);
  }
  values.push(id);
  await env.DB.prepare(`UPDATE reviews SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  return json({ success: true });
}
__name(updateReview, "updateReview");
async function deleteReview(env, id) {
  await env.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(Number(id)).run();
  return json({ success: true });
}
__name(deleteReview, "deleteReview");

// src/utils/validation.js
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
  const nowTs = Math.floor(Date.now() / 1e3);
  if (nowTs - lastTs < 1) {
    const err = new Error("Rate limited");
    err.status = 429;
    throw err;
  }
}
__name(enforceUserRateLimit, "enforceUserRateLimit");

// src/controllers/chat.js
async function startChat(env, body) {
  const nameIn = String(body.name || "").trim();
  const emailIn = String(body.email || "").trim();
  if (!nameIn || !emailIn) return json({ error: "Name and email are required" }, 400);
  const email = emailIn.toLowerCase();
  const name = nameIn;
  const canonical = await env.DB.prepare(
    `SELECT id, name, created_at
     FROM chat_sessions
     WHERE lower(email) = lower(?)
     ORDER BY datetime(created_at) ASC
     LIMIT 1`
  ).bind(email).first();
  if (canonical?.id) {
    const canonicalId = String(canonical.id);
    if (name && canonical.name !== name) {
      await env.DB.prepare(
        `UPDATE chat_sessions SET name = ? WHERE id = ?`
      ).bind(name, canonicalId).run();
    }
    const others = await env.DB.prepare(
      `SELECT id FROM chat_sessions
       WHERE lower(email) = lower(?) AND id != ?`
    ).bind(email, canonicalId).all();
    const otherIds = (others?.results || []).map((r) => String(r.id));
    if (otherIds.length > 0) {
      const placeholders = otherIds.map(() => "?").join(",");
      await env.DB.prepare(
        `UPDATE chat_messages SET session_id = ? WHERE session_id IN (${placeholders})`
      ).bind(canonicalId, ...otherIds).run();
      await env.DB.prepare(
        `DELETE FROM chat_sessions WHERE id IN (${placeholders})`
      ).bind(...otherIds).run();
    }
    return json({ sessionId: canonicalId, reused: true });
  }
  const sessionId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO chat_sessions (id, name, email) VALUES (?, ?, ?)`
  ).bind(sessionId, escapeHtml(name), escapeHtml(email)).run();
  return json({ sessionId, reused: false });
}
__name(startChat, "startChat");
async function syncChat(env, url) {
  const sessionId = url.searchParams.get("sessionId");
  const sinceIdRaw = url.searchParams.get("sinceId") || "0";
  const sinceId = Number(sinceIdRaw) || 0;
  if (!sessionId) return json({ error: "sessionId is required" }, 400);
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
__name(syncChat, "syncChat");
async function sendMessage(env, body, reqUrl) {
  const sessionId = String(body.sessionId || "").trim();
  const roleRaw = String(body.role || "user").trim().toLowerCase();
  const rawContent = String(body.content ?? body.message ?? "");
  const role = ["user", "admin", "system"].includes(roleRaw) ? roleRaw : "user";
  if (!sessionId) return json({ error: "sessionId is required" }, 400);
  const sess = await env.DB.prepare(
    `SELECT blocked FROM chat_sessions WHERE id = ?`
  ).bind(sessionId).first();
  if (role === "user" && Number(sess?.blocked || 0) === 1) {
    return json({ success: false, error: "You have been blocked by support." }, 403);
  }
  const trimmed = rawContent.trim();
  if (!trimmed) return json({ error: "content is required" }, 400);
  if (trimmed.length > 500) return json({ error: "Message too long (max 500 characters)" }, 400);
  try {
    if (role === "user") await enforceUserRateLimit(env, sessionId);
  } catch (e) {
    if (e?.status === 429) return json({ error: "Too many messages. Please wait a moment." }, 429);
    throw e;
  }
  let isFirstUserMessage = false;
  if (role === "user") {
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as c
       FROM chat_messages
       WHERE session_id = ? AND role = 'user'`
    ).bind(sessionId).first();
    isFirstUserMessage = Number(countRow?.c || 0) === 0;
  }
  const safeContent = escapeHtml(trimmed);
  const insertRes = await env.DB.prepare(
    `INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)`
  ).bind(sessionId, role, safeContent).run();
  try {
    await env.DB.prepare(
      `UPDATE chat_sessions
       SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(safeContent, sessionId).run();
  } catch (e) {
    console.error("Failed to update chat_sessions last-message fields:", e);
  }
  let sessionName = "", sessionEmail = "";
  try {
    const sess2 = await env.DB.prepare("SELECT name, email FROM chat_sessions WHERE id = ?").bind(sessionId).first();
    sessionName = sess2?.name || "";
    sessionEmail = sess2?.email || "";
  } catch (e) {
  }
  if (role === "user") {
    notifyChatMessage(env, {
      name: sessionName,
      email: sessionEmail,
      content: trimmed
    }).catch(() => {
    });
  }
  if (role === "admin" && sessionEmail) {
    notifyCustomerChatReply(env, {
      name: sessionName,
      email: sessionEmail,
      replyContent: trimmed
    }).catch(() => {
    });
  }
  if (isFirstUserMessage) {
    try {
      const setting = await env.DB.prepare(
        `SELECT value FROM settings WHERE key = ?`
      ).bind("GOOGLE_SCRIPT_URL").first();
      const scriptUrl = String(setting?.value || "").trim();
      if (scriptUrl) {
        const session = await env.DB.prepare(
          `SELECT id, name, email, created_at FROM chat_sessions WHERE id = ?`
        ).bind(sessionId).first();
        const webhookPromise = fetch(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "first_customer_message",
            sessionId,
            name: session?.name || null,
            email: session?.email || null,
            created_at: session?.created_at || null,
            message: trimmed
          })
        }).catch((e) => console.error("Chat webhook failed:", e));
        if (ctx && typeof ctx.waitUntil === "function") {
          ctx.waitUntil(webhookPromise);
        }
      }
    } catch (e) {
      console.error("Chat webhook trigger failed:", e);
    }
  }
  if (role === "user") {
    const normalized = normalizeQuickAction(trimmed);
    const session = await env.DB.prepare(
      `SELECT email FROM chat_sessions WHERE id = ?`
    ).bind(sessionId).first();
    const email = String(session?.email || "").trim();
    const origin = new URL(reqUrl).origin;
    if (normalized === "my order status") {
      let replyText = "We couldn't find any recent orders for this email.";
      if (email) {
        const lastOrder = await getLatestOrderForEmail(env, email);
        if (lastOrder) {
          const link = `${origin}/buyer-order.html?id=${encodeURIComponent(lastOrder.order_id)}`;
          replyText = `Your last order #${lastOrder.order_id} is currently ${lastOrder.status || "unknown"}. Track it here: ${link}`;
        }
      }
      const safeReply = escapeHtml(replyText);
      await env.DB.prepare(
        `INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'system', ?)`
      ).bind(sessionId, safeReply).run();
      try {
        await env.DB.prepare(
          `UPDATE chat_sessions
           SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).bind(safeReply, sessionId).run();
      } catch (e) {
      }
    }
    if (normalized === "check delivery status") {
      let replyText = "No recent orders found for this email.";
      if (email) {
        const lastOrder = await getLatestOrderForEmail(env, email);
        if (lastOrder) {
          const link = `${origin}/buyer-order.html?id=${encodeURIComponent(lastOrder.order_id)}`;
          replyText = `Your last order is ${lastOrder.status || "unknown"}. View details here: ${link}`;
        }
      }
      const safeReply = escapeHtml(replyText);
      await env.DB.prepare(
        `INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'system', ?)`
      ).bind(sessionId, safeReply).run();
      try {
        await env.DB.prepare(
          `UPDATE chat_sessions
           SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).bind(safeReply, sessionId).run();
      } catch (e) {
      }
    }
  }
  return json({ success: true, messageId: insertRes?.meta?.last_row_id || null });
}
__name(sendMessage, "sendMessage");
async function blockSession(env, body) {
  const sessionId = String(body.sessionId || "").trim();
  const blocked = body.blocked === true || body.blocked === 1 || body.blocked === "true";
  if (!sessionId) return json({ error: "sessionId is required" }, 400);
  await env.DB.prepare(
    `UPDATE chat_sessions SET blocked = ? WHERE id = ?`
  ).bind(blocked ? 1 : 0, sessionId).run();
  return json({ success: true, blocked: blocked ? 1 : 0 });
}
__name(blockSession, "blockSession");
async function deleteSession(env, sessionId) {
  if (!sessionId) return json({ error: "sessionId is required" }, 400);
  await env.DB.prepare(`DELETE FROM chat_messages WHERE session_id = ?`).bind(sessionId).run();
  await env.DB.prepare(`DELETE FROM chat_sessions WHERE id = ?`).bind(sessionId).run();
  return json({ success: true });
}
__name(deleteSession, "deleteSession");
async function getSessions(env) {
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
__name(getSessions, "getSessions");

// src/controllers/whop.js
var WHOP_API_TIMEOUT = 2e4;
var WHOP_METADATA_VALUE_MAX = 500;
var WHOP_METADATA_SAFE_MAX = 470;
var WHOP_ADDONS_MAX_ITEMS = 8;
function normalizeGatewayError(value, fallback = "Payment gateway error") {
  if (!value) return fallback;
  if (typeof value === "string") {
    const msg = value.trim();
    return msg || fallback;
  }
  if (typeof value === "object") {
    const candidates = [
      value.message,
      value.error,
      value.detail,
      value.details,
      value.description,
      value.reason
    ];
    for (const candidate of candidates) {
      const msg = normalizeGatewayError(candidate, "");
      if (msg) return msg;
    }
    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== "{}" && serialized !== "[]") {
        return serialized;
      }
    } catch (e) {
    }
  }
  try {
    const msg = String(value).trim();
    return msg || fallback;
  } catch (e) {
    return fallback;
  }
}
__name(normalizeGatewayError, "normalizeGatewayError");
function trimMetadataText(value, maxLength = WHOP_METADATA_SAFE_MAX) {
  const raw = String(value ?? "");
  if (raw.length <= maxLength) return raw;
  if (maxLength <= 3) return raw.slice(0, Math.max(0, maxLength));
  return `${raw.slice(0, maxLength - 3)}...`;
}
__name(trimMetadataText, "trimMetadataText");
function serializeAddonsMetadata(addons, maxLength = WHOP_METADATA_SAFE_MAX) {
  if (!Array.isArray(addons) || addons.length === 0) return "[]";
  const normalized = addons.map((addon, index) => {
    const safeField = trimMetadataText(
      addon && addon.field != null ? addon.field : `addon_${index + 1}`,
      80
    );
    const safeValue = trimMetadataText(addon && addon.value != null ? addon.value : "", 160);
    return { field: safeField, value: safeValue };
  });
  let candidate = normalized.slice(0, WHOP_ADDONS_MAX_ITEMS);
  while (candidate.length > 0) {
    const serialized = JSON.stringify(candidate);
    if (serialized.length <= maxLength) {
      return serialized;
    }
    let longestIndex = -1;
    let longestLength = 0;
    for (let i = 0; i < candidate.length; i += 1) {
      const length = String(candidate[i]?.value || "").length;
      if (length > longestLength) {
        longestLength = length;
        longestIndex = i;
      }
    }
    if (longestIndex >= 0 && longestLength > 30) {
      candidate[longestIndex] = {
        ...candidate[longestIndex],
        value: trimMetadataText(candidate[longestIndex].value, Math.max(24, Math.floor(longestLength * 0.7)))
      };
      continue;
    }
    candidate = candidate.slice(0, -1);
  }
  const summary = JSON.stringify([
    { field: "addons_summary", value: `${normalized.length} addon(s) selected` }
  ]);
  return summary.length <= maxLength ? summary : "[]";
}
__name(serializeAddonsMetadata, "serializeAddonsMetadata");
function serializeWhopMetadataValue(key, rawValue) {
  if (rawValue === void 0 || rawValue === null) return null;
  if (key === "addons") {
    if (Array.isArray(rawValue)) {
      return serializeAddonsMetadata(rawValue, WHOP_METADATA_SAFE_MAX);
    }
    if (typeof rawValue === "string") {
      try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
          return serializeAddonsMetadata(parsed, WHOP_METADATA_SAFE_MAX);
        }
      } catch (e) {
      }
      return trimMetadataText(rawValue, WHOP_METADATA_SAFE_MAX);
    }
    try {
      return serializeAddonsMetadata([rawValue], WHOP_METADATA_SAFE_MAX);
    } catch (e) {
      return "[]";
    }
  }
  if (typeof rawValue === "string") {
    return trimMetadataText(rawValue, WHOP_METADATA_SAFE_MAX);
  }
  if (typeof rawValue === "number" || typeof rawValue === "boolean" || typeof rawValue === "bigint") {
    return trimMetadataText(String(rawValue), WHOP_METADATA_VALUE_MAX);
  }
  try {
    const serialized = JSON.stringify(rawValue);
    return trimMetadataText(serialized, WHOP_METADATA_SAFE_MAX);
  } catch (e) {
    return trimMetadataText(String(rawValue), WHOP_METADATA_SAFE_MAX);
  }
}
__name(serializeWhopMetadataValue, "serializeWhopMetadataValue");
function serializeWhopMetadata(metadata = {}) {
  const output = {};
  if (!metadata || typeof metadata !== "object") return output;
  for (const [key, rawValue] of Object.entries(metadata)) {
    const safeValue = serializeWhopMetadataValue(key, rawValue);
    if (safeValue === null || safeValue === void 0 || safeValue === "") continue;
    output[key] = safeValue;
  }
  return output;
}
__name(serializeWhopMetadata, "serializeWhopMetadata");
function isWhopMetadataLengthError(errorText = "") {
  const text = String(errorText || "").toLowerCase();
  if (!text) return false;
  return text.includes("metadata") && (text.includes("exceeds 500") || text.includes("too long") || text.includes("max length") || text.includes("character"));
}
__name(isWhopMetadataLengthError, "isWhopMetadataLengthError");
function parseWhopMetadata(metadata = {}) {
  let source = {};
  if (typeof metadata === "string") {
    try {
      const maybeObj = JSON.parse(metadata);
      if (maybeObj && typeof maybeObj === "object") {
        source = maybeObj;
      }
    } catch (e) {
    }
  } else if (metadata && typeof metadata === "object") {
    source = metadata;
  }
  const parsed = { ...source };
  if (typeof parsed.addons === "string") {
    try {
      const addons = JSON.parse(parsed.addons);
      parsed.addons = Array.isArray(addons) ? addons : [];
    } catch (e) {
      parsed.addons = [];
    }
  }
  if (typeof parsed.amount === "string") {
    const amount = Number(parsed.amount);
    if (Number.isFinite(amount)) parsed.amount = amount;
  }
  if (typeof parsed.deliveryTimeMinutes === "string") {
    const minutes = Number(parsed.deliveryTimeMinutes);
    if (Number.isFinite(minutes)) parsed.deliveryTimeMinutes = minutes;
  }
  if (typeof parsed.tipAmount === "string") {
    const tip = Number(parsed.tipAmount);
    if (Number.isFinite(tip)) parsed.tipAmount = tip;
  }
  if (parsed.orderId !== void 0 && parsed.orderId !== null) {
    parsed.orderId = String(parsed.orderId);
  }
  if (typeof parsed.type === "string") {
    parsed.type = parsed.type.trim().toLowerCase();
  }
  if (parsed.product_id !== void 0 && parsed.product_id !== null) {
    parsed.product_id = String(parsed.product_id);
  }
  return parsed;
}
__name(parseWhopMetadata, "parseWhopMetadata");
async function createCheckout(env, body, origin) {
  const { product_id } = body;
  if (!product_id) {
    return json({ error: "Product ID required" }, 400);
  }
  const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(Number(product_id)).first();
  if (!product) {
    return json({ error: "Product not found" }, 404);
  }
  let globalSettings = {};
  try {
    const settingsRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
    if (settingsRow && settingsRow.value) {
      globalSettings = JSON.parse(settingsRow.value);
    }
  } catch (e) {
    console.error("Failed to load global settings:", e);
  }
  let planId = product.whop_plan || globalSettings.default_plan_id || globalSettings.default_plan || "";
  if (!planId) {
    return json({
      error: "Whop not configured. Please set a plan for this product or configure a default plan in Settings."
    }, 400);
  }
  planId = planId.trim();
  if (planId.startsWith("http")) {
    const planMatch = planId.match(/plan_[a-zA-Z0-9]+/);
    if (planMatch) {
      planId = planMatch[0];
    } else {
      return json({
        error: "Could not extract Plan ID from link. Please use: https://whop.com/checkout/plan_XXXXX or just plan_XXXXX"
      }, 400);
    }
  }
  if (!planId.startsWith("plan_")) {
    return json({ error: "Invalid Whop Plan ID format. Should start with plan_" }, 400);
  }
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: "Whop API key not configured. Please add it in admin Settings." }, 500);
  }
  const expiryTime = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
  try {
    const whopResponse = await fetchWithTimeout("https://api.whop.com/api/v2/checkout_sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        plan_id: planId,
        redirect_url: `${origin}/success.html?product=${product.id}`,
        metadata: {
          product_id: product.id.toString(),
          product_title: product.title,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          expires_at: expiryTime
        }
      })
    }, WHOP_API_TIMEOUT);
    if (!whopResponse.ok) {
      const errorText = await whopResponse.text();
      console.error("Whop API error:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        return json({
          error: normalizeGatewayError(errorData, "Failed to create checkout")
        }, whopResponse.status);
      } catch (e) {
        return json({ error: "Failed to create checkout session" }, whopResponse.status);
      }
    }
    const checkoutData = await whopResponse.json();
    try {
      await env.DB.prepare(`
        INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, expires_at, status, created_at)
        VALUES (?, ?, NULL, ?, 'pending', datetime('now'))
      `).bind(checkoutData.id, product.id, expiryTime).run();
    } catch (e) {
      console.log("Checkout tracking skipped:", e.message);
    }
    return json({
      success: true,
      checkout_id: checkoutData.id,
      checkout_url: checkoutData.purchase_url,
      expires_in: "15 minutes"
    });
  } catch (e) {
    console.error("Whop checkout error:", e);
    return json({ error: e.message || "Failed to create checkout" }, 500);
  }
}
__name(createCheckout, "createCheckout");
async function createPlanCheckout(env, body, origin) {
  const {
    product_id,
    email,
    amount: requestedAmount,
    metadata,
    deliveryTimeMinutes: bodyDeliveryTime,
    couponCode
  } = body || {};
  if (!product_id) {
    return json({ error: "Product ID required" }, 400);
  }
  const normalizedMetadata = metadata && typeof metadata === "object" ? metadata : {};
  const isTipCheckout = String(normalizedMetadata.type || "").toLowerCase() === "tip";
  const tipOrderId = isTipCheckout ? String(normalizedMetadata.orderId || normalizedMetadata.order_id || "").trim() : "";
  const requestedTipAmount = Number(
    normalizedMetadata.tipAmount ?? normalizedMetadata.tip_amount ?? requestedAmount ?? 0
  );
  const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(Number(product_id)).first();
  if (!product) {
    return json({ error: "Product not found" }, 404);
  }
  let deliveryTimeMinutes = bodyDeliveryTime || normalizedMetadata.deliveryTimeMinutes;
  if (!deliveryTimeMinutes) {
    deliveryTimeMinutes = calculateDeliveryMinutes(product);
  }
  deliveryTimeMinutes = Number(deliveryTimeMinutes) || 60;
  console.log("\u{1F4E6} Delivery time calculated:", deliveryTimeMinutes, "minutes");
  let priceValue = 0;
  if (isTipCheckout) {
    if (!tipOrderId) {
      return json({ error: "Tip order ID required" }, 400);
    }
    if (!Number.isFinite(requestedTipAmount) || requestedTipAmount <= 0) {
      return json({ error: "Invalid tip amount" }, 400);
    }
    priceValue = Number(requestedTipAmount.toFixed(2));
  } else {
    try {
      const selectedAddons = normalizedMetadata.addons || body?.addons || [];
      priceValue = await calculateServerSidePrice(env, product_id, selectedAddons, couponCode);
    } catch (e) {
      console.error("Failed to calculate server-side price:", e);
      return json({ error: "Failed to calculate order price" }, 400);
    }
  }
  if (isNaN(priceValue) || priceValue < 0) {
    return json({ error: "Invalid price" }, 400);
  }
  const normalizeWhopProductId = /* @__PURE__ */ __name((value) => {
    const raw = (value || "").trim();
    if (!raw) return "";
    const match = raw.match(/prod_[a-zA-Z0-9_-]+/);
    if (match) {
      return match[0];
    }
    return raw;
  }, "normalizeWhopProductId");
  const directProdId = normalizeWhopProductId(product.whop_product_id);
  let finalProdId = directProdId;
  if (!finalProdId) {
    try {
      const gateway = await env.DB.prepare(`
        SELECT id, whop_product_id
        FROM payment_gateways
        WHERE gateway_type = ?
          AND is_enabled = 1
          AND whop_product_id IS NOT NULL
          AND TRIM(whop_product_id) != ''
        ORDER BY id DESC
        LIMIT 1
      `).bind("whop").first();
      if (gateway && gateway.whop_product_id) {
        finalProdId = normalizeWhopProductId(gateway.whop_product_id);
        console.log(`Using Whop product ID from payment_gateways (id=${gateway.id}):`, finalProdId);
      }
    } catch (e) {
      console.log("Failed to load whop settings from payment_gateways:", e);
    }
  }
  if (!finalProdId) {
    try {
      const srow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
      let settings = {};
      if (srow && srow.value) {
        try {
          settings = JSON.parse(srow.value);
        } catch (e) {
          settings = {};
        }
      }
      const fallbackProdId = settings.default_product_id || settings.product_id || "";
      if (fallbackProdId) {
        finalProdId = normalizeWhopProductId(fallbackProdId);
        console.log("Using Whop product ID from legacy settings:", finalProdId);
      }
    } catch (e) {
      console.log("Failed to load whop settings for default product ID:", e);
    }
  }
  if (!finalProdId) {
    return json({ error: "whop_product_id not configured. Please set it in Payment Settings (Payment tab > Whop gateway)" }, 400);
  }
  if (!/^prod_[a-zA-Z0-9_-]+$/.test(finalProdId)) {
    return json({
      error: "Invalid Whop Product ID format. Use prod_xxxxx or a Whop URL containing prod_xxxxx."
    }, 400);
  }
  const companyId = env.WHOP_COMPANY_ID;
  if (!companyId) {
    return json({ error: "WHOP_COMPANY_ID environment variable not set" }, 500);
  }
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: "Whop API key not configured. Please add it in admin Settings." }, 500);
  }
  const currency = env.WHOP_CURRENCY || "usd";
  try {
    await fetchWithTimeout(`https://api.whop.com/api/v2/products/${finalProdId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ one_per_user: false })
    }, WHOP_API_TIMEOUT);
    console.log("\u2705 Product updated: one_per_user = false");
  } catch (e) {
    console.log("Product update skipped:", e.message);
  }
  const planBody = {
    company_id: companyId,
    product_id: finalProdId,
    plan_type: "one_time",
    release_method: "buy_now",
    currency,
    initial_price: priceValue,
    renewal_price: 0,
    title: `${product.title || "One\u2011time purchase"} - $${priceValue}`,
    stock: 999999,
    one_per_user: false,
    allow_multiple_quantity: true,
    internal_notes: `Auto-generated for product ${product.id} - ${(/* @__PURE__ */ new Date()).toISOString()}`
  };
  try {
    const planResp = await fetchWithTimeout("https://api.whop.com/api/v2/plans", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(planBody)
    }, WHOP_API_TIMEOUT);
    if (!planResp.ok) {
      const errorText = await planResp.text();
      console.error("Whop plan create error:", errorText);
      let msg = "Failed to create plan";
      try {
        const j = JSON.parse(errorText);
        msg = normalizeGatewayError(j, msg);
      } catch (_) {
      }
      return json({ error: msg }, planResp.status);
    }
    const planData = await planResp.json();
    const planId = planData.id;
    if (!planId) {
      return json({ error: "Plan ID missing from Whop response" }, 500);
    }
    const expiryTime = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
    const checkoutMetadata = {
      product_id: product.id.toString(),
      product_title: product.title,
      addons: isTipCheckout ? [] : normalizedMetadata.addons || [],
      email: email || "",
      amount: priceValue,
      // Use server-side calculated price
      deliveryTimeMinutes,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (isTipCheckout) {
      checkoutMetadata.type = "tip";
      checkoutMetadata.orderId = tipOrderId;
      checkoutMetadata.tipAmount = priceValue;
    }
    try {
      await env.DB.prepare(`
        INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, metadata, expires_at, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).bind("plan_" + planId, product.id, planId, JSON.stringify(checkoutMetadata), expiryTime).run();
    } catch (e) {
      console.log("Plan tracking insert failed:", e.message);
    }
    let redirectUrl = `${origin}/success.html?product=${product.id}`;
    if (isTipCheckout && tipOrderId) {
      const tipUrl = new URL("/buyer-order", origin);
      tipUrl.searchParams.set("id", tipOrderId);
      tipUrl.searchParams.set("tip_success", "1");
      tipUrl.searchParams.set("tip_amount", priceValue.toFixed(2));
      redirectUrl = tipUrl.toString();
    }
    const checkoutBody = {
      plan_id: planId,
      redirect_url: redirectUrl,
      metadata: serializeWhopMetadata(checkoutMetadata)
    };
    if (email && email.includes("@")) {
      checkoutBody.prefill = { email: email.trim() };
    }
    const sendCheckoutSessionRequest = /* @__PURE__ */ __name(async (payload) => {
      const response = await fetchWithTimeout("https://api.whop.com/api/v2/checkout_sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }, WHOP_API_TIMEOUT);
      const responseText = await response.text();
      return { response, responseText };
    }, "sendCheckoutSessionRequest");
    let { response: checkoutResp, responseText: checkoutErrorText } = await sendCheckoutSessionRequest(checkoutBody);
    if (!checkoutResp.ok && isWhopMetadataLengthError(checkoutErrorText)) {
      console.warn("Whop metadata too long, retrying checkout with compact fallback metadata");
      const fallbackMetadata = {
        ...checkoutMetadata,
        addons: [],
        addons_count: Array.isArray(checkoutMetadata.addons) ? checkoutMetadata.addons.length : 0
      };
      checkoutBody.metadata = serializeWhopMetadata(fallbackMetadata);
      ({ response: checkoutResp, responseText: checkoutErrorText } = await sendCheckoutSessionRequest(checkoutBody));
    }
    if (!checkoutResp.ok) {
      console.error("Whop checkout session error:", checkoutErrorText);
      let msg = "Failed to create checkout session";
      try {
        const j = JSON.parse(checkoutErrorText);
        msg = normalizeGatewayError(j, msg);
      } catch (_) {
        msg = normalizeGatewayError(checkoutErrorText, msg);
      }
      return json({ error: msg }, checkoutResp.status);
    }
    let checkoutData = {};
    try {
      checkoutData = checkoutErrorText ? JSON.parse(checkoutErrorText) : {};
    } catch (e) {
      checkoutData = {};
    }
    try {
      await env.DB.prepare(`
        UPDATE checkout_sessions 
        SET checkout_id = ?
        WHERE checkout_id = ?
      `).bind(checkoutData.id, "plan_" + planId).run();
    } catch (e) {
      console.log("Checkout session tracking update failed:", e.message);
    }
    return json({
      success: true,
      plan_id: planId,
      checkout_id: checkoutData.id,
      checkout_url: checkoutData.purchase_url,
      product_id: product.id,
      email,
      amount: priceValue,
      // Return server-side calculated price
      metadata: {
        product_id: product.id.toString(),
        product_title: product.title,
        addons: isTipCheckout ? [] : normalizedMetadata.addons || [],
        type: isTipCheckout ? "tip" : "order",
        orderId: isTipCheckout ? tipOrderId : void 0,
        tipAmount: isTipCheckout ? priceValue : void 0,
        amount: priceValue
        // Use server-side calculated price
      },
      expires_in: "15 minutes",
      email_prefilled: !!(email && email.includes("@"))
    });
  } catch (e) {
    console.error("Dynamic checkout error:", e);
    return json({ error: e.message || "Failed to create plan/checkout" }, 500);
  }
}
__name(createPlanCheckout, "createPlanCheckout");
async function verifyWhopSignature(signature, rawBody, secret) {
  if (!signature || !secret || !rawBody) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody)
    );
    const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return signature === expected;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}
__name(verifyWhopSignature, "verifyWhopSignature");
async function handleWebhook(env, webhookData, headers, rawBody) {
  try {
    const eventType = webhookData.type || webhookData.event;
    const signature = headers?.get("x-whop-signature") || headers?.get("whop-signature");
    console.log("Whop webhook received:", eventType);
    const secret = await getWhopWebhookSecret(env);
    if (secret && signature) {
      const isValid = await verifyWhopSignature(signature, rawBody, secret);
      if (!isValid) {
        console.error("\u274C Invalid Whop signature");
        return json({ error: "Invalid signature" }, 401);
      }
      console.log("\u2705 Whop signature verified");
    } else if (secret && !signature) {
      console.warn("\u26A0\uFE0F Whop secret configured but no signature received");
    }
    if (eventType === "payment.succeeded") {
      const checkoutSessionId = webhookData.data?.checkout_session_id;
      const membershipId = webhookData.data?.id;
      let metadata = parseWhopMetadata(webhookData.data?.metadata || {});
      console.log("Payment succeeded:", { checkoutSessionId, membershipId, metadata });
      const customerEmail = metadata.email || webhookData.data?.email || webhookData.data?.user?.email || "";
      const productId = metadata.product_id || metadata.productId;
      if (checkoutSessionId || customerEmail && productId) {
        try {
          let existingOrder = null;
          if (checkoutSessionId) {
            existingOrder = await env.DB.prepare(`
              SELECT o.id, o.encrypted_data FROM orders o
              WHERE o.encrypted_data LIKE ?
              LIMIT 1
            `).bind(`%"whop_checkout_id":"${checkoutSessionId}"%`).first();
          }
          if (!existingOrder && customerEmail && productId) {
            existingOrder = await env.DB.prepare(`
              SELECT o.id, o.encrypted_data FROM orders o
              WHERE o.product_id = ?
              AND o.created_at > datetime('now', '-5 minutes')
              AND o.encrypted_data LIKE ?
              LIMIT 1
            `).bind(Number(productId), `%${customerEmail}%`).first();
          }
          if (existingOrder) {
            console.log("Order already exists, skipping duplicate creation");
            return json({ received: true, duplicate: true, message: "Order already processed" });
          }
        } catch (e) {
          console.log("Order existence check failed:", e.message);
        }
      }
      const needsStoredMetadata = !metadata.type || !metadata.addons || !metadata.addons.length || !metadata.amount || metadata.type === "tip" && !metadata.orderId;
      if (checkoutSessionId && needsStoredMetadata) {
        try {
          const sessionRow = await env.DB.prepare(
            "SELECT metadata FROM checkout_sessions WHERE checkout_id = ?"
          ).bind(checkoutSessionId).first();
          if (sessionRow?.metadata) {
            const storedMetadata = JSON.parse(sessionRow.metadata);
            console.log("Retrieved stored metadata from DB:", storedMetadata);
            metadata = parseWhopMetadata({
              ...metadata,
              ...storedMetadata,
              // Ensure addons come from stored metadata if available
              addons: storedMetadata.addons || metadata.addons || [],
              // Ensure amount comes from stored metadata (server-side calculated)
              amount: storedMetadata.amount || metadata.amount || 0
            });
          }
        } catch (e) {
          console.log("Failed to retrieve stored metadata:", e.message);
        }
      }
      if (checkoutSessionId) {
        try {
          await env.DB.prepare(`
            UPDATE checkout_sessions
            SET status = 'completed', completed_at = datetime('now')
            WHERE checkout_id = ?
          `).bind(checkoutSessionId).run();
        } catch (e) {
          console.log("Checkout tracking update skipped:", e.message);
        }
      }
      const apiKey = await getWhopApiKey(env);
      if (checkoutSessionId && apiKey) {
        try {
          await fetchWithTimeout(`https://api.whop.com/api/v2/checkout_sessions/${checkoutSessionId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${apiKey}` }
          }, WHOP_API_TIMEOUT);
          console.log("Checkout session deleted immediately after payment:", checkoutSessionId);
        } catch (e) {
          console.error("Failed to delete checkout session:", e);
        }
        try {
          const row = await env.DB.prepare("SELECT plan_id FROM checkout_sessions WHERE checkout_id = ?").bind(checkoutSessionId).first();
          const planId = row && row.plan_id;
          if (planId) {
            await fetchWithTimeout(`https://api.whop.com/api/v2/plans/${planId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${apiKey}` }
            }, WHOP_API_TIMEOUT);
            console.log("Plan deleted immediately after payment:", planId);
          }
        } catch (e) {
          console.error("Failed to delete plan:", e);
        }
      }
      if (metadata.type === "tip" && metadata.orderId) {
        try {
          await env.DB.prepare(
            "UPDATE orders SET tip_paid = 1, tip_amount = ? WHERE order_id = ?"
          ).bind(Number(metadata.tipAmount) || Number(metadata.amount) || 0, metadata.orderId).run();
          console.log("Tip marked as paid for order:", metadata.orderId);
        } catch (e) {
          console.error("Failed to update tip status:", e);
        }
        return json({ received: true });
      }
      if (metadata.product_id) {
        try {
          const orderId = `WHOP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          let deliveryTimeMinutes = Number(metadata.deliveryTimeMinutes) || 0;
          let productTitle = String(metadata.productTitle || metadata.product_title || "").trim();
          if (!deliveryTimeMinutes || deliveryTimeMinutes <= 0) {
            try {
              const product = await env.DB.prepare("SELECT title, instant_delivery, normal_delivery_text FROM products WHERE id = ?").bind(Number(metadata.product_id)).first();
              if (product?.title && !productTitle) {
                productTitle = String(product.title).trim();
              }
              deliveryTimeMinutes = calculateDeliveryMinutes(product);
            } catch (e) {
              console.log("Could not get product delivery time:", e);
              deliveryTimeMinutes = 60;
            }
          }
          console.log("Final delivery time for order:", deliveryTimeMinutes, "minutes");
          const customerEmail2 = metadata.email || webhookData.data?.email || webhookData.data?.user?.email || "";
          const orderAmount = metadata.amount || 0;
          const encryptedData = {
            email: customerEmail2,
            amount: orderAmount,
            productId: metadata.product_id,
            addons: metadata.addons || [],
            whop_membership_id: membershipId || null,
            whop_checkout_id: checkoutSessionId || null
          };
          await createOrderRecord(env, {
            orderId,
            productId: metadata.product_id,
            status: "completed",
            deliveryMinutes: deliveryTimeMinutes,
            encryptedData
          });
          try {
            const emailResult = await sendOrderNotificationEmails(env, {
              orderId,
              customerEmail: customerEmail2,
              amount: orderAmount,
              currency: "USD",
              productId: metadata.product_id,
              productTitle,
              addons: metadata.addons || [],
              deliveryTimeMinutes,
              paymentMethod: "Whop",
              orderSource: "whop-webhook"
            });
            logOrderEmailDispatchResult("Whop order email notification", emailResult, {
              orderId,
              source: "whop-webhook"
            });
          } catch (e) {
            console.error("Whop order email notification failed:", e?.message || e);
          }
          console.log("Order created via webhook:", orderId, "Delivery:", deliveryTimeMinutes, "minutes", "Amount:", orderAmount);
        } catch (e) {
          console.error("Failed to create order:", e);
        }
      }
    }
    if (eventType === "membership.went_valid") {
      console.log("Membership validated:", webhookData.data?.id);
    }
    return json({ received: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return json({ error: "Webhook processing failed" }, 500);
  }
}
__name(handleWebhook, "handleWebhook");
async function testApi(env) {
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ success: false, error: "Whop API key not configured. Please add it in Settings." }, 500);
  }
  try {
    const resp = await fetchWithTimeout("https://api.whop.com/api/v2/plans?page=1&per=1", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }, WHOP_API_TIMEOUT);
    if (!resp.ok) {
      const text = await resp.text();
      let errMsg = "Whop API call failed";
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
          apiKeyPrefix: apiKey?.substring(0, 10) + "..."
        }
      }, resp.status);
    }
    const data = await resp.json();
    return json({
      success: true,
      message: "API connection successful!",
      plansCount: data.data?.length || 0,
      apiKeyValid: true
    });
  } catch (e) {
    return json({ success: false, error: e.message || "API test error" }, 500);
  }
}
__name(testApi, "testApi");
function testWebhook2() {
  return json({ success: true, message: "Webhook endpoint reachable" });
}
__name(testWebhook2, "testWebhook");
async function cleanupExpired(env) {
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: "Whop API key not configured" }, 500);
  }
  try {
    const expiredCheckouts = await env.DB.prepare(`
      SELECT checkout_id, product_id, plan_id, expires_at
      FROM checkout_sessions
      WHERE status = 'pending'
      AND datetime(expires_at) < datetime('now')
      ORDER BY created_at ASC
      LIMIT 50
    `).all();
    const checkouts = expiredCheckouts.results || [];
    if (checkouts.length === 0) {
      return json({ success: true, archived: 0, failed: 0, message: "No expired checkouts" });
    }
    const batchSize = 5;
    let archived = 0;
    let failed = 0;
    for (let i = 0; i < checkouts.length; i += batchSize) {
      const batch = checkouts.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map(async (checkout) => {
        const headers = {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        };
        let success = false;
        if (checkout.plan_id) {
          try {
            const archiveResp = await fetchWithTimeout(`https://api.whop.com/api/v2/plans/${checkout.plan_id}`, {
              method: "POST",
              headers,
              body: JSON.stringify({ visibility: "hidden" })
            }, WHOP_API_TIMEOUT);
            if (archiveResp.ok) {
              success = true;
              console.log("\u2705 Plan archived (hidden):", checkout.plan_id);
            } else {
              const deleteResp = await fetchWithTimeout(`https://api.whop.com/api/v2/plans/${checkout.plan_id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${apiKey}` }
              }, WHOP_API_TIMEOUT);
              success = deleteResp.ok || deleteResp.status === 404;
              if (success) console.log("\u2705 Plan deleted:", checkout.plan_id);
            }
          } catch (e) {
            console.error("Plan archive failed:", checkout.plan_id, e.message);
          }
        } else {
          success = true;
        }
        if (success) {
          await env.DB.prepare(`
            UPDATE checkout_sessions
            SET status = 'archived', completed_at = datetime('now')
            WHERE checkout_id = ?
          `).bind(checkout.checkout_id).run();
          return { success: true, id: checkout.checkout_id };
        }
        return { success: false, id: checkout.checkout_id };
      }));
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.success) archived++;
        else failed++;
      });
    }
    return json({
      success: true,
      archived,
      failed,
      message: `Archived ${archived} plans - users cannot repurchase these`
    });
  } catch (e) {
    console.error("Cleanup error:", e);
    return json({ error: e.message }, 500);
  }
}
__name(cleanupExpired, "cleanupExpired");

// src/controllers/paypal.js
var PAYPAL_API_TIMEOUT = 1e4;
async function getPayPalCredentials(env) {
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET) {
    return {
      clientId: env.PAYPAL_CLIENT_ID,
      secret: env.PAYPAL_SECRET,
      mode: env.PAYPAL_MODE || "sandbox"
    };
  }
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("paypal").first();
    if (row && row.value) {
      const settings = JSON.parse(row.value);
      return {
        clientId: settings.client_id || "",
        secret: settings.secret || "",
        mode: settings.mode || "sandbox"
      };
    }
  } catch (e) {
    console.error("Failed to load PayPal settings:", e);
  }
  return null;
}
__name(getPayPalCredentials, "getPayPalCredentials");
function getPayPalBaseUrl(mode) {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}
__name(getPayPalBaseUrl, "getPayPalBaseUrl");
async function getAccessToken(credentials) {
  const baseUrl = getPayPalBaseUrl(credentials.mode);
  const auth = btoa(`${credentials.clientId}:${credentials.secret}`);
  const response = await fetchWithTimeout(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  }, PAYPAL_API_TIMEOUT);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }
  const data = await response.json();
  return data.access_token;
}
__name(getAccessToken, "getAccessToken");
async function createPayPalOrder(env, body, origin) {
  const { product_id, amount, email, metadata, deliveryTimeMinutes } = body;
  if (!product_id) {
    return json({ error: "Product ID required" }, 400);
  }
  const credentials = await getPayPalCredentials(env);
  if (!credentials) {
    return json({
      error: "PayPal not configured. Go to Admin \u2192 Settings \u2192 PayPal and add your credentials."
    }, 400);
  }
  if (!credentials.clientId || credentials.clientId.length < 10) {
    return json({
      error: "PayPal Client ID missing or invalid. Go to Admin \u2192 Settings \u2192 PayPal and add your Client ID from PayPal Developer Dashboard."
    }, 400);
  }
  if (!credentials.secret || credentials.secret.length < 10) {
    return json({
      error: "PayPal Secret missing or invalid. Go to Admin \u2192 Settings \u2192 PayPal and add your Secret from PayPal Developer Dashboard."
    }, 400);
  }
  const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(Number(product_id)).first();
  if (!product) {
    return json({ error: "Product not found" }, 404);
  }
  const basePrice = product.sale_price || product.normal_price || 0;
  const finalAmount = amount || basePrice;
  if (finalAmount <= 0) {
    return json({ error: "Invalid amount. Price must be greater than 0." }, 400);
  }
  try {
    console.log("\u{1F17F}\uFE0F PayPal: Getting access token...");
    console.log("\u{1F17F}\uFE0F Mode:", credentials.mode);
    let accessToken;
    try {
      accessToken = await getAccessToken(credentials);
      console.log("\u{1F17F}\uFE0F Access token obtained successfully");
    } catch (authErr) {
      console.error("\u{1F17F}\uFE0F PayPal auth failed:", authErr.message);
      return json({ error: "PayPal authentication failed: " + authErr.message }, 500);
    }
    const baseUrl = getPayPalBaseUrl(credentials.mode);
    const customData = JSON.stringify({
      pid: product_id,
      email: (email || "").substring(0, 50)
    });
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: `prod_${product_id}_${Date.now()}`,
        description: (product.title || "Video Order").substring(0, 127),
        amount: {
          currency_code: "USD",
          value: finalAmount.toFixed(2)
        },
        custom_id: customData.substring(0, 127)
      }],
      application_context: {
        brand_name: "Prankwish",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${origin}/success.html?provider=paypal&product=${product_id}`,
        cancel_url: `${origin}/product?id=${product_id}&cancelled=1`
      }
    };
    console.log("\u{1F17F}\uFE0F Creating PayPal order with payload:", JSON.stringify(orderPayload, null, 2));
    const orderResponse = await fetchWithTimeout(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderPayload)
    }, PAYPAL_API_TIMEOUT);
    const responseText = await orderResponse.text();
    console.log("\u{1F17F}\uFE0F PayPal response status:", orderResponse.status);
    console.log("\u{1F17F}\uFE0F PayPal response:", responseText);
    if (!orderResponse.ok) {
      let errorMessage = "Failed to create PayPal order";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error_description || errorData.details?.[0]?.description || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      console.error("\u{1F17F}\uFE0F PayPal order creation failed:", errorMessage);
      return json({ error: errorMessage }, 500);
    }
    const orderData = JSON.parse(responseText);
    try {
      let finalDeliveryTime = deliveryTimeMinutes || metadata?.deliveryTimeMinutes;
      if (!finalDeliveryTime) {
        finalDeliveryTime = calculateDeliveryMinutes(product);
      }
      const metaType = metadata && metadata.type ? metadata.type : "order";
      const metaOrderId = metadata && (metadata.orderId || metadata.order_id) ? metadata.orderId || metadata.order_id : null;
      const metaTipAmount = metadata && (metadata.tipAmount || metadata.tip_amount) ? metadata.tipAmount || metadata.tip_amount : null;
      const sessionMetadata = {
        email,
        addons: metadata?.addons || [],
        amount: finalAmount,
        deliveryTimeMinutes: finalDeliveryTime,
        product_id,
        type: metaType,
        orderId: metaOrderId,
        tipAmount: metaTipAmount
      };
      await env.DB.prepare(`
        INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, metadata, expires_at, status, created_at)
        VALUES (?, ?, ?, ?, datetime('now', '+30 minutes'), 'pending', datetime('now'))
      `).bind(
        orderData.id,
        product_id,
        "paypal",
        JSON.stringify(sessionMetadata)
      ).run();
    } catch (e) {
      console.log("Checkout session storage skipped:", e.message);
    }
    const approvalLink = orderData.links?.find((l) => l.rel === "approve");
    return json({
      success: true,
      order_id: orderData.id,
      checkout_url: approvalLink?.href || null,
      status: orderData.status
    });
  } catch (e) {
    console.error("PayPal error:", e);
    return json({ error: e.message || "PayPal checkout failed" }, 500);
  }
}
__name(createPayPalOrder, "createPayPalOrder");
async function capturePayPalOrder(env, body) {
  const { order_id } = body;
  if (!order_id) {
    return json({ error: "Order ID required" }, 400);
  }
  const credentials = await getPayPalCredentials(env);
  if (!credentials) {
    return json({ error: "PayPal not configured" }, 400);
  }
  try {
    console.log("\u{1F17F}\uFE0F Capturing PayPal order:", order_id);
    const accessToken = await getAccessToken(credentials);
    const baseUrl = getPayPalBaseUrl(credentials.mode);
    const captureResponse = await fetchWithTimeout(`${baseUrl}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }, PAYPAL_API_TIMEOUT);
    const responseText = await captureResponse.text();
    console.log("\u{1F17F}\uFE0F Capture response status:", captureResponse.status);
    console.log("\u{1F17F}\uFE0F Capture response:", responseText);
    if (!captureResponse.ok) {
      let errorMessage = "Payment capture failed";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.details?.[0]?.description || errorMessage;
      } catch (e) {
      }
      console.error("\u{1F17F}\uFE0F PayPal capture failed:", errorMessage);
      return json({ error: errorMessage }, 500);
    }
    const captureData = JSON.parse(responseText);
    if (captureData.status === "COMPLETED") {
      let metadata = {};
      try {
        const sessionRow = await env.DB.prepare(
          "SELECT metadata FROM checkout_sessions WHERE checkout_id = ?"
        ).bind(order_id).first();
        if (sessionRow?.metadata) {
          metadata = JSON.parse(sessionRow.metadata);
        }
      } catch (e) {
        console.log("Failed to get stored metadata:", e);
      }
      let customData = {};
      try {
        const customId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id;
        if (customId) {
          customData = JSON.parse(customId);
        }
      } catch (e) {
        console.log("Failed to parse custom_id:", e);
      }
      const amount = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || metadata.amount || 0;
      if (metadata && metadata.type === "tip") {
        const targetOrderId = metadata.orderId || metadata.order_id;
        const tipAmount = parseFloat(amount) || parseFloat(metadata.tipAmount) || 0;
        if (!targetOrderId) {
          return json({ error: "Tip orderId missing" }, 400);
        }
        if (!Number.isFinite(tipAmount) || tipAmount <= 0) {
          return json({ error: "Invalid tip amount" }, 400);
        }
        const existing = await env.DB.prepare("SELECT order_id, tip_paid FROM orders WHERE order_id = ?").bind(targetOrderId).first();
        if (!existing) {
          return json({ error: "Order not found for tip" }, 404);
        }
        await env.DB.prepare(
          "UPDATE orders SET tip_paid = 1, tip_amount = ? WHERE order_id = ?"
        ).bind(tipAmount, targetOrderId).run();
        try {
          await env.DB.prepare(`
            UPDATE checkout_sessions SET status = 'completed', completed_at = datetime('now')
            WHERE checkout_id = ?
          `).bind(order_id).run();
        } catch (e) {
        }
        return json({
          success: true,
          tip_updated: true,
          order_id: targetOrderId,
          tip_amount: tipAmount,
          paypal_order_id: order_id
        });
      }
      const orderId = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const productId = customData.pid || metadata.product_id;
      const buyerEmail = customData.email || metadata.email || captureData.payer?.email_address || "";
      const addons = metadata.addons || [];
      let productTitle = String(metadata.productTitle || metadata.product_title || "").trim();
      let deliveryTimeMinutes = Number(metadata.deliveryTimeMinutes) || 0;
      if (!deliveryTimeMinutes || deliveryTimeMinutes <= 0 || !productTitle) {
        try {
          const product = await env.DB.prepare("SELECT title, instant_delivery, normal_delivery_text, delivery_time_days FROM products WHERE id = ?").bind(Number(productId)).first();
          if (product?.title && !productTitle) {
            productTitle = String(product.title).trim();
          }
          if (!deliveryTimeMinutes || deliveryTimeMinutes <= 0) {
            deliveryTimeMinutes = calculateDeliveryMinutes(product);
          }
        } catch (e) {
          console.log("Could not get product delivery time for PayPal order:", e);
          if (!deliveryTimeMinutes || deliveryTimeMinutes <= 0) {
            deliveryTimeMinutes = 60;
          }
        }
      }
      console.log("\u{1F17F}\uFE0F Delivery time for PayPal order:", deliveryTimeMinutes, "minutes");
      const encryptedData = {
        email: buyerEmail,
        amount: parseFloat(amount),
        productId,
        addons,
        paypalOrderId: order_id,
        payerId: captureData.payer?.payer_id
      };
      await createOrderRecord(env, {
        orderId,
        productId,
        status: "PAID",
        deliveryMinutes: deliveryTimeMinutes,
        encryptedData
      });
      console.log("\u{1F17F}\uFE0F Order created:", orderId, "Delivery:", deliveryTimeMinutes, "minutes");
      try {
        const emailResult = await sendOrderNotificationEmails(env, {
          orderId,
          customerEmail: buyerEmail,
          amount: parseFloat(amount),
          currency: "USD",
          productId,
          productTitle,
          addons,
          deliveryTimeMinutes,
          paymentMethod: "PayPal",
          orderSource: "paypal-capture"
        });
        logOrderEmailDispatchResult("PayPal order email notification", emailResult, {
          orderId,
          source: "paypal-capture"
        });
      } catch (e) {
        console.error("PayPal order email notification failed:", e?.message || e);
      }
      try {
        await env.DB.prepare(`
          UPDATE checkout_sessions SET status = 'completed', completed_at = datetime('now')
          WHERE checkout_id = ?
        `).bind(order_id).run();
      } catch (e) {
      }
      return json({
        success: true,
        order_id: orderId,
        status: "completed",
        paypal_order_id: order_id
      });
    }
    return json({
      success: false,
      status: captureData.status,
      error: "Payment not completed"
    });
  } catch (e) {
    console.error("\u{1F17F}\uFE0F PayPal capture error:", e);
    return json({ error: e.message || "Payment capture failed" }, 500);
  }
}
__name(capturePayPalOrder, "capturePayPalOrder");
async function handlePayPalWebhook(env, body, headers, rawBody) {
  const eventType = body.event_type;
  const resource = body.resource;
  console.log("PayPal webhook received:", eventType, resource?.id);
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const captureId = resource.id;
    const orderId = resource.supplementary_data?.related_ids?.order_id || resource.parent_payment;
    console.log("\u{1F4B0} PayPal Payment Captured:", captureId, "Order:", orderId);
    try {
      const existingOrder = await env.DB.prepare(
        "SELECT id FROM orders WHERE encrypted_data LIKE ?"
      ).bind(`%"paypalOrderId":"${orderId}"%`).first();
      if (existingOrder) {
        console.log("Order already exists for this PayPal checkout, skipping webhook processing");
        return json({ received: true, duplicate: true });
      }
    } catch (e) {
      console.error("Error checking for existing PayPal order:", e);
    }
    try {
      const sessionRow = await env.DB.prepare(
        "SELECT metadata, product_id FROM checkout_sessions WHERE checkout_id = ?"
      ).bind(orderId).first();
      if (sessionRow?.metadata) {
        const metadata = JSON.parse(sessionRow.metadata);
        if (metadata.type !== "tip") {
          const newOrderId = `PP-REC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          const productId = metadata.product_id;
          const email = metadata.email;
          const amount = resource.amount?.value || metadata.amount || 0;
          const productTitle = String(metadata.productTitle || metadata.product_title || "").trim();
          console.log("\u{1F504} Reconciling missing PayPal order from webhook:", newOrderId);
          await createOrderRecord(env, {
            orderId: newOrderId,
            productId,
            status: "PAID",
            deliveryMinutes: metadata.deliveryTimeMinutes || 60,
            encryptedData: {
              email,
              amount: parseFloat(amount),
              productId,
              addons: metadata.addons || [],
              paypalOrderId: orderId,
              source: "webhook-reconciliation"
            }
          });
          try {
            const emailResult = await sendOrderNotificationEmails(env, {
              orderId: newOrderId,
              customerEmail: email,
              amount: parseFloat(amount),
              currency: "USD",
              productId,
              productTitle,
              addons: metadata.addons || [],
              deliveryTimeMinutes: metadata.deliveryTimeMinutes || 60,
              paymentMethod: "PayPal",
              orderSource: "paypal-webhook-reconciliation"
            });
            logOrderEmailDispatchResult("PayPal reconciliation email notification", emailResult, {
              orderId: newOrderId,
              source: "paypal-webhook-reconciliation"
            });
          } catch (e) {
            console.error("PayPal reconciliation email notification failed:", e?.message || e);
          }
        } else if (metadata.type === "tip" && metadata.orderId) {
          await env.DB.prepare(
            "UPDATE orders SET tip_paid = 1, tip_amount = ? WHERE order_id = ?"
          ).bind(parseFloat(resource.amount?.value || metadata.tipAmount || 0), metadata.orderId).run();
          console.log("\u2705 Reconciled tip from PayPal webhook:", metadata.orderId);
        }
      }
    } catch (e) {
      console.error("Failed to reconcile PayPal order from webhook:", e);
    }
  }
  return json({ received: true });
}
__name(handlePayPalWebhook, "handlePayPalWebhook");
async function getPayPalSettings(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("paypal").first();
    if (row && row.value) {
      const settings = JSON.parse(row.value);
      return json({
        settings: {
          client_id: settings.client_id || "",
          mode: settings.mode || "sandbox",
          enabled: settings.enabled || false,
          has_secret: !!(settings.secret && settings.secret.length > 10)
          // Don't return actual secret
        }
      });
    }
  } catch (e) {
    console.error("Failed to load PayPal settings:", e);
  }
  return json({ settings: { client_id: "", mode: "sandbox", enabled: false, has_secret: false } });
}
__name(getPayPalSettings, "getPayPalSettings");
async function savePayPalSettings(env, body) {
  console.log("\u{1F17F}\uFE0F Saving PayPal settings:", {
    enabled: body.enabled,
    client_id: body.client_id ? "***" + body.client_id.slice(-4) : "empty",
    secret: body.secret ? "***" + body.secret.slice(-4) : "empty",
    mode: body.mode
  });
  const settings = {
    client_id: body.client_id || "",
    secret: body.secret || "",
    mode: body.mode || "sandbox",
    enabled: body.enabled === true || body.enabled === "true"
  };
  if (!settings.secret) {
    try {
      const existing = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("paypal").first();
      if (existing?.value) {
        const old = JSON.parse(existing.value);
        settings.secret = old.secret || "";
        console.log("\u{1F17F}\uFE0F Keeping existing secret");
      }
    } catch (e) {
      console.log("\u{1F17F}\uFE0F No existing settings found");
    }
  }
  console.log("\u{1F17F}\uFE0F Final settings to save:", {
    enabled: settings.enabled,
    client_id: settings.client_id ? "***" + settings.client_id.slice(-4) : "empty",
    has_secret: !!settings.secret,
    mode: settings.mode
  });
  await env.DB.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
  ).bind("paypal", JSON.stringify(settings)).run();
  console.log("\u{1F17F}\uFE0F PayPal settings saved successfully");
  return json({ success: true });
}
__name(savePayPalSettings, "savePayPalSettings");
async function testPayPalConnection(env) {
  const credentials = await getPayPalCredentials(env);
  if (!credentials || !credentials.clientId) {
    return json({ success: false, error: "PayPal credentials not configured" });
  }
  try {
    const accessToken = await getAccessToken(credentials);
    return json({
      success: true,
      message: "PayPal connection successful!",
      mode: credentials.mode
    });
  } catch (e) {
    return json({ success: false, error: e.message });
  }
}
__name(testPayPalConnection, "testPayPalConnection");
async function getPayPalClientId(env) {
  const credentials = await getPayPalCredentials(env);
  if (!credentials) {
    return json({ client_id: null, enabled: false });
  }
  return json({
    client_id: credentials.clientId,
    mode: credentials.mode,
    enabled: !!credentials.clientId
  });
}
__name(getPayPalClientId, "getPayPalClientId");

// src/controllers/payment-gateway.js
var paymentMethodsCache = null;
var paymentMethodsCacheTime = 0;
var PAYMENT_CACHE_TTL = 6e4;
async function getLatestEnabledWhopGateway(env) {
  try {
    return await env.DB.prepare(`
      SELECT whop_product_id
      FROM payment_gateways
      WHERE gateway_type = 'whop' AND is_enabled = 1
      ORDER BY id DESC
      LIMIT 1
    `).first();
  } catch (e) {
    return null;
  }
}
__name(getLatestEnabledWhopGateway, "getLatestEnabledWhopGateway");
async function getPaymentMethodsEnabled(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("payment_methods").first();
    if (row?.value) {
      return JSON.parse(row.value);
    }
  } catch (e) {
  }
  return { paypal_enabled: true, whop_enabled: true };
}
__name(getPaymentMethodsEnabled, "getPaymentMethodsEnabled");
async function getPaymentMethods(env) {
  const now = Date.now();
  if (paymentMethodsCache && now - paymentMethodsCacheTime < PAYMENT_CACHE_TTL) {
    return cachedJson({ methods: paymentMethodsCache }, 60);
  }
  const methods = [];
  const enabledStatus = await getPaymentMethodsEnabled(env);
  if (enabledStatus.whop_enabled !== false) {
    try {
      const whopApiKey = await getWhopApiKey(env);
      if (whopApiKey) {
        methods.push({
          id: "whop",
          name: "All Payment Methods",
          icon: "\u{1F310}",
          description: "GPay, Apple Pay, Cards, Bank & more",
          enabled: true,
          priority: 2
        });
      }
    } catch (e) {
    }
  }
  if (enabledStatus.paypal_enabled !== false) {
    try {
      const paypalRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("paypal").first();
      if (paypalRow?.value) {
        const paypal = JSON.parse(paypalRow.value);
        const hasValidClientId = paypal.client_id && paypal.client_id.length > 10;
        const hasValidSecret = paypal.secret && paypal.secret.length > 10;
        if (paypal.enabled && hasValidClientId && hasValidSecret) {
          methods.push({
            id: "paypal",
            name: "PayPal",
            icon: "\u{1F17F}\uFE0F",
            description: "Pay with PayPal",
            enabled: true,
            priority: 1,
            client_id: paypal.client_id,
            mode: paypal.mode || "sandbox"
          });
        }
      } else if (env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET) {
        const hasValidClientId = env.PAYPAL_CLIENT_ID.length > 10;
        const hasValidSecret = env.PAYPAL_SECRET.length > 10;
        if (hasValidClientId && hasValidSecret) {
          methods.push({
            id: "paypal",
            name: "PayPal",
            icon: "\u{1F17F}\uFE0F",
            description: "Pay with PayPal",
            enabled: true,
            priority: 1,
            client_id: env.PAYPAL_CLIENT_ID,
            mode: env.PAYPAL_MODE || "sandbox"
          });
        }
      }
    } catch (e) {
    }
  }
  try {
    const stripeRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("stripe").first();
    if (stripeRow?.value) {
      const stripe = JSON.parse(stripeRow.value);
      if (stripe.enabled && stripe.publishable_key) {
        methods.push({
          id: "stripe",
          name: "Stripe",
          icon: "\u{1F4B3}",
          description: "Pay with Stripe",
          enabled: true,
          priority: 3,
          publishable_key: stripe.publishable_key
        });
      }
    }
  } catch (e) {
  }
  methods.sort((a, b) => a.priority - b.priority);
  paymentMethodsCache = methods;
  paymentMethodsCacheTime = Date.now();
  return cachedJson({ methods }, 120);
}
__name(getPaymentMethods, "getPaymentMethods");
async function savePaymentMethodsEnabled(env, body) {
  const { paypal_enabled, whop_enabled } = body;
  if (!paypal_enabled && !whop_enabled) {
    return json({ error: "At least one payment method must be enabled" }, 400);
  }
  const settings = {
    paypal_enabled: !!paypal_enabled,
    whop_enabled: !!whop_enabled
  };
  await env.DB.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
  ).bind("payment_methods", JSON.stringify(settings)).run();
  paymentMethodsCache = null;
  paymentMethodsCacheTime = 0;
  return json({ success: true, settings });
}
__name(savePaymentMethodsEnabled, "savePaymentMethodsEnabled");
async function getPaymentMethodsStatus(env) {
  let status = { paypal_enabled: true, whop_enabled: true };
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("payment_methods").first();
    if (row?.value) {
      status = JSON.parse(row.value);
    }
  } catch (e) {
  }
  let paypalConfigured = false;
  let whopConfigured = false;
  try {
    const paypalRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("paypal").first();
    if (paypalRow?.value) {
      const paypal = JSON.parse(paypalRow.value);
      paypalConfigured = !!(paypal.enabled && paypal.client_id && paypal.secret);
    }
  } catch (e) {
  }
  try {
    const whopApiKey = await getWhopApiKey(env);
    whopConfigured = !!whopApiKey;
  } catch (e) {
  }
  return cachedJson({
    paypal_enabled: status.paypal_enabled !== false,
    whop_enabled: status.whop_enabled !== false,
    paypal_configured: paypalConfigured,
    whop_configured: whopConfigured
  }, 120);
}
__name(getPaymentMethodsStatus, "getPaymentMethodsStatus");
async function getAllPaymentSettings(env) {
  const settings = {
    whop: { enabled: false },
    paypal: { enabled: false, client_id: "", mode: "sandbox" },
    stripe: { enabled: false, publishable_key: "" }
  };
  try {
    const whopRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
    const whopGateway = await getLatestEnabledWhopGateway(env);
    const whopApiKey = await getWhopApiKey(env);
    if (whopRow?.value) {
      const whop = JSON.parse(whopRow.value);
      settings.whop = {
        enabled: !!whopApiKey,
        has_api_key: !!whopApiKey,
        default_product_id: whopGateway?.whop_product_id || whop.default_product_id || "",
        default_plan_id: whop.default_plan_id || ""
      };
    } else if (whopApiKey || whopGateway?.whop_product_id) {
      settings.whop = {
        enabled: !!whopApiKey,
        has_api_key: !!whopApiKey,
        default_product_id: whopGateway?.whop_product_id || "",
        default_plan_id: ""
      };
    }
    const paypalRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("paypal").first();
    if (paypalRow?.value) {
      const paypal = JSON.parse(paypalRow.value);
      settings.paypal = {
        enabled: paypal.enabled || false,
        client_id: paypal.client_id || "",
        mode: paypal.mode || "sandbox",
        has_secret: !!paypal.secret
      };
    }
    const stripeRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("stripe").first();
    if (stripeRow?.value) {
      const stripe = JSON.parse(stripeRow.value);
      settings.stripe = {
        enabled: stripe.enabled || false,
        publishable_key: stripe.publishable_key || "",
        has_secret: !!stripe.secret_key
      };
    }
  } catch (e) {
    console.error("Failed to load payment settings:", e);
  }
  return json({ settings });
}
__name(getAllPaymentSettings, "getAllPaymentSettings");
async function savePaymentMethodSettings(env, body) {
  const { provider, settings } = body;
  if (!provider || !settings) {
    return json({ error: "Provider and settings required" }, 400);
  }
  let existing = {};
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(provider).first();
    if (row?.value) {
      existing = JSON.parse(row.value);
    }
  } catch (e) {
  }
  const merged = { ...existing, ...settings };
  if (provider === "paypal" && !settings.secret && existing.secret) {
    merged.secret = existing.secret;
  }
  if (provider === "stripe" && !settings.secret_key && existing.secret_key) {
    merged.secret_key = existing.secret_key;
  }
  if (provider === "whop" && !settings.api_key && existing.api_key) {
    merged.api_key = existing.api_key;
  }
  await env.DB.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
  ).bind(provider, JSON.stringify(merged)).run();
  paymentMethodsCache = null;
  paymentMethodsCacheTime = 0;
  return json({ success: true });
}
__name(savePaymentMethodSettings, "savePaymentMethodSettings");

// src/controllers/payment-universal.js
var gatewaysCache = null;
var cacheTime2 = 0;
var CACHE_TTL2 = 6e4;
var DEFAULT_GATEWAYS = [];
var SINGLE_ACTIVE_GATEWAYS = /* @__PURE__ */ new Set(["whop", "paypal", "stripe"]);
async function enforceSingleActiveGateway(env, gatewayType, activeId) {
  const type = (gatewayType || "").toLowerCase();
  if (!SINGLE_ACTIVE_GATEWAYS.has(type) || !activeId) return;
  await env.DB.prepare(`
    UPDATE payment_gateways
    SET is_enabled = CASE WHEN id = ? THEN 1 ELSE 0 END
    WHERE lower(gateway_type) = ?
  `).bind(Number(activeId), type).run();
}
__name(enforceSingleActiveGateway, "enforceSingleActiveGateway");
async function getPaymentGateways(env) {
  const now = Date.now();
  if (gatewaysCache && now - cacheTime2 < CACHE_TTL2) {
    return gatewaysCache;
  }
  try {
    const result = await env.DB.prepare(`
      SELECT
        id, name, gateway_type, webhook_url, webhook_secret,
        custom_code, is_enabled, whop_product_id, whop_api_key,
        whop_theme, created_at, updated_at
      FROM payment_gateways
      ORDER BY created_at DESC
    `).all();
    gatewaysCache = result.results || [];
    cacheTime2 = now;
    return gatewaysCache;
  } catch (e) {
    try {
      const result = await env.DB.prepare("SELECT * FROM payment_gateways").all();
      gatewaysCache = result.results || [];
      return gatewaysCache;
    } catch (e2) {
      console.error("Fallback query also failed:", e2);
      return DEFAULT_GATEWAYS;
    }
  }
}
__name(getPaymentGateways, "getPaymentGateways");
async function getPaymentGatewaysApi(env) {
  try {
    gatewaysCache = null;
    const gateways = await getPaymentGateways(env);
    const safeGateways = gateways.map((gw) => ({
      id: gw.id,
      name: gw.name,
      gateway_type: gw.gateway_type || "",
      webhook_url: gw.webhook_url || "",
      secret: gw.webhook_secret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
      custom_code: gw.custom_code || "",
      enabled: gw.is_enabled === 1,
      created_at: gw.created_at,
      updated_at: gw.updated_at,
      whop_product_id: gw.whop_product_id || "",
      whop_api_key: gw.whop_api_key ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
      whop_theme: gw.whop_theme || "light"
    }));
    return json({ success: true, gateways: safeGateways });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getPaymentGatewaysApi, "getPaymentGatewaysApi");
async function addPaymentGatewayApi(env, body) {
  try {
    const gateway = {
      name: (body.name || "").trim(),
      gateway_type: (body.gateway_type || "").trim(),
      webhook_url: (body.webhook_url || "").trim(),
      webhook_secret: (body.secret || "").trim(),
      custom_code: (body.custom_code || "").trim(),
      is_enabled: body.enabled !== false ? 1 : 0,
      // Whop-specific fields
      whop_product_id: (body.whop_product_id || "").trim(),
      whop_api_key: (body.whop_api_key || "").trim(),
      whop_theme: (body.whop_theme || "light").trim()
    };
    if (!gateway.name) {
      return json({ error: "Gateway name is required" }, 400);
    }
    const insertResult = await env.DB.prepare(`
      INSERT INTO payment_gateways
      (name, gateway_type, webhook_url, webhook_secret, custom_code, is_enabled, whop_product_id, whop_api_key, whop_theme)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      gateway.name,
      gateway.gateway_type,
      gateway.webhook_url,
      gateway.webhook_secret,
      gateway.custom_code,
      gateway.is_enabled,
      gateway.whop_product_id,
      gateway.whop_api_key,
      gateway.whop_theme
    ).run();
    if (gateway.is_enabled === 1 && gateway.gateway_type) {
      await enforceSingleActiveGateway(env, gateway.gateway_type, insertResult?.meta?.last_row_id);
    }
    gatewaysCache = null;
    return json({ success: true, message: "Gateway added successfully" });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(addPaymentGatewayApi, "addPaymentGatewayApi");
async function updatePaymentGatewayApi(env, id, body) {
  try {
    const gateway = {
      name: (body.name || "").trim(),
      gateway_type: (body.gateway_type || "").trim(),
      webhook_url: (body.webhook_url || "").trim(),
      webhook_secret: (body.secret || "").trim(),
      custom_code: (body.custom_code || "").trim(),
      is_enabled: body.enabled !== false ? 1 : 0,
      // Whop-specific fields
      whop_product_id: (body.whop_product_id || "").trim(),
      whop_api_key: (body.whop_api_key || "").trim(),
      whop_theme: (body.whop_theme || "light").trim()
    };
    if (gateway.webhook_secret === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
      const existing = await env.DB.prepare(
        "SELECT webhook_secret FROM payment_gateways WHERE id = ?"
      ).bind(id).first();
      gateway.webhook_secret = existing?.webhook_secret || "";
    }
    if (gateway.whop_api_key === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
      const existing = await env.DB.prepare(
        "SELECT whop_api_key FROM payment_gateways WHERE id = ?"
      ).bind(id).first();
      gateway.whop_api_key = existing?.whop_api_key || "";
    }
    await env.DB.prepare(`
      UPDATE payment_gateways SET
        name = ?, gateway_type = ?, webhook_url = ?, webhook_secret = ?, custom_code = ?, is_enabled = ?,
        whop_product_id = ?, whop_api_key = ?, whop_theme = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      gateway.name,
      gateway.gateway_type,
      gateway.webhook_url,
      gateway.webhook_secret,
      gateway.custom_code,
      gateway.is_enabled,
      gateway.whop_product_id,
      gateway.whop_api_key,
      gateway.whop_theme,
      id
    ).run();
    if (gateway.is_enabled === 1 && gateway.gateway_type) {
      await enforceSingleActiveGateway(env, gateway.gateway_type, id);
    }
    gatewaysCache = null;
    return json({ success: true, message: "Gateway updated successfully" });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(updatePaymentGatewayApi, "updatePaymentGatewayApi");
async function deletePaymentGatewayApi(env, id) {
  try {
    await env.DB.prepare("DELETE FROM payment_gateways WHERE id = ?").bind(id).run();
    gatewaysCache = null;
    return json({ success: true, message: "Gateway deleted successfully" });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(deletePaymentGatewayApi, "deletePaymentGatewayApi");
async function getWhopCheckoutSettings(env) {
  try {
    const whopGateway = await env.DB.prepare(`
      SELECT whop_product_id, whop_theme
      FROM payment_gateways
      WHERE gateway_type = 'whop' AND is_enabled = 1
      ORDER BY id DESC
      LIMIT 1
    `).first();
    if (!whopGateway || !whopGateway.whop_product_id) {
      return json({
        success: false,
        error: "Whop gateway not configured"
      }, 404);
    }
    return json({
      success: true,
      product_id: whopGateway.whop_product_id,
      theme: whopGateway.whop_theme || "light"
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getWhopCheckoutSettings, "getWhopCheckoutSettings");
function identifyGateway(payload, gateway) {
  const type = (gateway.gateway_type || "").toLowerCase();
  if (type === "whop") {
    return !!(payload.checkout_id || payload.subscription_id || payload.type && payload.type.includes("payment."));
  }
  if (type === "paypal") {
    return !!(payload.event_type || payload.resource);
  }
  if (type === "stripe") {
    return !!(payload.object === "event" || payload.type && payload.type.includes("payment_intent."));
  }
  return false;
}
__name(identifyGateway, "identifyGateway");
async function handleUniversalWebhook(env, payload, headers, rawBody) {
  try {
    if (isPayPalWebhook(payload, headers)) {
      const paypalSettings = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("paypal").first();
      if (paypalSettings && paypalSettings.value) {
        console.log("Processing PayPal webhook with original handler for backward compatibility");
      }
    } else if (isWhopWebhook(payload, headers)) {
      const whopSettings = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
      if (whopSettings && whopSettings.value) {
        console.log("Processing Whop webhook with original handler for backward compatibility");
      }
    }
    let gateway = null;
    const gateways = await env.DB.prepare(
      "SELECT * FROM payment_gateways WHERE is_enabled = 1"
    ).all();
    for (const g of gateways.results || []) {
      if (identifyGateway(payload, g)) {
        gateway = g;
        break;
      }
    }
    if (!gateway) {
      console.log("No matching gateway found for webhook:", payload);
      return json({ received: true, gateway: "unknown" });
    }
    console.log(`Processing webhook for gateway: ${gateway.name}`, {
      gateway_type: gateway.gateway_type,
      event_type: payload.type || payload.event_type
    });
    if (gateway.webhook_secret && gateway.webhook_secret.trim()) {
      const isValid = await verifyWebhookSignature(rawBody, headers, gateway.webhook_secret);
      if (!isValid) {
        console.error(`Invalid signature for gateway: ${gateway.name}`);
        return json({ error: "Invalid signature" }, 401);
      }
    }
    await processPaymentEvent(env, gateway, payload, headers);
    return json({ received: true, gateway: gateway.name, processed: true });
  } catch (e) {
    console.error("Universal webhook error:", e);
    return json({ error: e.message }, 500);
  }
}
__name(handleUniversalWebhook, "handleUniversalWebhook");
async function verifyWebhookSignature(rawBody, headers, secret) {
  try {
    const signatureHeader = headers.get("x-signature") || headers.get("x-webhook-signature") || headers.get("stripe-signature") || headers.get("paypal-transmission-sig") || headers.get("authorization");
    if (!signatureHeader) {
      return true;
    }
    return true;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}
__name(verifyWebhookSignature, "verifyWebhookSignature");
async function processPaymentEvent(env, gateway, payload) {
  try {
    const eventId = payload.id || payload.event_id || payload.payment_id;
    const eventType = payload.type || payload.event_type || "unknown";
    const amount = payload.amount || payload.total || payload.value;
    const currency = payload.currency || "USD";
    if ((gateway.gateway_type === "paypal" || gateway.name.toLowerCase().includes("paypal")) && (!gateway.custom_code || gateway.custom_code.trim() === "")) {
      console.log("Forwarding PayPal webhook to original handler for backward compatibility");
    } else if ((gateway.gateway_type === "whop" || gateway.name.toLowerCase().includes("whop")) && (!gateway.custom_code || gateway.custom_code.trim() === "")) {
      console.log("Forwarding Whop webhook to original handler for backward compatibility");
    }
    const isSuccess = isPaymentSuccessEvent(eventType, payload, gateway.name);
    if (isSuccess) {
      console.log(`Successful payment from ${gateway.name}:`, { eventId, amount, currency });
    } else {
      console.log(`Failed payment from ${gateway.name}:`, { eventId, eventType });
    }
    try {
      await env.DB.prepare(`
        INSERT INTO webhook_events (gateway, event_id, event_type, payload, processed_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(gateway.name, eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, eventType, JSON.stringify(payload)).run();
    } catch (e) {
      if (e.message && e.message.includes("UNIQUE constraint")) {
        console.log(`Duplicate webhook ignored: ${eventId}`);
        return;
      }
    }
  } catch (e) {
    console.error("Payment event processing error:", e);
  }
}
__name(processPaymentEvent, "processPaymentEvent");
function isPaymentSuccessEvent(eventType, payload, gatewayName) {
  const successIndicators = {
    stripe: ["payment_intent.succeeded", "invoice.paid"],
    paypal: ["PAYMENT.CAPTURE.COMPLETED", "BILLING.SUBSCRIPTION.ACTIVATED"],
    whop: ["checkout.completed", "subscription.created"],
    gumroad: ["charge_success", "subscription_renewal"],
    razorpay: ["payment.captured", "order.paid"],
    paystack: ["charge.success", "invoice.success"]
  };
  const indicators = successIndicators[gatewayName.toLowerCase()] || [];
  if (indicators.some((indicator) => eventType.includes(indicator))) {
    return true;
  }
  if (payload.status && (payload.status.includes("success") || payload.status.includes("paid"))) {
    return true;
  }
  return false;
}
__name(isPaymentSuccessEvent, "isPaymentSuccessEvent");
async function handleUniversalPaymentAPI(env) {
  return json({
    success: true,
    message: "Universal Payment Gateway System is operational",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(handleUniversalPaymentAPI, "handleUniversalPaymentAPI");
async function handleAddPaymentGateway(env, body) {
  return addPaymentGatewayApi(env, body);
}
__name(handleAddPaymentGateway, "handleAddPaymentGateway");
async function handleGetPaymentGateways(env) {
  return getPaymentGatewaysApi(env);
}
__name(handleGetPaymentGateways, "handleGetPaymentGateways");
async function handleUpdatePaymentGateway(env, body) {
  const id = body.id;
  return updatePaymentGatewayApi(env, id, body);
}
__name(handleUpdatePaymentGateway, "handleUpdatePaymentGateway");
async function handleDeletePaymentGateway(env, id) {
  return deletePaymentGatewayApi(env, id);
}
__name(handleDeletePaymentGateway, "handleDeletePaymentGateway");
function isPayPalWebhook(payload, headers) {
  const contentType = (headers.get("content-type") || "").toLowerCase();
  const webhookId = headers.get("paypal-transmission-id") || headers.get("x-paypal-transmission-id");
  return contentType.includes("paypal") || webhookId || payload.resource && payload.event_type || payload.id && payload.event_type && payload.resource || payload.resource?.billing_agreement_id || payload.event_type && payload.event_type.includes("PAYPAL");
}
__name(isPayPalWebhook, "isPayPalWebhook");
function isWhopWebhook(payload, headers) {
  const whopSignature = headers.get("whop-signature") || headers.get("x-whop-signature");
  const whopWebhookId = headers.get("whop-webhook-id");
  return whopSignature || whopWebhookId || payload.checkout_id || payload.subscription_id || payload.customer_id && payload.product_id || payload.type && (payload.type.includes("whop") || payload.type.includes("checkout"));
}
__name(isWhopWebhook, "isWhopWebhook");

// src/controllers/pages.js
var PAGE_TYPES = {
  CUSTOM: "custom",
  HOME: "home",
  BLOG_ARCHIVE: "blog_archive",
  FORUM_ARCHIVE: "forum_archive",
  PRODUCT_GRID: "product_grid"
};
function sanitizePageSlug(input) {
  return String(input || "").toLowerCase().replace(/['"`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
}
__name(sanitizePageSlug, "sanitizePageSlug");
function isTruthyDefault(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}
__name(isTruthyDefault, "isTruthyDefault");
function isRootHomePage(pageType, isDefault) {
  return String(pageType || "") === PAGE_TYPES.HOME && Number(isDefault) === 1;
}
__name(isRootHomePage, "isRootHomePage");
async function getUniquePageSlug(env, baseSlug, excludeId = null) {
  let base = sanitizePageSlug(baseSlug || "page");
  if (!base || base === "home") base = "page";
  let candidate = base;
  let counter = 1;
  while (true) {
    const row = excludeId ? await env.DB.prepare("SELECT id FROM pages WHERE slug = ? AND id != ? LIMIT 1").bind(candidate, Number(excludeId)).first() : await env.DB.prepare("SELECT id FROM pages WHERE slug = ? LIMIT 1").bind(candidate).first();
    if (!row) return candidate;
    candidate = `${base}-${counter++}`;
  }
}
__name(getUniquePageSlug, "getUniquePageSlug");
async function freeHomeSlugForPage(env, targetId = null) {
  const query = targetId ? "SELECT id, title FROM pages WHERE slug = ? AND id != ? ORDER BY id DESC" : "SELECT id, title FROM pages WHERE slug = ? ORDER BY id DESC";
  const bind = targetId ? ["home", Number(targetId)] : ["home"];
  const rows = await env.DB.prepare(query).bind(...bind).all();
  for (const row of rows.results || []) {
    const base = sanitizePageSlug(row.title || "") || "home-page";
    const nextSlug = await getUniquePageSlug(env, `${base}-previous`, row.id);
    await env.DB.prepare(
      "UPDATE pages SET slug = ?, is_default = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(nextSlug, Number(row.id)).run();
  }
}
__name(freeHomeSlugForPage, "freeHomeSlugForPage");
async function getPages(env) {
  const kvKey = "api_cache:pages:list";
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return cachedJson(JSON.parse(cached), 120);
      }
    } catch (e) {
    }
  }
  const r = await env.DB.prepare(
    "SELECT id, slug, title, meta_description, page_type, is_default, created_at, updated_at FROM pages WHERE status = ? ORDER BY id DESC"
  ).bind("published").all();
  const pages = (r.results || []).map((page) => {
    if (page.created_at) page.created_at = toISO8601(page.created_at);
    if (page.updated_at) page.updated_at = toISO8601(page.updated_at);
    return page;
  });
  const responseData = { pages };
  if (env.PAGE_CACHE) {
    try {
      await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
    } catch (e) {
    }
  }
  return cachedJson(responseData, 120);
}
__name(getPages, "getPages");
async function getPagesList(env) {
  let r;
  let hasNewColumns = true;
  try {
    r = await env.DB.prepare(
      "SELECT id, slug, title, content, status, page_type, is_default, created_at, updated_at FROM pages ORDER BY id DESC"
    ).all();
  } catch (e) {
    hasNewColumns = false;
    r = await env.DB.prepare(
      "SELECT id, slug, title, content, status, created_at, updated_at FROM pages ORDER BY id DESC"
    ).all();
  }
  const pages = (r.results || []).map((page) => {
    const contentSize = page.content ? page.content.length : 0;
    let sizeStr = "0 B";
    if (contentSize >= 1024 * 1024) {
      sizeStr = (contentSize / (1024 * 1024)).toFixed(2) + " MB";
    } else if (contentSize >= 1024) {
      sizeStr = (contentSize / 1024).toFixed(2) + " KB";
    } else {
      sizeStr = contentSize + " B";
    }
    const uploaded = page.updated_at ? toISO8601(page.updated_at) : page.created_at ? toISO8601(page.created_at) : (/* @__PURE__ */ new Date()).toISOString();
    const pageType = hasNewColumns ? page.page_type || "custom" : "custom";
    const isDefault = hasNewColumns ? page.is_default || 0 : 0;
    const publicUrl = isRootHomePage(pageType, isDefault) ? "/" : `/${page.slug}`;
    return {
      id: page.id,
      name: page.slug || page.title || "Untitled",
      title: page.title || page.slug || "Untitled",
      url: publicUrl,
      size: sizeStr,
      uploaded,
      status: page.status || "draft",
      page_type: pageType,
      is_default: isDefault
    };
  });
  return json({ success: true, pages });
}
__name(getPagesList, "getPagesList");
async function getPage(env, slug) {
  const kvKey = `api_cache:pages:get:${slug}`;
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return json(JSON.parse(cached));
      }
    } catch (e) {
    }
  }
  const row = await env.DB.prepare("SELECT * FROM pages WHERE slug = ?").bind(slug).first();
  if (!row) return json({ error: "Page not found" }, 404);
  if (row.created_at) row.created_at = toISO8601(row.created_at);
  if (row.updated_at) row.updated_at = toISO8601(row.updated_at);
  const responseData = { page: row };
  if (env.PAGE_CACHE) {
    try {
      await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
    } catch (e) {
    }
  }
  return json(responseData);
}
__name(getPage, "getPage");
async function getDefaultPage(env, pageType) {
  const kvKey = `api_cache:pages:default:${pageType}`;
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return json(JSON.parse(cached));
      }
    } catch (e) {
    }
  }
  try {
    const row = await env.DB.prepare(
      "SELECT * FROM pages WHERE page_type = ? AND is_default = 1 AND status = ?"
    ).bind(pageType, "published").first();
    if (!row) return json({ page: null });
    if (row.created_at) row.created_at = toISO8601(row.created_at);
    if (row.updated_at) row.updated_at = toISO8601(row.updated_at);
    row.public_url = isRootHomePage(row.page_type, row.is_default) ? "/" : `/${row.slug}`;
    const responseData = { page: row };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return json(responseData);
  } catch (e) {
    return json({ page: null });
  }
}
__name(getDefaultPage, "getDefaultPage");
async function setDefaultPage(env, body) {
  const { id, page_type } = body;
  if (!id || !page_type) {
    return json({ error: "id and page_type required" }, 400);
  }
  try {
    await env.DB.prepare(
      "UPDATE pages SET is_default = 0 WHERE page_type = ?"
    ).bind(page_type).run();
    if (String(page_type) === PAGE_TYPES.HOME) {
      await freeHomeSlugForPage(env, Number(id));
      await env.DB.prepare(
        "UPDATE pages SET slug = ?, is_default = 1, page_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind("home", page_type, Number(id)).run();
    } else {
      await env.DB.prepare(
        "UPDATE pages SET is_default = 1, page_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(page_type, Number(id)).run();
    }
    return json({ success: true });
  } catch (e) {
    return json({ error: "Columns not available. Please redeploy to add page_type support." }, 500);
  }
}
__name(setDefaultPage, "setDefaultPage");
async function clearDefaultPage(env, body) {
  const { page_type } = body;
  if (!page_type) {
    return json({ error: "page_type required" }, 400);
  }
  await env.DB.prepare(
    "UPDATE pages SET is_default = 0 WHERE page_type = ?"
  ).bind(page_type).run();
  return json({ success: true });
}
__name(clearDefaultPage, "clearDefaultPage");
async function savePage(env, body) {
  if (!body.title) return json({ error: "title required" }, 400);
  const pageType = body.page_type || "custom";
  const wantsDefault = isTruthyDefault(body.is_default);
  const isDefault = wantsDefault && pageType !== "custom" ? 1 : 0;
  const forcedHomeSlug = isRootHomePage(pageType, isDefault);
  let finalSlug = forcedHomeSlug ? "home" : sanitizePageSlug(
    body.slug && typeof body.slug === "string" && body.slug.trim().length > 0 ? body.slug : body.title || ""
  );
  if (!finalSlug) {
    return json({ error: "slug could not be generated from title" }, 400);
  }
  const clearDefaultsIfNeeded = /* @__PURE__ */ __name(async () => {
    if (isDefault && pageType !== "custom") {
      await env.DB.prepare(
        "UPDATE pages SET is_default = 0 WHERE page_type = ?"
      ).bind(pageType).run();
    }
  }, "clearDefaultsIfNeeded");
  const bodyId = Number(body.id);
  const hasValidBodyId = Number.isInteger(bodyId) && bodyId > 0;
  const originalSlug = sanitizePageSlug(body.original_slug || "");
  let updateId = hasValidBodyId ? bodyId : null;
  if (!updateId && originalSlug) {
    const existingByOriginalSlug = await env.DB.prepare(
      "SELECT id FROM pages WHERE slug = ? LIMIT 1"
    ).bind(originalSlug).first();
    if (existingByOriginalSlug && existingByOriginalSlug.id) {
      updateId = Number(existingByOriginalSlug.id);
    }
  }
  if (forcedHomeSlug) {
    await freeHomeSlugForPage(env, updateId);
  }
  if (updateId) {
    const existingPage = await env.DB.prepare(
      "SELECT id FROM pages WHERE id = ? LIMIT 1"
    ).bind(updateId).first();
    if (!existingPage) {
      return json({ error: "page not found" }, 404);
    }
    let slugOwner = await env.DB.prepare("SELECT id FROM pages WHERE slug = ? LIMIT 1").bind(finalSlug).first();
    let baseSlug = finalSlug;
    let idx = 1;
    while (slugOwner && Number(slugOwner.id) !== updateId) {
      finalSlug = `${baseSlug}-${idx++}`;
      slugOwner = await env.DB.prepare("SELECT id FROM pages WHERE slug = ? LIMIT 1").bind(finalSlug).first();
    }
    await clearDefaultsIfNeeded();
    await env.DB.prepare(
      "UPDATE pages SET slug=?, title=?, content=?, meta_description=?, page_type=?, is_default=?, feature_image_url=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(
      finalSlug,
      body.title,
      body.content || "",
      body.meta_description || "",
      pageType,
      isDefault,
      body.feature_image_url || "",
      body.status || "published",
      updateId
    ).run();
    return json({ success: true, id: updateId, slug: finalSlug, public_url: forcedHomeSlug ? "/" : `/${finalSlug}` });
  }
  try {
    const existingBySlug = await env.DB.prepare("SELECT id FROM pages WHERE slug = ? LIMIT 1").bind(finalSlug).first();
    if (existingBySlug) {
      await clearDefaultsIfNeeded();
      await env.DB.prepare(
        "UPDATE pages SET slug=?, title=?, content=?, meta_description=?, page_type=?, is_default=?, feature_image_url=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(
        finalSlug,
        body.title,
        body.content || "",
        body.meta_description || "",
        pageType,
        isDefault,
        body.feature_image_url || "",
        body.status || "published",
        existingBySlug.id
      ).run();
      return json({ success: true, id: existingBySlug.id, slug: finalSlug, public_url: forcedHomeSlug ? "/" : `/${finalSlug}` });
    }
  } catch (e) {
  }
  let uniqueSlug = finalSlug;
  if (!forcedHomeSlug) {
    let idx = 1;
    while (true) {
      const exists = await env.DB.prepare("SELECT id FROM pages WHERE slug = ? LIMIT 1").bind(uniqueSlug).first();
      if (!exists) break;
      uniqueSlug = `${finalSlug}-${idx++}`;
    }
  } else {
    const existingHome = await env.DB.prepare("SELECT id FROM pages WHERE slug = ? LIMIT 1").bind("home").first();
    if (existingHome) {
      return json({ error: "default home page could not claim the home slug" }, 409);
    }
  }
  await clearDefaultsIfNeeded();
  const r = await env.DB.prepare(
    "INSERT INTO pages (slug, title, content, meta_description, page_type, is_default, feature_image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(uniqueSlug, body.title, body.content || "", body.meta_description || "", pageType, isDefault, body.feature_image_url || "", body.status || "published").run();
  return json({ success: true, id: r.meta?.last_row_id, slug: uniqueSlug, public_url: forcedHomeSlug ? "/" : `/${uniqueSlug}` });
}
__name(savePage, "savePage");
async function savePageBuilder(env, body) {
  const content = body.content || "";
  const pageType = body.page_type || "custom";
  const wantsDefault = isTruthyDefault(body.is_default);
  const isDefault = wantsDefault && pageType !== "custom" ? 1 : 0;
  const forcedHomeSlug = isRootHomePage(pageType, isDefault);
  let name = forcedHomeSlug ? "home" : sanitizePageSlug((body.name || "").trim());
  if (!name) return json({ error: "name required" }, 400);
  const clearDefaultsIfNeeded = /* @__PURE__ */ __name(async () => {
    if (isDefault && pageType !== "custom") {
      try {
        await env.DB.prepare(
          "UPDATE pages SET is_default = 0 WHERE page_type = ?"
        ).bind(pageType).run();
      } catch (e) {
      }
    }
  }, "clearDefaultsIfNeeded");
  const bodyId = Number(body.id);
  const hasValidBodyId = Number.isInteger(bodyId) && bodyId > 0;
  const originalSlug = sanitizePageSlug(body.original_slug || "");
  let existing = null;
  if (hasValidBodyId) {
    existing = await env.DB.prepare("SELECT id FROM pages WHERE id = ?").bind(bodyId).first();
  }
  if (!existing && originalSlug) {
    existing = await env.DB.prepare("SELECT id FROM pages WHERE slug = ?").bind(originalSlug).first();
  }
  if (!existing && !forcedHomeSlug) {
    existing = await env.DB.prepare("SELECT id FROM pages WHERE slug = ?").bind(name).first();
  }
  if (forcedHomeSlug) {
    await freeHomeSlugForPage(env, existing?.id || null);
  }
  if (existing) {
    let slugOwner = await env.DB.prepare("SELECT id FROM pages WHERE slug = ? LIMIT 1").bind(name).first();
    let baseName = name;
    let nameIdx = 1;
    while (slugOwner && Number(slugOwner.id) !== Number(existing.id)) {
      name = `${baseName}-${nameIdx++}`;
      slugOwner = await env.DB.prepare("SELECT id FROM pages WHERE slug = ? LIMIT 1").bind(name).first();
    }
    await clearDefaultsIfNeeded();
    try {
      await env.DB.prepare(
        "UPDATE pages SET slug=?, content=?, page_type=?, is_default=?, feature_image_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(name, content, pageType, isDefault, body.feature_image_url || "", existing.id).run();
    } catch (e) {
      await env.DB.prepare(
        "UPDATE pages SET slug=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(name, content, existing.id).run();
    }
    return json({ success: true, id: existing.id, slug: name, public_url: forcedHomeSlug ? "/" : `/${name}` });
  }
  await clearDefaultsIfNeeded();
  try {
    const r = await env.DB.prepare(
      "INSERT INTO pages (slug, title, content, page_type, is_default, feature_image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(name, name, content, pageType, isDefault, body.feature_image_url || "", "published").run();
    return json({ success: true, id: r.meta?.last_row_id, slug: name, public_url: forcedHomeSlug ? "/" : `/${name}` });
  } catch (e) {
    const r = await env.DB.prepare(
      "INSERT INTO pages (slug, title, content, status) VALUES (?, ?, ?, ?)"
    ).bind(name, name, content, "published").run();
    return json({ success: true, id: r.meta?.last_row_id, slug: name, public_url: forcedHomeSlug ? "/" : `/${name}` });
  }
}
__name(savePageBuilder, "savePageBuilder");
async function deletePage(env, id) {
  await env.DB.prepare("DELETE FROM pages WHERE id = ?").bind(Number(id)).run();
  return json({ success: true });
}
__name(deletePage, "deletePage");
async function deletePageBySlug(env, body) {
  const name = (body.name || "").trim();
  if (!name) return json({ error: "name required" }, 400);
  await env.DB.prepare("DELETE FROM pages WHERE slug = ?").bind(name).run();
  return json({ success: true });
}
__name(deletePageBySlug, "deletePageBySlug");
async function deleteAllPages(env, body = {}) {
  const status = String(body.status || "all").trim().toLowerCase();
  const pageType = String(body.page_type || "all").trim().toLowerCase();
  if (!["all", "draft", "published"].includes(status)) {
    return json({ error: "Invalid status filter. Use all, draft, or published." }, 400);
  }
  const validPageTypes = /* @__PURE__ */ new Set(["all", ...Object.values(PAGE_TYPES)]);
  if (!validPageTypes.has(pageType)) {
    return json({ error: "Invalid page_type filter." }, 400);
  }
  let query = "DELETE FROM pages";
  const conditions = [];
  const params = [];
  if (status !== "all") {
    conditions.push("status = ?");
    params.push(status);
  }
  if (pageType !== "all") {
    conditions.push("page_type = ?");
    params.push(pageType);
  }
  if (conditions.length) {
    query += " WHERE " + conditions.join(" AND ");
  }
  try {
    const result = await env.DB.prepare(query).bind(...params).run();
    return json({ success: true, count: result?.changes || 0 });
  } catch (err) {
    const message = String(err?.message || "");
    const pageTypeColumnMissing = /no such column: page_type/i.test(message);
    if (pageTypeColumnMissing && pageType !== "all") {
      return json({ error: "page_type filtering is not available on current schema." }, 400);
    }
    if (pageTypeColumnMissing) {
      const fallbackQuery = status === "all" ? "DELETE FROM pages" : "DELETE FROM pages WHERE status = ?";
      const fallbackParams = status === "all" ? [] : [status];
      const fallback = await env.DB.prepare(fallbackQuery).bind(...fallbackParams).run();
      return json({ success: true, count: fallback?.changes || 0 });
    }
    return json({ error: message || "Failed to delete pages." }, 500);
  }
}
__name(deleteAllPages, "deleteAllPages");
async function updatePageStatus(env, body) {
  const id = body.id;
  const status = (body.status || "").trim().toLowerCase();
  if (!id || !status) {
    return json({ error: "id and status required" }, 400);
  }
  if (status !== "published" && status !== "draft") {
    return json({ error: "invalid status" }, 400);
  }
  await env.DB.prepare("UPDATE pages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, Number(id)).run();
  return json({ success: true });
}
__name(updatePageStatus, "updatePageStatus");
async function updatePageType(env, body) {
  const { id, page_type, is_default } = body;
  if (!id || !page_type) {
    return json({ error: "id and page_type required" }, 400);
  }
  const wantsDefault = is_default === true || is_default === 1 || is_default === "1" || is_default === "true";
  const setDefault = wantsDefault ? 1 : 0;
  if (setDefault && page_type !== "custom") {
    await env.DB.prepare(
      "UPDATE pages SET is_default = 0 WHERE page_type = ?"
    ).bind(page_type).run();
  }
  await env.DB.prepare(
    "UPDATE pages SET page_type = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(page_type, setDefault, Number(id)).run();
  return json({ success: true });
}
__name(updatePageType, "updatePageType");
async function duplicatePage(env, body) {
  const id = body.id;
  if (!id) {
    return json({ error: "id required" }, 400);
  }
  const row = await env.DB.prepare("SELECT * FROM pages WHERE id = ?").bind(Number(id)).first();
  if (!row) {
    return json({ error: "Page not found" }, 404);
  }
  const baseSlug = row.slug || "page";
  let newSlug = baseSlug + "-copy";
  let idx = 1;
  let exists = await env.DB.prepare("SELECT slug FROM pages WHERE slug = ?").bind(newSlug).first();
  while (exists) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx++;
    exists = await env.DB.prepare("SELECT slug FROM pages WHERE slug = ?").bind(newSlug).first();
  }
  const r = await env.DB.prepare(
    "INSERT INTO pages (slug, title, content, meta_description, page_type, is_default, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    newSlug,
    (row.title || "") + " Copy",
    row.content || "",
    row.meta_description || "",
    row.page_type || "custom",
    0,
    // Never copy default status
    "draft"
  ).run();
  return json({ success: true, id: r.meta?.last_row_id, slug: newSlug });
}
__name(duplicatePage, "duplicatePage");
async function loadPageBuilder(env, name) {
  if (!name) return json({ error: "name required" }, 400);
  const row = await env.DB.prepare("SELECT id, slug, content, page_type, is_default, feature_image_url FROM pages WHERE slug = ?").bind(name).first();
  if (!row) return json({ id: null, slug: name, content: "", page_type: "custom", is_default: 0, feature_image_url: "" });
  return json({
    id: row.id || null,
    slug: row.slug || name,
    content: row.content || "",
    page_type: row.page_type || "custom",
    is_default: row.is_default || 0,
    feature_image_url: row.feature_image_url || ""
  });
}
__name(loadPageBuilder, "loadPageBuilder");

// src/controllers/blog.js
async function getBlogs(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM blogs ORDER BY created_at DESC
    `).all();
    return json({ success: true, blogs: result.results || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getBlogs, "getBlogs");
async function getBlogsList(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url, status, created_at, updated_at
      FROM blogs ORDER BY created_at DESC
    `).all();
    return json({ success: true, blogs: result.results || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getBlogsList, "getBlogsList");
async function getPublishedBlogs(env, url) {
  try {
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "30");
    const offset = (page - 1) * limit;
    const kvKey = `api_cache:blogs:published:${page}:${limit}`;
    if (env.PAGE_CACHE) {
      try {
        const cached = await env.PAGE_CACHE.get(kvKey);
        if (cached) {
          return cachedJson(JSON.parse(cached));
        }
      } catch (e) {
      }
    }
    const [countResult, result] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as total FROM blogs WHERE status = 'published'`).first(),
      env.DB.prepare(`
        SELECT id, title, slug, description, thumbnail_url, created_at
        FROM blogs 
        WHERE status = 'published'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all()
    ]);
    const total = countResult?.total || 0;
    const responseData = {
      success: true,
      blogs: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return cachedJson(responseData);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getPublishedBlogs, "getPublishedBlogs");
async function getBlog(env, idOrSlug) {
  try {
    let blog;
    if (/^\d+$/.test(idOrSlug)) {
      blog = await env.DB.prepare(`
        SELECT * FROM blogs WHERE id = ?
      `).bind(parseInt(idOrSlug)).first();
    } else {
      blog = await env.DB.prepare(`
        SELECT * FROM blogs WHERE slug = ?
      `).bind(idOrSlug).first();
    }
    if (!blog) {
      return json({ error: "Blog post not found" }, 404);
    }
    return json({ success: true, blog });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getBlog, "getBlog");
async function getPublishedBlog(env, slug) {
  try {
    const kvKey = `api_cache:blogs:get:${slug}`;
    if (env.PAGE_CACHE) {
      try {
        const cached = await env.PAGE_CACHE.get(kvKey);
        if (cached) {
          return json(JSON.parse(cached));
        }
      } catch (e) {
      }
    }
    const blog = await env.DB.prepare(`
      SELECT * FROM blogs WHERE slug = ? AND status = 'published'
    `).bind(slug).first();
    if (!blog) {
      return json({ error: "Blog post not found" }, 404);
    }
    const responseData = { success: true, blog };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return json(responseData);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getPublishedBlog, "getPublishedBlog");
async function getPreviousBlogs(env, currentId, limit = 2) {
  try {
    const result = await env.DB.prepare(`
      SELECT id, title, slug, description, thumbnail_url, created_at
      FROM blogs 
      WHERE status = 'published' AND id < ?
      ORDER BY id DESC
      LIMIT ?
    `).bind(currentId, limit).all();
    return json({ success: true, blogs: result.results || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getPreviousBlogs, "getPreviousBlogs");
async function saveBlog(env, body) {
  try {
    const {
      id,
      title,
      slug,
      description,
      content,
      thumbnail_url,
      custom_css,
      custom_js,
      seo_title,
      seo_description,
      seo_keywords,
      status = "draft"
    } = body;
    if (!title) {
      return json({ error: "Title is required" }, 400);
    }
    let finalSlug;
    if (slug && typeof slug === "string" && slug.trim().length > 0) {
      finalSlug = slug.toLowerCase().replace(/['"`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
    } else {
      finalSlug = title.toLowerCase().replace(/['"`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
    }
    let baseSlug = finalSlug;
    let slugIdx = 1;
    if (id) {
      let exists = await env.DB.prepare("SELECT id FROM blogs WHERE slug = ? AND id != ?").bind(finalSlug, Number(id)).first();
      while (exists) {
        finalSlug = `${baseSlug}-${slugIdx++}`;
        exists = await env.DB.prepare("SELECT id FROM blogs WHERE slug = ? AND id != ?").bind(finalSlug, Number(id)).first();
      }
    } else {
      let exists = await env.DB.prepare("SELECT id FROM blogs WHERE slug = ?").bind(finalSlug).first();
      while (exists) {
        finalSlug = `${baseSlug}-${slugIdx++}`;
        exists = await env.DB.prepare("SELECT id FROM blogs WHERE slug = ?").bind(finalSlug).first();
      }
    }
    const now = Date.now();
    if (id) {
      const existing = await env.DB.prepare("SELECT * FROM blogs WHERE id = ?").bind(id).first();
      if (!existing) {
        return json({ error: "Blog post not found" }, 404);
      }
      const pick = /* @__PURE__ */ __name((key, fallback) => key in body ? body[key] ?? "" : fallback ?? "", "pick");
      await env.DB.prepare(`
        UPDATE blogs SET
          title = ?,
          slug = ?,
          description = ?,
          content = ?,
          thumbnail_url = ?,
          custom_css = ?,
          custom_js = ?,
          seo_title = ?,
          seo_description = ?,
          seo_keywords = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        title,
        finalSlug,
        pick("description", existing.description),
        pick("content", existing.content),
        pick("thumbnail_url", existing.thumbnail_url),
        pick("custom_css", existing.custom_css),
        pick("custom_js", existing.custom_js),
        pick("seo_title", existing.seo_title),
        pick("seo_description", existing.seo_description),
        pick("seo_keywords", existing.seo_keywords),
        pick("status", existing.status),
        now,
        id
      ).run();
      return json({ success: true, id, slug: finalSlug });
    } else {
      const result = await env.DB.prepare(`
        INSERT INTO blogs (title, slug, description, content, thumbnail_url, custom_css, custom_js, seo_title, seo_description, seo_keywords, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        title,
        finalSlug,
        description || "",
        content || "",
        thumbnail_url || "",
        custom_css || "",
        custom_js || "",
        seo_title || "",
        seo_description || "",
        seo_keywords || "",
        status,
        now,
        now
      ).run();
      return json({ success: true, id: result.meta?.last_row_id, slug: finalSlug });
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(saveBlog, "saveBlog");
async function deleteBlog(env, id) {
  try {
    if (!id) {
      return json({ error: "Blog ID required" }, 400);
    }
    await env.DB.prepare("DELETE FROM blogs WHERE id = ?").bind(id).run();
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(deleteBlog, "deleteBlog");
async function deleteAllBlogs(env) {
  try {
    const commentsResult = await env.DB.prepare(
      "DELETE FROM blog_comments WHERE blog_id IN (SELECT id FROM blogs)"
    ).run();
    const blogsResult = await env.DB.prepare("DELETE FROM blogs").run();
    return json({
      success: true,
      count: blogsResult?.changes || 0,
      deleted_blog_comments: commentsResult?.changes || 0
    });
  } catch (err) {
    return json({ error: err.message || "Failed to delete all blogs" }, 500);
  }
}
__name(deleteAllBlogs, "deleteAllBlogs");
async function updateBlogStatus(env, body) {
  try {
    const { id, status } = body;
    if (!id || !status) {
      return json({ error: "ID and status required" }, 400);
    }
    await env.DB.prepare(`
      UPDATE blogs SET status = ?, updated_at = ? WHERE id = ?
    `).bind(status, Date.now(), id).run();
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(updateBlogStatus, "updateBlogStatus");
async function duplicateBlog(env, body) {
  try {
    const { id } = body;
    if (!id) {
      return json({ error: "Blog ID required" }, 400);
    }
    const original = await env.DB.prepare("SELECT * FROM blogs WHERE id = ?").bind(id).first();
    if (!original) {
      return json({ error: "Blog not found" }, 404);
    }
    let baseSlug = (original.slug || "").toString().toLowerCase().replace(/['"`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
    if (!baseSlug) {
      baseSlug = "post";
    }
    let newSlugCandidate = `${baseSlug}-copy`;
    let counter = 1;
    while (true) {
      const exists = await env.DB.prepare("SELECT id FROM blogs WHERE slug = ? LIMIT 1").bind(newSlugCandidate).first();
      if (!exists) break;
      newSlugCandidate = `${baseSlug}-copy${counter++}`;
    }
    const now = Date.now();
    const result = await env.DB.prepare(`
      INSERT INTO blogs (title, slug, description, content, thumbnail_url, custom_css, custom_js, seo_title, seo_description, seo_keywords, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(
      `${original.title} (Copy)`,
      newSlugCandidate,
      original.description || "",
      original.content || "",
      original.thumbnail_url || "",
      original.custom_css || "",
      original.custom_js || "",
      original.seo_title || "",
      original.seo_description || "",
      original.seo_keywords || "",
      now,
      now
    ).run();
    return json({ success: true, id: result.meta?.last_row_id, slug: newSlugCandidate });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(duplicateBlog, "duplicateBlog");

// src/controllers/blog-comments.js
async function getBlogComments(env, blogId) {
  try {
    const result = await env.DB.prepare(`
      SELECT id, name, comment, created_at
      FROM blog_comments 
      WHERE blog_id = ? AND status = 'approved'
      ORDER BY created_at DESC
    `).bind(blogId).all();
    return json({ success: true, comments: result.results || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getBlogComments, "getBlogComments");
async function checkPendingComment(env, blogId, email) {
  try {
    const pending = await env.DB.prepare(`
      SELECT id FROM blog_comments 
      WHERE blog_id = ? AND email = ? AND status = 'pending'
      LIMIT 1
    `).bind(blogId, email).first();
    return json({
      success: true,
      hasPending: !!pending
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(checkPendingComment, "checkPendingComment");
async function addBlogComment(env, body) {
  try {
    const { blog_id, name, email, comment } = body;
    if (!blog_id || !name || !email || !comment) {
      return json({ error: "All fields are required" }, 400);
    }
    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedComment = String(comment).trim();
    if (trimmedName.length > 50) {
      return json({ error: "Name must be 50 characters or less" }, 400);
    }
    if (trimmedEmail.length > 100) {
      return json({ error: "Email must be 100 characters or less" }, 400);
    }
    if (trimmedComment.length > 2e3) {
      return json({ error: "Comment must be 2000 characters or less" }, 400);
    }
    if (trimmedComment.length < 3) {
      return json({ error: "Comment must be at least 3 characters" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return json({ error: "Invalid email format" }, 400);
    }
    const pending = await env.DB.prepare(`
      SELECT id FROM blog_comments 
      WHERE blog_id = ? AND email = ? AND status = 'pending'
      LIMIT 1
    `).bind(blog_id, trimmedEmail).first();
    if (pending) {
      return json({
        error: "You already have a pending comment awaiting approval. Please wait for it to be approved before posting another.",
        hasPending: true
      }, 400);
    }
    const blog = await env.DB.prepare(`
      SELECT id FROM blogs WHERE id = ? AND status = 'published'
    `).bind(blog_id).first();
    if (!blog) {
      return json({ error: "Blog post not found" }, 404);
    }
    const now = Date.now();
    await env.DB.prepare(`
      INSERT INTO blog_comments (blog_id, name, email, comment, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).bind(blog_id, trimmedName, trimmedEmail, trimmedComment, now).run();
    let blogTitle = "";
    try {
      const blogInfo = await env.DB.prepare("SELECT title FROM blogs WHERE id = ?").bind(blog_id).first();
      blogTitle = blogInfo?.title || "";
    } catch (e) {
    }
    notifyBlogComment(env, {
      blogTitle,
      name: trimmedName,
      email: trimmedEmail,
      comment: trimmedComment
    }).catch(() => {
    });
    return json({
      success: true,
      message: "Comment submitted successfully! It will appear after admin approval."
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(addBlogComment, "addBlogComment");
async function getAdminComments(env, url) {
  try {
    const status = url.searchParams.get("status") || "all";
    const blogId = url.searchParams.get("blog_id");
    let query = `
      SELECT c.*, b.title as blog_title, b.slug as blog_slug
      FROM blog_comments c
      LEFT JOIN blogs b ON c.blog_id = b.id
    `;
    const conditions = [];
    const params = [];
    if (status !== "all") {
      conditions.push("c.status = ?");
      params.push(status);
    }
    if (blogId) {
      conditions.push("c.blog_id = ?");
      params.push(blogId);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY c.created_at DESC";
    const stmt = env.DB.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
    const pendingCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM blog_comments WHERE status = ?"
    ).bind("pending").first();
    const approvedCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM blog_comments WHERE status = ?"
    ).bind("approved").first();
    return json({
      success: true,
      comments: result.results || [],
      counts: {
        pending: pendingCount?.count || 0,
        approved: approvedCount?.count || 0
      }
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getAdminComments, "getAdminComments");
async function updateCommentStatus(env, body) {
  try {
    const { id, status } = body;
    if (!id || !status) {
      return json({ error: "ID and status required" }, 400);
    }
    if (!["approved", "rejected", "pending"].includes(status)) {
      return json({ error: "Invalid status" }, 400);
    }
    await env.DB.prepare(`
      UPDATE blog_comments SET status = ? WHERE id = ?
    `).bind(status, id).run();
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(updateCommentStatus, "updateCommentStatus");
async function deleteComment(env, id) {
  try {
    if (!id) {
      return json({ error: "Comment ID required" }, 400);
    }
    await env.DB.prepare("DELETE FROM blog_comments WHERE id = ?").bind(id).run();
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(deleteComment, "deleteComment");
async function bulkUpdateComments(env, body) {
  try {
    const { ids, status } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return json({ error: "Comment IDs required" }, 400);
    }
    if (!["approved", "rejected"].includes(status)) {
      return json({ error: "Invalid status" }, 400);
    }
    const placeholders = ids.map(() => "?").join(",");
    await env.DB.prepare(`
      UPDATE blog_comments SET status = ? WHERE id IN (${placeholders})
    `).bind(status, ...ids).run();
    return json({ success: true, updated: ids.length });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(bulkUpdateComments, "bulkUpdateComments");

// src/controllers/forum.js
function buildForumQuestionBaseSlug(title, fallbackSeed = Date.now()) {
  const baseSlug = slugifyStr(String(title || "")).slice(0, 80).replace(/^-+|-+$/g, "");
  return baseSlug || `question-${String(fallbackSeed)}`;
}
__name(buildForumQuestionBaseSlug, "buildForumQuestionBaseSlug");
function isForumSlugUniqueConstraintError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("unique") && message.includes("forum_questions.slug");
}
__name(isForumSlugUniqueConstraintError, "isForumSlugUniqueConstraintError");
async function getPublishedQuestions(env, url) {
  try {
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const kvKey = `api_cache:forum:published:${page}:${limit}`;
    if (env.PAGE_CACHE) {
      try {
        const cached = await env.PAGE_CACHE.get(kvKey);
        if (cached) {
          return cachedJson(JSON.parse(cached), 120);
        }
      } catch (e) {
      }
    }
    const [countResult, result] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as total FROM forum_questions WHERE status = 'approved'`).first(),
      env.DB.prepare(`
        SELECT id, title, slug, content, name, reply_count, created_at
        FROM forum_questions 
        WHERE status = 'approved'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all()
    ]);
    const total = countResult?.total || 0;
    const responseData = {
      success: true,
      questions: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return cachedJson(responseData, 120);
  } catch (err) {
    console.error("getPublishedQuestions error:", err);
    return json({ error: err.message, questions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }, 500);
  }
}
__name(getPublishedQuestions, "getPublishedQuestions");
async function getQuestion(env, slug) {
  try {
    const kvKey = `api_cache:forum:get:${slug}`;
    if (env.PAGE_CACHE) {
      try {
        const cached = await env.PAGE_CACHE.get(kvKey);
        if (cached) {
          return json(JSON.parse(cached));
        }
      } catch (e) {
      }
    }
    const question = await env.DB.prepare(`
      SELECT * FROM forum_questions WHERE slug = ? AND status = 'approved'
    `).bind(slug).first();
    if (!question) {
      return json({ error: "Question not found" }, 404);
    }
    const replies = await env.DB.prepare(`
      SELECT id, name, content, created_at
      FROM forum_replies 
      WHERE question_id = ? AND status = 'approved'
      ORDER BY created_at ASC
    `).bind(question.id).all();
    const responseData = {
      success: true,
      question,
      replies: replies.results || []
    };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return json(responseData);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getQuestion, "getQuestion");
async function getQuestionById(env, id) {
  try {
    const kvKey = `api_cache:forum:getById:${id}`;
    if (env.PAGE_CACHE) {
      try {
        const cached = await env.PAGE_CACHE.get(kvKey);
        if (cached) {
          return json(JSON.parse(cached));
        }
      } catch (e) {
      }
    }
    if (!id) {
      return json({ error: "Question ID required" }, 400);
    }
    const question = await env.DB.prepare(`
      SELECT * FROM forum_questions WHERE id = ? AND status = 'approved'
    `).bind(parseInt(id)).first();
    if (!question) {
      return json({ error: "Question not found" }, 404);
    }
    const responseData = {
      success: true,
      question
    };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(responseData), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return json(responseData);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getQuestionById, "getQuestionById");
async function getQuestionReplies(env, questionId) {
  try {
    if (!questionId) {
      return json({ replies: [] });
    }
    const replies = await env.DB.prepare(`
      SELECT id, name, content, created_at
      FROM forum_replies 
      WHERE question_id = ? AND status = 'approved'
      ORDER BY created_at ASC
    `).bind(questionId).all();
    return json({
      success: true,
      replies: replies.results || []
    });
  } catch (err) {
    console.error("getQuestionReplies error:", err);
    return json({ replies: [] });
  }
}
__name(getQuestionReplies, "getQuestionReplies");
async function checkPendingForum(env, email) {
  try {
    let pendingQuestion = null;
    try {
      pendingQuestion = await env.DB.prepare(`
        SELECT id FROM forum_questions 
        WHERE email = ? AND status = 'pending'
        LIMIT 1
      `).bind(email).first();
    } catch (e) {
    }
    let pendingReply = null;
    try {
      pendingReply = await env.DB.prepare(`
        SELECT id FROM forum_replies 
        WHERE email = ? AND status = 'pending'
        LIMIT 1
      `).bind(email).first();
    } catch (e) {
    }
    return json({
      success: true,
      hasPending: !!(pendingQuestion || pendingReply),
      pendingType: pendingQuestion ? "question" : pendingReply ? "reply" : null
    });
  } catch (err) {
    console.error("checkPendingForum error:", err);
    return json({ success: true, hasPending: false }, 200);
  }
}
__name(checkPendingForum, "checkPendingForum");
async function submitQuestion(env, body) {
  try {
    const { title, content, name, email } = body;
    if (!title || !content || !name || !email) {
      return json({ error: "All fields are required" }, 400);
    }
    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedTitle = String(title).trim();
    const trimmedContent = String(content).trim();
    if (trimmedName.length > 50) {
      return json({ error: "Name must be 50 characters or less" }, 400);
    }
    if (trimmedEmail.length > 100) {
      return json({ error: "Email must be 100 characters or less" }, 400);
    }
    if (trimmedTitle.length > 200) {
      return json({ error: "Question title must be 200 characters or less" }, 400);
    }
    if (trimmedContent.length > 2e3) {
      return json({ error: "Question content must be 2000 characters or less" }, 400);
    }
    if (trimmedTitle.length < 5) {
      return json({ error: "Question title must be at least 5 characters" }, 400);
    }
    if (trimmedContent.length < 10) {
      return json({ error: "Question content must be at least 10 characters" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return json({ error: "Invalid email format" }, 400);
    }
    let pendingQ = null;
    let pendingR = null;
    try {
      pendingQ = await env.DB.prepare(`
        SELECT id FROM forum_questions WHERE email = ? AND status = 'pending' LIMIT 1
      `).bind(trimmedEmail).first();
    } catch (e) {
    }
    try {
      pendingR = await env.DB.prepare(`
        SELECT id FROM forum_replies WHERE email = ? AND status = 'pending' LIMIT 1
      `).bind(trimmedEmail).first();
    } catch (e) {
    }
    if (pendingQ || pendingR) {
      return json({
        error: "You have a pending question or reply awaiting approval. Please wait for it to be approved.",
        hasPending: true
      }, 400);
    }
    const now = Date.now();
    const baseSlug = buildForumQuestionBaseSlug(trimmedTitle, now);
    let finalSlug = baseSlug;
    let suffix = 1;
    while (true) {
      try {
        await env.DB.prepare(`
          INSERT INTO forum_questions (title, slug, content, name, email, status, reply_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
        `).bind(trimmedTitle, finalSlug, trimmedContent, trimmedName, trimmedEmail, now, now).run();
        break;
      } catch (err) {
        if (!isForumSlugUniqueConstraintError(err)) {
          throw err;
        }
        finalSlug = `${baseSlug}-${suffix++}`;
      }
    }
    notifyForumQuestion(env, {
      title: trimmedTitle,
      name: trimmedName,
      email: trimmedEmail,
      content: trimmedContent
    }).catch(() => {
    });
    return json({
      success: true,
      message: "Question submitted! It will appear after admin approval."
    });
  } catch (err) {
    console.error("submitQuestion error:", err);
    return json({ error: "Failed to submit question: " + err.message }, 500);
  }
}
__name(submitQuestion, "submitQuestion");
async function submitReply(env, body) {
  try {
    const { question_id, content, name, email } = body;
    if (!question_id || !content || !name || !email) {
      return json({ error: "All fields are required" }, 400);
    }
    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedContent = String(content).trim();
    if (trimmedName.length > 50) {
      return json({ error: "Name must be 50 characters or less" }, 400);
    }
    if (trimmedEmail.length > 100) {
      return json({ error: "Email must be 100 characters or less" }, 400);
    }
    if (trimmedContent.length > 2e3) {
      return json({ error: "Reply must be 2000 characters or less" }, 400);
    }
    if (trimmedContent.length < 5) {
      return json({ error: "Reply must be at least 5 characters" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return json({ error: "Invalid email format" }, 400);
    }
    const question = await env.DB.prepare(`
      SELECT id FROM forum_questions WHERE id = ? AND status = 'approved'
    `).bind(question_id).first();
    if (!question) {
      return json({ error: "Question not found" }, 404);
    }
    let pendingQ = null;
    let pendingR = null;
    try {
      pendingQ = await env.DB.prepare(`
        SELECT id FROM forum_questions WHERE email = ? AND status = 'pending' LIMIT 1
      `).bind(trimmedEmail).first();
    } catch (e) {
    }
    try {
      pendingR = await env.DB.prepare(`
        SELECT id FROM forum_replies WHERE email = ? AND status = 'pending' LIMIT 1
      `).bind(trimmedEmail).first();
    } catch (e) {
    }
    if (pendingQ || pendingR) {
      return json({
        error: "You have a pending question or reply awaiting approval. Please wait for it to be approved.",
        hasPending: true
      }, 400);
    }
    const now = Date.now();
    await env.DB.prepare(`
      INSERT INTO forum_replies (question_id, name, email, content, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).bind(question_id, trimmedName, trimmedEmail, trimmedContent, now).run();
    let questionTitle = "", questionAuthorName = "", questionAuthorEmail = "", questionSlug = "";
    try {
      const q = await env.DB.prepare("SELECT title, name, email, slug FROM forum_questions WHERE id = ?").bind(question_id).first();
      questionTitle = q?.title || "";
      questionAuthorName = q?.name || "";
      questionAuthorEmail = q?.email || "";
      questionSlug = q?.slug || "";
    } catch (e) {
    }
    notifyForumReply(env, {
      questionTitle,
      name: trimmedName,
      email: trimmedEmail,
      content: trimmedContent
    }).catch(() => {
    });
    if (questionAuthorEmail && questionAuthorEmail !== trimmedEmail) {
      notifyCustomerForumReply(env, {
        questionTitle,
        questionSlug,
        questionAuthorName,
        questionAuthorEmail,
        replyAuthorName: trimmedName,
        replyContent: trimmedContent
      }).catch(() => {
      });
    }
    return json({
      success: true,
      message: "Reply submitted! It will appear after admin approval."
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(submitReply, "submitReply");
async function getAdminQuestions(env, url) {
  try {
    const status = url.searchParams.get("status") || "all";
    let query = "SELECT * FROM forum_questions";
    if (status !== "all") {
      query += ` WHERE status = '${status}'`;
    }
    query += " ORDER BY created_at DESC";
    const result = await env.DB.prepare(query).all();
    const pendingCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM forum_questions WHERE status = ?"
    ).bind("pending").first();
    const approvedCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM forum_questions WHERE status = ?"
    ).bind("approved").first();
    return json({
      success: true,
      questions: result.results || [],
      counts: {
        pending: pendingCount?.count || 0,
        approved: approvedCount?.count || 0
      }
    });
  } catch (err) {
    console.error("getAdminQuestions error:", err);
    return json({ success: true, questions: [], counts: { pending: 0, approved: 0 } }, 200);
  }
}
__name(getAdminQuestions, "getAdminQuestions");
async function getAdminReplies(env, url) {
  try {
    const status = url.searchParams.get("status") || "all";
    const questionId = url.searchParams.get("question_id");
    let query = `
      SELECT r.*, q.title as question_title, q.slug as question_slug
      FROM forum_replies r
      LEFT JOIN forum_questions q ON r.question_id = q.id
    `;
    const conditions = [];
    if (status !== "all") {
      conditions.push(`r.status = '${status}'`);
    }
    if (questionId) {
      conditions.push(`r.question_id = ${questionId}`);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY r.created_at DESC";
    const result = await env.DB.prepare(query).all();
    const pendingCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM forum_replies WHERE status = ?"
    ).bind("pending").first();
    const approvedCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM forum_replies WHERE status = ?"
    ).bind("approved").first();
    return json({
      success: true,
      replies: result.results || [],
      counts: {
        pending: pendingCount?.count || 0,
        approved: approvedCount?.count || 0
      }
    });
  } catch (err) {
    console.error("getAdminReplies error:", err);
    return json({ success: true, replies: [], counts: { pending: 0, approved: 0 } }, 200);
  }
}
__name(getAdminReplies, "getAdminReplies");
async function updateQuestionStatus(env, body) {
  try {
    const { id, status } = body;
    if (!id || !status) {
      return json({ error: "ID and status required" }, 400);
    }
    await env.DB.prepare(`
      UPDATE forum_questions SET status = ?, updated_at = ? WHERE id = ?
    `).bind(status, Date.now(), id).run();
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(updateQuestionStatus, "updateQuestionStatus");
async function updateReplyStatus(env, body) {
  try {
    const { id, status } = body;
    if (!id || !status) {
      return json({ error: "ID and status required" }, 400);
    }
    const reply = await env.DB.prepare("SELECT question_id FROM forum_replies WHERE id = ?").bind(id).first();
    await env.DB.prepare(`
      UPDATE forum_replies SET status = ? WHERE id = ?
    `).bind(status, id).run();
    if (reply) {
      const countResult = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM forum_replies WHERE question_id = ? AND status = 'approved'
      `).bind(reply.question_id).first();
      await env.DB.prepare(`
        UPDATE forum_questions SET reply_count = ? WHERE id = ?
      `).bind(countResult?.count || 0, reply.question_id).run();
    }
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(updateReplyStatus, "updateReplyStatus");
async function deleteQuestion(env, id) {
  try {
    if (!id) {
      return json({ error: "Question ID required" }, 400);
    }
    await env.DB.prepare("DELETE FROM forum_replies WHERE question_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM forum_questions WHERE id = ?").bind(id).run();
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(deleteQuestion, "deleteQuestion");
async function deleteReply(env, id) {
  try {
    if (!id) {
      return json({ error: "Reply ID required" }, 400);
    }
    const reply = await env.DB.prepare("SELECT question_id FROM forum_replies WHERE id = ?").bind(id).first();
    await env.DB.prepare("DELETE FROM forum_replies WHERE id = ?").bind(id).run();
    if (reply) {
      const countResult = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM forum_replies WHERE question_id = ? AND status = 'approved'
      `).bind(reply.question_id).first();
      await env.DB.prepare(`
        UPDATE forum_questions SET reply_count = ? WHERE id = ?
      `).bind(countResult?.count || 0, reply.question_id).run();
    }
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(deleteReply, "deleteReply");
async function deleteAllForumContent(env) {
  try {
    const repliesResult = await env.DB.prepare("DELETE FROM forum_replies").run();
    const questionsResult = await env.DB.prepare("DELETE FROM forum_questions").run();
    return json({
      success: true,
      questions_deleted: questionsResult?.changes || 0,
      replies_deleted: repliesResult?.changes || 0
    });
  } catch (err) {
    return json({ error: err.message || "Failed to delete forum data" }, 500);
  }
}
__name(deleteAllForumContent, "deleteAllForumContent");
async function getForumSidebar(env, questionId) {
  try {
    const products = await env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url, sale_price, normal_price
      FROM products 
      WHERE ${buildPublicProductStatusWhere("status")}
      ORDER BY id DESC
      LIMIT 2 OFFSET ?
    `).bind(Math.max(0, questionId - 1)).all();
    const blogs = await env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url, description
      FROM blogs 
      WHERE status = 'published'
      ORDER BY id DESC
      LIMIT 2 OFFSET ?
    `).bind(Math.max(0, questionId - 1)).all();
    return json({
      success: true,
      products: products.results || [],
      blogs: blogs.results || []
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getForumSidebar, "getForumSidebar");

// src/utils/upload-helper.js
function getMimeTypeFromFilename(filename) {
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "m4v":
      return "video/x-m4v";
    case "mkv":
      return "video/x-matroska";
    case "avi":
      return "video/x-msvideo";
    case "wmv":
      return "video/x-ms-wmv";
    case "flv":
      return "video/x-flv";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "pdf":
      return "application/pdf";
    case "zip":
      return "application/zip";
    default:
      return "";
  }
}
__name(getMimeTypeFromFilename, "getMimeTypeFromFilename");
function resolveContentType(req, filename) {
  const headerContentType = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (headerContentType && headerContentType !== "application/octet-stream") {
    return headerContentType;
  }
  return getMimeTypeFromFilename(filename) || headerContentType || "application/octet-stream";
}
__name(resolveContentType, "resolveContentType");
function sanitizeFilename(filename) {
  return String(filename || "file").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").substring(0, 200);
}
__name(sanitizeFilename, "sanitizeFilename");

// src/utils/canonical.js
var CANONICAL_ALIAS_ENTRIES = Object.freeze([
  ["/index.html", "/"],
  ["/home", "/"],
  ["/home/", "/"],
  ["/page-builder", "/admin/page-builder.html"],
  ["/page-builder/", "/admin/page-builder.html"],
  ["/page-builder.html", "/admin/page-builder.html"],
  ["/landing-builder", "/admin/landing-builder.html"],
  ["/landing-builder/", "/admin/landing-builder.html"],
  ["/landing-builder.html", "/admin/landing-builder.html"],
  ["/blog/index.html", "/blog"],
  ["/blog.html", "/blog"],
  ["/forum/index.html", "/forum"],
  ["/forum.html", "/forum"],
  ["/terms/", "/terms"],
  ["/terms/index.html", "/terms"],
  ["/terms.html", "/terms"],
  ["/products/index.html", "/products"],
  ["/products.html", "/products"],
  ["/products-grid", "/products"],
  ["/products-grid/", "/products"],
  ["/products-grid.html", "/products"],
  ["/checkout/", "/checkout"],
  ["/checkout/index.html", "/checkout"],
  ["/success.html", "/success"],
  ["/buyer-order/", "/buyer-order"],
  ["/buyer-order.html", "/buyer-order"],
  ["/order-detail/", "/order-detail"],
  ["/order-detail.html", "/order-detail"],
  ["/order-success", "/success"],
  ["/order-success.html", "/success"]
]);
var NON_REDIRECT_ALIAS_PATHS = /* @__PURE__ */ new Set([
  "/checkout/",
  "/checkout/index.html",
  "/buyer-order/",
  "/buyer-order.html",
  "/order-detail/",
  "/order-detail.html"
]);
var SAME_SITE_HOSTS = /* @__PURE__ */ new Set([
  "prankwish.com",
  "www.prankwish.com"
]);
var CANONICAL_ALIAS_MAP = new Map(CANONICAL_ALIAS_ENTRIES);
function collapsePathname(pathname) {
  let path = String(pathname || "/").trim() || "/";
  path = path.replace(/\/+/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  return path || "/";
}
__name(collapsePathname, "collapsePathname");
function resolveBaseOrigin(baseOrigin) {
  const fallback = "https://prankwish.com";
  try {
    return new URL(String(baseOrigin || fallback)).origin;
  } catch (_) {
    return fallback;
  }
}
__name(resolveBaseOrigin, "resolveBaseOrigin");
function isInternalHost(hostname, baseHostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host) return false;
  if (host === String(baseHostname || "").trim().toLowerCase()) return true;
  return SAME_SITE_HOSTS.has(host);
}
__name(isInternalHost, "isInternalHost");
function normalizeComponentList(entries, baseOrigin) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const next = { ...entry };
    if (typeof next.code === "string" && next.code) {
      next.code = rewriteLegacyInternalLinksInHtml(next.code, baseOrigin);
    }
    return next;
  });
}
__name(normalizeComponentList, "normalizeComponentList");
function normalizeCanonicalPath(pathname) {
  let path = collapsePathname(pathname);
  path = CANONICAL_ALIAS_MAP.get(path) || path;
  if (path.length > 1 && path.endsWith("/") && !path.startsWith("/admin/") && !path.startsWith("/api/")) {
    path = path.slice(0, -1);
  }
  return path || "/";
}
__name(normalizeCanonicalPath, "normalizeCanonicalPath");
function getCanonicalRedirectPath(pathname) {
  const raw = collapsePathname(pathname);
  if (raw === "/admin/" || raw === "/api/") return null;
  if (raw.startsWith("/admin/") || raw.startsWith("/api/")) return null;
  if (NON_REDIRECT_ALIAS_PATHS.has(raw)) return null;
  const normalized = normalizeCanonicalPath(raw);
  return normalized !== raw ? normalized : null;
}
__name(getCanonicalRedirectPath, "getCanonicalRedirectPath");
function rewriteLegacyInternalLinksInHtml(html, baseOrigin = "https://prankwish.com") {
  const source = String(html || "");
  if (!source) return source;
  const base = new URL(resolveBaseOrigin(baseOrigin));
  const baseHostLower = base.hostname.toLowerCase();
  return source.replace(/\b(href|action)\s*=\s*(["'])(.*?)\2/gi, (match, attr, quote, value) => {
    if (!value || value.startsWith("#") || value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("javascript:") || value.startsWith("data:") || value.startsWith("//")) {
      return match;
    }
    const trimmed = value.trim();
    const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
    const isRootRelative = trimmed.startsWith("/");
    if (!isAbsolute && !isRootRelative) return match;
    let parsed;
    try {
      parsed = new URL(trimmed, base);
    } catch (_) {
      return match;
    }
    if (isAbsolute && !isInternalHost(parsed.hostname, baseHostLower)) {
      return match;
    }
    const normalizedPath = normalizeCanonicalPath(parsed.pathname);
    const needsHostNormalization = isAbsolute && (parsed.protocol !== base.protocol || parsed.hostname.toLowerCase() !== baseHostLower);
    const needsPathNormalization = normalizedPath !== parsed.pathname;
    if (!needsHostNormalization && !needsPathNormalization) return match;
    parsed.protocol = base.protocol;
    parsed.host = base.host;
    parsed.pathname = normalizedPath;
    const normalized = isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return `${attr}=${quote}${normalized}${quote}`;
  });
}
__name(rewriteLegacyInternalLinksInHtml, "rewriteLegacyInternalLinksInHtml");
function normalizeSiteComponentsPayload(components, baseOrigin = "https://prankwish.com") {
  if (!components || typeof components !== "object") return components;
  return {
    ...components,
    headers: normalizeComponentList(components.headers, baseOrigin),
    footers: normalizeComponentList(components.footers, baseOrigin)
  };
}
__name(normalizeSiteComponentsPayload, "normalizeSiteComponentsPayload");

// src/controllers/admin.js
var purgeVersionChecked = false;
async function verifyTurnstileToken(env, token, remoteIp) {
  if (!token) {
    console.log("Turnstile token missing");
    return false;
  }
  const secretKey = env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.log("Turnstile secret key not configured");
    return env.NODE_ENV === "development" || env.ENVIRONMENT === "development";
  }
  try {
    const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        token,
        remoteip: remoteIp
      })
    });
    const result = await response.json();
    if (result.success) {
      console.log("Turnstile verification successful");
      return true;
    } else {
      console.log("Turnstile verification failed:", result.error_codes);
      return false;
    }
  } catch (e) {
    console.error("Turnstile verification error:", e);
    return false;
  }
}
__name(verifyTurnstileToken, "verifyTurnstileToken");
async function validateUploadRequest(env, req, url) {
  const bypassToken = url.searchParams.get("adminToken");
  if (bypassToken && env.ADMIN_SESSION_SECRET) {
    try {
      const [tsStr, sig] = bypassToken.split(".");
      if (tsStr && sig) {
        const ts = Number(tsStr);
        const ageSec = Math.floor((Date.now() - ts) / 1e3);
        if (ageSec >= 0 && ageSec < 3600) {
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            enc.encode(env.ADMIN_SESSION_SECRET),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(tsStr));
          const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sigBytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
          if (expectedSig === sig) {
            return null;
          }
        }
      }
    } catch (e) {
      console.log("Admin bypass verification failed:", e.message);
    }
  }
  const sessionId = url.searchParams.get("sessionId");
  if (sessionId) {
    const isWhitelistedPattern = (
      // instant-upload.js: upload_1731234567_abc123def
      sessionId.startsWith("upload_") || // product-form.js: 1731234567 (timestamp only)
      /^\d{10,14}$/.test(sessionId) || // dashboard-settings.js: branding-1731234567
      sessionId.startsWith("branding-") || // Admin temporary uploads
      sessionId.startsWith("admin-") || // Chat widget temporary sessions
      sessionId.startsWith("chat_") || // Generic temporary sessions
      sessionId.startsWith("temp_")
    );
    if (isWhitelistedPattern) {
      console.log("Upload allowed: whitelisted frontend session pattern:", sessionId.substring(0, 20) + "...");
      return null;
    }
    try {
      const session = await env.DB.prepare(
        "SELECT id, status FROM checkout_sessions WHERE checkout_id = ?"
      ).bind(sessionId).first();
      if (session && (session.status === "pending" || session.status === "completed")) {
        return null;
      }
    } catch (e) {
      console.log("Session validation failed:", e.message);
    }
  }
  const turnstileToken = url.searchParams.get("cf-turnstile-response") || req.headers.get("X-Turnstile-Token") || url.searchParams.get("turnstile_token");
  if (!turnstileToken) {
    const secretKey = env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.log("No Turnstile secret key configured, allowing upload without captcha");
      return null;
    }
    console.log("Upload rejected: No Turnstile token provided");
    return json({
      error: "Captcha validation failed. Please refresh and try again.",
      code: "CAPTCHA_REQUIRED"
    }, 403);
  }
  const clientIp = req.headers.get("CF-Connecting-IP") || "unknown";
  const isValid = await verifyTurnstileToken(env, turnstileToken, clientIp);
  if (!isValid) {
    console.log("Upload rejected: Invalid Turnstile captcha");
    return json({
      error: "Captcha validation failed. Please refresh and try again.",
      code: "CAPTCHA_INVALID"
    }, 403);
  }
  return null;
}
__name(validateUploadRequest, "validateUploadRequest");
function getDebugInfo(env) {
  return json({
    status: "running",
    bindings: {
      DB: !!env.DB,
      R2_BUCKET: !!env.R2_BUCKET,
      PRODUCT_MEDIA: !!env.PRODUCT_MEDIA,
      ASSETS: !!env.ASSETS
    },
    version: VERSION,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(getDebugInfo, "getDebugInfo");
function getArchiveCredentials(env) {
  if (!env.ARCHIVE_ACCESS_KEY || !env.ARCHIVE_SECRET_KEY) {
    return json({ error: "Archive.org credentials not configured" }, 500);
  }
  return json({
    accessKey: env.ARCHIVE_ACCESS_KEY,
    secretKey: env.ARCHIVE_SECRET_KEY,
    bucket: "wishesu_uploads"
    // Default bucket or dynamic
  });
}
__name(getArchiveCredentials, "getArchiveCredentials");
async function purgeCache(env) {
  try {
    await purgeKVCache(env);
    const zoneId = env.CF_ZONE_ID;
    const token = env.CF_API_TOKEN;
    if (!zoneId || !token) return json({ error: "Cloudflare credentials not configured" }, 500);
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ purge_everything: true })
    });
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(purgeCache, "purgeCache");
async function purgeKVCache(env, path = null) {
  if (!env.PAGE_CACHE) return;
  try {
    if (path) {
      await env.PAGE_CACHE.delete(`page_html:${path}`);
    } else {
      const prefixes = ["page_html:", "api_cache:"];
      for (const prefix of prefixes) {
        let list;
        let cursor;
        do {
          list = await env.PAGE_CACHE.list({ prefix, cursor });
          if (list && list.keys) {
            for (const key of list.keys) {
              await env.PAGE_CACHE.delete(key.name);
            }
          }
          cursor = list && !list.list_complete ? list.cursor : null;
        } while (cursor);
      }
    }
  } catch (e) {
    console.error("KV Cache purge error:", e);
  }
}
__name(purgeKVCache, "purgeKVCache");
async function maybePurgeCache(env, initDB2) {
  if (purgeVersionChecked) return;
  try {
    if (env.DB) await initDB2(env);
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("last_purge_version").first();
    const lastVersion = row && row.value ? row.value.toString() : null;
    const currentVersion = VERSION.toString();
    if (lastVersion === currentVersion) {
      purgeVersionChecked = true;
      return;
    }
    const zoneId = env.CF_ZONE_ID;
    const token = env.CF_API_TOKEN;
    const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
    await fetch(purgeUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ purge_everything: true })
    });
    await env.DB.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
    ).bind("last_purge_version", currentVersion).run();
    purgeVersionChecked = true;
  } catch (e) {
    console.error("maybePurgeCache error:", e);
  }
}
__name(maybePurgeCache, "maybePurgeCache");
async function getWhopSettings(env) {
  try {
    const gateway = await env.DB.prepare(`
      SELECT whop_product_id, whop_theme, webhook_secret, whop_api_key
      FROM payment_gateways
      WHERE gateway_type = 'whop'
      ORDER BY is_enabled DESC, id DESC
      LIMIT 1
    `).first();
    if (gateway) {
      return json({
        settings: {
          default_product_id: gateway.whop_product_id || "",
          product_id: gateway.whop_product_id || "",
          theme: gateway.whop_theme || "light",
          webhook_secret: gateway.webhook_secret || "",
          api_key: env.WHOP_API_KEY || gateway.whop_api_key ? "********" : ""
        }
      });
    }
  } catch (e) {
    console.log("Failed to read Whop settings from payment_gateways:", e.message);
  }
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
    if (row && row.value) {
      const settings = JSON.parse(row.value);
      return json({ settings });
    }
  } catch (e) {
    console.log("Failed to read legacy Whop settings:", e.message);
  }
  return json({ settings: {} });
}
__name(getWhopSettings, "getWhopSettings");
async function saveWhopSettings(env, body) {
  const productId = (body.default_product_id || body.product_id || "").trim();
  const theme = (body.theme || "light").trim();
  const webhookSecret = (body.webhook_secret || "").trim();
  let apiKey = (body.api_key || "").trim();
  if (apiKey === "********") {
    apiKey = "";
  }
  try {
    const existing = await env.DB.prepare(`
      SELECT id, whop_api_key
      FROM payment_gateways
      WHERE gateway_type = 'whop'
      ORDER BY id DESC
      LIMIT 1
    `).first();
    if (existing) {
      const finalApiKey = apiKey || existing.whop_api_key || "";
      await env.DB.prepare(`
        UPDATE payment_gateways
        SET whop_product_id = ?,
            whop_theme = ?,
            webhook_secret = ?,
            whop_api_key = ?,
            is_enabled = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(productId, theme, webhookSecret, finalApiKey, existing.id).run();
      await env.DB.prepare(`
        UPDATE payment_gateways
        SET is_enabled = CASE WHEN id = ? THEN 1 ELSE 0 END
        WHERE gateway_type = 'whop'
      `).bind(existing.id).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO payment_gateways
        (name, gateway_type, webhook_url, webhook_secret, custom_code, is_enabled, whop_product_id, whop_api_key, whop_theme)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        "Whop",
        "whop",
        "/api/whop/webhook",
        webhookSecret,
        "",
        1,
        productId,
        apiKey,
        theme
      ).run();
    }
  } catch (e) {
    console.log("Failed to sync Whop settings to payment_gateways:", e.message);
  }
  let existingLegacy = {};
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
    if (row?.value) {
      existingLegacy = JSON.parse(row.value);
    }
  } catch (e) {
  }
  const mergedLegacy = {
    ...existingLegacy,
    ...body,
    default_product_id: productId,
    product_id: productId,
    theme,
    webhook_secret: webhookSecret
  };
  if (apiKey) {
    mergedLegacy.api_key = apiKey;
  }
  const value = JSON.stringify(mergedLegacy);
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("whop", value).run();
  return json({ success: true });
}
__name(saveWhopSettings, "saveWhopSettings");
async function uploadTempFile(env, req, url) {
  try {
    if (!env.R2_BUCKET) {
      console.error("R2_BUCKET not configured");
      return json({ error: "R2 storage not configured" }, 500);
    }
    const validationError = await validateUploadRequest(env, req, url);
    if (validationError) {
      return validationError;
    }
    const sessionId = url.searchParams.get("sessionId");
    const filename = url.searchParams.get("filename");
    if (!sessionId || !filename) {
      console.error("Missing sessionId or filename");
      return json({ error: "sessionId and filename required" }, 400);
    }
    console.log("Uploading file:", filename, "for session:", sessionId);
    const contentLength = req.headers.get("content-length");
    const fileSize = contentLength ? parseInt(contentLength, 10) : null;
    const isVideo = filename.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/);
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeLabel = isVideo ? "500MB" : "10MB";
    if (fileSize !== null && fileSize > maxSize) {
      console.error("File too large:", fileSize, "bytes (max", maxSizeLabel, ")");
      return json({
        error: `File too large. Maximum file size is ${maxSizeLabel} for ${isVideo ? "videos" : "files"}.`,
        fileSize,
        maxSize,
        fileType: isVideo ? "video" : "file"
      }, 400);
    }
    const SIZE_THRESHOLD = 50 * 1024 * 1024;
    let fileData;
    let actualSize;
    if (fileSize !== null && fileSize > SIZE_THRESHOLD) {
      console.log("Large file detected, streaming directly to R2...");
      fileData = req.body;
      actualSize = fileSize;
    } else {
      const buf = await req.arrayBuffer();
      actualSize = buf.byteLength;
      if (actualSize > maxSize) {
        console.error("File too large:", actualSize, "bytes (max", maxSizeLabel, ")");
        return json({
          error: `File too large. Maximum file size is ${maxSizeLabel} for ${isVideo ? "videos" : "files"}.`,
          fileSize: actualSize,
          maxSize,
          fileType: isVideo ? "video" : "file"
        }, 400);
      }
      if (!buf || actualSize === 0) {
        console.error("Empty file buffer");
        return json({ error: "Empty file - please select a valid file" }, 400);
      }
      fileData = buf;
      console.log("File size:", (actualSize / 1024 / 1024).toFixed(2), "MB");
    }
    const key = `temp/${sessionId}/${filename}`;
    await env.R2_BUCKET.put(key, fileData, {
      httpMetadata: { contentType: req.headers.get("content-type") || "application/octet-stream" }
    });
    console.log("File uploaded successfully:", key);
    return json({ success: true, tempUrl: `r2://${key}` });
  } catch (err) {
    console.error("Upload error:", err);
    return json({
      error: "Upload failed: " + err.message,
      details: err.stack
    }, 500);
  }
}
__name(uploadTempFile, "uploadTempFile");
async function getR2File(env, key) {
  if (!env.R2_BUCKET) return json({ error: "R2 not configured" }, 500);
  if (!key) return json({ error: "key required" }, 400);
  const obj = await env.R2_BUCKET.get(key);
  if (!obj) return json({ error: "File not found" }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
__name(getR2File, "getR2File");
async function uploadCustomerFile(env, req, url) {
  try {
    if (!env.ARCHIVE_ACCESS_KEY || !env.ARCHIVE_SECRET_KEY) {
      console.error("Archive.org credentials not configured");
      return json({ error: "Archive.org credentials not configured" }, 500);
    }
    const validationError = await validateUploadRequest(env, req, url);
    if (validationError) {
      return validationError;
    }
    const itemId = (url.searchParams.get("itemId") || "").replace(/[^a-zA-Z0-9_.-]/g, "-");
    const filename = (url.searchParams.get("filename") || "").replace(/[^a-zA-Z0-9_.-]/g, "-");
    const originalFilename = url.searchParams.get("originalFilename");
    if (!itemId || !filename) {
      console.error("Missing itemId or filename");
      return json({ error: "itemId and filename required" }, 400);
    }
    console.log("Starting direct Archive.org upload:", filename, "Item:", itemId);
    const contentLength = req.headers.get("content-length");
    const fileSize = contentLength ? parseInt(contentLength, 10) : null;
    const videoExtensions = /\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/i;
    const isVideo = videoExtensions.test(filename);
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeLabel = isVideo ? "500MB" : "10MB";
    if (fileSize !== null && fileSize > maxSize) {
      console.error("File too large:", fileSize, "bytes (max", maxSizeLabel, ")");
      return json({
        error: `File too large. Maximum file size is ${maxSizeLabel} for ${isVideo ? "videos" : "files"}.`,
        fileSize,
        maxSize,
        fileType: isVideo ? "video" : "file"
      }, 400);
    }
    const contentType = resolveContentType(req, filename);
    const isVideoUpload = contentType.startsWith("video/");
    const orderIdFromQuery = url.searchParams.get("orderId");
    let resolvedOrderId = orderIdFromQuery;
    if (!resolvedOrderId) {
      const match = itemId.match(/^delivery_(.+?)_\d+$/);
      if (match) {
        resolvedOrderId = match[1];
      }
    }
    let archiveDescription = "";
    if (resolvedOrderId) {
      try {
        const orderRow = await env.DB.prepare(
          "SELECT o.order_id, p.title AS product_title, p.description AS product_description FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_id = ?"
        ).bind(resolvedOrderId).first();
        if (orderRow) {
          const productTitle = orderRow.product_title || "";
          const productDescription = orderRow.product_description || "";
          archiveDescription = productDescription ? productTitle ? `${productTitle} - ${productDescription}` : productDescription : `Order #${orderRow.order_id} - ${productTitle || "Video Delivery"}`;
        } else {
          archiveDescription = `Order #${resolvedOrderId} video delivery`;
        }
      } catch (dbErr) {
        console.warn("Could not fetch order details:", dbErr);
        archiveDescription = `Order #${resolvedOrderId} video delivery`;
      }
    } else {
      archiveDescription = `${isVideoUpload ? "Video" : "File"} uploaded via order delivery system`;
    }
    const archiveHeaders = {
      Authorization: `LOW ${env.ARCHIVE_ACCESS_KEY}:${env.ARCHIVE_SECRET_KEY}`,
      "Content-Type": contentType,
      "x-archive-auto-make-bucket": "1",
      "x-archive-meta-mediatype": isVideoUpload ? "movies" : "data",
      "x-archive-meta-collection": isVideoUpload ? "opensource_movies" : "opensource",
      "x-archive-meta-title": normalizeArchiveMetaValue(originalFilename || filename),
      "x-archive-meta-description": normalizeArchiveMetaValue(archiveDescription),
      "x-archive-meta-subject": "video; delivery",
      "x-archive-meta-language": "eng"
    };
    console.log("Uploading directly to Archive.org...");
    const archiveUrl = `https://s3.us.archive.org/${itemId}/${filename}`;
    let uploadBody;
    if (fileSize !== null && fileSize > 50 * 1024 * 1024) {
      uploadBody = req.body;
    } else {
      uploadBody = await req.arrayBuffer();
    }
    let archiveResp;
    try {
      archiveResp = await fetch(archiveUrl, {
        method: "PUT",
        headers: archiveHeaders,
        body: uploadBody
      });
      if (!archiveResp.ok) {
        const errorText = await archiveResp.text().catch(() => "Unknown error");
        console.error("Archive.org upload failed:", archiveResp.status, errorText);
        return json({
          error: "Archive.org upload failed",
          status: archiveResp.status,
          details: errorText,
          stage: "archive-upload"
        }, 502);
      }
      const publicUrl = `https://archive.org/download/${itemId}/${filename}`;
      return json({ success: true, url: publicUrl, archiveUrl });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(uploadCustomerFile, "uploadCustomerFile");
async function uploadEncryptedFile(env, req, url) {
  return uploadTempFile(env, req, url);
}
__name(uploadEncryptedFile, "uploadEncryptedFile");
async function handleSecureDownload(env, orderId, baseUrl) {
  if (!orderId) return new Response("Order ID required", { status: 400 });
  const order = await env.DB.prepare(
    "SELECT archive_url, delivered_video_url, delivered_video_metadata FROM orders WHERE order_id = ?"
  ).bind(orderId).first();
  if (!order) {
    return new Response("File not found", { status: 404 });
  }
  let metadata = {};
  try {
    if (order.delivered_video_metadata) {
      const parsed = JSON.parse(order.delivered_video_metadata);
      if (parsed && typeof parsed === "object") metadata = parsed;
    }
  } catch (_) {
    metadata = {};
  }
  const preferredDownloadUrl = String(metadata.downloadUrl || metadata.buyerDownloadUrl || "").trim();
  const sourceUrl = String(
    preferredDownloadUrl || order.delivered_video_url || order.archive_url || ""
  ).trim();
  if (!sourceUrl) {
    return new Response("Download link expired or not found", { status: 404 });
  }
  const lowered = sourceUrl.toLowerCase();
  const isStreamOnly = lowered.includes("youtube.com") || lowered.includes("youtu.be") || lowered.includes("vimeo.com") || lowered.includes("iframe.mediadelivery.net/embed/") || lowered.includes("video.bunnycdn.com/play/") || lowered.includes("archive.org/details/") && !lowered.includes("/download/");
  if (isStreamOnly) {
    return new Response("Download is not available for this delivery link.", { status: 400 });
  }
  let fileResp;
  try {
    fileResp = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
  } catch (e) {
    console.error("Fetch error:", e.message);
    return new Response("Failed to fetch file: " + e.message, { status: 502 });
  }
  if (!fileResp.ok) {
    console.log("Proxy failed (" + fileResp.status + ") for source: " + sourceUrl);
    return new Response("File not available right now", { status: 404 });
  }
  const urlObj = new URL(sourceUrl, baseUrl || "https://prankwish.com");
  let filename = urlObj.pathname.split("/").pop() || "video.mp4";
  try {
    filename = decodeURIComponent(filename);
  } catch (_) {
  }
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!filename.includes(".")) {
    const ext = getExtensionFromContentType(fileResp.headers.get("content-type") || "");
    filename += ext;
  }
  let contentType = fileResp.headers.get("content-type") || "";
  contentType = contentType.split(";")[0].trim() || getMimeTypeFromFilename(filename) || "application/octet-stream";
  const headers = new Headers({ ...CORS });
  const contentLength = fileResp.headers.get("content-length");
  const hasBody = fileResp.body;
  if (hasBody) {
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    return new Response(fileResp.body, {
      status: 200,
      headers
    });
  }
  return new Response("File stream unavailable", { status: 404 });
}
__name(handleSecureDownload, "handleSecureDownload");
function getExtensionFromContentType(contentType) {
  const mimeToExt = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/x-matroska": ".mkv",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "application/zip": ".zip"
  };
  return mimeToExt[contentType] || ".mp4";
}
__name(getExtensionFromContentType, "getExtensionFromContentType");
var brandingCache = null;
var brandingCacheTime = 0;
var BRANDING_CACHE_TTL = 3e5;
async function getBrandingSettings(env) {
  const kvKey = "api_cache:settings:branding";
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return json(JSON.parse(cached));
      }
    } catch (e) {
    }
  }
  const now = Date.now();
  if (brandingCache && now - brandingCacheTime < BRANDING_CACHE_TTL) {
    const resp = { success: true, branding: brandingCache };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(resp), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return json(resp);
  }
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("site_branding").first();
    if (row?.value) {
      brandingCache = JSON.parse(row.value);
      brandingCacheTime = now;
      const resp2 = { success: true, branding: brandingCache };
      if (env.PAGE_CACHE) {
        try {
          await env.PAGE_CACHE.put(kvKey, JSON.stringify(resp2), { expirationTtl: 86400 * 7 });
        } catch (e) {
        }
      }
      return json(resp2);
    }
    brandingCache = { logo_url: "", favicon_url: "" };
    brandingCacheTime = now;
    const resp = { success: true, branding: brandingCache };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(resp), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return json(resp);
  } catch (e) {
    console.error("Get branding error:", e);
    return json({ success: true, branding: { logo_url: "", favicon_url: "" } });
  }
}
__name(getBrandingSettings, "getBrandingSettings");
async function saveBrandingSettings(env, body) {
  try {
    const branding = {
      logo_url: (body.logo_url || "").trim(),
      favicon_url: (body.favicon_url || "").trim(),
      updated_at: Date.now()
    };
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("site_branding", JSON.stringify(branding)).run();
    brandingCache = branding;
    brandingCacheTime = Date.now();
    return json({ success: true });
  } catch (e) {
    console.error("Save branding error:", e);
    return json({ error: e.message }, 500);
  }
}
__name(saveBrandingSettings, "saveBrandingSettings");
var cobaltCache = {};
var COBALT_CACHE_TTL = 6e4;
async function getCobaltSettings(env) {
  const now = Date.now();
  if (cobaltCache.value && now - cobaltCache.time < COBALT_CACHE_TTL) {
    return json({ success: true, settings: { cobalt_url: cobaltCache.value } });
  }
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("cobalt_url").first();
    const value = row?.value || "https://api.cobalt.tools";
    cobaltCache.value = value;
    cobaltCache.time = now;
    return json({ success: true, settings: { cobalt_url: value } });
  } catch (e) {
    console.error("Get cobalt settings error:", e);
    return json({ success: true, settings: { cobalt_url: "https://api.cobalt.tools" } });
  }
}
__name(getCobaltSettings, "getCobaltSettings");
async function saveCobaltSettings(env, body) {
  try {
    const value = (body.cobalt_url || "https://api.cobalt.tools").trim();
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("cobalt_url", value).run();
    cobaltCache.value = value;
    cobaltCache.time = Date.now();
    return json({ success: true });
  } catch (e) {
    console.error("Save cobalt settings error:", e);
    return json({ error: e.message }, 500);
  }
}
__name(saveCobaltSettings, "saveCobaltSettings");
function sanitizePublicSiteComponents(components) {
  if (!components || typeof components !== "object") return null;
  return {
    headers: Array.isArray(components.headers) ? components.headers : [],
    footers: Array.isArray(components.footers) ? components.footers : [],
    defaultHeaderId: components.defaultHeaderId ?? null,
    defaultFooterId: components.defaultFooterId ?? null,
    excludedPages: Array.isArray(components.excludedPages) ? components.excludedPages : [],
    settings: components.settings && typeof components.settings === "object" ? components.settings : {
      enableGlobalHeader: true,
      enableGlobalFooter: true
    }
  };
}
__name(sanitizePublicSiteComponents, "sanitizePublicSiteComponents");
async function getSiteComponents(env, options = {}) {
  const publicView = options.publicView === true;
  const kvKey = `api_cache:settings:components:${publicView}`;
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return json(JSON.parse(cached));
      }
    } catch (e) {
    }
  }
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("site_components").first();
    if (row && row.value) {
      try {
        const components = normalizeSiteComponentsPayload(JSON.parse(row.value));
        const resp2 = {
          components: publicView ? sanitizePublicSiteComponents(components) : components
        };
        if (env.PAGE_CACHE) {
          try {
            await env.PAGE_CACHE.put(kvKey, JSON.stringify(resp2), { expirationTtl: 86400 * 7 });
          } catch (e) {
          }
        }
        return json(resp2);
      } catch (e) {
        return json({ components: null });
      }
    }
    const resp = { components: null };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(resp), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return json(resp);
  } catch (e) {
    console.error("Failed to get components:", e);
    return json({ components: null, error: e.message });
  }
}
__name(getSiteComponents, "getSiteComponents");
async function saveSiteComponents(env, body) {
  try {
    const dataToSave = normalizeSiteComponentsPayload(body.data || body);
    const value = JSON.stringify(dataToSave);
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("site_components", value).run();
    try {
      const zoneId = env.CF_ZONE_ID;
      const token = env.CF_API_TOKEN;
      if (zoneId && token) {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ purge_everything: true })
        });
      }
    } catch (e) {
      console.error("Cache purge failed", e);
    }
    return json({ success: true });
  } catch (e) {
    console.error("Failed to save components:", e);
    return json({ error: e.message }, 500);
  }
}
__name(saveSiteComponents, "saveSiteComponents");

// src/controllers/seo-minimal.js
var cache = null;
var cacheTime3 = 0;
var TTL = 3 * 60 * 1e3;
var DEFAULT = {
  site_url: "",
  site_title: "",
  site_description: "",
  sitemap_enabled: 1,
  robots_enabled: 1,
  og_enabled: 1,
  og_image: ""
};
function toAbsoluteUrl(base, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  return `${base}/${raw}`;
}
__name(toAbsoluteUrl, "toAbsoluteUrl");
function escapeXml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
__name(escapeXml, "escapeXml");
function toSitemapDate(value) {
  if (value == null || value === "") return void 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return void 0;
  return date.toISOString().split("T")[0];
}
__name(toSitemapDate, "toSitemapDate");
async function getSettings(env) {
  const kvKey = "api_cache:settings:seo_minimal";
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
    }
  }
  const now = Date.now();
  if (cache && now - cacheTime3 < TTL) {
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(cache), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return cache;
  }
  try {
    const row = await env.DB.prepare("SELECT * FROM seo_minimal WHERE id = 1").first();
    cache = row || DEFAULT;
    cacheTime3 = now;
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(cache), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return cache;
  } catch (e) {
    return DEFAULT;
  }
}
__name(getSettings, "getSettings");
async function getMinimalSEOSettings(env) {
  try {
    const settings = await getSettings(env);
    return json({ success: true, settings });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getMinimalSEOSettings, "getMinimalSEOSettings");
async function saveMinimalSEOSettings(env, body) {
  try {
    const s = {
      site_url: (body.site_url || "").trim(),
      site_title: (body.site_title || "").trim(),
      site_description: (body.site_description || "").trim().substring(0, 160),
      sitemap_enabled: body.sitemap_enabled ? 1 : 0,
      robots_enabled: body.robots_enabled ? 1 : 0,
      og_enabled: body.og_enabled ? 1 : 0,
      og_image: (body.og_image || "").trim()
    };
    if (!s.site_url || !s.site_title || !s.site_description) {
      return json({ error: "Site URL, Title, and Description are required" }, 400);
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
    cache = null;
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(saveMinimalSEOSettings, "saveMinimalSEOSettings");
async function buildMinimalRobotsTxt(env, req) {
  const s = await getSettings(env);
  if (!s.robots_enabled) {
    return "User-agent: *\nAllow: /";
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
Disallow: /checkout
Disallow: /success

# Sitemap
Sitemap: ${sitemap}/sitemap.xml
`.trim();
}
__name(buildMinimalRobotsTxt, "buildMinimalRobotsTxt");
async function buildMinimalSitemapXml(env, req) {
  if (env.DB) {
    try {
      await initDB(env);
    } catch (_) {
    }
  }
  const s = await getSettings(env);
  if (!s.sitemap_enabled) {
    return {
      body: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      contentType: "application/xml"
    };
  }
  const url = new URL(req.url);
  const base = String(s.site_url || url.origin).replace(/\/+$/, "");
  const urls = [];
  urls.push({
    loc: `${base}/`,
    lastmod: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    changefreq: "daily",
    priority: 1
  });
  if (env.DB) try {
    const productColumns = await getProductTableColumns(env);
    const productSelect = ["id", "title", "slug", "seo_canonical", "status"];
    if (productColumns.has("updated_at")) productSelect.push("updated_at");
    if (productColumns.has("created_at")) productSelect.push("created_at");
    const productsQuery = await env.DB.prepare(`
      SELECT ${productSelect.join(", ")}
      FROM products
      WHERE ${buildPublicProductStatusWhere("status")}
      ORDER BY id DESC
      LIMIT 10000
    `).all();
    const productRows = productsQuery.results || [];
    for (const p of productRows) {
      const loc = p.seo_canonical && String(p.seo_canonical).trim() ? toAbsoluteUrl(base, p.seo_canonical) : `${base}${canonicalProductPath({
        id: p.id,
        slug: p.slug,
        title: p.title || `product-${p.id}`
      })}`;
      const lastmod = toSitemapDate(p.updated_at || p.created_at);
      urls.push({
        loc,
        lastmod,
        changefreq: "weekly",
        priority: 0.8
      });
    }
  } catch (e) {
    console.warn("Sitemap products query failed:", e);
  }
  try {
    const blogs = await env.DB.prepare(
      "SELECT slug, updated_at, created_at FROM blogs WHERE status = ? ORDER BY created_at DESC LIMIT 10000"
    ).bind("published").all();
    for (const b of blogs.results || []) {
      const lastmod = b.updated_at || b.created_at ? toSitemapDate(b.updated_at || b.created_at) : void 0;
      urls.push({
        loc: `${base}/blog/${b.slug}`,
        lastmod,
        changefreq: "weekly",
        priority: 0.7
      });
    }
  } catch (e) {
  }
  try {
    const pages = await env.DB.prepare(
      "SELECT slug, updated_at, created_at FROM pages WHERE status = 'published' AND page_type = 'custom' AND slug IS NOT NULL ORDER BY created_at DESC LIMIT 10000"
    ).all();
    for (const p of pages.results || []) {
      const lastmod = p.updated_at || p.created_at ? toSitemapDate(p.updated_at || p.created_at) : void 0;
      urls.push({
        loc: `${base}/${p.slug}`,
        lastmod,
        changefreq: "monthly",
        priority: 0.6
      });
    }
  } catch (e) {
  }
  try {
    const questions = await env.DB.prepare(
      "SELECT slug, updated_at, created_at FROM forum_questions WHERE status = 'approved' AND slug IS NOT NULL ORDER BY created_at DESC LIMIT 10000"
    ).all();
    for (const q of questions.results || []) {
      const lastmod = q.updated_at || q.created_at ? toSitemapDate(q.updated_at || q.created_at) : void 0;
      urls.push({
        loc: `${base}/forum/${q.slug}`,
        lastmod,
        changefreq: "weekly",
        priority: 0.5
      });
    }
  } catch (e) {
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  urls.push(
    { loc: `${base}/products`, lastmod: today, changefreq: "daily", priority: 0.9 },
    { loc: `${base}/blog`, lastmod: today, changefreq: "daily", priority: 0.8 },
    { loc: `${base}/forum`, lastmod: today, changefreq: "daily", priority: 0.7 }
  );
  const seenLocs = /* @__PURE__ */ new Set();
  const dedupedUrls = [];
  for (const u of urls) {
    const normalizedLoc = u.loc.replace(/\/+$/, "") || "/";
    if (!seenLocs.has(normalizedLoc)) {
      seenLocs.add(normalizedLoc);
      dedupedUrls.push(u);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${dedupedUrls.slice(0, 5e4).map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
  return {
    body: xml,
    contentType: "application/xml"
  };
}
__name(buildMinimalSitemapXml, "buildMinimalSitemapXml");

// src/controllers/analytics.js
var analyticsCache = null;
var analyticsCacheTime = 0;
var ANALYTICS_CACHE_TTL = 3 * 60 * 1e3;
var DEFAULT_ANALYTICS_SETTINGS = {
  ga_id: "",
  google_verify: "",
  bing_verify: "",
  fb_pixel_id: "",
  /**
   * Custom analytics or tracking script provided by the admin. This can contain
   * any HTML/JS snippet (e.g. full Google Analytics script, Hotjar, etc.).
   * It will be injected as-is into the <head> of every public page.
   */
  custom_script: ""
};
async function getAnalyticsSettings(env) {
  const now = Date.now();
  if (analyticsCache && now - analyticsCacheTime < ANALYTICS_CACHE_TTL) {
    return analyticsCache;
  }
  try {
    const row = await env.DB.prepare("SELECT * FROM analytics_settings WHERE id = 1").first();
    analyticsCache = { ...DEFAULT_ANALYTICS_SETTINGS, ...row || {} };
    analyticsCacheTime = now;
    return analyticsCache;
  } catch (e) {
    return DEFAULT_ANALYTICS_SETTINGS;
  }
}
__name(getAnalyticsSettings, "getAnalyticsSettings");
async function getAnalyticsSettingsApi(env) {
  try {
    const settings = await getAnalyticsSettings(env);
    return json({ success: true, settings });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getAnalyticsSettingsApi, "getAnalyticsSettingsApi");
async function saveAnalyticsSettings(env, body) {
  try {
    const gaId = String(body.ga_id || "").trim();
    const googleVerify = String(body.google_verify || "").trim();
    const bingVerify = String(body.bing_verify || "").trim();
    const fbPixel = String(body.fb_pixel_id || "").trim();
    const customScript = String(body.custom_script || "").trim();
    await env.DB.prepare(
      `INSERT OR REPLACE INTO analytics_settings
       (id, ga_id, google_verify, bing_verify, fb_pixel_id, custom_script)
       VALUES (1, ?, ?, ?, ?, ?)`
    ).bind(gaId, googleVerify, bingVerify, fbPixel, customScript).run();
    analyticsCache = null;
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(saveAnalyticsSettings, "saveAnalyticsSettings");
async function injectAnalyticsAndMeta(env, html) {
  if (!html || typeof html !== "string" || !html.includes("</head>")) return html;
  const snippets = [];
  try {
    const [analytics, seo] = await Promise.all([
      getAnalyticsSettings(env),
      getSettings(env)
    ]);
    const headEnd = html.indexOf("</head>");
    const headSection = headEnd > -1 ? html.slice(0, headEnd) : html;
    if (analytics) {
      const { ga_id: gaId = "", google_verify: gVerify = "", bing_verify: bVerify = "", fb_pixel_id: fbPixel = "" } = analytics;
      const sanitizeId = /* @__PURE__ */ __name((val) => String(val || "").replace(/[^a-zA-Z0-9_-]/g, ""), "sanitizeId");
      const safeGaId = sanitizeId(gaId);
      const safeFbPixel = sanitizeId(fbPixel);
      const safeGVerify = String(gVerify || "").replace(/[<>"'&]/g, "");
      const safeBVerify = String(bVerify || "").replace(/[<>"'&]/g, "");
      if (safeGaId && !headSection.includes(safeGaId)) {
        snippets.push(
          `<!-- Google tag (gtag.js) - deferred for performance -->
<script>
window.dataLayer = window.dataLayer || [];
window.gtag = function(){ window.dataLayer.push(arguments); };
window.addEventListener('load', function() {
  function initGA() {
    window.gtag('js', new Date());
    window.gtag('config', '${safeGaId}');
    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=${safeGaId}';
    s.async = true;
    document.head.appendChild(s);
  }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initGA, { timeout: 2000 });
  } else {
    setTimeout(initGA, 1);
  }
});
<\/script>`
        );
      }
      if (safeGVerify && !headSection.includes("google-site-verification")) {
        snippets.push(`<meta name="google-site-verification" content="${safeGVerify}">`);
      }
      if (safeBVerify && !headSection.includes("msvalidate.01")) {
        snippets.push(`<meta name="msvalidate.01" content="${safeBVerify}">`);
      }
      if (safeFbPixel && !headSection.includes(safeFbPixel)) {
        snippets.push(
          `<script>
window.addEventListener('load', function() {
  !function(f,b,e,v,n,t,s){
   if(f.fbq)return;
   n=f.fbq=function(){n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};
   if(!f._fbq)f._fbq=n;
   n.push=n; n.loaded=!0; n.version='2.0'; n.queue=[];
   t=b.createElement(e); t.async=!0; t.src=v;
   s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s)
  }(window, document, 'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init','${safeFbPixel}');
  fbq('track','PageView');
});
<\/script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${safeFbPixel}&ev=PageView&noscript=1"/></noscript>`
        );
      }
      if (analytics.custom_script) {
        const trimmedCustom = String(analytics.custom_script).trim();
        if (trimmedCustom && !headSection.includes(trimmedCustom)) {
          snippets.push(trimmedCustom);
        }
      }
    }
    if (seo) {
      const title = String(seo.site_title || "").trim();
      const desc = String(seo.site_description || "").trim();
      const ogEnabled = !!seo.og_enabled;
      const ogImg = String(seo.og_image || "").trim();
      if (desc && !headSection.includes('name="description"')) {
        snippets.push(`<meta name="description" content="${desc.replace(/"/g, "&quot;")}">`);
      }
      if (ogEnabled && !headSection.includes("og:title")) {
        if (title) snippets.push(`<meta property="og:title" content="${title.replace(/"/g, "&quot;")}">`);
        if (desc) snippets.push(`<meta property="og:description" content="${desc.replace(/"/g, "&quot;")}">`);
        if (ogImg) snippets.push(`<meta property="og:image" content="${ogImg}">`);
        if (title) snippets.push(`<meta property="og:site_name" content="${title.replace(/"/g, "&quot;")}">`);
      }
      if (ogEnabled && !headSection.includes("twitter:card")) {
        snippets.push(`<meta name="twitter:card" content="summary_large_image">`);
        if (title) snippets.push(`<meta name="twitter:title" content="${title.replace(/"/g, "&quot;")}">`);
        if (desc) snippets.push(`<meta name="twitter:description" content="${desc.replace(/"/g, "&quot;")}">`);
        if (ogImg) snippets.push(`<meta name="twitter:image" content="${ogImg}">`);
      }
    }
  } catch (err) {
  }
  if (snippets.length > 0) {
    const injection = snippets.join("\n");
    html = html.slice(0, html.indexOf("</head>")) + injection + "\n" + html.slice(html.indexOf("</head>"));
  }
  return html;
}
__name(injectAnalyticsAndMeta, "injectAnalyticsAndMeta");

// src/controllers/email.js
var templatesCache = null;
var templatesCacheTime = 0;
var TEMPLATES_CACHE_TTL = 6e4;
var BREVO_API_URL2 = "https://api.brevo.com/v3/smtp/email";
var BREVO_TIMEOUT_MS2 = 1e4;
async function getEmailTemplates(env, type = null) {
  const now = Date.now();
  if (templatesCache && now - templatesCacheTime < TEMPLATES_CACHE_TTL) {
    if (type) {
      return templatesCache.filter((t) => t.type === type);
    }
    return templatesCache;
  }
  try {
    const sql = type ? "SELECT * FROM email_templates WHERE type = ?" : "SELECT * FROM email_templates";
    const stmt = env.DB.prepare(sql);
    const rows = type ? (await stmt.bind(type).all()).results : (await stmt.all()).results;
    templatesCache = rows || [];
    templatesCacheTime = now;
    return templatesCache;
  } catch (e) {
    console.error("Email templates fetch error:", e);
    return [];
  }
}
__name(getEmailTemplates, "getEmailTemplates");
async function getEmailTemplatesApi(env, req) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const templates = await getEmailTemplates(env, type);
    return json({ success: true, templates });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getEmailTemplatesApi, "getEmailTemplatesApi");
async function saveEmailTemplate(env, body) {
  try {
    const type = String(body.type || "").trim();
    const subject = String(body.subject || "").trim();
    const content = String(body.body || "").trim();
    if (!type) {
      return json({ error: "Missing template type" }, 400);
    }
    await env.DB.prepare(`
      INSERT INTO email_templates (type, subject, body, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(type) DO UPDATE SET
        subject = excluded.subject,
        body = excluded.body,
        updated_at = excluded.updated_at
    `).bind(type, subject, content, Date.now()).run();
    templatesCache = null;
    return json({ success: true });
  } catch (e) {
    console.error("Email template save error:", e);
    return json({ error: e.message }, 500);
  }
}
__name(saveEmailTemplate, "saveEmailTemplate");
async function saveEmailTemplateApi(env, body) {
  return saveEmailTemplate(env, body);
}
__name(saveEmailTemplateApi, "saveEmailTemplateApi");
function normalizeEmail2(value) {
  const email = String(value || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : "";
}
__name(normalizeEmail2, "normalizeEmail");
function resolveFromEmail2(env) {
  return normalizeEmail2(env.BREVO_FROM_EMAIL || env.FROM_EMAIL || "support@prankwish.com");
}
__name(resolveFromEmail2, "resolveFromEmail");
function resolveFromName2(env) {
  const name = String(env.BREVO_FROM_NAME || env.FROM_NAME || "Prankwish").trim();
  return name || "Prankwish";
}
__name(resolveFromName2, "resolveFromName");
function renderManualHtmlEmail(subject, message) {
  const safeSubject = escapeHtml(subject || "");
  const safeBody = escapeHtml(message || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "<br>");
  return [
    '<div style="margin:0;background:#f8fafc;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif;">',
    '  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">',
    '    <div style="background:#111827;padding:18px 22px;color:#ffffff;font-size:13px;letter-spacing:0.5px;">PRANKWISH MESSAGE</div>',
    '    <div style="padding:22px;">',
    `      <h2 style="margin:0 0 14px;color:#111827;font-size:20px;line-height:1.35;">${safeSubject}</h2>`,
    `      <p style="margin:0;color:#374151;font-size:14px;line-height:1.65;">${safeBody}</p>`,
    "    </div>",
    "  </div>",
    "</div>"
  ].join("\n");
}
__name(renderManualHtmlEmail, "renderManualHtmlEmail");
async function sendBrevoEmail2(env, payload) {
  const apiKey = String(env.BREVO_API_KEY || "").trim();
  if (!apiKey) {
    return { skipped: true, reason: "BREVO_API_KEY missing" };
  }
  const resp = await fetchWithTimeout(
    BREVO_API_URL2,
    {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    },
    BREVO_TIMEOUT_MS2
  );
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Brevo send failed (${resp.status}): ${body || "Unknown error"}`);
  }
  return resp.json().catch(() => ({}));
}
__name(sendBrevoEmail2, "sendBrevoEmail");
async function sendCustomEmail(env, body) {
  try {
    const to = normalizeEmail2(body.to || body.email || body.to_email);
    const subject = String(body.subject || "").trim().substring(0, 180);
    const message = String(body.message || body.body || "").trim().substring(0, 2e4);
    if (!to) return json({ error: "Valid recipient email is required" }, 400);
    if (!subject) return json({ error: "Subject is required" }, 400);
    if (!message) return json({ error: "Message is required" }, 400);
    const fromEmail = resolveFromEmail2(env);
    if (!fromEmail) {
      return json({ error: "Sender email is not configured (BREVO_FROM_EMAIL)" }, 500);
    }
    if (!String(env.BREVO_API_KEY || "").trim()) {
      return json({ error: "Brevo is not configured (BREVO_API_KEY missing)" }, 500);
    }
    const fromName = resolveFromName2(env);
    const htmlContent = renderManualHtmlEmail(subject, message);
    const brevoResponse = await sendBrevoEmail2(env, {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent: message,
      tags: ["admin", "manual-email"]
    });
    return json({
      success: true,
      recipient: to,
      messageId: brevoResponse?.messageId || null
    });
  } catch (e) {
    console.error("Manual email send error:", e);
    return json({ error: e.message || "Failed to send email" }, 500);
  }
}
__name(sendCustomEmail, "sendCustomEmail");
async function sendCustomEmailApi(env, body) {
  return sendCustomEmail(env, body);
}
__name(sendCustomEmailApi, "sendCustomEmailApi");
async function addLead(env, body) {
  try {
    const email = String(body.email || "").trim().toLowerCase();
    const name = body.name ? String(body.name).trim() : "";
    const source = body.source ? String(body.source).trim() : "";
    if (!email || !email.includes("@")) {
      return json({ error: "Invalid email" }, 400);
    }
    await env.DB.prepare(
      "INSERT INTO leads (email, name, source, created_at) VALUES (?, ?, ?, ?)"
    ).bind(email, name, source, Date.now()).run();
    return json({ success: true });
  } catch (e) {
    console.error("Lead insert error:", e);
    return json({ error: e.message }, 500);
  }
}
__name(addLead, "addLead");
async function addLeadApi(env, body) {
  return addLead(env, body);
}
__name(addLeadApi, "addLeadApi");

// src/controllers/noindex.js
var EMPTY_RULES = Object.freeze({ noindex: [], index: [] });
var PREVIEW_LIMIT = 250;
var rulesCache = null;
var cacheTime4 = 0;
function clearRulesCache(env) {
  rulesCache = null;
  cacheTime4 = 0;
  if (env?.PAGE_CACHE) {
    try {
      env.PAGE_CACHE.delete("api_cache:seo_rules");
    } catch (e) {
    }
  }
}
__name(clearRulesCache, "clearRulesCache");
function normalizePath(value) {
  let p = String(value || "").trim();
  if (!p) return "/";
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/+/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}
__name(normalizePath, "normalizePath");
function normalizeComparableUrl(rawUrl) {
  try {
    const u = new URL(String(rawUrl || "").trim());
    const protocol = String(u.protocol || "").toLowerCase() || "https:";
    const host = String(u.host || "").toLowerCase();
    const pathname = normalizePath(u.pathname || "/");
    return `${protocol}//${host}${pathname}`;
  } catch (_) {
    return "";
  }
}
__name(normalizeComparableUrl, "normalizeComparableUrl");
function decodeXmlEntities(value) {
  return String(value || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
__name(decodeXmlEntities, "decodeXmlEntities");
function isSensitiveNoindexPath(pathname) {
  const p = normalizePath(pathname);
  if (p === "/admin" || p.startsWith("/admin/")) return true;
  if (p === "/api" || p.startsWith("/api/")) return true;
  if (p === "/checkout" || p === "/success" || p === "/buyer-order" || p === "/order-detail") return true;
  if (p === "/order" || p.startsWith("/order/")) return true;
  if (p === "/download" || p.startsWith("/download/")) return true;
  return false;
}
__name(isSensitiveNoindexPath, "isSensitiveNoindexPath");
function pushCandidate(list, seen, url, source) {
  const normalized = normalizeComparableUrl(url);
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  list.push({
    url: normalized,
    source: String(source || "detected")
  });
}
__name(pushCandidate, "pushCandidate");
async function buildSitemapIndex(env, req) {
  const index = /* @__PURE__ */ new Set();
  const sitemapUrls = [];
  try {
    const sm = await buildMinimalSitemapXml(env, req);
    const xml = String(sm?.body || "");
    const locRe = /<loc>([\s\S]*?)<\/loc>/gi;
    let m;
    while ((m = locRe.exec(xml)) !== null) {
      const decoded = decodeXmlEntities(m[1] || "");
      const normalized = normalizeComparableUrl(decoded);
      if (!normalized) continue;
      index.add(normalized);
      sitemapUrls.push(normalized);
    }
  } catch (_) {
  }
  return { index, sitemapUrls };
}
__name(buildSitemapIndex, "buildSitemapIndex");
async function collectPreviewCandidates(env, req, sitemapUrls) {
  const reqUrl = new URL(req?.url || "https://example.com");
  const baseOrigin = sitemapUrls[0] ? new URL(sitemapUrls[0]).origin : `${reqUrl.protocol}//${reqUrl.host}`;
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  const corePaths = [
    "/",
    "/products",
    "/blog",
    "/forum",
    "/contact",
    "/privacy",
    "/refund",
    "/terms",
    "/checkout",
    "/success",
    "/buyer-order",
    "/order-detail",
    "/admin"
  ];
  for (const path of corePaths) {
    pushCandidate(candidates, seen, `${baseOrigin}${path}`, "core");
  }
  for (const url of sitemapUrls || []) {
    pushCandidate(candidates, seen, url, "sitemap");
  }
  if (!env.DB) return candidates;
  try {
    const products = await env.DB.prepare(`
      SELECT id, title, slug, status
      FROM products
      ORDER BY id DESC
      LIMIT 300
    `).all();
    for (const p of products.results || []) {
      const path = canonicalProductPath({
        id: p.id,
        slug: p.slug,
        title: p.title || `product-${p.id}`
      });
      pushCandidate(candidates, seen, `${baseOrigin}${path}`, `product:${String(p.status || "") || "unknown"}`);
    }
  } catch (_) {
  }
  try {
    const blogs = await env.DB.prepare(`
      SELECT slug, status
      FROM blogs
      ORDER BY id DESC
      LIMIT 200
    `).all();
    for (const b of blogs.results || []) {
      const slug = String(b.slug || "").trim();
      if (!slug) continue;
      pushCandidate(candidates, seen, `${baseOrigin}/blog/${encodeURIComponent(slug)}`, `blog:${String(b.status || "") || "unknown"}`);
    }
  } catch (_) {
  }
  try {
    const pages = await env.DB.prepare(`
      SELECT slug, status
      FROM pages
      ORDER BY id DESC
      LIMIT 200
    `).all();
    for (const p of pages.results || []) {
      const slug = String(p.slug || "").trim();
      if (!slug) continue;
      const path = slug.startsWith("/") ? slug : `/${slug}`;
      pushCandidate(candidates, seen, `${baseOrigin}${normalizePath(path)}`, `page:${String(p.status || "") || "unknown"}`);
    }
  } catch (_) {
  }
  try {
    const forum = await env.DB.prepare(`
      SELECT slug, status
      FROM forum_questions
      ORDER BY id DESC
      LIMIT 200
    `).all();
    for (const q of forum.results || []) {
      const slug = String(q.slug || "").trim();
      if (!slug) continue;
      pushCandidate(candidates, seen, `${baseOrigin}/forum/${encodeURIComponent(slug)}`, `forum:${String(q.status || "") || "unknown"}`);
    }
  } catch (_) {
  }
  return candidates;
}
__name(collectPreviewCandidates, "collectPreviewCandidates");
async function buildEffectivePreview(env, req) {
  const { index: sitemapIndex, sitemapUrls } = await buildSitemapIndex(env, req);
  const candidates = await collectPreviewCandidates(env, req, sitemapUrls);
  const indexed = [];
  const noindexed = [];
  for (const item of candidates) {
    let pathname = "/";
    try {
      pathname = normalizePath(new URL(item.url).pathname || "/");
    } catch (_) {
    }
    let visibility = "none";
    try {
      visibility = await getSeoVisibilityRuleMatch(env, {
        pathname,
        rawPathname: pathname,
        url: item.url,
        requestUrl: item.url
      });
    } catch (_) {
      visibility = "none";
    }
    let reason = "";
    let finalStatus = "index";
    if (isSensitiveNoindexPath(pathname)) {
      finalStatus = "noindex";
      reason = "sensitive_path";
    } else if (visibility === "index") {
      finalStatus = "index";
      reason = "force_index_rule";
    } else if (visibility === "noindex") {
      finalStatus = "noindex";
      reason = "noindex_rule";
    } else if (sitemapIndex.has(item.url)) {
      finalStatus = "index";
      reason = "in_sitemap";
    } else {
      finalStatus = "noindex";
      reason = "outside_sitemap";
    }
    const row = {
      url: item.url,
      source: item.source,
      reason
    };
    if (finalStatus === "index") indexed.push(row);
    else noindexed.push(row);
  }
  return {
    indexedTotal: indexed.length,
    noindexedTotal: noindexed.length,
    indexed: indexed.slice(0, PREVIEW_LIMIT),
    noindexed: noindexed.slice(0, PREVIEW_LIMIT)
  };
}
__name(buildEffectivePreview, "buildEffectivePreview");
function normalizeRuleInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const protocol = String(u.protocol || "").toLowerCase();
      const host = String(u.host || "").toLowerCase();
      const pathname = normalizePath(u.pathname || "/");
      return `${protocol}//${host}${pathname}${u.search || ""}`;
    } catch (_) {
      return "";
    }
  }
  if (raw.startsWith("/")) {
    const [pathPart, queryPart] = raw.split("?");
    const normalizedPath = normalizePath(pathPart);
    return queryPart ? `${normalizedPath}?${queryPart}` : normalizedPath;
  }
  return "";
}
__name(normalizeRuleInput, "normalizeRuleInput");
function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
__name(escapeRegExp, "escapeRegExp");
var _wildcardRegexCache = /* @__PURE__ */ new Map();
var WILDCARD_CACHE_MAX = 200;
function wildcardToRegex(pattern, caseInsensitive = false) {
  const cacheKey = `${pattern}|${caseInsensitive ? "i" : ""}`;
  const cached = _wildcardRegexCache.get(cacheKey);
  if (cached) return cached;
  const escaped = pattern.split("*").map((part) => escapeRegExp(part)).join(".*");
  const re = new RegExp(`^${escaped}$`, caseInsensitive ? "i" : "");
  if (_wildcardRegexCache.size >= WILDCARD_CACHE_MAX) {
    const firstKey = _wildcardRegexCache.keys().next().value;
    _wildcardRegexCache.delete(firstKey);
  }
  _wildcardRegexCache.set(cacheKey, re);
  return re;
}
__name(wildcardToRegex, "wildcardToRegex");
function matchesPattern(value, pattern, caseInsensitive = false) {
  const val = String(value || "");
  const pat = String(pattern || "");
  if (!val || !pat) return false;
  if (!pat.includes("*")) {
    if (val === pat) return true;
    if (pat.endsWith("/") && val.startsWith(pat)) return true;
    return false;
  }
  const re = wildcardToRegex(pat, caseInsensitive);
  return re.test(val);
}
__name(matchesPattern, "matchesPattern");
function buildCandidates(target) {
  const pathCandidates = /* @__PURE__ */ new Set();
  const urlCandidates = /* @__PURE__ */ new Set();
  const addPath = /* @__PURE__ */ __name((value) => {
    const raw = String(value || "").trim();
    if (!raw) return;
    const [pathOnly, query] = raw.split("?");
    const normalizedPath = normalizePath(pathOnly);
    pathCandidates.add(normalizedPath);
    pathCandidates.add(query ? `${normalizedPath}?${query}` : normalizedPath);
  }, "addPath");
  const addUrl = /* @__PURE__ */ __name((value) => {
    try {
      const u = value instanceof URL ? value : new URL(String(value));
      const protocol = String(u.protocol || "").toLowerCase();
      const host = String(u.host || "").toLowerCase();
      const pathname = normalizePath(u.pathname || "/");
      const withQuery = `${protocol}//${host}${pathname}${u.search || ""}`;
      const withoutQuery = `${protocol}//${host}${pathname}`;
      const hostPathWithQuery = `${host}${pathname}${u.search || ""}`;
      const hostPathWithoutQuery = `${host}${pathname}`;
      urlCandidates.add(withQuery);
      urlCandidates.add(withoutQuery);
      urlCandidates.add(hostPathWithQuery);
      urlCandidates.add(hostPathWithoutQuery);
      addPath(`${pathname}${u.search || ""}`);
    } catch (_) {
    }
  }, "addUrl");
  if (typeof target === "string") {
    if (/^https?:\/\//i.test(target)) addUrl(target);
    else addPath(target);
  } else if (target && typeof target === "object") {
    if (target.pathname) addPath(target.pathname);
    if (target.rawPathname) addPath(target.rawPathname);
    if (target.url) addUrl(target.url);
    if (target.requestUrl) addUrl(target.requestUrl);
  }
  return {
    paths: Array.from(pathCandidates),
    urls: Array.from(urlCandidates)
  };
}
__name(buildCandidates, "buildCandidates");
function matchesRule(candidates, rule) {
  const normalizedRule = normalizeRuleInput(rule);
  if (!normalizedRule) return false;
  if (/^https?:\/\//i.test(normalizedRule)) {
    const lowerRule = normalizedRule.toLowerCase();
    return candidates.urls.some((candidate) => matchesPattern(String(candidate || "").toLowerCase(), lowerRule, false));
  }
  return candidates.paths.some((candidate) => matchesPattern(candidate, normalizedRule, false));
}
__name(matchesRule, "matchesRule");
function normalizeMode(value) {
  return String(value || "").toLowerCase() === "index" ? "index" : "noindex";
}
__name(normalizeMode, "normalizeMode");
async function getRulePatterns(env) {
  const now = Date.now();
  if (rulesCache && now - cacheTime4 < 6e4) return rulesCache;
  const cacheKey = "api_cache:seo_rules";
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(cacheKey, "json");
      if (cached && cached.noindex) {
        rulesCache = cached;
        cacheTime4 = now;
        return rulesCache;
      }
    } catch (e) {
    }
  }
  try {
    const [noindexResult, indexResult] = await Promise.all([
      env.DB.prepare("SELECT url_pattern FROM noindex_pages ORDER BY id").all(),
      env.DB.prepare("SELECT url_pattern FROM index_pages ORDER BY id").all()
    ]);
    rulesCache = {
      noindex: (noindexResult.results || []).map((r) => r.url_pattern).filter(Boolean),
      index: (indexResult.results || []).map((r) => r.url_pattern).filter(Boolean)
    };
    cacheTime4 = now;
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(cacheKey, JSON.stringify(rulesCache), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return rulesCache;
  } catch (_) {
    return EMPTY_RULES;
  }
}
__name(getRulePatterns, "getRulePatterns");
async function getNoindexList(env, req) {
  try {
    const rules = await getRulePatterns(env);
    const preview = await buildEffectivePreview(env, req);
    return json({
      success: true,
      urls: rules.noindex,
      // backward compatibility with old dashboard
      noindexUrls: rules.noindex,
      indexUrls: rules.index,
      preview
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getNoindexList, "getNoindexList");
async function addNoindexUrl(env, body) {
  try {
    const mode = normalizeMode(body?.mode);
    const rule = normalizeRuleInput(body?.url);
    if (!rule) {
      return json({ error: "Valid URL pattern is required (relative path or full http/https URL)" }, 400);
    }
    const table = mode === "index" ? "index_pages" : "noindex_pages";
    await env.DB.prepare(`INSERT OR IGNORE INTO ${table} (url_pattern) VALUES (?)`).bind(rule).run();
    clearRulesCache(env);
    return json({ success: true, mode, url: rule });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(addNoindexUrl, "addNoindexUrl");
async function removeNoindexUrl(env, body) {
  try {
    const mode = normalizeMode(body?.mode);
    const index = body?.index;
    if (typeof index !== "number") {
      return json({ error: "Index is required" }, 400);
    }
    const table = mode === "index" ? "index_pages" : "noindex_pages";
    const result = await env.DB.prepare(`SELECT id, url_pattern FROM ${table} ORDER BY id`).all();
    const rows = result.results || [];
    if (index < 0 || index >= rows.length) {
      return json({ error: "Pattern not found" }, 404);
    }
    const rule = rows[index].url_pattern;
    await env.DB.prepare(`DELETE FROM ${table} WHERE url_pattern = ? LIMIT 1`).bind(rule).run();
    clearRulesCache(env);
    return json({ success: true, mode, url: rule });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(removeNoindexUrl, "removeNoindexUrl");
async function shouldNoindexUrl(env, target) {
  const visibility = await getSeoVisibilityRuleMatch(env, target);
  return visibility === "noindex";
}
__name(shouldNoindexUrl, "shouldNoindexUrl");
async function getSeoVisibilityRuleMatch(env, target) {
  const rules = await getRulePatterns(env);
  const candidates = buildCandidates(target);
  for (const rule of rules.index || []) {
    if (matchesRule(candidates, rule)) return "index";
  }
  for (const rule of rules.noindex || []) {
    if (matchesRule(candidates, rule)) return "noindex";
  }
  return "none";
}
__name(getSeoVisibilityRuleMatch, "getSeoVisibilityRuleMatch");
async function getNoindexMetaTags(env, target) {
  if (await shouldNoindexUrl(env, target)) {
    return '<meta name="robots" content="noindex, nofollow">';
  }
  return "";
}
__name(getNoindexMetaTags, "getNoindexMetaTags");

// src/middleware/api-auth.js
var PERMISSIONS = {
  products: {
    list: "products:list",
    create: "products:create",
    read: "products:read",
    update: "products:update",
    delete: "products:delete"
  },
  orders: {
    list: "orders:list",
    create: "orders:create",
    read: "orders:read",
    update: "orders:update",
    delete: "orders:delete",
    deliver: "orders:deliver",
    revise: "orders:revise"
  },
  reviews: {
    list: "reviews:list",
    create: "reviews:create",
    read: "reviews:read",
    update: "reviews:update",
    delete: "reviews:delete"
  },
  coupons: {
    list: "coupons:list",
    create: "coupons:create",
    read: "coupons:read",
    update: "coupons:update",
    delete: "coupons:delete",
    validate: "coupons:validate"
  },
  pages: {
    list: "pages:list",
    create: "pages:create",
    read: "pages:read",
    update: "pages:update",
    delete: "pages:delete",
    builder: "pages:builder"
  },
  blogs: {
    list: "blogs:list",
    create: "blogs:create",
    read: "blogs:read",
    update: "blogs:update",
    delete: "blogs:delete",
    comments: {
      list: "blogs:comments:list",
      create: "blogs:comments:create",
      update: "blogs:comments:update",
      delete: "blogs:comments:delete"
    }
  },
  forum: {
    list: "forum:list",
    create: "forum:create",
    read: "forum:read",
    update: "forum:update",
    delete: "forum:delete",
    questions: {
      list: "forum:questions:list",
      create: "forum:questions:create",
      update: "forum:questions:update",
      delete: "forum:questions:delete"
    },
    replies: {
      list: "forum:replies:list",
      create: "forum:replies:create",
      update: "forum:replies:update",
      delete: "forum:replies:delete"
    }
  },
  users: {
    list: "users:list",
    read: "users:read",
    export: "users:export"
  },
  chat: {
    list: "chat:list",
    read: "chat:read",
    send: "chat:send",
    block: "chat:block",
    delete: "chat:delete"
  },
  settings: {
    read: "settings:read",
    update: "settings:update",
    seo: "settings:seo",
    branding: "settings:branding",
    automation: "settings:automation",
    payments: "settings:payments"
  },
  backup: {
    history: "backup:history",
    create: "backup:create",
    download: "backup:download",
    restore: "backup:restore"
  },
  export: {
    full: "export:full",
    products: "export:products",
    pages: "export:pages",
    blogs: "export:blogs",
    data: "export:data"
  },
  import: {
    products: "import:products",
    pages: "import:pages",
    blogs: "import:blogs"
  }
};
function getAllAvailablePermissions() {
  const allPerms = [];
  for (const resource in PERMISSIONS) {
    const resourcePerms = PERMISSIONS[resource];
    for (const action in resourcePerms) {
      if (typeof resourcePerms[action] === "string") {
        allPerms.push({
          resource,
          action,
          permission: resourcePerms[action],
          label: `${resource}:${action}`
        });
      } else if (typeof resourcePerms[action] === "object") {
        for (const nestedAction in resourcePerms[action]) {
          allPerms.push({
            resource,
            action: `${action}:${nestedAction}`,
            permission: resourcePerms[action][nestedAction],
            label: `${resource}:${action}:${nestedAction}`
          });
        }
      }
    }
  }
  return allPerms.sort((a, b) => a.permission.localeCompare(b.permission));
}
__name(getAllAvailablePermissions, "getAllAvailablePermissions");
function getApiKeyFromRequest(req) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme === "Bearer" && token) {
      return token;
    }
  }
  const xApiKey = req.headers.get("X-API-Key");
  if (xApiKey) {
    return xApiKey;
  }
  return null;
}
__name(getApiKeyFromRequest, "getApiKeyFromRequest");
async function verifyApiKey(env, apiKey) {
  if (!apiKey || !env.DB) {
    return null;
  }
  try {
    const result = await env.DB.prepare(`
      SELECT id, key_name, permissions, usage_count, is_active, expires_at
      FROM api_keys
      WHERE key_value = ? AND is_active = 1
    `).bind(apiKey).first();
    if (!result) {
      return null;
    }
    if (result.expires_at) {
      const now = /* @__PURE__ */ new Date();
      const expiry = new Date(result.expires_at);
      if (now > expiry) {
        return null;
      }
    }
    let permissions = [];
    try {
      permissions = JSON.parse(result.permissions || "[]");
    } catch (e) {
      permissions = [];
    }
    return {
      id: result.id,
      name: result.key_name,
      permissions,
      usageCount: result.usage_count || 0
    };
  } catch (e) {
    console.error("API key verification error:", e);
    return null;
  }
}
__name(verifyApiKey, "verifyApiKey");
function hasPermission(apiKeyData, requiredPermission) {
  if (!apiKeyData || !requiredPermission) {
    return false;
  }
  if (apiKeyData.permissions.includes("*")) {
    return true;
  }
  return apiKeyData.permissions.includes(requiredPermission);
}
__name(hasPermission, "hasPermission");
async function apiKeyAuth(req, env, requiredPermission) {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    return json({ error: "API key required. Provide via Authorization: Bearer <key> or X-API-Key header." }, 401);
  }
  const apiKeyData = await verifyApiKey(env, apiKey);
  if (!apiKeyData) {
    return json({ error: "Invalid or expired API key" }, 401);
  }
  if (!hasPermission(apiKeyData, requiredPermission)) {
    return json({
      error: "Insufficient permissions",
      required: requiredPermission,
      your_permissions: apiKeyData.permissions
    }, 403);
  }
  req.apiKeyData = apiKeyData;
  return null;
}
__name(apiKeyAuth, "apiKeyAuth");
async function requireAdminOrApiKey(req, env, requiredPermission) {
  const isAdmin = await isAdminAuthed2(req, env);
  if (isAdmin) {
    req.apiKeyData = {
      id: "admin",
      name: "Admin User",
      permissions: ["*"],
      usageCount: 0
    };
    return null;
  }
  return await apiKeyAuth(req, env, requiredPermission);
}
__name(requireAdminOrApiKey, "requireAdminOrApiKey");
async function isAdminAuthed2(req, env) {
  const ADMIN_COOKIE2 = "admin_session";
  const ADMIN_MAX_AGE_SECONDS2 = 60 * 60 * 24 * 7;
  const cookieHeader = req.headers.get("Cookie") || "";
  const value = getCookieValue2(cookieHeader, ADMIN_COOKIE2);
  if (!value) return false;
  const [tsStr, sig] = value.split(".");
  if (!tsStr || !sig) return false;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.floor((Date.now() - ts) / 1e3);
  if (ageSec < 0 || ageSec > ADMIN_MAX_AGE_SECONDS2) return false;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const expected = await hmacSha2562(secret, tsStr);
  return expected === sig;
}
__name(isAdminAuthed2, "isAdminAuthed");
function getCookieValue2(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const [k, ...rest] = p.trim().split("=");
    if (k === name) return rest.join("=") || "";
  }
  return null;
}
__name(getCookieValue2, "getCookieValue");
async function hmacSha2562(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const base64url2 = /* @__PURE__ */ __name((bytes) => {
    const b64 = btoa(String.fromCharCode(...bytes));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }, "base64url");
  return base64url2(new Uint8Array(sig));
}
__name(hmacSha2562, "hmacSha256");

// src/controllers/backup.js
var MAX_TABLES = 200;
var MAX_ROWS_PER_TABLE = 2e5;
var BACKUP_PREFIX = "backups/";
async function getSetting(env, key) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
    return row?.value ?? null;
  } catch {
    return null;
  }
}
__name(getSetting, "getSetting");
async function isValidBackupWebhookSecret(env, provided) {
  if (!provided) return false;
  if (env.BACKUP_WEBHOOK_SECRET && provided === env.BACKUP_WEBHOOK_SECRET) return true;
  const dbSecret = await getSetting(env, "backup_webhook_secret");
  if (dbSecret && provided === dbSecret) return true;
  const cfgRaw = await getSetting(env, "webhooks_config");
  if (cfgRaw) {
    try {
      const cfg = JSON.parse(cfgRaw);
      const eps = Array.isArray(cfg?.endpoints) ? cfg.endpoints : [];
      for (const e of eps) {
        if (e?.secret && provided === e.secret) return true;
      }
    } catch {
    }
  }
  return false;
}
__name(isValidBackupWebhookSecret, "isValidBackupWebhookSecret");
async function requireBackupAuth(req, env, requiredPermission) {
  const provided = req.headers.get("X-Webhook-Secret") || req.headers.get("x-webhook-secret");
  if (provided) {
    const ok = await isValidBackupWebhookSecret(env, provided);
    if (!ok) return json({ ok: false, error: "Invalid webhook secret" }, 401);
    req.apiKeyData = { id: "webhook", name: "Webhook Secret", permissions: ["*"], usageCount: 0 };
    return null;
  }
  return await requireAdminOrApiKey(req, env, requiredPermission);
}
__name(requireBackupAuth, "requireBackupAuth");
function safeIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}
__name(safeIdent, "safeIdent");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");
function isInternalTable(name) {
  const n = String(name || "");
  return n.startsWith("sqlite_") || n.startsWith("_cf_") || n.includes(":") || // e.g. _cf_KV:key
  n.startsWith("__");
}
__name(isInternalTable, "isInternalTable");
function extractLinksFromValue(val) {
  const links = /* @__PURE__ */ new Set();
  if (val == null) return links;
  if (typeof val !== "string") return links;
  const trimmed = val.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]") || trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      const stack = [parsed];
      while (stack.length) {
        const cur = stack.pop();
        if (typeof cur === "string") {
          if (cur.startsWith("http://") || cur.startsWith("https://")) links.add(cur);
          continue;
        }
        if (Array.isArray(cur)) {
          for (const x of cur) stack.push(x);
          continue;
        }
        if (cur && typeof cur === "object") {
          for (const k of Object.keys(cur)) stack.push(cur[k]);
        }
      }
    } catch {
    }
  }
  const urlRe = /(https?:\/\/[^\s"'<>]+)/g;
  let m;
  while ((m = urlRe.exec(val)) !== null) {
    links.add(m[1]);
  }
  return links;
}
__name(extractLinksFromValue, "extractLinksFromValue");
async function getBackupsColumns(env) {
  const info = await env.DB.prepare("PRAGMA table_info(backups)").all();
  return new Set((info?.results || []).map((r) => r.name));
}
__name(getBackupsColumns, "getBackupsColumns");
async function listTables(env) {
  const res = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all();
  const names = (res?.results || []).map((r) => r.name).filter((n) => !isInternalTable(n));
  return names.slice(0, MAX_TABLES);
}
__name(listTables, "listTables");
async function getTableColumns(env, table) {
  const info = await env.DB.prepare(`PRAGMA table_info(${safeIdent(table)})`).all();
  return (info?.results || []).map((r) => r.name);
}
__name(getTableColumns, "getTableColumns");
async function exportTable(env, table) {
  const rowsRes = await env.DB.prepare(`SELECT * FROM ${safeIdent(table)}`).all();
  const rows = rowsRes?.results || [];
  if (rows.length > MAX_ROWS_PER_TABLE) {
    throw new Error(`Table ${table} too large (${rows.length} rows).`);
  }
  const columns = await getTableColumns(env, table);
  return { columns, rows };
}
__name(exportTable, "exportTable");
async function generateBackupData(env) {
  if (!env?.DB) throw new Error("Database binding not configured (env.DB missing).");
  const created_at = nowIso();
  const tables = {};
  const mediaLinks = /* @__PURE__ */ new Set();
  const tableNames = await listTables(env);
  for (const t of tableNames) {
    if (t === "backups") continue;
    const exported = await exportTable(env, t);
    tables[t] = exported;
    for (const row of exported.rows) {
      for (const k of Object.keys(row)) {
        const val = row[k];
        if (typeof val === "string") {
          for (const link of extractLinksFromValue(val)) mediaLinks.add(link);
        }
      }
    }
  }
  const data = {
    kind: "wishesu_full_backup",
    version: 2,
    created_at,
    notes: "Media files are NOT included. Only media links/keys are captured.",
    tables,
    media_links: Array.from(mediaLinks)
  };
  const jsonStr = JSON.stringify(data);
  return {
    data,
    jsonStr,
    size: new TextEncoder().encode(jsonStr).byteLength,
    media_count: data.media_links.length
  };
}
__name(generateBackupData, "generateBackupData");
async function getBackupHistory(env) {
  try {
    const res = await env.DB.prepare("SELECT id, created_at as timestamp, size, media_count FROM backups ORDER BY created_at DESC LIMIT 30").all();
    return json({ ok: true, backups: res?.results || [] });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(getBackupHistory, "getBackupHistory");
async function createBackupInternal(env, meta = {}) {
  const BUCKET = getBackupBucket(env);
  if (!BUCKET) {
    throw new Error("R2 bucket binding missing (R2_BUCKET or PRODUCT_MEDIA).");
  }
  const { jsonStr, size, media_count } = await generateBackupData(env);
  const id = "backup-" + Date.now();
  const r2_key = `${BACKUP_PREFIX}${id}.json`;
  const created_at = nowIso();
  await BUCKET.put(r2_key, jsonStr, {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  const cols = await getBackupsColumns(env);
  const insertCols = ["id"];
  const insertVals = [id];
  if (cols.has("created_at")) {
    insertCols.push("created_at");
    insertVals.push(created_at);
  } else if (cols.has("timestamp")) {
    insertCols.push("timestamp");
    insertVals.push(created_at);
  }
  if (cols.has("size")) {
    insertCols.push("size");
    insertVals.push(size);
  }
  if (cols.has("media_count")) {
    insertCols.push("media_count");
    insertVals.push(media_count);
  }
  if (cols.has("r2_key")) {
    insertCols.push("r2_key");
    insertVals.push(r2_key);
  }
  const placeholders = insertCols.map(() => "?").join(", ");
  await env.DB.prepare(`INSERT INTO backups (${insertCols.join(", ")}) VALUES (${placeholders})`).bind(...insertVals).run();
  const url = meta.base_url || (meta.req_url ? new URL(meta.req_url).origin : null) || env.PUBLIC_BASE_URL || env.SITE_URL || env.BASE_URL || null;
  const download_url = url ? `${url}/api/backup/download/${id}` : null;
  try {
    await dispatch(env, "backup.created", {
      id,
      created_at,
      size,
      media_count,
      download_url,
      trigger: meta.trigger || "manual",
      note: "Media files not included; links only"
    });
  } catch (e) {
    console.log("backup.created webhook dispatch failed:", e?.message || e);
  }
  try {
    const subject = `WishesU Backup Created - ${created_at.slice(0, 10)}`;
    const text = `Backup created at ${created_at}
ID: ${id}
Size: ${size} bytes
Media links: ${media_count}
` + (download_url ? `Download: ${download_url}
` : "") + `
Note: Media files are NOT included (links only).`;
    const attach = size <= 6e6 ? jsonStr : null;
    await sendBackupEmail(
      env,
      subject,
      text + (attach ? "" : "\n\nBackup is too large for email attachment. Use the download link or Admin > Backup."),
      `${id}.json`,
      attach
    );
  } catch (e) {
    console.log("backup email skipped/failed:", e?.message || e);
  }
  return { id, created_at, size, media_count, r2_key };
}
__name(createBackupInternal, "createBackupInternal");
async function createBackup(env, meta = {}) {
  try {
    const created = await createBackupInternal(env, meta);
    return json({
      ok: true,
      id: created.id,
      created_at: created.created_at,
      size: created.size,
      media_count: created.media_count
    });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(createBackup, "createBackup");
async function downloadBackup(env, backupId) {
  try {
    const BUCKET = getBackupBucket(env);
    if (!BUCKET) {
      return json({ ok: false, error: "R2 bucket binding missing (R2_BUCKET/PRODUCT_MEDIA)." }, 500);
    }
    const row = await env.DB.prepare("SELECT * FROM backups WHERE id = ?").bind(backupId).first();
    if (!row || !row.r2_key) {
      return json({ ok: false, error: "Backup not found" }, 404);
    }
    const obj = await BUCKET.get(row.r2_key);
    if (!obj) {
      return json({ ok: false, error: "Backup file missing in storage" }, 404);
    }
    const body = await obj.text();
    const filename = `${row.id}.json`;
    return new Response(body, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(new TextEncoder().encode(body).byteLength),
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(downloadBackup, "downloadBackup");
async function wipeAllTables(env, keepTables = /* @__PURE__ */ new Set(["backups"])) {
  const tableNames = await listTables(env);
  for (const t of tableNames) {
    if (keepTables.has(t)) continue;
    await env.DB.prepare(`DELETE FROM ${safeIdent(t)}`).run();
  }
}
__name(wipeAllTables, "wipeAllTables");
async function insertRows(env, table, columns, rows) {
  if (!rows || rows.length === 0) return;
  const safeTable = safeIdent(table);
  const colList = columns.map((c) => safeIdent(c)).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const stmt = env.DB.prepare(`INSERT INTO ${safeTable} (${colList}) VALUES (${placeholders})`);
  const batch = [];
  for (const row of rows) {
    const vals = columns.map((c) => row[c]);
    batch.push(stmt.bind(...vals));
    if (batch.length >= 100) {
      await env.DB.batch(batch.splice(0, batch.length));
    }
  }
  if (batch.length) await env.DB.batch(batch);
}
__name(insertRows, "insertRows");
async function restoreBackup(env, body = {}) {
  try {
    let backupObj = null;
    if (body.backupId) {
      const BUCKET = getBackupBucket(env);
      if (!BUCKET) return json({ ok: false, error: "R2 bucket binding missing (R2_BUCKET or PRODUCT_MEDIA)." }, 500);
      const row = await env.DB.prepare("SELECT * FROM backups WHERE id = ?").bind(body.backupId).first();
      if (!row || !row.r2_key) return json({ ok: false, error: "Backup not found" }, 404);
      const obj = await BUCKET.get(row.r2_key);
      if (!obj) return json({ ok: false, error: "Backup file missing in storage" }, 404);
      backupObj = JSON.parse(await obj.text());
    } else if (typeof body.backupJson === "string") {
      backupObj = JSON.parse(body.backupJson);
    } else if (body.backup && typeof body.backup === "object") {
      backupObj = body.backup;
    } else {
      return json({ ok: false, error: "No backup provided" }, 400);
    }
    if (backupObj?.kind !== "wishesu_full_backup" || !backupObj?.tables) {
      return json({ ok: false, error: "Invalid backup format" }, 400);
    }
    await wipeAllTables(env, /* @__PURE__ */ new Set(["backups"]));
    for (const [table, payload] of Object.entries(backupObj.tables)) {
      if (table === "backups") continue;
      const columns = payload.columns || (payload.rows && payload.rows[0] ? Object.keys(payload.rows[0]) : []);
      const rows = payload.rows || [];
      if (!columns.length) continue;
      await insertRows(env, table, columns, rows);
    }
    return json({ ok: true, restored_at: nowIso(), media_links_count: (backupObj.media_links || []).length });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(restoreBackup, "restoreBackup");
async function importBackup(env, body = {}) {
  return restoreBackup(env, body);
}
__name(importBackup, "importBackup");
async function sendBackupEmail(env, subject, text, attachmentName, attachmentText) {
  if (!env.BACKUP_EMAIL_TO || !env.BACKUP_EMAIL_FROM) {
    return { ok: false, skipped: true, reason: "Email env vars not configured" };
  }
  const payload = {
    personalizations: [{ to: [{ email: env.BACKUP_EMAIL_TO }] }],
    from: { email: env.BACKUP_EMAIL_FROM, name: env.BACKUP_EMAIL_NAME || "WishesU Backup" },
    subject,
    content: [{ type: "text/plain", value: text }]
  };
  if (attachmentName && attachmentText) {
    const b64 = btoa(unescape(encodeURIComponent(attachmentText)));
    payload.attachments = [{ filename: attachmentName, content: b64, type: "application/json", disposition: "attachment" }];
  }
  const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return { ok: resp.ok, status: resp.status, body: resp.ok ? null : await resp.text().catch(() => null) };
}
__name(sendBackupEmail, "sendBackupEmail");
function getBackupBucket(env) {
  return env.R2_BUCKET || env.PRODUCT_MEDIA || null;
}
__name(getBackupBucket, "getBackupBucket");

// src/controllers/settings-clean.js
var settingsCache = null;
var cacheTime5 = 0;
var CACHE_TTL3 = 6e4;
var DEFAULT_SETTINGS = {
  site_title: "",
  site_description: "",
  admin_email: "",
  enable_paypal: false,
  enable_stripe: false,
  paypal_client_id: "",
  paypal_secret: "",
  stripe_pub_key: "",
  stripe_secret_key: "",
  enable_rate_limit: true,
  rate_limit: 10
};
async function upsertCleanSettings(env, settings) {
  await env.DB.prepare(`
      INSERT OR REPLACE INTO clean_settings (
        id, site_title, site_description, admin_email, enable_paypal, enable_stripe,
        paypal_client_id, paypal_secret, stripe_pub_key, stripe_secret_key,
        enable_rate_limit, rate_limit
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
    settings.site_title,
    settings.site_description,
    settings.admin_email,
    settings.enable_paypal,
    settings.enable_stripe,
    settings.paypal_client_id,
    settings.paypal_secret,
    settings.stripe_pub_key,
    settings.stripe_secret_key,
    settings.enable_rate_limit,
    settings.rate_limit
  ).run();
}
__name(upsertCleanSettings, "upsertCleanSettings");
async function migrateLegacyPayPalToClean(env, settings) {
  let legacy = null;
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("paypal").first();
    if (row?.value) {
      legacy = JSON.parse(row.value);
    }
  } catch (e) {
    return settings;
  }
  const cleanHasPayPal = !!(settings.paypal_client_id || settings.paypal_secret);
  const legacyHasPayPal = !!(legacy && (legacy.client_id || legacy.secret));
  if (cleanHasPayPal || !legacyHasPayPal) {
    return settings;
  }
  const legacyEnabled = typeof legacy.enabled === "boolean" ? legacy.enabled : !!(legacy.client_id || legacy.secret);
  const migrated = {
    ...settings,
    enable_paypal: legacyEnabled ? 1 : 0,
    paypal_client_id: legacy.client_id || "",
    paypal_secret: legacy.secret || ""
  };
  try {
    await upsertCleanSettings(env, migrated);
  } catch (e) {
    console.error("Failed to migrate legacy PayPal settings:", e);
    return settings;
  }
  return migrated;
}
__name(migrateLegacyPayPalToClean, "migrateLegacyPayPalToClean");
async function syncPayPalToLegacySettings(env, settings) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("paypal").first();
    const legacy = row?.value ? JSON.parse(row.value) : {};
    const merged = {
      ...legacy,
      client_id: settings.paypal_client_id || "",
      secret: settings.paypal_secret || "",
      enabled: !!settings.enable_paypal,
      mode: legacy.mode || "sandbox"
    };
    await env.DB.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
    ).bind("paypal", JSON.stringify(merged)).run();
  } catch (e) {
    console.error("Failed to sync PayPal settings to legacy table:", e);
  }
}
__name(syncPayPalToLegacySettings, "syncPayPalToLegacySettings");
async function getCleanSettings(env) {
  const now = Date.now();
  if (settingsCache && now - cacheTime5 < CACHE_TTL3) {
    return settingsCache;
  }
  try {
    const row = await env.DB.prepare("SELECT * FROM clean_settings WHERE id = 1").first();
    let settings = { ...DEFAULT_SETTINGS, ...row || {} };
    settings = await migrateLegacyPayPalToClean(env, settings);
    settingsCache = settings;
    cacheTime5 = now;
    return settingsCache;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}
__name(getCleanSettings, "getCleanSettings");
async function getCleanSettingsApi(env) {
  try {
    const settings = await getCleanSettings(env);
    const safeSettings = {
      ...settings,
      paypal_secret: settings.paypal_secret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
      stripe_secret_key: settings.stripe_secret_key ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
    };
    return json({ success: true, settings: safeSettings });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getCleanSettingsApi, "getCleanSettingsApi");
async function saveCleanSettingsApi(env, body) {
  try {
    const current = await getCleanSettings(env);
    const settings = {
      site_title: (body.site_title || "").trim(),
      site_description: (body.site_description || "").trim().substring(0, 160),
      admin_email: (body.admin_email || "").trim(),
      enable_paypal: body.enable_paypal ? 1 : 0,
      enable_stripe: body.enable_stripe ? 1 : 0,
      paypal_client_id: (body.paypal_client_id || "").trim(),
      paypal_secret: (body.paypal_secret || "").trim(),
      stripe_pub_key: (body.stripe_pub_key || "").trim(),
      stripe_secret_key: (body.stripe_secret_key || "").trim(),
      enable_rate_limit: body.enable_rate_limit ? 1 : 0,
      rate_limit: Math.max(1, Math.min(100, parseInt(body.rate_limit) || 10))
    };
    if (settings.paypal_secret === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
      settings.paypal_secret = current.paypal_secret;
    }
    if (settings.stripe_secret_key === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
      settings.stripe_secret_key = current.stripe_secret_key;
    }
    await upsertCleanSettings(env, settings);
    await syncPayPalToLegacySettings(env, settings);
    settingsCache = null;
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(saveCleanSettingsApi, "saveCleanSettingsApi");

// src/controllers/settings-media.js
var TABLE_NAME = "settings_media_uploads";
var MAX_MP4_SIZE_BYTES = 500 * 1024 * 1024;
function buildPublicMediaUrl(origin, id, filename) {
  const safeName = String(filename || "video.mp4");
  return `${origin}/api/r2/settings-media/${id}/${encodeURIComponent(safeName)}`;
}
__name(buildPublicMediaUrl, "buildPublicMediaUrl");
function normalizeFilename(input) {
  const cleaned = sanitizeFilename(input || "video.mp4");
  if (!cleaned) return "video.mp4";
  return /\.mp4$/i.test(cleaned) ? cleaned : `${cleaned}.mp4`;
}
__name(normalizeFilename, "normalizeFilename");
async function requireAdmin(req, env) {
  if (!env.ADMIN_SESSION_SECRET) return null;
  const ok = await isAdminAuthed(req, env);
  if (!ok) return json({ error: "Unauthorized" }, 401);
  return null;
}
__name(requireAdmin, "requireAdmin");
function parseMediaId(idRaw) {
  const id = parseInt(String(idRaw || ""), 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}
__name(parseMediaId, "parseMediaId");
async function uploadSettingsMediaFile(env, req, url) {
  try {
    if (!env.R2_BUCKET) {
      return json({ error: "R2 storage not configured" }, 500);
    }
    const authError = await requireAdmin(req, env);
    if (authError) return authError;
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "MP4 file is required" }, 400);
    }
    const rawName = String(file.name || "video.mp4");
    const filename = normalizeFilename(rawName);
    if (!/\.mp4$/i.test(filename)) {
      return json({ error: "Only .mp4 files are allowed" }, 400);
    }
    const sizeBytes = Number(file.size || 0);
    if (!sizeBytes) {
      return json({ error: "Selected file is empty" }, 400);
    }
    if (sizeBytes > MAX_MP4_SIZE_BYTES) {
      return json({ error: "File too large. Maximum size is 500MB." }, 400);
    }
    const body = await file.arrayBuffer();
    const now = Date.now();
    const randomPart = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${now}`;
    const key = `settings-media/${now}-${randomPart}/${filename}`;
    await env.R2_BUCKET.put(key, body, {
      httpMetadata: {
        contentType: "video/mp4",
        cacheControl: "public, max-age=31536000, immutable"
      }
    });
    const insertResult = await env.DB.prepare(`
      INSERT INTO ${TABLE_NAME} (filename, r2_key, size_bytes, content_type, uploaded_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      filename,
      key,
      sizeBytes,
      "video/mp4",
      now
    ).run();
    let id = parseMediaId(insertResult?.meta?.last_row_id);
    if (!id) {
      const row = await env.DB.prepare(
        `SELECT id FROM ${TABLE_NAME} WHERE r2_key = ?`
      ).bind(key).first();
      id = parseMediaId(row?.id);
    }
    if (!id) {
      return json({ error: "Upload saved but could not resolve media id" }, 500);
    }
    const publicUrl = buildPublicMediaUrl(url.origin, id, filename);
    return json({
      success: true,
      item: {
        id,
        filename,
        size_bytes: sizeBytes,
        uploaded_at: now,
        public_url: publicUrl
      },
      last_link: publicUrl
    });
  } catch (e) {
    return json({ error: e.message || "Upload failed" }, 500);
  }
}
__name(uploadSettingsMediaFile, "uploadSettingsMediaFile");
async function listSettingsMediaFiles(env, req, url) {
  try {
    const authError = await requireAdmin(req, env);
    if (authError) return authError;
    const result = await env.DB.prepare(`
      SELECT id, filename, size_bytes, content_type, uploaded_at
      FROM ${TABLE_NAME}
      ORDER BY uploaded_at DESC
      LIMIT 300
    `).all();
    const items = (result.results || []).map((row) => ({
      id: row.id,
      filename: row.filename,
      size_bytes: Number(row.size_bytes || 0),
      content_type: row.content_type || "video/mp4",
      uploaded_at: Number(row.uploaded_at || 0),
      public_url: buildPublicMediaUrl(url.origin, row.id, row.filename)
    }));
    return json({
      success: true,
      last_link: items.length > 0 ? items[0].public_url : "",
      items
    });
  } catch (e) {
    return json({ error: e.message || "Failed to fetch uploads" }, 500);
  }
}
__name(listSettingsMediaFiles, "listSettingsMediaFiles");
async function deleteSettingsMediaFile(env, req, url) {
  try {
    const authError = await requireAdmin(req, env);
    if (authError) return authError;
    const id = parseMediaId(url.searchParams.get("id"));
    if (!id) return json({ error: "Valid id is required" }, 400);
    const row = await env.DB.prepare(
      `SELECT id, filename, r2_key FROM ${TABLE_NAME} WHERE id = ?`
    ).bind(id).first();
    if (!row) return json({ error: "Upload not found" }, 404);
    if (env.R2_BUCKET && row.r2_key) {
      await env.R2_BUCKET.delete(row.r2_key).catch(() => null);
    }
    await env.DB.prepare(
      `DELETE FROM ${TABLE_NAME} WHERE id = ?`
    ).bind(id).run();
    return json({
      success: true,
      deleted: {
        id,
        filename: row.filename
      }
    });
  } catch (e) {
    return json({ error: e.message || "Delete failed" }, 500);
  }
}
__name(deleteSettingsMediaFile, "deleteSettingsMediaFile");
async function getPublicSettingsMediaFile(env, id) {
  try {
    if (!env.R2_BUCKET) return json({ error: "R2 storage not configured" }, 500);
    const mediaId = parseMediaId(id);
    if (!mediaId) return json({ error: "Invalid media id" }, 400);
    const row = await env.DB.prepare(
      `SELECT filename, r2_key, content_type FROM ${TABLE_NAME} WHERE id = ?`
    ).bind(mediaId).first();
    if (!row || !row.r2_key) return json({ error: "File not found" }, 404);
    const obj = await env.R2_BUCKET.get(row.r2_key);
    if (!obj) return json({ error: "File not found" }, 404);
    const headers = new Headers();
    headers.set("Content-Type", obj.httpMetadata?.contentType || row.content_type || "video/mp4");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Disposition", `inline; filename="${String(row.filename || `video-${mediaId}.mp4`).replace(/"/g, "")}"`);
    return new Response(obj.body, { status: 200, headers });
  } catch (e) {
    return json({ error: e.message || "Failed to fetch file" }, 500);
  }
}
__name(getPublicSettingsMediaFile, "getPublicSettingsMediaFile");

// src/controllers/coupons.js
var couponsCache = null;
var couponsCacheTime = 0;
var COUPONS_CACHE_TTL = 6e4;
async function getCoupons(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM coupons ORDER BY created_at DESC
    `).all();
    return json({ success: true, coupons: result.results || [] });
  } catch (e) {
    console.error("Get coupons error:", e);
    return json({ success: true, coupons: [] });
  }
}
__name(getCoupons, "getCoupons");
async function getActiveCoupons(env) {
  const kvKey = "api_cache:coupons:active";
  if (env.PAGE_CACHE) {
    try {
      const cached = await env.PAGE_CACHE.get(kvKey);
      if (cached) {
        return cachedJson(JSON.parse(cached), 60);
      }
    } catch (e) {
    }
  }
  const now = Date.now();
  if (couponsCache && now - couponsCacheTime < COUPONS_CACHE_TTL) {
    const resp = { success: true, coupons: couponsCache };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(resp), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return cachedJson(resp, 60);
  }
  try {
    const result = await env.DB.prepare(`
      SELECT id, code, discount_type, discount_value, min_order_amount, product_ids
      FROM coupons 
      WHERE status = 'active'
        AND (valid_from IS NULL OR valid_from <= ?)
        AND (valid_until IS NULL OR valid_until >= ?)
        AND (max_uses = 0 OR used_count < max_uses)
    `).bind(now, now).all();
    couponsCache = result.results || [];
    couponsCacheTime = now;
    const resp = { success: true, coupons: couponsCache };
    if (env.PAGE_CACHE) {
      try {
        await env.PAGE_CACHE.put(kvKey, JSON.stringify(resp), { expirationTtl: 86400 * 7 });
      } catch (e) {
      }
    }
    return cachedJson(resp, 60);
  } catch (e) {
    console.error("Get active coupons error:", e);
    return json({ success: true, coupons: [] });
  }
}
__name(getActiveCoupons, "getActiveCoupons");
async function getCouponsEnabled(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("coupons_enabled").first();
    const enabled = row?.value === "true";
    return cachedJson({ success: true, enabled }, 120);
  } catch (e) {
    console.error("getCouponsEnabled error:", e);
    return json({ success: true, enabled: false });
  }
}
__name(getCouponsEnabled, "getCouponsEnabled");
async function setCouponsEnabled(env, body) {
  try {
    const enabled = body.enabled ? "true" : "false";
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("coupons_enabled", enabled).run();
    return json({ success: true, enabled: body.enabled });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(setCouponsEnabled, "setCouponsEnabled");
async function validateCoupon(env, body) {
  const { code, product_id, order_amount } = body;
  if (!code) {
    return json({ valid: false, error: "Coupon code is required" });
  }
  try {
    const now = Date.now();
    const coupon = await env.DB.prepare(`
      SELECT * FROM coupons 
      WHERE code = ? COLLATE NOCASE
        AND status = 'active'
    `).bind(code.trim()).first();
    if (!coupon) {
      return json({ valid: false, error: "Invalid coupon code" });
    }
    if (coupon.valid_from && coupon.valid_from > now) {
      return json({ valid: false, error: "This coupon is not yet active" });
    }
    if (coupon.valid_until && coupon.valid_until < now) {
      return json({ valid: false, error: "This coupon has expired" });
    }
    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
      return json({ valid: false, error: "This coupon has reached its usage limit" });
    }
    if (coupon.min_order_amount > 0 && order_amount < coupon.min_order_amount) {
      return json({
        valid: false,
        error: `Minimum order amount is $${coupon.min_order_amount.toFixed(2)}`
      });
    }
    if (coupon.product_ids && product_id) {
      const allowedProducts = coupon.product_ids.split(",").map((p) => p.trim());
      if (!allowedProducts.includes(String(product_id)) && !allowedProducts.includes("all")) {
        return json({ valid: false, error: "This coupon is not valid for this product" });
      }
    }
    let discount = 0;
    let discountedPrice = order_amount;
    if (coupon.discount_type === "percentage") {
      discount = order_amount * coupon.discount_value / 100;
      discountedPrice = order_amount - discount;
    } else if (coupon.discount_type === "fixed") {
      discount = Math.min(coupon.discount_value, order_amount);
      discountedPrice = order_amount - discount;
    }
    discountedPrice = Math.max(0, discountedPrice);
    return json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      },
      discount: Math.round(discount * 100) / 100,
      discounted_price: Math.round(discountedPrice * 100) / 100,
      original_price: order_amount
    });
  } catch (e) {
    console.error("Validate coupon error:", e);
    return json({ valid: false, error: "Failed to validate coupon" });
  }
}
__name(validateCoupon, "validateCoupon");
async function createCoupon(env, body) {
  try {
    const {
      code,
      discount_type = "percentage",
      discount_value,
      min_order_amount = 0,
      max_uses = 0,
      valid_from,
      valid_until,
      product_ids,
      status = "active"
    } = body;
    if (!code || !discount_value) {
      return json({ error: "Code and discount value are required" }, 400);
    }
    const existing = await env.DB.prepare("SELECT id FROM coupons WHERE code = ? COLLATE NOCASE").bind(code.trim()).first();
    if (existing) {
      return json({ error: "A coupon with this code already exists" }, 400);
    }
    const result = await env.DB.prepare(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, valid_from, valid_until, product_ids, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      code.trim().toUpperCase(),
      discount_type,
      discount_value,
      min_order_amount,
      max_uses,
      valid_from || null,
      valid_until || null,
      product_ids || null,
      status,
      Date.now()
    ).run();
    couponsCache = null;
    return json({ success: true, id: result.meta?.last_row_id });
  } catch (e) {
    console.error("Create coupon error:", e);
    return json({ error: e.message }, 500);
  }
}
__name(createCoupon, "createCoupon");
async function updateCoupon(env, body) {
  try {
    const {
      id,
      code,
      discount_type,
      discount_value,
      min_order_amount,
      max_uses,
      valid_from,
      valid_until,
      product_ids,
      status
    } = body;
    if (!id) {
      return json({ error: "Coupon ID is required" }, 400);
    }
    await env.DB.prepare(`
      UPDATE coupons SET
        code = ?,
        discount_type = ?,
        discount_value = ?,
        min_order_amount = ?,
        max_uses = ?,
        valid_from = ?,
        valid_until = ?,
        product_ids = ?,
        status = ?
      WHERE id = ?
    `).bind(
      code.trim().toUpperCase(),
      discount_type,
      discount_value,
      min_order_amount || 0,
      max_uses || 0,
      valid_from || null,
      valid_until || null,
      product_ids || null,
      status,
      id
    ).run();
    couponsCache = null;
    return json({ success: true });
  } catch (e) {
    console.error("Update coupon error:", e);
    return json({ error: e.message }, 500);
  }
}
__name(updateCoupon, "updateCoupon");
async function deleteCoupon(env, id) {
  try {
    await env.DB.prepare("DELETE FROM coupons WHERE id = ?").bind(id).run();
    couponsCache = null;
    return json({ success: true });
  } catch (e) {
    console.error("Delete coupon error:", e);
    return json({ error: e.message }, 500);
  }
}
__name(deleteCoupon, "deleteCoupon");
async function toggleCouponStatus(env, body) {
  try {
    const { id, status } = body;
    await env.DB.prepare("UPDATE coupons SET status = ? WHERE id = ?").bind(status, id).run();
    couponsCache = null;
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(toggleCouponStatus, "toggleCouponStatus");

// src/controllers/api-keys.js
function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 48;
  let key = "wishesu_";
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}
__name(generateApiKey, "generateApiKey");
async function createApiKey(env, body) {
  try {
    const { name, permissions, expiresInDays } = body;
    if (!name || !permissions || !Array.isArray(permissions)) {
      return json({ error: "Name and permissions array are required" }, 400);
    }
    const availablePerms = getAllAvailablePermissions();
    const validPermissionStrings = availablePerms.map((p) => p.permission);
    const invalidPerms = permissions.filter((p) => !validPermissionStrings.includes(p) && p !== "*");
    if (invalidPerms.length > 0) {
      return json({ error: "Invalid permissions", invalid: invalidPerms }, 400);
    }
    const keyValue = generateApiKey();
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      const expiryDate = /* @__PURE__ */ new Date();
      expiryDate.setDate(expiryDate.getDate() + expiresInDays);
      expiresAt = expiryDate.toISOString();
    }
    const result = await env.DB.prepare(`
      INSERT INTO api_keys (key_name, key_value, permissions, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      name,
      keyValue,
      JSON.stringify(permissions),
      expiresAt
    ).run();
    if (!result.success) {
      throw new Error("Failed to create API key");
    }
    const keyRecord = await env.DB.prepare(`
      SELECT id, key_name, key_value, permissions, is_active, usage_count, last_used_at, created_at, expires_at
      FROM api_keys
      WHERE key_value = ?
    `).bind(keyValue).first();
    let parsedPermissions = [];
    try {
      parsedPermissions = JSON.parse(keyRecord.permissions || "[]");
    } catch (e) {
      parsedPermissions = [];
    }
    return json({
      success: true,
      apiKey: {
        id: keyRecord.id,
        name: keyRecord.key_name,
        key: keyRecord.key_value,
        // Include key only on creation
        permissions: parsedPermissions,
        isActive: keyRecord.is_active === 1,
        usageCount: keyRecord.usage_count || 0,
        lastUsedAt: keyRecord.last_used_at,
        createdAt: keyRecord.created_at,
        expiresAt: keyRecord.expires_at
      },
      message: "API key created successfully. Save the key value - it will not be shown again!"
    });
  } catch (err) {
    console.error("Create API key error:", err);
    return json({ error: err.message }, 500);
  }
}
__name(createApiKey, "createApiKey");
async function listApiKeys(env) {
  try {
    const keys = await env.DB.prepare(`
      SELECT id, key_name, permissions, is_active, usage_count, last_used_at, created_at, expires_at
      FROM api_keys
      ORDER BY created_at DESC
    `).all();
    const formattedKeys = (keys.results || []).map((key) => {
      let parsedPermissions = [];
      try {
        parsedPermissions = JSON.parse(key.permissions || "[]");
      } catch (e) {
        parsedPermissions = [];
      }
      return {
        id: key.id,
        name: key.key_name,
        permissions: parsedPermissions,
        isActive: key.is_active === 1,
        usageCount: key.usage_count || 0,
        lastUsedAt: key.last_used_at,
        createdAt: key.created_at,
        expiresAt: key.expires_at
      };
    });
    return json({
      success: true,
      apiKeys: formattedKeys,
      total: formattedKeys.length
    });
  } catch (err) {
    console.error("List API keys error:", err);
    return json({ error: err.message }, 500);
  }
}
__name(listApiKeys, "listApiKeys");
async function getApiKey(env, id) {
  try {
    const key = await env.DB.prepare(`
      SELECT id, key_name, permissions, is_active, usage_count, last_used_at, created_at, expires_at
      FROM api_keys
      WHERE id = ?
    `).bind(id).first();
    if (!key) {
      return json({ error: "API key not found" }, 404);
    }
    let parsedPermissions = [];
    try {
      parsedPermissions = JSON.parse(key.permissions || "[]");
    } catch (e) {
      parsedPermissions = [];
    }
    const usageStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_requests,
        AVG(response_time_ms) as avg_response_time,
        MIN(created_at) as first_used_at,
        MAX(created_at) as last_used_at
      FROM api_key_usage
      WHERE api_key_id = ?
    `).bind(id).first();
    const recentUsage = await env.DB.prepare(`
      SELECT endpoint, method, status_code, response_time_ms, ip_address, created_at
      FROM api_key_usage
      WHERE api_key_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(id).all();
    return json({
      success: true,
      apiKey: {
        id: key.id,
        name: key.key_name,
        permissions: parsedPermissions,
        isActive: key.is_active === 1,
        usageCount: key.usage_count || 0,
        lastUsedAt: key.last_used_at,
        createdAt: key.created_at,
        expiresAt: key.expires_at,
        stats: usageStats || {},
        recentUsage: recentUsage.results || []
      }
    });
  } catch (err) {
    console.error("Get API key error:", err);
    return json({ error: err.message }, 500);
  }
}
__name(getApiKey, "getApiKey");
async function updateApiKey(env, body) {
  try {
    const { id, name, permissions, isActive } = body;
    if (!id) {
      return json({ error: "API key ID is required" }, 400);
    }
    const existing = await env.DB.prepare(`
      SELECT id FROM api_keys WHERE id = ?
    `).bind(id).first();
    if (!existing) {
      return json({ error: "API key not found" }, 404);
    }
    const updates = [];
    const params = [];
    if (name !== void 0) {
      updates.push("key_name = ?");
      params.push(name);
    }
    if (permissions !== void 0) {
      const availablePerms = getAllAvailablePermissions();
      const validPermissionStrings = availablePerms.map((p) => p.permission);
      const invalidPerms = permissions.filter((p) => !validPermissionStrings.includes(p) && p !== "*");
      if (invalidPerms.length > 0) {
        return json({ error: "Invalid permissions", invalid: invalidPerms }, 400);
      }
      updates.push("permissions = ?");
      params.push(JSON.stringify(permissions));
    }
    if (isActive !== void 0) {
      updates.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    if (updates.length === 0) {
      return json({ error: "No updates provided" }, 400);
    }
    params.push(id);
    await env.DB.prepare(`
      UPDATE api_keys
      SET ${updates.join(", ")}
      WHERE id = ?
    `).bind(...params).run();
    const updatedKey = await env.DB.prepare(`
      SELECT id, key_name, permissions, is_active, usage_count, last_used_at, created_at, expires_at
      FROM api_keys
      WHERE id = ?
    `).bind(id).first();
    let parsedPermissions = [];
    try {
      parsedPermissions = JSON.parse(updatedKey.permissions || "[]");
    } catch (e) {
      parsedPermissions = [];
    }
    return json({
      success: true,
      apiKey: {
        id: updatedKey.id,
        name: updatedKey.key_name,
        permissions: parsedPermissions,
        isActive: updatedKey.is_active === 1,
        usageCount: updatedKey.usage_count || 0,
        lastUsedAt: updatedKey.last_used_at,
        createdAt: updatedKey.created_at,
        expiresAt: updatedKey.expires_at
      }
    });
  } catch (err) {
    console.error("Update API key error:", err);
    return json({ error: err.message }, 500);
  }
}
__name(updateApiKey, "updateApiKey");
async function deleteApiKey(env, id) {
  try {
    if (!id) {
      return json({ error: "API key ID is required" }, 400);
    }
    const existing = await env.DB.prepare(`
      SELECT id FROM api_keys WHERE id = ?
    `).bind(id).first();
    if (!existing) {
      return json({ error: "API key not found" }, 404);
    }
    await env.DB.prepare(`
      DELETE FROM api_keys WHERE id = ?
    `).bind(id).run();
    await env.DB.prepare(`
      DELETE FROM api_key_usage WHERE api_key_id = ?
    `).bind(id).run();
    return json({
      success: true,
      message: "API key deleted successfully"
    });
  } catch (err) {
    console.error("Delete API key error:", err);
    return json({ error: err.message }, 500);
  }
}
__name(deleteApiKey, "deleteApiKey");
async function getPermissionsList() {
  const permissions = getAllAvailablePermissions();
  const grouped = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {});
  return json({
    success: true,
    permissions: grouped
  });
}
__name(getPermissionsList, "getPermissionsList");
async function getApiKeyAnalytics(env, id) {
  try {
    const keyId = id || null;
    const overallStats = await env.DB.prepare(`
      SELECT
        COUNT(DISTINCT api_key_id) as active_keys,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as enabled_keys,
        SUM(usage_count) as total_requests_all_keys
      FROM api_keys
    `).first();
    const statusCodeStats = await env.DB.prepare(`
      SELECT
        status_code,
        COUNT(*) as count
      FROM api_key_usage
      ${keyId ? "WHERE api_key_id = ?" : ""}
      GROUP BY status_code
      ORDER BY status_code
    `).bind(keyId || null).all();
    const topEndpoints = await env.DB.prepare(`
      SELECT
        endpoint,
        COUNT(*) as request_count,
        AVG(response_time_ms) as avg_response_time
      FROM api_key_usage
      ${keyId ? "WHERE api_key_id = ?" : ""}
      GROUP BY endpoint
      ORDER BY request_count DESC
      LIMIT 20
    `).bind(keyId || null).all();
    const requestsOverTime = await env.DB.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as request_count
      FROM api_key_usage
      WHERE created_at >= date('now', '-30 days')
      ${keyId ? "AND api_key_id = ?" : ""}
      GROUP BY DATE(created_at)
      ORDER BY date
    `).bind(keyId || null).all();
    const topKeys = await env.DB.prepare(`
      SELECT
        k.id,
        k.key_name,
        COUNT(u.id) as request_count,
        k.usage_count
      FROM api_keys k
      LEFT JOIN api_key_usage u ON k.id = u.api_key_id
      GROUP BY k.id
      ORDER BY request_count DESC
      LIMIT 10
    `).all();
    return json({
      success: true,
      analytics: {
        overall: overallStats || {},
        statusCodes: statusCodeStats.results || [],
        topEndpoints: topEndpoints.results || [],
        requestsOverTime: requestsOverTime.results || [],
        topKeys: topKeys.results || []
      }
    });
  } catch (err) {
    console.error("Get API key analytics error:", err);
    return json({ error: err.message }, 500);
  }
}
__name(getApiKeyAnalytics, "getApiKeyAnalytics");
async function pingApiKey(env) {
  return json({
    success: true,
    message: "API Key is valid and server is responding.",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: "1.0.0"
  });
}
__name(pingApiKey, "pingApiKey");

// src/router.js
function csvEscapeField(value) {
  if (value === null || value === void 0) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
__name(csvEscapeField, "csvEscapeField");
function rowsToCsv(rows, columns) {
  const header = columns.map(csvEscapeField).join(",");
  const lines = rows.map(
    (row) => columns.map((col) => csvEscapeField(row[col])).join(",")
  );
  return header + "\n" + lines.join("\n");
}
__name(rowsToCsv, "rowsToCsv");
var HEAD_SAFE_EXACT_API_PATHS = /* @__PURE__ */ new Set([
  "/api/health",
  "/api/time",
  "/api/products",
  "/api/products/list",
  "/api/reviews",
  "/api/blogs/published",
  "/api/forum/questions",
  "/api/forum/question-replies",
  "/api/forum/question-by-id",
  "/api/forum/sidebar",
  "/api/payment/methods",
  "/api/payment/whop/checkout-settings",
  "/api/settings/components",
  "/api/settings/branding",
  "/api/coupons/active",
  "/api/coupons/enabled"
]);
var HEAD_SAFE_API_PATTERNS = [
  /^\/api\/product\/\d+(?:\/adjacent)?$/,
  /^\/api\/reviews\/\d+$/,
  /^\/api\/blog\/public\/[^/]+$/,
  /^\/api\/blog\/previous\/\d+$/,
  /^\/api\/blog\/comments\/\d+$/,
  /^\/api\/forum\/question\/[^/]+$/,
  /^\/api\/order\/buyer\/[^/]+$/
];
var ADMIN_ONLY_NON_PREFIXED_ROUTE_KEYS = /* @__PURE__ */ new Set([
  "GET /api/products/list",
  "POST /api/products/status",
  "POST /api/products/duplicate",
  "POST /api/product/save",
  "DELETE /api/product/delete",
  "POST /api/purge-cache",
  "GET /api/settings/payments",
  "POST /api/settings/payments",
  "GET /api/settings/paypal",
  "POST /api/settings/paypal",
  "GET /api/settings/payment-methods",
  "POST /api/settings/payment-methods",
  "GET /api/whop/test-api",
  "POST /api/whop/cleanup",
  "GET /api/paypal/test",
  "GET /api/payment/universal/test",
  "GET /api/coupons",
  "POST /api/coupons/enabled",
  "POST /api/coupons/create",
  "POST /api/coupons/update",
  "DELETE /api/coupons/delete",
  "POST /api/coupons/status",
  "GET /api/pages",
  "GET /api/pages/list",
  "GET /api/pages/load",
  "GET /api/pages/default",
  "POST /api/page/save",
  "DELETE /api/page/delete",
  "POST /api/pages/save",
  "POST /api/pages/delete",
  "POST /api/pages/status",
  "POST /api/pages/duplicate",
  "POST /api/pages/set-default",
  "POST /api/pages/clear-default",
  "POST /api/pages/type",
  "GET /api/blogs",
  "GET /api/blogs/list",
  "POST /api/blog/save",
  "DELETE /api/blog/delete",
  "POST /api/blogs/status",
  "POST /api/blogs/duplicate",
  "POST /api/reviews/update",
  "DELETE /api/reviews/delete"
]);
function isHeadCompatibleApiPath(path) {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) return false;
  if (HEAD_SAFE_EXACT_API_PATHS.has(normalizedPath)) return true;
  return HEAD_SAFE_API_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}
__name(isHeadCompatibleApiPath, "isHeadCompatibleApiPath");
function isAdminOnlyNonPrefixedRoute(path, method) {
  const routeKey = `${String(method || "").toUpperCase()} ${String(path || "").trim()}`;
  if (ADMIN_ONLY_NON_PREFIXED_ROUTE_KEYS.has(routeKey)) return true;
  if (/^GET \/api\/page\/[^/]+$/.test(routeKey)) return true;
  if (/^GET \/api\/blog\/[^/]+$/.test(routeKey)) return true;
  return false;
}
__name(isAdminOnlyNonPrefixedRoute, "isAdminOnlyNonPrefixedRoute");
function toHeadResponse(response) {
  if (!response) return response;
  return new Response(null, {
    status: response.status,
    headers: new Headers(response.headers)
  });
}
__name(toHeadResponse, "toHeadResponse");
function unauthorizedApiResponse() {
  return json({ error: "Unauthorized" }, 401);
}
__name(unauthorizedApiResponse, "unauthorizedApiResponse");
async function requireAdminApi(req, env) {
  return await isAdminAuthed(req, env) ? null : unauthorizedApiResponse();
}
__name(requireAdminApi, "requireAdminApi");
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
__name(isPlainObject, "isPlainObject");
function isNonEmptyObject(value) {
  return isPlainObject(value) && Object.keys(value).length > 0;
}
__name(isNonEmptyObject, "isNonEmptyObject");
function getWebhookKindForPath(path) {
  if (path === "/api/whop/webhook") return "whop";
  if (path === "/api/paypal/webhook") return "paypal";
  if (path === "/api/payment/universal/webhook") return "universal";
  return null;
}
__name(getWebhookKindForPath, "getWebhookKindForPath");
function validateWebhookRequestPayload(kind, body) {
  if (!isNonEmptyObject(body)) {
    return "Webhook payload must be a non-empty JSON object";
  }
  const normalizedKind = String(kind || "").trim().toLowerCase();
  const hasWhopShape = normalizedKind === "whop" || normalizedKind === "universal" && ("type" in body || "event" in body || "data" in body);
  if (hasWhopShape) {
    const eventType = String(body.type || body.event || "").trim();
    if (!eventType) {
      return "Whop webhook event type required";
    }
    if (!isNonEmptyObject(body.data)) {
      return "Whop webhook data required";
    }
    return null;
  }
  const hasPayPalShape = normalizedKind === "paypal" || normalizedKind === "universal" && ("event_type" in body || "resource" in body);
  if (hasPayPalShape) {
    const eventType = String(body.event_type || "").trim();
    if (!eventType) {
      return "PayPal webhook event_type required";
    }
    if (!isNonEmptyObject(body.resource)) {
      return "PayPal webhook resource required";
    }
    return null;
  }
  return null;
}
__name(validateWebhookRequestPayload, "validateWebhookRequestPayload");
async function parseWebhookRequestPayload(req, path) {
  const kind = getWebhookKindForPath(path);
  if (!kind) return null;
  const rawBody = await req.text();
  let body;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch (e) {
    return {
      errorResponse: json({ error: "Invalid JSON" }, 400)
    };
  }
  const validationError = validateWebhookRequestPayload(kind, body);
  if (validationError) {
    return {
      errorResponse: json({ error: validationError }, 400)
    };
  }
  return { kind, body, rawBody };
}
__name(parseWebhookRequestPayload, "parseWebhookRequestPayload");
async function routeApiRequest(req, env, url, path, method) {
  if (method === "HEAD" && isHeadCompatibleApiPath(path)) {
    const getRequest = new Request(url.toString(), {
      method: "GET",
      headers: req.headers
    });
    const getResponse = await routeApiRequest(getRequest, env, url, path, "GET");
    return toHeadResponse(getResponse);
  }
  let parsedWebhookPayload = null;
  if (method === "POST") {
    parsedWebhookPayload = await parseWebhookRequestPayload(req, path);
    if (parsedWebhookPayload?.errorResponse) {
      return parsedWebhookPayload.errorResponse;
    }
  }
  if (path === "/api/health") {
    return json({ ok: true, time: Date.now() });
  }
  if (path === "/api/time") {
    return json({ serverTime: Date.now() });
  }
  if (path === "/api/debug") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return getDebugInfo(env);
  }
  if (method === "GET" && path === "/api/whop/test-webhook") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return testWebhook2();
  }
  if (method === "POST" && path === "/api/upload/temp-file") {
    return uploadTempFile(env, req, url);
  }
  if (method === "POST" && path === "/api/upload/customer-file") {
    return uploadCustomerFile(env, req, url);
  }
  if (method === "POST" && path === "/api/upload/archive-credentials") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return getArchiveCredentials(env);
  }
  if (!path.startsWith("/api/")) {
    return null;
  }
  if (!env.DB) {
    return json({ error: "Database not configured" }, 500);
  }
  await initDB(env);
  if (path === "/api/chat/start" && method === "POST") {
    const auth = await requireAdminOrApiKey(req, env, "chat:send");
    if (auth) return auth;
    const body = await req.json().catch(() => ({}));
    return startChat(env, body);
  }
  if (path === "/api/chat/sync" && method === "GET") {
    const auth = await requireAdminOrApiKey(req, env, "chat:read");
    if (auth) return auth;
    return syncChat(env, url);
  }
  if (path === "/api/chat/send" && method === "POST") {
    const auth = await requireAdminOrApiKey(req, env, "chat:send");
    if (auth) return auth;
    const body = await req.json().catch(() => ({}));
    return sendMessage(env, body, req.url);
  }
  if (path === "/api/admin/chats/block" && method === "POST") {
    const body = await req.json().catch(() => ({}));
    return blockSession(env, body);
  }
  if (path === "/api/admin/chats/delete" && method === "DELETE") {
    let sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      const body = await req.json().catch(() => ({}));
      sessionId = String(body.sessionId || "").trim();
    }
    return deleteSession(env, sessionId);
  }
  if (path === "/api/admin/chats/sessions" && method === "GET") {
    return getSessions(env);
  }
  if (path.startsWith("/api/admin/")) {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
  }
  if (isAdminOnlyNonPrefixedRoute(path, method)) {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
  }
  if (method === "GET" && path === "/api/admin/seo/minimal") {
    return getMinimalSEOSettings(env);
  }
  if (method === "POST" && path === "/api/admin/seo/minimal") {
    const body = await req.json().catch(() => ({}));
    return saveMinimalSEOSettings(env, body);
  }
  if (method === "GET" && path === "/api/admin/analytics") {
    return getAnalyticsSettingsApi(env);
  }
  if (method === "POST" && path === "/api/admin/analytics") {
    const body = await req.json().catch(() => ({}));
    return saveAnalyticsSettings(env, body);
  }
  if (method === "GET" && path === "/api/admin/email-templates") {
    return getEmailTemplatesApi(env, req);
  }
  if (method === "POST" && path === "/api/admin/email-templates") {
    const body = await req.json().catch(() => ({}));
    return saveEmailTemplateApi(env, body);
  }
  if (method === "POST" && path === "/api/admin/email/send") {
    const body = await req.json().catch(() => ({}));
    return sendCustomEmailApi(env, body);
  }
  if (method === "POST" && path === "/api/lead") {
    const body = await req.json().catch(() => ({}));
    return addLeadApi(env, body);
  }
  if (method === "GET" && path === "/api/admin/noindex/list") {
    return getNoindexList(env, req);
  }
  if (method === "POST" && path === "/api/admin/noindex/add") {
    const body = await req.json().catch(() => ({}));
    return addNoindexUrl(env, body);
  }
  if (method === "POST" && path === "/api/admin/noindex/remove") {
    const body = await req.json().catch(() => ({}));
    return removeNoindexUrl(env, body);
  }
  if (method === "GET" && path === "/api/admin/webhooks/settings") {
    return getWebhooksSettings(env);
  }
  if (method === "POST" && path === "/api/admin/webhooks/settings") {
    const body = await req.json().catch(() => ({}));
    return saveWebhooksSettings(env, body);
  }
  if (method === "POST" && path.startsWith("/api/admin/webhooks/test/")) {
    const endpointId = path.split("/").pop();
    return testWebhook(env, endpointId);
  }
  if (method === "GET" && path === "/api/backup/history") {
    const auth = await requireBackupAuth(req, env, "backup:history");
    if (auth) return auth;
    return getBackupHistory(env);
  }
  if (method === "POST" && path === "/api/backup/create") {
    const auth = await requireBackupAuth(req, env, "backup:create");
    if (auth) return auth;
    return createBackup(env, { req_url: req.url, trigger: "api" });
  }
  if (method === "GET" && path.startsWith("/api/backup/download/")) {
    const auth = await requireBackupAuth(req, env, "backup:download");
    if (auth) return auth;
    const backupId = path.split("/").pop();
    return downloadBackup(env, backupId);
  }
  if (method === "POST" && path === "/api/backup/restore") {
    const auth = await requireBackupAuth(req, env, "backup:restore");
    if (auth) return auth;
    const body = await req.json().catch(() => ({}));
    return restoreBackup(env, body);
  }
  if (method === "GET" && path === "/api/admin/backup/history") {
    return getBackupHistory(env);
  }
  if (method === "POST" && path === "/api/admin/backup/create") {
    return createBackup(env, { req_url: req.url, trigger: "admin" });
  }
  if (method === "POST" && path === "/api/admin/backup/restore") {
    const body = await req.json().catch(() => ({}));
    return restoreBackup(env, body);
  }
  if (method === "POST" && path === "/api/admin/backup/import") {
    const body = await req.json().catch(() => ({}));
    return importBackup(env, body);
  }
  if (method === "GET" && path.startsWith("/api/admin/backup/download/")) {
    const backupId = path.split("/").pop();
    return downloadBackup(env, backupId);
  }
  if (method === "GET" && path === "/api/admin/settings/clean") {
    return getCleanSettingsApi(env);
  }
  if (method === "POST" && path === "/api/admin/settings/clean") {
    const body = await req.json().catch(() => ({}));
    return saveCleanSettingsApi(env, body);
  }
  if (method === "POST" && path === "/api/admin/settings/media/upload") {
    return uploadSettingsMediaFile(env, req, url);
  }
  if (method === "GET" && path === "/api/admin/settings/media/list") {
    return listSettingsMediaFiles(env, req, url);
  }
  if (method === "DELETE" && path === "/api/admin/settings/media/delete") {
    return deleteSettingsMediaFile(env, req, url);
  }
  if (method === "GET" && path.startsWith("/api/r2/settings-media/")) {
    const parts = path.split("/");
    const mediaId = parseInt(parts[4] || "", 10);
    if (!Number.isFinite(mediaId) || mediaId <= 0) {
      return json({ error: "Invalid media id" }, 400);
    }
    return getPublicSettingsMediaFile(env, mediaId);
  }
  if (method === "POST" && path === "/api/purge-cache") {
    return purgeCache(env);
  }
  if (method === "GET" && path === "/api/products") {
    const response = await getProducts(env, url);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=30, s-maxage=60");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "GET" && path === "/api/products/list") {
    return getProductsList(env);
  }
  if (method === "POST" && path === "/api/products/status") {
    const body = await req.json().catch(() => ({}));
    return updateProductStatus(env, body);
  }
  if (method === "POST" && path === "/api/products/duplicate") {
    const body = await req.json().catch(() => ({}));
    return duplicateProduct(env, body);
  }
  if (method === "GET" && path.startsWith("/api/product/")) {
    if (path.match(/^\/api\/product\/(\d+)\/adjacent$/)) {
      const id2 = path.split("/")[3];
      const response2 = await getAdjacentProducts(env, id2);
      const newHeaders2 = new Headers(response2.headers);
      newHeaders2.set("Cache-Control", "public, max-age=30, s-maxage=60");
      return new Response(response2.body, { status: response2.status, headers: newHeaders2 });
    }
    const id = path.split("/").pop();
    const response = await getProduct(env, id, { includeHidden: await isAdminAuthed(req, env) });
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=15, s-maxage=30");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "POST" && path === "/api/product/save") {
    const body = await req.json().catch(() => ({}));
    const resp = await saveProduct(env, body);
    try {
      const data = await resp.clone().json().catch(() => ({}));
      if (data && data.success && data.url && caches && caches.default) {
        const origin = new URL(req.url).origin;
        const full = new URL(String(data.url), origin).toString();
        const cacheKey = new Request(full, {
          method: "GET",
          headers: { "Accept": "text/html" }
        });
        await caches.default.delete(cacheKey);
      }
    } catch (_) {
    }
    return resp;
  }
  if (method === "DELETE" && path === "/api/product/delete") {
    const id = url.searchParams.get("id");
    return deleteProduct(env, id);
  }
  if (method === "POST" && path === "/api/admin/products/delete-all") {
    return deleteAllProducts(env);
  }
  if (method === "POST" && path === "/api/whop/create-checkout") {
    const body = await req.json();
    return createCheckout(env, body, url.origin);
  }
  if (method === "POST" && path === "/api/whop/create-plan-checkout") {
    const body = await req.json();
    return createPlanCheckout(env, body, url.origin);
  }
  if (method === "POST" && path === "/api/whop/webhook") {
    const rawBody = parsedWebhookPayload?.rawBody || "";
    const body = parsedWebhookPayload?.body || {};
    return handleWebhook(env, body, req.headers, rawBody);
  }
  if (method === "GET" && path === "/api/whop/test-api") {
    return testApi(env);
  }
  if (method === "POST" && path === "/api/whop/cleanup") {
    return cleanupExpired(env);
  }
  if (method === "POST" && path === "/api/paypal/create-order") {
    const body = await req.json();
    return createPayPalOrder(env, body, url.origin);
  }
  if (method === "POST" && path === "/api/paypal/capture-order") {
    const body = await req.json();
    return capturePayPalOrder(env, body);
  }
  if (method === "POST" && path === "/api/paypal/webhook") {
    const rawBody = parsedWebhookPayload?.rawBody || "";
    const body = parsedWebhookPayload?.body || {};
    return handlePayPalWebhook(env, body, req.headers, rawBody);
  }
  if (method === "GET" && path === "/api/paypal/client-id") {
    return getPayPalClientId(env);
  }
  if (method === "GET" && path === "/api/paypal/test") {
    return testPayPalConnection(env);
  }
  if (method === "GET" && path === "/api/payment/methods") {
    return getPaymentMethods(env);
  }
  if (method === "GET" && path === "/api/settings/payments") {
    return getAllPaymentSettings(env);
  }
  if (method === "POST" && path === "/api/settings/payments") {
    const body = await req.json();
    return savePaymentMethodSettings(env, body);
  }
  if (method === "GET" && path === "/api/settings/paypal") {
    return getPayPalSettings(env);
  }
  if (method === "POST" && path === "/api/settings/paypal") {
    const body = await req.json();
    return savePayPalSettings(env, body);
  }
  if (method === "GET" && path === "/api/settings/payment-methods") {
    return getPaymentMethodsStatus(env);
  }
  if (method === "POST" && path === "/api/settings/payment-methods") {
    const body = await req.json();
    return savePaymentMethodsEnabled(env, body);
  }
  if (method === "GET" && path === "/api/admin/payment-universal/gateways") {
    return handleGetPaymentGateways(env);
  }
  if (method === "POST" && path === "/api/admin/payment-universal/gateways") {
    const body = await req.json();
    return handleAddPaymentGateway(env, body);
  }
  if (method === "PUT" && path === "/api/admin/payment-universal/gateways") {
    const body = await req.json();
    return handleUpdatePaymentGateway(env, body);
  }
  if (method === "DELETE" && path === "/api/admin/payment-universal/gateways") {
    const id = url.searchParams.get("id");
    return handleDeletePaymentGateway(env, id);
  }
  if (method === "POST" && path === "/api/payment/universal/webhook") {
    const rawBody = parsedWebhookPayload?.rawBody || "";
    const body = parsedWebhookPayload?.body || {};
    return handleUniversalWebhook(env, body, req.headers, rawBody);
  }
  if (method === "GET" && path === "/api/payment/universal/test") {
    return handleUniversalPaymentAPI(env);
  }
  if (method === "GET" && path === "/api/payment/whop/checkout-settings") {
    return getWhopCheckoutSettings(env);
  }
  if (method === "GET" && path === "/api/orders") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return getOrders(env);
  }
  if (method === "POST" && (path === "/api/order/create" || path === "/submit-order")) {
    const body = await req.json();
    if (body.manualOrder === true) {
      const adminGate = await requireAdminApi(req, env);
      if (adminGate) return adminGate;
      return createManualOrder(env, body);
    }
    return createOrder(env, body);
  }
  if (method === "GET" && path.startsWith("/api/order/buyer/")) {
    const orderId = path.split("/").pop();
    return getBuyerOrder(env, orderId);
  }
  if (method === "DELETE" && path === "/api/order/delete") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const id = url.searchParams.get("id");
    return deleteOrder(env, id);
  }
  if (method === "POST" && path === "/api/admin/orders/delete-all") {
    return deleteAllOrders(env);
  }
  if (method === "POST" && path === "/api/order/update") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return updateOrder(env, body);
  }
  if (method === "POST" && path === "/api/order/deliver") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return deliverOrder(env, body);
  }
  if (method === "POST" && path === "/api/order/revision") {
    const body = await req.json();
    return requestRevision(env, body);
  }
  if (method === "POST" && path === "/api/order/portfolio") {
    const body = await req.json();
    return updatePortfolio(env, body);
  }
  if (method === "POST" && path === "/api/order/archive-link") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return updateArchiveLink(env, body);
  }
  if (method === "POST" && path === "/api/order/tip-paid") {
    const body = await req.json();
    return markTipPaid(env, body);
  }
  if (method === "POST" && path === "/api/order/upload-encrypted-file") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return uploadEncryptedFile(env, req, url);
  }
  if (method === "GET" && path === "/api/admin/reviews/migrate/status") {
    return getReviewMigrationStatus(env);
  }
  if (method === "POST" && path === "/api/admin/reviews/migrate") {
    return migrateReviewMediaFromOrders(env);
  }
  if (method === "GET" && path === "/api/reviews") {
    const response = await getReviews(env, url);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=30, s-maxage=60");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "POST" && path === "/api/reviews/add") {
    const body = await req.json();
    return addReview(env, body);
  }
  if (method === "POST" && path === "/api/reviews/save") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return addReview(env, body, { allowStatusOverride: true, notify: false });
  }
  if (method === "GET" && (/^\/api\/reviews\/\d+$/.test(path) || path.startsWith("/api/reviews/product/"))) {
    const productId = path.split("/").pop();
    if (!/^\d+$/.test(String(productId || "").trim())) {
      return json({ error: "Not found" }, 404);
    }
    const response = await getProductReviews(env, productId);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=30, s-maxage=60");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "POST" && path === "/api/reviews/update") {
    const body = await req.json();
    return updateReview(env, body);
  }
  if (method === "DELETE" && path === "/api/reviews/delete") {
    const id = url.searchParams.get("id");
    return deleteReview(env, id);
  }
  if (method === "GET" && path === "/api/admin/settings/whop") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return getWhopSettings(env);
  }
  if (method === "POST" && path === "/api/admin/settings/whop") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return saveWhopSettings(env, body);
  }
  if (method === "GET" && path === "/api/settings/whop") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return getWhopSettings(env);
  }
  if (method === "POST" && path === "/api/settings/whop") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return saveWhopSettings(env, body);
  }
  if (method === "GET" && path === "/api/settings/branding") {
    return getBrandingSettings(env);
  }
  if (method === "POST" && path === "/api/settings/branding") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return saveBrandingSettings(env, body);
  }
  if (method === "GET" && path === "/api/admin/settings/cobalt") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return getCobaltSettings(env);
  }
  if (method === "POST" && path === "/api/admin/settings/cobalt") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return saveCobaltSettings(env, body);
  }
  if (method === "GET" && path === "/api/settings/cobalt") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return getCobaltSettings(env);
  }
  if (method === "POST" && path === "/api/settings/cobalt") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return saveCobaltSettings(env, body);
  }
  if (method === "GET" && path === "/api/admin/settings/components") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    return getSiteComponents(env);
  }
  if (method === "POST" && path === "/api/admin/settings/components") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return saveSiteComponents(env, body);
  }
  if (method === "GET" && path === "/api/settings/components") {
    return getSiteComponents(env, { publicView: true });
  }
  if (method === "POST" && path === "/api/settings/components") {
    const adminGate = await requireAdminApi(req, env);
    if (adminGate) return adminGate;
    const body = await req.json();
    return saveSiteComponents(env, body);
  }
  if (method === "GET" && path === "/api/coupons") {
    return getCoupons(env);
  }
  if (method === "GET" && path === "/api/coupons/active") {
    return getActiveCoupons(env);
  }
  if (method === "GET" && path === "/api/coupons/enabled") {
    return getCouponsEnabled(env);
  }
  if (method === "POST" && path === "/api/coupons/enabled") {
    const body = await req.json();
    return setCouponsEnabled(env, body);
  }
  if (method === "POST" && path === "/api/coupons/validate") {
    const body = await req.json();
    return validateCoupon(env, body);
  }
  if (method === "POST" && path === "/api/coupons/create") {
    const body = await req.json();
    return createCoupon(env, body);
  }
  if (method === "POST" && path === "/api/coupons/update") {
    const body = await req.json();
    return updateCoupon(env, body);
  }
  if (method === "DELETE" && path === "/api/coupons/delete") {
    const id = url.searchParams.get("id");
    return deleteCoupon(env, id);
  }
  if (method === "POST" && path === "/api/coupons/status") {
    const body = await req.json();
    return toggleCouponStatus(env, body);
  }
  if (method === "GET" && path === "/api/pages") {
    return getPages(env);
  }
  if (method === "GET" && path === "/api/pages/list") {
    return getPagesList(env);
  }
  if (method === "GET" && path.startsWith("/api/page/")) {
    const slug = path.split("/").pop();
    return getPage(env, slug);
  }
  if (method === "POST" && path === "/api/page/save") {
    const body = await req.json();
    return savePage(env, body);
  }
  if (method === "DELETE" && path === "/api/page/delete") {
    const id = url.searchParams.get("id");
    return deletePage(env, id);
  }
  if (method === "POST" && path === "/api/pages/save") {
    const body = await req.json();
    return savePageBuilder(env, body);
  }
  if (method === "POST" && path === "/api/pages/delete") {
    const body = await req.json().catch(() => ({}));
    return deletePageBySlug(env, body);
  }
  if (method === "POST" && path === "/api/admin/pages/delete-all") {
    const body = await req.json().catch(() => ({}));
    return deleteAllPages(env, body);
  }
  if (method === "POST" && path === "/api/pages/status") {
    const body = await req.json().catch(() => ({}));
    return updatePageStatus(env, body);
  }
  if (method === "POST" && path === "/api/pages/duplicate") {
    const body = await req.json().catch(() => ({}));
    return duplicatePage(env, body);
  }
  if (method === "GET" && path === "/api/pages/load") {
    const name = url.searchParams.get("name");
    return loadPageBuilder(env, name);
  }
  if (method === "GET" && path === "/api/pages/default") {
    const pageType = url.searchParams.get("type");
    return getDefaultPage(env, pageType);
  }
  if (method === "POST" && path === "/api/pages/set-default") {
    const body = await req.json().catch(() => ({}));
    return setDefaultPage(env, body);
  }
  if (method === "POST" && path === "/api/pages/clear-default") {
    const body = await req.json().catch(() => ({}));
    return clearDefaultPage(env, body);
  }
  if (method === "POST" && path === "/api/pages/type") {
    const body = await req.json().catch(() => ({}));
    return updatePageType(env, body);
  }
  if (method === "GET" && path === "/api/blogs") {
    return getBlogs(env);
  }
  if (method === "GET" && path === "/api/blogs/list") {
    return getBlogsList(env);
  }
  if (method === "GET" && path === "/api/blogs/published") {
    return getPublishedBlogs(env, url);
  }
  if (method === "GET" && path.startsWith("/api/blog/previous/")) {
    const id = parseInt(path.split("/").pop());
    const limit = parseInt(url.searchParams.get("limit") || "2");
    return getPreviousBlogs(env, id, limit);
  }
  if (method === "GET" && path.startsWith("/api/blog/public/")) {
    const slug = path.split("/").pop();
    return getPublishedBlog(env, slug);
  }
  if (method === "GET" && path.startsWith("/api/blog/")) {
    const idOrSlug = path.split("/").pop();
    return getBlog(env, idOrSlug);
  }
  if (method === "POST" && path === "/api/blog/save") {
    const body = await req.json();
    return saveBlog(env, body);
  }
  if (method === "DELETE" && path === "/api/blog/delete") {
    const id = url.searchParams.get("id");
    return deleteBlog(env, id);
  }
  if (method === "POST" && path === "/api/blogs/status") {
    const body = await req.json().catch(() => ({}));
    return updateBlogStatus(env, body);
  }
  if (method === "POST" && path === "/api/blogs/duplicate") {
    const body = await req.json().catch(() => ({}));
    return duplicateBlog(env, body);
  }
  if (method === "POST" && path === "/api/admin/blogs/delete-all") {
    return deleteAllBlogs(env);
  }
  if (method === "GET" && path.startsWith("/api/blog/comments/")) {
    const blogId = parseInt(path.split("/").pop());
    return getBlogComments(env, blogId);
  }
  if (method === "POST" && path === "/api/blog/comments/check-pending") {
    const body = await req.json().catch(() => ({}));
    return checkPendingComment(env, body.blog_id, body.email);
  }
  if (method === "POST" && path === "/api/blog/comments/add") {
    const body = await req.json();
    return addBlogComment(env, body);
  }
  if (method === "GET" && path === "/api/admin/blog-comments") {
    return getAdminComments(env, url);
  }
  if (method === "POST" && path === "/api/admin/blog-comments/status") {
    const body = await req.json().catch(() => ({}));
    return updateCommentStatus(env, body);
  }
  if (method === "DELETE" && path === "/api/admin/blog-comments/delete") {
    const id = url.searchParams.get("id");
    return deleteComment(env, id);
  }
  if (method === "POST" && path === "/api/admin/blog-comments/bulk") {
    const body = await req.json().catch(() => ({}));
    return bulkUpdateComments(env, body);
  }
  if (method === "GET" && path === "/api/admin/users") {
    try {
      const [commentUsers, forumQUsers, forumRUsers, orders] = await Promise.all([
        // Get emails from blog_comments with counts
        env.DB.prepare(`
          SELECT 
            LOWER(email) as email,
            MAX(name) as name,
            COUNT(*) as comment_count,
            MAX(created_at) as last_activity
          FROM blog_comments
          GROUP BY LOWER(email)
        `).all().catch(() => ({ results: [] })),
        // Get emails from forum_questions
        env.DB.prepare(`
          SELECT 
            LOWER(email) as email,
            MAX(name) as name,
            COUNT(*) as question_count,
            MAX(created_at) as last_activity
          FROM forum_questions
          WHERE email IS NOT NULL AND email != ''
          GROUP BY LOWER(email)
        `).all().catch(() => ({ results: [] })),
        // Get emails from forum_replies
        env.DB.prepare(`
          SELECT 
            LOWER(email) as email,
            MAX(name) as name,
            COUNT(*) as reply_count,
            MAX(created_at) as last_activity
          FROM forum_replies
          WHERE email IS NOT NULL AND email != ''
          GROUP BY LOWER(email)
        `).all().catch(() => ({ results: [] })),
        // Get orders for email extraction
        env.DB.prepare(`
          SELECT id, order_id, encrypted_data, created_at FROM orders
        `).all().catch(() => ({ results: [] }))
      ]);
      const userMap = /* @__PURE__ */ new Map();
      for (const u of commentUsers.results || []) {
        if (!u.email) continue;
        const email = u.email.toLowerCase().trim();
        if (!userMap.has(email)) {
          userMap.set(email, {
            email,
            name: u.name || "",
            order_count: 0,
            comment_count: 0,
            forum_count: 0,
            last_activity: 0
          });
        }
        const user = userMap.get(email);
        user.comment_count = u.comment_count || 0;
        user.name = user.name || u.name || "";
        if (u.last_activity > user.last_activity) user.last_activity = u.last_activity;
      }
      for (const u of forumQUsers.results || []) {
        if (!u.email) continue;
        const email = u.email.toLowerCase().trim();
        if (!userMap.has(email)) {
          userMap.set(email, {
            email,
            name: u.name || "",
            order_count: 0,
            comment_count: 0,
            forum_count: 0,
            last_activity: 0
          });
        }
        const user = userMap.get(email);
        user.forum_count = (user.forum_count || 0) + (u.question_count || 0);
        user.name = user.name || u.name || "";
        if (u.last_activity > user.last_activity) user.last_activity = u.last_activity;
      }
      for (const u of forumRUsers.results || []) {
        if (!u.email) continue;
        const email = u.email.toLowerCase().trim();
        if (!userMap.has(email)) {
          userMap.set(email, {
            email,
            name: u.name || "",
            order_count: 0,
            comment_count: 0,
            forum_count: 0,
            last_activity: 0
          });
        }
        const user = userMap.get(email);
        user.forum_count = (user.forum_count || 0) + (u.reply_count || 0);
        user.name = user.name || u.name || "";
        if (u.last_activity > user.last_activity) user.last_activity = u.last_activity;
      }
      for (const o of orders.results || []) {
        try {
          if (o.encrypted_data) {
            const data = JSON.parse(o.encrypted_data);
            const email = (data.email || data.buyerEmail || "").toLowerCase().trim();
            const name = data.name || data.buyerName || "";
            if (email) {
              if (!userMap.has(email)) {
                userMap.set(email, {
                  email,
                  name,
                  order_count: 0,
                  comment_count: 0,
                  forum_count: 0,
                  last_activity: 0
                });
              }
              const user = userMap.get(email);
              user.order_count = (user.order_count || 0) + 1;
              user.name = user.name || name;
              const orderTime = new Date(o.created_at).getTime() || 0;
              if (orderTime > user.last_activity) user.last_activity = orderTime;
            }
          }
        } catch (e) {
        }
      }
      const users = Array.from(userMap.values()).filter((u) => u.email).sort((a, b) => (b.last_activity || 0) - (a.last_activity || 0));
      return json({
        success: true,
        users,
        total: users.length
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/admin/user-details") {
    try {
      const email = (url.searchParams.get("email") || "").toLowerCase().trim();
      if (!email) {
        return json({ error: "Email required" }, 400);
      }
      const [comments, forumQuestions, forumReplies, allOrders] = await Promise.all([
        // Get blog comments
        env.DB.prepare(`
          SELECT c.*, b.title as blog_title, b.slug as blog_slug
          FROM blog_comments c
          LEFT JOIN blogs b ON c.blog_id = b.id
          WHERE LOWER(c.email) = ?
          ORDER BY c.created_at DESC
        `).bind(email).all().catch(() => ({ results: [] })),
        // Get forum questions
        env.DB.prepare(`
          SELECT * FROM forum_questions
          WHERE LOWER(email) = ?
          ORDER BY created_at DESC
        `).bind(email).all().catch(() => ({ results: [] })),
        // Get forum replies
        env.DB.prepare(`
          SELECT r.*, q.title as question_title, q.slug as question_slug
          FROM forum_replies r
          LEFT JOIN forum_questions q ON r.question_id = q.id
          WHERE LOWER(r.email) = ?
          ORDER BY r.created_at DESC
        `).bind(email).all().catch(() => ({ results: [] })),
        // Get orders
        env.DB.prepare(`
          SELECT * FROM orders ORDER BY created_at DESC
        `).all().catch(() => ({ results: [] }))
      ]);
      const userOrders = [];
      for (const o of allOrders.results || []) {
        try {
          if (o.archive_data) {
            const data = JSON.parse(o.archive_data);
            const orderEmail = (data.email || data.buyerEmail || "").toLowerCase().trim();
            if (orderEmail === email) {
              userOrders.push({
                ...o,
                buyer_name: data.name || data.buyerName || "",
                buyer_email: orderEmail
              });
            }
          }
        } catch (e) {
        }
      }
      return json({
        success: true,
        email,
        orders: userOrders,
        comments: comments.results || [],
        forumQuestions: forumQuestions.results || [],
        forumReplies: forumReplies.results || []
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/forum/questions") {
    const response = await getPublishedQuestions(env, url);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=30, s-maxage=60");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "GET" && path.startsWith("/api/forum/question/")) {
    const slug = path.split("/").pop();
    const response = await getQuestion(env, slug);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=15, s-maxage=30");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "GET" && path === "/api/forum/question-replies") {
    const questionId = parseInt(url.searchParams.get("question_id") || "0");
    const response = await getQuestionReplies(env, questionId);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=15, s-maxage=30");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "GET" && path === "/api/forum/question-by-id") {
    const id = url.searchParams.get("id");
    const response = await getQuestionById(env, id);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=15, s-maxage=30");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "POST" && path === "/api/forum/check-pending") {
    const body = await req.json().catch(() => ({}));
    return checkPendingForum(env, (body.email || "").toLowerCase());
  }
  if (method === "POST" && path === "/api/forum/submit-question") {
    const body = await req.json();
    return submitQuestion(env, body);
  }
  if (method === "POST" && path === "/api/forum/submit-reply") {
    const body = await req.json();
    return submitReply(env, body);
  }
  if (method === "GET" && path === "/api/forum/sidebar") {
    const questionId = parseInt(url.searchParams.get("question_id") || "1");
    const response = await getForumSidebar(env, questionId);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "GET" && path === "/api/admin/forum/questions") {
    return getAdminQuestions(env, url);
  }
  if (method === "POST" && path === "/api/admin/forum/migrate") {
    try {
      let existingReplies = [];
      try {
        const result = await env.DB.prepare(`SELECT * FROM forum_replies`).all();
        existingReplies = result.results || [];
      } catch (e) {
      }
      await env.DB.prepare(`DROP TABLE IF EXISTS forum_replies`).run();
      await env.DB.prepare(`
        CREATE TABLE forum_replies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id INTEGER NOT NULL DEFAULT 0,
          name TEXT NOT NULL DEFAULT '',
          email TEXT DEFAULT '',
          content TEXT NOT NULL DEFAULT '',
          status TEXT DEFAULT 'pending',
          created_at INTEGER
        )
      `).run();
      let restoredReplies = 0;
      const batchSize = 10;
      for (let i = 0; i < existingReplies.length; i += batchSize) {
        const batch = existingReplies.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(
          (r) => env.DB.prepare(`
            INSERT INTO forum_replies (question_id, name, email, content, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            r.question_id || 0,
            r.name || "",
            r.email || "",
            r.content || "",
            r.status || "pending",
            r.created_at || Date.now()
          ).run()
        ));
        restoredReplies += results.filter((r) => r.status === "fulfilled").length;
      }
      let existingQuestions = [];
      try {
        const result = await env.DB.prepare(`SELECT * FROM forum_questions`).all();
        existingQuestions = result.results || [];
      } catch (e) {
      }
      await env.DB.prepare(`DROP TABLE IF EXISTS forum_questions`).run();
      await env.DB.prepare(`
        CREATE TABLE forum_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL DEFAULT '',
          slug TEXT UNIQUE,
          content TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL DEFAULT '',
          email TEXT DEFAULT '',
          status TEXT DEFAULT 'pending',
          reply_count INTEGER DEFAULT 0,
          created_at INTEGER,
          updated_at INTEGER
        )
      `).run();
      const usedForumSlugs = /* @__PURE__ */ new Set();
      const buildMigratedForumSlug = /* @__PURE__ */ __name((question, fallbackIndex) => {
        const baseSlug = slugifyStr(String(question?.slug || question?.title || "")).slice(0, 80).replace(/^-+|-+$/g, "") || `question-${fallbackIndex}`;
        let candidate = baseSlug;
        let suffix = 1;
        while (usedForumSlugs.has(candidate)) {
          candidate = `${baseSlug}-${suffix++}`;
        }
        usedForumSlugs.add(candidate);
        return candidate;
      }, "buildMigratedForumSlug");
      let restoredQuestions = 0;
      for (let i = 0; i < existingQuestions.length; i += batchSize) {
        const batch = existingQuestions.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(
          (q, batchIndex) => env.DB.prepare(`
            INSERT INTO forum_questions (title, slug, content, name, email, status, reply_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            q.title || "",
            buildMigratedForumSlug(q, i + batchIndex + 1),
            q.content || "",
            q.name || "",
            q.email || "",
            q.status || "pending",
            q.reply_count || 0,
            q.created_at || Date.now(),
            q.updated_at || Date.now()
          ).run()
        ));
        restoredQuestions += results.filter((r) => r.status === "fulfilled").length;
      }
      return json({
        success: true,
        message: "Forum tables migrated successfully",
        restored: {
          questions: restoredQuestions,
          replies: restoredReplies
        }
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/admin/forum/replies") {
    return getAdminReplies(env, url);
  }
  if (method === "POST" && path === "/api/admin/forum/question-status") {
    const body = await req.json().catch(() => ({}));
    return updateQuestionStatus(env, body);
  }
  if (method === "POST" && path === "/api/admin/forum/reply-status") {
    const body = await req.json().catch(() => ({}));
    return updateReplyStatus(env, body);
  }
  if (method === "DELETE" && path === "/api/admin/forum/question") {
    const id = url.searchParams.get("id");
    return deleteQuestion(env, id);
  }
  if (method === "DELETE" && path === "/api/admin/forum/reply") {
    const id = url.searchParams.get("id");
    return deleteReply(env, id);
  }
  if (method === "POST" && path === "/api/admin/forum/delete-all") {
    return deleteAllForumContent(env);
  }
  if (method === "GET" && path === "/api/r2/file") {
    const key = String(url.searchParams.get("key") || "").trim();
    if (!key) {
      return getR2File(env, key);
    }
    if (!key.startsWith("temp/")) {
      const adminGate = await requireAdminApi(req, env);
      if (adminGate) return adminGate;
    }
    return getR2File(env, key);
  }
  if (method === "GET" && path === "/api/admin/export/full") {
    try {
      const [products, pages, reviews, orders, settings, blogs] = await Promise.all([
        env.DB.prepare("SELECT * FROM products").all(),
        env.DB.prepare("SELECT * FROM pages").all(),
        env.DB.prepare("SELECT * FROM reviews").all(),
        env.DB.prepare("SELECT * FROM orders").all(),
        env.DB.prepare("SELECT * FROM settings").all(),
        env.DB.prepare("SELECT * FROM blogs").all()
      ]);
      return json({
        success: true,
        data: {
          products: products.results || [],
          pages: pages.results || [],
          reviews: reviews.results || [],
          orders: orders.results || [],
          settings: settings.results || [],
          blogs: blogs.results || [],
          exportedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/admin/export/products") {
    try {
      const products = await env.DB.prepare("SELECT * FROM products").all();
      return json({ success: true, data: products.results || [] });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/admin/export/pages") {
    try {
      const pages = await env.DB.prepare("SELECT * FROM pages").all();
      return json({ success: true, data: pages.results || [] });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/admin/export/blogs") {
    try {
      const blogs = await env.DB.prepare("SELECT * FROM blogs").all();
      return json({ success: true, data: blogs.results || [] });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/admin/export/products/csv") {
    try {
      const products = await env.DB.prepare("SELECT * FROM products").all();
      const columns = ["id", "title", "slug", "description", "normal_price", "sale_price", "instant_delivery", "normal_delivery_text", "thumbnail_url", "video_url", "gallery_images", "addons_json", "seo_title", "seo_description", "seo_keywords", "seo_canonical", "whop_plan", "whop_price_map", "whop_product_id", "status", "featured", "sort_order", "created_at", "updated_at"];
      return csvResponse(rowsToCsv(products.results || [], columns), "products.csv");
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/admin/export/blogs/csv") {
    try {
      const blogs = await env.DB.prepare("SELECT * FROM blogs").all();
      const columns = ["id", "title", "slug", "description", "content", "thumbnail_url", "custom_css", "custom_js", "seo_title", "seo_description", "seo_keywords", "status", "created_at", "updated_at"];
      return csvResponse(rowsToCsv(blogs.results || [], columns), "blogs.csv");
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "POST" && path === "/api/admin/import/blogs") {
    try {
      const body = await req.json();
      const blogs = body.blogs || body;
      if (!Array.isArray(blogs)) {
        return json({ error: "Invalid data format" }, 400);
      }
      const now = Date.now();
      const validBlogs = blogs.filter((b) => b.title);
      const batchSize = 10;
      let imported = 0;
      for (let i = 0; i < validBlogs.length; i += batchSize) {
        const batch = validBlogs.slice(i, i + batchSize);
        await Promise.all(batch.map(
          (b) => env.DB.prepare(`
            INSERT OR REPLACE INTO blogs (id, title, slug, description, content, thumbnail_url, custom_css, custom_js, seo_title, seo_description, seo_keywords, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            b.id || null,
            b.title,
            b.slug || "",
            b.description || "",
            b.content || "",
            b.thumbnail_url || "",
            b.custom_css || "",
            b.custom_js || "",
            b.seo_title || "",
            b.seo_description || "",
            b.seo_keywords || "",
            b.status || "draft",
            b.created_at || now,
            b.updated_at || now
          ).run().catch(() => null)
        ));
        imported += batch.length;
      }
      return json({ success: true, imported });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "POST" && path === "/api/admin/import/products") {
    try {
      const body = await req.json();
      const products = body.products || body;
      if (!Array.isArray(products)) {
        return json({ error: "Invalid data format" }, 400);
      }
      const validProducts = products.filter((p) => p.title);
      const batchSize = 10;
      let imported = 0;
      for (let i = 0; i < validProducts.length; i += batchSize) {
        const batch = validProducts.slice(i, i + batchSize);
        await Promise.all(batch.map((p) => {
          const addonsData = p.addons_json || p.addons || "[]";
          return env.DB.prepare(`
            INSERT OR REPLACE INTO products (id, title, slug, description, normal_price, sale_price, thumbnail_url, video_url, gallery_images, addons_json, status, sort_order, whop_plan, whop_price_map, whop_product_id, normal_delivery_text, instant_delivery, seo_title, seo_description, seo_keywords, seo_canonical)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            p.id || null,
            p.title,
            p.slug || "",
            p.description || "",
            p.normal_price || 0,
            p.sale_price || null,
            p.thumbnail_url || "",
            p.video_url || "",
            p.gallery_images || "[]",
            addonsData,
            p.status || "active",
            p.sort_order || 0,
            p.whop_plan || "",
            p.whop_price_map || "",
            p.whop_product_id || "",
            p.normal_delivery_text || "",
            p.instant_delivery || 0,
            p.seo_title || "",
            p.seo_description || "",
            p.seo_keywords || "",
            p.seo_canonical || ""
          ).run().catch(() => null);
        }));
        imported += batch.length;
      }
      return json({ success: true, imported });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "POST" && path === "/api/admin/import/pages") {
    try {
      const body = await req.json();
      const pages = body.pages || body;
      if (!Array.isArray(pages)) {
        return json({ error: "Invalid data format" }, 400);
      }
      const validPages = pages.filter((p) => p.slug || p.name);
      const batchSize = 10;
      let imported = 0;
      for (let i = 0; i < validPages.length; i += batchSize) {
        const batch = validPages.slice(i, i + batchSize);
        await Promise.all(batch.map(
          (p) => env.DB.prepare(`
            INSERT OR REPLACE INTO pages (id, name, slug, content, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            p.id || null,
            p.name || p.slug,
            p.slug || p.name,
            p.content || "",
            p.status || "active",
            p.created_at || Date.now()
          ).run().catch(() => null)
        ));
        imported += batch.length;
      }
      return json({ success: true, imported });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "POST" && path === "/api/admin/test-google-sync") {
    const body = await req.json().catch(() => ({}));
    const googleUrl = body.googleUrl;
    if (!googleUrl) {
      return json({ error: "Google Web App URL required" }, 400);
    }
    try {
      const testRes = await fetch(googleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping", timestamp: Date.now() })
      });
      if (testRes.ok) {
        return json({ success: true, message: "Google Sync test successful" });
      } else {
        return json({ error: "Google Apps Script returned error: " + testRes.status });
      }
    } catch (err) {
      return json({ error: "Failed to connect: " + err.message });
    }
  }
  if (method === "POST" && path === "/api/admin/clear-temp-files") {
    try {
      if (!env.R2_BUCKET) {
        return json({ success: true, count: 0, message: "R2 not configured" });
      }
      const listed = await env.R2_BUCKET.list({ prefix: "temp/", limit: 100 });
      let count = 0;
      for (const obj of listed.objects || []) {
        await env.R2_BUCKET.delete(obj.key);
        count++;
      }
      return json({ success: true, count });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "POST" && path === "/api/admin/clear-pending-checkouts") {
    try {
      const cutoff = Date.now() - 24 * 60 * 60 * 1e3;
      const result = await env.DB.prepare(
        "DELETE FROM pending_checkouts WHERE created_at < ?"
      ).bind(cutoff).run();
      return json({ success: true, count: result.changes || 0 });
    } catch (err) {
      return json({ success: true, count: 0, message: "No pending checkouts table or already empty" });
    }
  }
  if (method === "POST" && path === "/api/admin/delete-all-content") {
    try {
      if (!env.DB) {
        return json({ error: "Database not configured" }, 500);
      }
      await initDB(env);
      const tables = [
        "orders",
        "products",
        "reviews",
        "pages",
        "checkout_sessions",
        "chat_sessions",
        "chat_messages",
        "blogs",
        "blog_comments",
        "forum_questions",
        "forum_replies"
      ];
      let totalDeleted = 0;
      try {
        const tx = await env.DB.batch(
          tables.map((t) => env.DB.prepare(`DELETE FROM ${t}`))
        );
        totalDeleted = tables.length;
      } catch (e) {
        for (const t of tables) {
          try {
            const result = await env.DB.prepare(`DELETE FROM ${t}`).run();
            totalDeleted += result?.changes || 0;
          } catch (err) {
          }
        }
      }
      return json({ success: true, count: totalDeleted });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "POST" && path === "/api/admin/delete-user-photos") {
    try {
      if (!env.R2_BUCKET) {
        return json({ success: true, count: 0, message: "R2 not configured" });
      }
      const prefixes = ["orders/", "temp/"];
      let deletedCount = 0;
      for (const prefix of prefixes) {
        let cursor = void 0;
        do {
          const listOpts = { prefix, limit: 100 };
          if (cursor) listOpts.cursor = cursor;
          const listed = await env.R2_BUCKET.list(listOpts);
          for (const obj of listed.objects || []) {
            await env.R2_BUCKET.delete(obj.key);
            deletedCount++;
          }
          cursor = listed.truncated && listed.cursor ? listed.cursor : null;
        } while (cursor);
      }
      return json({ success: true, count: deletedCount });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/admin/export-data") {
    try {
      const [products, orders, reviews] = await Promise.all([
        env.DB.prepare("SELECT * FROM products").all(),
        env.DB.prepare("SELECT * FROM orders").all(),
        env.DB.prepare("SELECT * FROM reviews").all()
      ]);
      return json({
        success: true,
        data: {
          products: products.results || [],
          orders: orders.results || [],
          reviews: reviews.results || []
        }
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/admin/api-keys/permissions") {
    return getPermissionsList();
  }
  if (method === "GET" && path === "/api/admin/api-keys/ping") {
    return pingApiKey(env);
  }
  if (method === "POST" && path === "/api/admin/api-keys") {
    const body = await req.json().catch(() => ({}));
    return createApiKey(env, body);
  }
  if (method === "GET" && path === "/api/admin/api-keys") {
    return listApiKeys(env);
  }
  if (method === "GET" && path === "/api/admin/api-keys/analytics") {
    const id = url.searchParams.get("id");
    return getApiKeyAnalytics(env, id);
  }
  if (method === "GET" && path.startsWith("/api/admin/api-keys/")) {
    const id = path.split("/").pop();
    return getApiKey(env, id);
  }
  if (method === "PUT" && path.startsWith("/api/admin/api-keys/")) {
    const id = path.split("/").pop();
    const body = await req.json().catch(() => ({}));
    body.id = id;
    return updateApiKey(env, body);
  }
  if (method === "DELETE" && path.startsWith("/api/admin/api-keys/")) {
    const id = path.split("/").pop();
    return deleteApiKey(env, id);
  }
  return json({ error: "API endpoint not found", path, method }, 404);
}
__name(routeApiRequest, "routeApiRequest");

// src/utils/schema.js
function resolveSchemaBrandName(baseUrl, fallback = "Prankwish") {
  try {
    const hostname = new URL(String(baseUrl || "https://prankwish.com")).hostname.replace(/^www\./i, "");
    const firstLabel = hostname.split(".")[0] || "";
    const brand = firstLabel.split(/[-_]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    return brand || fallback;
  } catch (_) {
    return fallback;
  }
}
__name(resolveSchemaBrandName, "resolveSchemaBrandName");
function generateOfferObject(product, baseUrl) {
  const brandName = resolveSchemaBrandName(baseUrl);
  const price = parseFloat(product.sale_price || product.normal_price || 0);
  const date = /* @__PURE__ */ new Date();
  date.setFullYear(date.getFullYear() + 1);
  const priceValidUntil = date.toISOString().split("T")[0];
  const instantDelivery = product.instant_delivery;
  const isDigital = instantDelivery === 1 || instantDelivery === "1" || instantDelivery === true;
  let deliveryDays = 1;
  if (product.normal_delivery_text) {
    const match = String(product.normal_delivery_text).match(/\d+/);
    if (match) deliveryDays = parseInt(match[0]) || 1;
  } else if (product.delivery_time_days) {
    deliveryDays = parseInt(product.delivery_time_days) || 1;
  }
  const offer = {
    "@type": "Offer",
    "url": `${baseUrl}${canonicalProductPath(product)}`,
    "priceCurrency": "USD",
    "price": price.toString(),
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition",
    "priceValidUntil": priceValidUntil,
    "seller": {
      "@type": "Organization",
      "name": brandName
    }
  };
  offer.shippingDetails = {
    "@type": "OfferShippingDetails",
    "shippingDestination": {
      "@type": "DefinedRegion",
      "addressCountry": "US"
    },
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
        "minValue": isDigital ? 0 : 1,
        "maxValue": isDigital ? 0 : Math.max(1, deliveryDays),
        "unitCode": "DAY"
      }
    }
  };
  offer.hasMerchantReturnPolicy = {
    "@type": "MerchantReturnPolicy",
    "applicableCountry": "US",
    "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
    "merchantReturnDays": 0
  };
  return offer;
}
__name(generateOfferObject, "generateOfferObject");
function generateVideoObject(product, baseUrl) {
  const brandName = resolveSchemaBrandName(baseUrl);
  const videoUrl = product.video_url || product.preview_video_url || product.sample_video_url;
  if (!videoUrl) return null;
  const uploadDate = product.created_at ? new Date(product.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
  const duration = product.video_duration || "PT1M";
  const videoSchema = {
    "@type": "VideoObject",
    "name": `${product.title} - Personalized Video`,
    "description": product.seo_description || product.description || `Watch ${product.title} personalized video greeting`,
    "thumbnailUrl": product.thumbnail_url || `${baseUrl}/favicon.svg`,
    "uploadDate": uploadDate,
    "duration": duration,
    "contentUrl": videoUrl,
    "embedUrl": videoUrl,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "WatchAction" },
      "userInteractionCount": parseInt(product.view_count) || 0
    },
    "publisher": {
      "@type": "Organization",
      "name": brandName,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/favicon.svg`
      }
    }
  };
  videoSchema.potentialAction = {
    "@type": "WatchAction",
    "target": `${baseUrl}${canonicalProductPath(product)}`
  };
  return videoSchema;
}
__name(generateVideoObject, "generateVideoObject");
function generateProductSchema(product, baseUrl, reviews = []) {
  const brandName = resolveSchemaBrandName(baseUrl);
  const sku = product.slug ? `WV-${product.id}-${product.slug.toUpperCase().replace(/-/g, "")}` : `WV-${product.id}`;
  const productUrl = `${baseUrl}${canonicalProductPath(product)}`;
  const images = [];
  if (product.thumbnail_url) images.push(product.thumbnail_url);
  if (product.gallery_images) {
    try {
      const gallery = typeof product.gallery_images === "string" ? JSON.parse(product.gallery_images) : product.gallery_images;
      if (Array.isArray(gallery)) {
        images.push(...gallery.slice(0, 5));
      }
    } catch (e) {
    }
  }
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "@id": productUrl,
    "name": product.title,
    "description": product.seo_description || product.description || product.title,
    "sku": sku,
    "mpn": sku,
    "image": images.length > 0 ? images : [`${baseUrl}/favicon.svg`],
    "brand": {
      "@type": "Brand",
      "name": brandName,
      "logo": `${baseUrl}/favicon.svg`
    },
    "manufacturer": {
      "@type": "Organization",
      "name": brandName,
      "url": baseUrl
    },
    "category": "Digital Goods > Personalized Videos",
    "offers": generateOfferObject(product, baseUrl)
  };
  const videoObject = generateVideoObject(product, baseUrl);
  if (videoObject) {
    schema.video = videoObject;
    schema.subjectOf = {
      "@type": "VideoObject",
      "@id": `${productUrl}#video`,
      ...videoObject
    };
  }
  if (parseInt(product.review_count) > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": parseFloat(product.rating_average),
      "reviewCount": parseInt(product.review_count),
      "bestRating": 5,
      "worstRating": 1
    };
  }
  if (reviews && reviews.length > 0) {
    const limitedReviews = reviews.slice(0, 5);
    schema.review = limitedReviews.map((review) => ({
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
      "datePublished": review.created_at ? new Date(review.created_at).toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    }));
  }
  return JSON.stringify(schema);
}
__name(generateProductSchema, "generateProductSchema");
function generateVideoSchema(product, baseUrl) {
  const videoObject = generateVideoObject(product, baseUrl);
  if (!videoObject) {
    return "{}";
  }
  const schema = {
    "@context": "https://schema.org/",
    ...videoObject,
    "@id": `${baseUrl}${canonicalProductPath(product)}#video`
  };
  return JSON.stringify(schema);
}
__name(generateVideoSchema, "generateVideoSchema");
function generateCollectionSchema(products, baseUrl) {
  const brandName = resolveSchemaBrandName(baseUrl);
  if (!products || products.length === 0) {
    return "{}";
  }
  const itemListElement = products.map((product, index) => {
    const item = {
      "@type": "ListItem",
      "position": index + 1,
      "url": `${baseUrl}${canonicalProductPath(product)}`,
      "item": {
        "@type": "Product",
        "@id": `${baseUrl}${canonicalProductPath(product)}`,
        "name": product.title,
        "description": product.seo_description || product.description || product.title,
        "image": product.thumbnail_url ? [product.thumbnail_url] : [],
        "offers": generateOfferObject(product, baseUrl)
      }
    };
    const videoUrl = product.video_url || product.preview_video_url;
    if (videoUrl && product.thumbnail_url) {
      item.item.video = {
        "@type": "VideoObject",
        "name": product.title,
        "thumbnailUrl": product.thumbnail_url,
        "contentUrl": videoUrl
      };
    }
    if (product.review_count > 0) {
      item.item.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": parseFloat(product.rating_average) || 5,
        "reviewCount": parseInt(product.review_count) || 1,
        "bestRating": 5,
        "worstRating": 1
      };
    }
    return item;
  });
  const schema = {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    "name": `${brandName} Products`,
    "numberOfItems": products.length,
    "itemListElement": itemListElement
  };
  return JSON.stringify(schema);
}
__name(generateCollectionSchema, "generateCollectionSchema");
function generateBlogPostingSchema(blog, baseUrl) {
  const brandName = resolveSchemaBrandName(baseUrl);
  const blogHeadline = blog.seo_title || blog.title || "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blogHeadline,
    "description": (blog.seo_description || blog.description || "").substring(0, 160),
    "image": blog.thumbnail_url || `${baseUrl}/favicon.svg`,
    "datePublished": blog.created_at ? new Date(blog.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
    "dateModified": blog.updated_at ? new Date(blog.updated_at).toISOString() : blog.created_at ? new Date(blog.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
    "author": {
      "@type": "Organization",
      "name": brandName
    },
    "publisher": {
      "@type": "Organization",
      "name": brandName,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/favicon.svg`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${blog.slug}`
    }
  };
  return JSON.stringify(schema);
}
__name(generateBlogPostingSchema, "generateBlogPostingSchema");
function generateQAPageSchema(question, replies, baseUrl) {
  const suggestedAnswers = (replies || []).map((r) => ({
    "@type": "Answer",
    "text": r.content || "",
    "dateCreated": r.created_at ? new Date(r.created_at).toISOString() : void 0,
    "author": {
      "@type": "Person",
      "name": r.name || "Anonymous"
    }
  }));
  const schema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": question.title || "",
      "text": question.content || "",
      "dateCreated": question.created_at ? new Date(question.created_at).toISOString() : void 0,
      "author": {
        "@type": "Person",
        "name": question.name || "Anonymous"
      },
      "answerCount": suggestedAnswers.length
    }
  };
  if (suggestedAnswers.length > 0) {
    schema.mainEntity.suggestedAnswer = suggestedAnswers;
    schema.mainEntity.acceptedAnswer = suggestedAnswers[0];
  }
  return JSON.stringify(schema);
}
__name(generateQAPageSchema, "generateQAPageSchema");
function generateBreadcrumbSchema(items) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
  return JSON.stringify(schema);
}
__name(generateBreadcrumbSchema, "generateBreadcrumbSchema");
function generateOrganizationSchema(settings) {
  const baseUrl = settings.site_url || "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": settings.site_title || resolveSchemaBrandName(baseUrl),
    "url": baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/favicon.svg`,
      "width": 512,
      "height": 512
    }
  };
  return JSON.stringify(schema);
}
__name(generateOrganizationSchema, "generateOrganizationSchema");
function generateWebSiteSchema(settings) {
  const baseUrl = settings.site_url || "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": settings.site_title || resolveSchemaBrandName(baseUrl),
    "url": baseUrl
  };
  return JSON.stringify(schema);
}
__name(generateWebSiteSchema, "generateWebSiteSchema");
function generateWebPageSchema(page, baseUrl, settings = {}) {
  const brandName = settings.site_title || resolveSchemaBrandName(baseUrl);
  const pageUrl = page.slug === "home" ? `${baseUrl}/` : `${baseUrl}/${page.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": page.title || page.slug || "Page",
    "description": (page.meta_description || "").substring(0, 160),
    "url": pageUrl,
    "isPartOf": {
      "@type": "WebSite",
      "name": brandName,
      "url": baseUrl
    }
  };
  if (page.feature_image_url) {
    schema.primaryImageOfPage = {
      "@type": "ImageObject",
      "url": page.feature_image_url
    };
  }
  if (page.created_at) {
    schema.datePublished = new Date(page.created_at).toISOString();
  }
  if (page.updated_at) {
    schema.dateModified = new Date(page.updated_at).toISOString();
  }
  schema.breadcrumb = {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${baseUrl}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": page.title || page.slug || "Page",
        "item": pageUrl
      }
    ]
  };
  return JSON.stringify(schema);
}
__name(generateWebPageSchema, "generateWebPageSchema");
function generateFAQPageSchema(faqItems, baseUrl) {
  if (!Array.isArray(faqItems) || faqItems.length === 0) return "{}";
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map((item) => ({
      "@type": "Question",
      "name": item.question || "",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer || ""
      }
    }))
  };
  return JSON.stringify(schema);
}
__name(generateFAQPageSchema, "generateFAQPageSchema");
function injectSchemaIntoHTML(html, schemaId, schemaJson) {
  const placeholder = `<script type="application/ld+json" id="${schemaId}">{}<\/script>`;
  const replacement = `<script type="application/ld+json" id="${schemaId}">${schemaJson}<\/script>`;
  if (String(html || "").includes(placeholder)) {
    return html.replace(placeholder, replacement);
  }
  const existingSchemaRegex = new RegExp(`<script\\s+type=["']application/ld\\+json["']\\s+id=["']${schemaId}["'][^>]*>[\\s\\S]*?<\\/script>`, "i");
  if (existingSchemaRegex.test(String(html || ""))) {
    return html.replace(existingSchemaRegex, replacement);
  }
  if (/<\/head>/i.test(String(html || ""))) {
    return html.replace(/<\/head>/i, `${replacement}
</head>`);
  }
  return `${html}
${replacement}`;
}
__name(injectSchemaIntoHTML, "injectSchemaIntoHTML");

// src/controllers/nojs.js
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
__name(toNumber, "toNumber");
function formatMoney2(value) {
  const amount = toNumber(value, 0);
  return "$" + amount.toFixed(2);
}
__name(formatMoney2, "formatMoney");
function formatDate(value) {
  if (!value) return "-";
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    return new Date(n).toLocaleString("en-US");
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US");
}
__name(formatDate, "formatDate");
function extractBodyFragment(raw) {
  const input = String(raw || "");
  const bodyMatch = input.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1] || "";
  return input;
}
__name(extractBodyFragment, "extractBodyFragment");
function sanitizeRichHtml(raw) {
  const input = String(raw || "");
  return input.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
}
__name(sanitizeRichHtml, "sanitizeRichHtml");
function parseOrderEncryptedData(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}
__name(parseOrderEncryptedData, "parseOrderEncryptedData");
function renderNotice(url) {
  const ok = url.searchParams.get("ok");
  const err = url.searchParams.get("err");
  if (!ok && !err) return "";
  if (err) {
    return `<div class="notice error">${escapeHtml(err)}</div>`;
  }
  return `<div class="notice ok">${escapeHtml(ok)}</div>`;
}
__name(renderNotice, "renderNotice");
var NOJS_RESERVED_PUBLIC_SLUGS = /* @__PURE__ */ new Set([
  "",
  "admin",
  "api",
  "blog",
  "buyer-order",
  "checkout",
  "download",
  "favicon.ico",
  "favicon.svg",
  "forum",
  "order",
  "order-detail",
  "order-success",
  "product",
  "products",
  "products-grid",
  "robots.txt",
  "sitemap.xml",
  "success"
]);
function renderLayout(opts = {}) {
  const title = escapeHtml(opts.title || "Prankwish");
  const description = escapeHtml(opts.description || "No-JS server-rendered experience");
  const nav = opts.admin ? `
      <nav class="nav">
        <a href="/admin">Dashboard</a>
        <a href="/admin/products">Products</a>
        <a href="/admin/orders">Orders</a>
        <a href="/admin/pages">Pages</a>
        <a href="/admin/blogs">Blogs</a>
        <a href="/admin/moderation">Moderation</a>
        <a href="/admin/logout">Logout</a>
      </nav>
    ` : `
      <nav class="nav">
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
        <a href="/forum">Forum</a>
      </nav>
    `;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  ${opts.head || ""}
  <style>
    :root {
      --bg: #f7f8fc;
      --card: #ffffff;
      --text: #111827;
      --muted: #4b5563;
      --line: #e5e7eb;
      --brand: #0f766e;
      --brand-soft: #ccfbf1;
      --err: #b91c1c;
      --ok: #065f46;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: var(--bg); color: var(--text); }
    .wrap { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .top { background: linear-gradient(120deg, #eff6ff, #ecfeff); border-bottom: 1px solid var(--line); }
    .brand { font-weight: 800; letter-spacing: 0.2px; text-decoration: none; color: var(--text); font-size: 20px; }
    .nav { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
    .nav a { color: var(--brand); text-decoration: none; font-weight: 600; }
    .grid { display: grid; gap: 16px; }
    .grid-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .grid-3 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
    .muted { color: var(--muted); }
    .btn {
      display: inline-block;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #0d9488;
      background: #0f766e;
      color: #fff;
      text-decoration: none;
      font-weight: 700;
      cursor: pointer;
    }
    .btn.secondary {
      background: #fff;
      color: #0f766e;
    }
    .btn.danger {
      background: #b91c1c;
      border-color: #991b1b;
    }
    .form-grid { display: grid; gap: 10px; }
    label { font-size: 13px; font-weight: 700; color: #111827; }
    input, textarea, select {
      width: 100%;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #d1d5db;
      background: #fff;
      font: inherit;
    }
    textarea { min-height: 110px; resize: vertical; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid var(--line); padding: 9px 6px; vertical-align: top; font-size: 14px; }
    .notice { padding: 12px; border-radius: 10px; margin: 14px 0; font-weight: 600; }
    .notice.ok { background: #ecfdf5; color: var(--ok); border: 1px solid #a7f3d0; }
    .notice.error { background: #fef2f2; color: var(--err); border: 1px solid #fecaca; }
    .pill {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      border-radius: 999px;
      padding: 4px 9px;
      background: var(--brand-soft);
      color: #115e59;
    }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .small { font-size: 12px; }
    img.thumb { width: 100%; max-height: 190px; object-fit: cover; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; }
    @media (max-width: 700px) {
      .wrap { padding: 14px; }
      th, td { font-size: 13px; }
    }
  </style>
</head>
<body>
  <header class="top">
    <div class="wrap">
      <a class="brand" href="${opts.admin ? "/admin" : "/"}">Prankwish No-JS</a>
      ${nav}
    </div>
  </header>
  <main class="wrap">
    ${opts.content || ""}
  </main>
</body>
</html>`;
}
__name(renderLayout, "renderLayout");
function htmlResponse(html, opts = {}) {
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8"
  });
  if (opts.admin) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
  } else {
    headers.set("Cache-Control", "no-store");
  }
  if (opts.headers && typeof opts.headers === "object") {
    for (const [k, v] of Object.entries(opts.headers)) {
      if (v !== void 0 && v !== null) headers.set(k, String(v));
    }
  }
  return new Response(rewriteLegacyInternalLinksInHtml(html), { status: opts.status || 200, headers });
}
__name(htmlResponse, "htmlResponse");
function redirectWithParams(url, path, params = {}, status = 303) {
  const to = new URL(path, url.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v !== void 0 && v !== null && String(v).trim() !== "") {
      to.searchParams.set(k, String(v));
    }
  }
  return Response.redirect(to.toString(), status);
}
__name(redirectWithParams, "redirectWithParams");
async function readForm(req) {
  const fd = await req.formData();
  const out = {};
  for (const [k, v] of fd.entries()) {
    out[k] = typeof v === "string" ? v.trim() : String(v);
  }
  return out;
}
__name(readForm, "readForm");
async function readJsonResponse(resp) {
  let data = {};
  try {
    data = await resp.clone().json();
  } catch (_) {
    data = {};
  }
  return { ok: resp.ok, status: resp.status, data };
}
__name(readJsonResponse, "readJsonResponse");
function getCookieValue3(cookieHeader, name) {
  if (!cookieHeader) return "";
  const parts = String(cookieHeader).split(";");
  for (const p of parts) {
    const [k, ...rest] = p.trim().split("=");
    if (k === name) return rest.join("=") || "";
  }
  return "";
}
__name(getCookieValue3, "getCookieValue");
function toBase64Url(input) {
  const b64 = btoa(String(input || ""));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(toBase64Url, "toBase64Url");
function fromBase64Url(input) {
  const normalized = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - normalized.length % 4) % 4;
  const padded = normalized + "=".repeat(padLen);
  return atob(padded);
}
__name(fromBase64Url, "fromBase64Url");
function buildCheckoutHintCookie(url, hint) {
  const payload = toBase64Url(JSON.stringify(hint || {}));
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `nojs_checkout_hint=${payload}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
}
__name(buildCheckoutHintCookie, "buildCheckoutHintCookie");
function clearCheckoutHintCookie(url) {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `nojs_checkout_hint=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
__name(clearCheckoutHintCookie, "clearCheckoutHintCookie");
function readCheckoutHintFromRequest(req) {
  try {
    const cookieHeader = req?.headers?.get("Cookie") || "";
    const raw = getCookieValue3(cookieHeader, "nojs_checkout_hint");
    if (!raw) return null;
    const json2 = fromBase64Url(raw);
    const parsed = JSON.parse(json2);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (_) {
    return null;
  }
}
__name(readCheckoutHintFromRequest, "readCheckoutHintFromRequest");
async function resolveProductPath(env, productId) {
  const row = await env.DB.prepare(
    "SELECT id, title, slug FROM products WHERE id = ?"
  ).bind(Number(productId)).first();
  if (!row) return "/";
  return canonicalProductPath(row);
}
__name(resolveProductPath, "resolveProductPath");
async function resolveProductPathBySlug(env, slug) {
  const row = await env.DB.prepare(
    "SELECT id, title, slug FROM products WHERE slug = ? LIMIT 1"
  ).bind(String(slug || "")).first();
  if (!row) return "";
  return canonicalProductPath(row);
}
__name(resolveProductPathBySlug, "resolveProductPathBySlug");
async function getPublishedPageBySlug(env, slug) {
  if (!env?.DB || !slug) return null;
  return env.DB.prepare(`
    SELECT id, slug, title, meta_description, content, page_type, is_default
    FROM pages
    WHERE slug = ? AND status = 'published'
    LIMIT 1
  `).bind(String(slug)).first();
}
__name(getPublishedPageBySlug, "getPublishedPageBySlug");
async function getDefaultPublishedPage(env, pageType) {
  if (!env?.DB || !pageType) return null;
  return env.DB.prepare(`
    SELECT id, slug, title, meta_description, content, page_type, is_default
    FROM pages
    WHERE page_type = ? AND is_default = 1 AND status = 'published'
    ORDER BY id DESC
    LIMIT 1
  `).bind(String(pageType)).first();
}
__name(getDefaultPublishedPage, "getDefaultPublishedPage");
function renderStoreProductCards(products = []) {
  return products.map((p) => {
    const productUrl = canonicalProductPath(p);
    const price = p.sale_price && Number(p.sale_price) > 0 ? `<div><strong>${formatMoney2(p.sale_price)}</strong> <span class="muted"><s>${formatMoney2(p.normal_price)}</s></span></div>` : `<div><strong>${formatMoney2(p.normal_price)}</strong></div>`;
    const thumb = p.thumbnail_url ? `<img class="thumb" src="${escapeHtml(p.thumbnail_url)}" alt="${escapeHtml(p.title || "Product")}" loading="lazy">` : `<div class="card muted">No image</div>`;
    return `
      <article class="card">
        ${thumb}
        <h3>${escapeHtml(p.title || "Untitled")}</h3>
        <p class="muted">${escapeHtml((p.description || "").slice(0, 220))}</p>
        ${price}
        <p class="small muted">Delivery: ${p.instant_delivery ? "Instant" : escapeHtml(p.normal_delivery_text || "1") + " day(s)"}</p>
        <a class="btn" href="${productUrl}">Open Product</a>
      </article>
    `;
  }).join("");
}
__name(renderStoreProductCards, "renderStoreProductCards");
async function renderStorefront(env, url, opts = {}) {
  const pageType = opts.pageType || "";
  const page = pageType ? await getDefaultPublishedPage(env, pageType) : null;
  const productsResult = await env.DB.prepare(`
    SELECT id, title, slug, description, normal_price, sale_price, thumbnail_url, normal_delivery_text, instant_delivery
    FROM products
    WHERE ${buildPublicProductStatusWhere("status")}
    ORDER BY sort_order ASC, id DESC
    LIMIT 120
  `).all();
  const products = productsResult.results || [];
  const introHtml = page?.content ? `<section class="card">${sanitizeRichHtml(extractBodyFragment(page.content))}</section>` : "";
  const content = `
    <h1>${escapeHtml(page?.title || opts.heading || "Server-rendered Storefront")}</h1>
    ${renderNotice(url)}
    <p class="muted">${escapeHtml(opts.introText || "This storefront is rendered fully on server with plain HTML forms and no client JS.")}</p>
    ${introHtml}
    <section class="grid grid-3">${renderStoreProductCards(products) || '<div class="card">No products available.</div>'}</section>
  `;
  return htmlResponse(renderLayout({
    title: page?.title || opts.title || "Prankwish Store",
    description: page?.meta_description || opts.description || "Server-rendered storefront",
    content
  }));
}
__name(renderStorefront, "renderStorefront");
async function renderCustomPage(env, url, slug) {
  const page = await getPublishedPageBySlug(env, slug);
  if (!page) return null;
  const bodyHtml = sanitizeRichHtml(extractBodyFragment(page.content || ""));
  return htmlResponse(renderLayout({
    title: page.title || slug,
    description: page.meta_description || `${page.title || slug} - server-rendered page`,
    content: `
      ${renderNotice(url)}
      ${bodyHtml || `<section class="card"><h1>${escapeHtml(page.title || slug)}</h1></section>`}
    `
  }));
}
__name(renderCustomPage, "renderCustomPage");
async function getNoJsPaymentMethods(env) {
  try {
    const response = await getPaymentMethods(env);
    const parsed = await readJsonResponse(response);
    const methods = Array.isArray(parsed.data?.methods) ? parsed.data.methods : [];
    const filtered = methods.map((m) => ({ id: String(m.id || "").toLowerCase(), name: String(m.name || "").trim() })).filter((m) => m.id === "whop" || m.id === "paypal");
    if (filtered.length > 0) return filtered;
  } catch (_) {
  }
  return [{ id: "whop", name: "Whop" }];
}
__name(getNoJsPaymentMethods, "getNoJsPaymentMethods");
function normalizePaymentMethod(raw, fallback = "whop") {
  const m = String(raw || "").trim().toLowerCase();
  if (!m) return fallback;
  if (m === "paypal") return "paypal";
  return "whop";
}
__name(normalizePaymentMethod, "normalizePaymentMethod");
async function createGatewayCheckoutRedirect(env, url, opts = {}) {
  const method = normalizePaymentMethod(opts.method);
  const productId = Number(opts.productId);
  const email = String(opts.email || "").trim();
  const addons = Array.isArray(opts.addons) ? opts.addons : [];
  const couponCode = String(opts.couponCode || "").trim();
  const product = await env.DB.prepare(
    "SELECT id, title, instant_delivery, normal_delivery_text, status FROM products WHERE id = ? LIMIT 1"
  ).bind(productId).first();
  if (!product || product.status !== "active") {
    return { ok: false, error: "Product not found or inactive." };
  }
  const deliveryTimeMinutes = Number(calculateDeliveryMinutes(product)) || 60;
  if (method === "paypal") {
    let amount = 0;
    try {
      amount = await calculateServerSidePrice(env, productId, addons, couponCode || null);
    } catch (e) {
      return { ok: false, error: "Could not calculate server-side price for PayPal." };
    }
    const ppResp = await createPayPalOrder(env, {
      product_id: productId,
      amount,
      email,
      deliveryTimeMinutes,
      metadata: {
        addons,
        deliveryTimeMinutes,
        product_id: String(productId),
        product_title: product.title || "",
        couponCode: couponCode || null,
        source: "nojs-ssr"
      }
    }, url.origin);
    const parsed2 = await readJsonResponse(ppResp);
    const checkoutUrl2 = parsed2.data?.checkout_url || "";
    if (!parsed2.ok || !parsed2.data?.success || !checkoutUrl2) {
      return { ok: false, error: parsed2.data?.error || "Failed to initialize PayPal checkout." };
    }
    return { ok: true, checkoutUrl: checkoutUrl2, provider: "paypal", checkoutId: parsed2.data?.order_id || "" };
  }
  const whopResp = await createPlanCheckout(env, {
    product_id: productId,
    email,
    couponCode: couponCode || void 0,
    metadata: {
      addons,
      deliveryTimeMinutes,
      product_id: String(productId),
      product_title: product.title || "",
      source: "nojs-ssr"
    }
  }, url.origin);
  const parsed = await readJsonResponse(whopResp);
  const checkoutUrl = parsed.data?.checkout_url || "";
  if (!parsed.ok || !parsed.data?.success || !checkoutUrl) {
    return { ok: false, error: parsed.data?.error || "Failed to initialize checkout." };
  }
  return { ok: true, checkoutUrl, provider: "whop", checkoutId: parsed.data?.checkout_id || "" };
}
__name(createGatewayCheckoutRedirect, "createGatewayCheckoutRedirect");
async function renderHome(env, url) {
  return renderStorefront(env, url, {
    pageType: "home",
    title: "Prankwish Store",
    description: "Server-rendered home page",
    heading: "Server-rendered Storefront",
    introText: "This storefront is rendered fully on server with plain HTML forms and no client JS."
  });
}
__name(renderHome, "renderHome");
async function renderProductsArchive(env, url) {
  return renderStorefront(env, url, {
    pageType: "product_grid",
    title: "All Products",
    description: "Server-rendered product archive",
    heading: "All Products",
    introText: "Every product card on this page is rendered server-side."
  });
}
__name(renderProductsArchive, "renderProductsArchive");
function parseAddonDefinitions(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, idx) => {
      if (!item || typeof item !== "object") return null;
      const label = String(item.label || item.name || item.title || item.field || "Addon " + (idx + 1)).trim();
      const type = String(item.type || "text").toLowerCase();
      const required = item.required === true || item.required === 1 || item.required === "1";
      return { label, type, required };
    }).filter(Boolean).slice(0, 30);
  } catch (_) {
    return [];
  }
}
__name(parseAddonDefinitions, "parseAddonDefinitions");
async function renderProduct(env, url, productId) {
  const product = await env.DB.prepare(`
    SELECT *
    FROM products
    WHERE id = ? AND ${buildPublicProductStatusWhere("status")}
    LIMIT 1
  `).bind(Number(productId)).first();
  if (!product) {
    return htmlResponse(renderLayout({
      title: "Product Not Found",
      content: '<h1>Product not found</h1><p><a class="btn secondary" href="/">Back to home</a></p>'
    }), { status: 404 });
  }
  const reviewRows = await env.DB.prepare(`
    SELECT author_name, rating, comment, created_at
    FROM reviews
    WHERE product_id = ? AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 15
  `).bind(Number(productId)).all();
  const reviews = reviewRows.results || [];
  const addons = parseAddonDefinitions(product.addons_json);
  const paymentMethods = await getNoJsPaymentMethods(env);
  const paymentOptionsHtml = paymentMethods.map((m) => {
    const label = m.id === "paypal" ? "PayPal" : m.name || "Whop";
    return `<option value="${escapeHtml(m.id)}">${escapeHtml(label)}</option>`;
  }).join("");
  const safeSlugPath = canonicalProductPath(product);
  const priceBlock = product.sale_price && Number(product.sale_price) > 0 ? `<div class="row"><span class="pill">Sale</span> <strong>${formatMoney2(product.sale_price)}</strong> <span class="muted"><s>${formatMoney2(product.normal_price)}</s></span></div>` : `<div><strong>${formatMoney2(product.normal_price)}</strong></div>`;
  const addonFields = addons.map((addon, idx) => {
    const key = String(idx);
    const fieldLabel = escapeHtml(addon.label);
    const required = addon.required ? "required" : "";
    if (addon.type === "textarea") {
      return `
        <div>
          <label>${fieldLabel}</label>
          <input type="hidden" name="addon_label_${key}" value="${fieldLabel}">
          <textarea name="addon_value_${key}" ${required}></textarea>
        </div>
      `;
    }
    return `
      <div>
        <label>${fieldLabel}</label>
        <input type="hidden" name="addon_label_${key}" value="${fieldLabel}">
        <input type="text" name="addon_value_${key}" ${required}>
      </div>
    `;
  }).join("");
  const reviewHtml = reviews.map((r) => `
    <article class="card">
      <div class="row">
        <strong>${escapeHtml(r.author_name || "Customer")}</strong>
        <span class="pill">${escapeHtml(r.rating || 5)}/5</span>
        <span class="small muted">${escapeHtml(formatDate(r.created_at))}</span>
      </div>
      <p>${escapeHtml(r.comment || "")}</p>
    </article>
  `).join("");
  const content = `
    <h1>${escapeHtml(product.title || "Product")}</h1>
    ${renderNotice(url)}
    <div class="grid grid-2">
      <section class="card">
        ${product.thumbnail_url ? `<img class="thumb" src="${escapeHtml(product.thumbnail_url)}" alt="${escapeHtml(product.title || "Product image")}">` : ""}
        <p class="muted">${escapeHtml(product.description || "")}</p>
        ${priceBlock}
        <p class="small muted">Delivery: ${product.instant_delivery ? "Instant" : escapeHtml(product.normal_delivery_text || "1") + " day(s)"}</p>
      </section>
      <section class="card">
        <h2>Order Form</h2>
        <p class="small muted">This is a pure HTML form flow (no JS checkout).</p>
        <form class="form-grid" method="post" action="/order/create">
          <input type="hidden" name="product_id" value="${escapeHtml(product.id)}">
          <input type="hidden" name="return_to" value="${escapeHtml(safeSlugPath)}">
          <div>
            <label>Your Email</label>
            <input type="email" name="email" required>
          </div>
          ${addonFields}
          <div>
            <label>Coupon Code (optional)</label>
            <input type="text" name="coupon_code">
          </div>
          <div>
            <label>Payment Method</label>
            <select name="payment_method">
              ${paymentOptionsHtml}
            </select>
          </div>
          <button class="btn" type="submit">Place Order</button>
        </form>
      </section>
    </div>
    <section style="margin-top:20px;">
      <h2>Recent Reviews</h2>
      <div class="grid">${reviewHtml || '<div class="card muted">No reviews yet.</div>'}</div>
    </section>
  `;
  return htmlResponse(renderLayout({
    title: product.title || "Product",
    description: (product.description || "").slice(0, 150),
    content
  }));
}
__name(renderProduct, "renderProduct");
async function handleCreateOrder(env, req, url) {
  const form = await readForm(req);
  const productId = toNumber(form.product_id);
  if (!productId) {
    return redirectWithParams(url, "/", { err: "Invalid product id." });
  }
  const backTo = form.return_to || await resolveProductPath(env, productId);
  const email = String(form.email || "").trim();
  if (!email) {
    return redirectWithParams(url, backTo, { err: "Email is required." });
  }
  const paymentMethod = normalizePaymentMethod(form.payment_method, "whop");
  const addons = [];
  for (const [k, v] of Object.entries(form)) {
    if (!k.startsWith("addon_value_")) continue;
    const idx = k.split("addon_value_")[1];
    const value = String(v || "").trim();
    if (!value) continue;
    const label = String(form["addon_label_" + idx] || "Addon " + idx).trim();
    addons.push({ field: label, value });
  }
  const checkout = await createGatewayCheckoutRedirect(env, url, {
    method: paymentMethod,
    productId,
    email,
    addons,
    couponCode: String(form.coupon_code || "").trim()
  });
  if (!checkout.ok || !checkout.checkoutUrl) {
    return redirectWithParams(url, backTo, { err: checkout.error || "Failed to start checkout." });
  }
  const hint = {
    provider: checkout.provider || paymentMethod,
    checkout_id: checkout.checkoutId || "",
    product_id: productId,
    created_at: Date.now()
  };
  return new Response(null, {
    status: 302,
    headers: {
      "Location": checkout.checkoutUrl,
      "Set-Cookie": buildCheckoutHintCookie(url, hint),
      "Cache-Control": "no-store"
    }
  });
}
__name(handleCreateOrder, "handleCreateOrder");
async function lookupOrderDetailsByOrderId(env, orderId) {
  if (!orderId) return null;
  return env.DB.prepare(`
    SELECT o.order_id, o.status, o.created_at, o.delivery_time_minutes, p.title as product_title
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.order_id = ?
    LIMIT 1
  `).bind(orderId).first();
}
__name(lookupOrderDetailsByOrderId, "lookupOrderDetailsByOrderId");
async function lookupOrderByWhopCheckoutId(env, checkoutId) {
  if (!checkoutId) return null;
  const row = await env.DB.prepare(`
    SELECT o.order_id
    FROM orders o
    WHERE o.encrypted_data LIKE ?
    ORDER BY o.id DESC
    LIMIT 1
  `).bind(`%"whop_checkout_id":"${checkoutId}"%`).first();
  if (!row?.order_id) return null;
  return lookupOrderDetailsByOrderId(env, String(row.order_id));
}
__name(lookupOrderByWhopCheckoutId, "lookupOrderByWhopCheckoutId");
async function renderSuccess(env, url, req) {
  const queryProvider = String(url.searchParams.get("provider") || "").trim().toLowerCase();
  const paypalToken = String(url.searchParams.get("token") || url.searchParams.get("order_id") || "").trim();
  let orderId = String(url.searchParams.get("order_id") || "").trim();
  let extraNotice = "";
  let extraNoticeType = "ok";
  const hint = readCheckoutHintFromRequest(req);
  const provider = queryProvider || String(hint?.provider || "").trim().toLowerCase();
  const productParam = String(url.searchParams.get("product") || hint?.product_id || "").trim();
  let order = null;
  let pendingAutoRefresh = false;
  let refreshTarget = "";
  const attempt = Math.max(0, toNumber(url.searchParams.get("attempt"), 0));
  const maxAttempts = 25;
  if (provider === "paypal" && paypalToken) {
    const captureResp = await capturePayPalOrder(env, { order_id: paypalToken });
    const capture = await readJsonResponse(captureResp);
    if (capture.ok && capture.data?.success && capture.data?.order_id) {
      orderId = String(capture.data.order_id);
      extraNotice = "PayPal payment captured successfully.";
    } else {
      const msg = String(capture.data?.error || "").toLowerCase();
      if (msg.includes("already") && msg.includes("capture")) {
        const existing = await env.DB.prepare(
          "SELECT order_id FROM orders WHERE encrypted_data LIKE ? ORDER BY id DESC LIMIT 1"
        ).bind(`%"paypalOrderId":"${paypalToken}"%`).first();
        if (existing?.order_id) {
          orderId = String(existing.order_id);
          extraNotice = "Payment already captured earlier.";
        }
      }
      if (!orderId && !extraNotice) {
        extraNotice = capture.data?.error || "Payment is being processed. Please check your order shortly.";
        extraNoticeType = "error";
      }
    }
  }
  if (orderId) {
    order = await lookupOrderDetailsByOrderId(env, orderId);
  }
  if (!order && provider === "whop" && hint?.checkout_id) {
    order = await lookupOrderByWhopCheckoutId(env, String(hint.checkout_id));
    if (order) {
      orderId = String(order.order_id);
      extraNotice = "Whop payment confirmed and order finalized.";
    } else {
      const session = await env.DB.prepare(
        "SELECT status, created_at, completed_at FROM checkout_sessions WHERE checkout_id = ? LIMIT 1"
      ).bind(String(hint.checkout_id)).first();
      if (session?.status === "completed") {
        extraNotice = "Payment confirmed. Finalizing order record. Please wait a few seconds.";
      } else if (session?.status === "pending") {
        extraNotice = "Payment verification in progress. Waiting for gateway confirmation webhook.";
      } else {
        extraNotice = "Checkout session found. Waiting for final order sync.";
      }
      if (attempt < maxAttempts) {
        pendingAutoRefresh = true;
        const refreshUrl = new URL("/success", url.origin);
        if (productParam) refreshUrl.searchParams.set("product", productParam);
        if (provider) refreshUrl.searchParams.set("provider", provider);
        refreshUrl.searchParams.set("attempt", String(attempt + 1));
        refreshTarget = refreshUrl.pathname + refreshUrl.search;
      } else {
        extraNoticeType = "error";
        extraNotice = "Order is still pending. Please wait 1-2 minutes and refresh manually.";
      }
    }
  }
  const statusCard = order ? `
      <p><strong>Order ID:</strong> ${escapeHtml(order.order_id)}</p>
      <p><strong>Status:</strong> ${escapeHtml(order.status || "PAID")}</p>
      <p><strong>Product:</strong> ${escapeHtml(order.product_title || "-")}</p>
      <p><strong>Created:</strong> ${escapeHtml(formatDate(order.created_at))}</p>
      <p><strong>Delivery Window:</strong> ${escapeHtml(order.delivery_time_minutes || 60)} minutes</p>
      <p><a class="btn" href="/order/${encodeURIComponent(order.order_id)}">Open Order Page</a></p>
    ` : `
      <p>Your payment was received. Order finalization is running server-side.</p>
      ${hint?.checkout_id ? `<p><strong>Checkout Ref:</strong> ${escapeHtml(String(hint.checkout_id))}</p>` : ""}
      ${pendingAutoRefresh ? `<p class="muted">Auto-check attempt ${escapeHtml(attempt + 1)} of ${escapeHtml(maxAttempts)}. Refreshing shortly...</p>` : '<p class="muted">Please refresh this page in a few moments.</p>'}
      ${refreshTarget ? `<p><a class="btn" href="${escapeHtml(refreshTarget)}">Check Order Now</a></p>` : ""}
    `;
  const head = pendingAutoRefresh && refreshTarget ? `<meta http-equiv="refresh" content="8;url=${escapeHtml(refreshTarget)}">` : "";
  const responseHeaders = {};
  if (order) {
    responseHeaders["Set-Cookie"] = clearCheckoutHintCookie(url);
  }
  const content = `
    <h1>Order Success</h1>
    ${renderNotice(url)}
    ${extraNotice ? `<div class="notice ${extraNoticeType === "error" ? "error" : "ok"}">${escapeHtml(extraNotice)}</div>` : ""}
    <div class="card">
      ${statusCard}
      <p><a class="btn secondary" href="/">Back to Home</a></p>
    </div>
  `;
  return htmlResponse(renderLayout({
    title: "Order Success",
    head,
    content
  }), {
    headers: responseHeaders
  });
}
__name(renderSuccess, "renderSuccess");
async function renderOrder(env, url, orderId) {
  const row = await env.DB.prepare(`
    SELECT o.*, p.title as product_title
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.order_id = ?
    LIMIT 1
  `).bind(orderId).first();
  if (!row) {
    return htmlResponse(renderLayout({
      title: "Order Not Found",
      content: '<h1>Order not found</h1><p><a class="btn secondary" href="/">Home</a></p>'
    }), { status: 404 });
  }
  const orderData = parseOrderEncryptedData(row.encrypted_data || "{}");
  const reviewExists = await env.DB.prepare(
    "SELECT id FROM reviews WHERE order_id = ? LIMIT 1"
  ).bind(orderId).first();
  const addonItems = Array.isArray(orderData.addons) ? orderData.addons : [];
  const addonHtml = addonItems.length ? addonItems.map((a) => `<li><strong>${escapeHtml(a.field || "Field")}:</strong> ${escapeHtml(a.value || "")}</li>`).join("") : "<li>No addons</li>";
  const content = `
    <h1>Order ${escapeHtml(orderId)}</h1>
    ${renderNotice(url)}
    <div class="grid grid-2">
      <section class="card">
        <p><strong>Product:</strong> ${escapeHtml(row.product_title || "-")}</p>
        <p><strong>Status:</strong> <span class="pill">${escapeHtml(row.status || "pending")}</span></p>
        <p><strong>Email:</strong> ${escapeHtml(orderData.email || "-")}</p>
        <p><strong>Amount:</strong> ${formatMoney2(orderData.amount || 0)}</p>
        <p><strong>Created:</strong> ${escapeHtml(formatDate(row.created_at))}</p>
        <p><strong>Delivered Video:</strong> ${row.delivered_video_url ? `<a href="${escapeHtml(row.delivered_video_url)}" target="_blank" rel="noopener">Open</a>` : "Not delivered yet"}</p>
      </section>
      <section class="card">
        <h2>Addon Details</h2>
        <ul>${addonHtml}</ul>
      </section>
    </div>
    <section class="card" style="margin-top:18px;">
      <h2>Submit Review</h2>
      ${reviewExists ? '<p class="muted">Review already submitted for this order.</p>' : `
        <form class="form-grid" method="post" action="/order/${encodeURIComponent(orderId)}/review">
          <div>
            <label>Name</label>
            <input type="text" name="author" required>
          </div>
          <div>
            <label>Rating (1-5)</label>
            <select name="rating">
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
          </div>
          <div>
            <label>Comment</label>
            <textarea name="comment"></textarea>
          </div>
          <button class="btn" type="submit">Submit Review</button>
        </form>
      `}
    </section>
  `;
  return htmlResponse(renderLayout({
    title: `Order ${orderId}`,
    content
  }));
}
__name(renderOrder, "renderOrder");
async function handleOrderReview(env, req, url, orderId) {
  const order = await env.DB.prepare(
    "SELECT product_id FROM orders WHERE order_id = ? LIMIT 1"
  ).bind(orderId).first();
  if (!order) {
    return redirectWithParams(url, "/", { err: "Order not found." });
  }
  const form = await readForm(req);
  const resp = await addReview(env, {
    productId: Number(order.product_id),
    orderId,
    author: form.author || "Customer",
    rating: toNumber(form.rating, 5),
    comment: form.comment || ""
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, `/order/${encodeURIComponent(orderId)}`, {
      err: parsed.data.error || "Failed to submit review."
    });
  }
  return redirectWithParams(url, `/order/${encodeURIComponent(orderId)}`, {
    ok: "Review submitted."
  });
}
__name(handleOrderReview, "handleOrderReview");
async function renderBlogList(env, url) {
  const r = await env.DB.prepare(`
    SELECT id, title, slug, description, thumbnail_url, created_at
    FROM blogs
    WHERE status = 'published'
    ORDER BY created_at DESC
    LIMIT 100
  `).all();
  const blogs = r.results || [];
  const items = blogs.map((b) => `
    <article class="card">
      ${b.thumbnail_url ? `<img class="thumb" src="${escapeHtml(b.thumbnail_url)}" alt="${escapeHtml(b.title || "Blog image")}">` : ""}
      <h3><a href="/blog/${encodeURIComponent(b.slug || "")}">${escapeHtml(b.title || "Untitled")}</a></h3>
      <p class="muted">${escapeHtml((b.description || "").slice(0, 220))}</p>
      <p class="small muted">${escapeHtml(formatDate(b.created_at))}</p>
    </article>
  `).join("");
  return htmlResponse(renderLayout({
    title: "Blog",
    content: `
      <h1>Blog Archive</h1>
      ${renderNotice(url)}
      <section class="grid grid-3">${items || '<div class="card">No posts yet.</div>'}</section>
    `
  }));
}
__name(renderBlogList, "renderBlogList");
async function renderBlogPost(env, url, slug) {
  const blog = await env.DB.prepare(`
    SELECT *
    FROM blogs
    WHERE slug = ? AND status = 'published'
    LIMIT 1
  `).bind(slug).first();
  if (!blog) {
    return htmlResponse(renderLayout({
      title: "Blog Not Found",
      content: '<h1>Blog post not found</h1><p><a class="btn secondary" href="/blog">Back to blog</a></p>'
    }), { status: 404 });
  }
  const commentsResult = await env.DB.prepare(`
    SELECT id, name, comment, created_at
    FROM blog_comments
    WHERE blog_id = ? AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 80
  `).bind(Number(blog.id)).all();
  const comments = commentsResult.results || [];
  const commentsHtml = comments.map((c) => `
    <article class="card">
      <p><strong>${escapeHtml(c.name || "User")}</strong> <span class="small muted">${escapeHtml(formatDate(c.created_at))}</span></p>
      <p>${escapeHtml(c.comment || "")}</p>
    </article>
  `).join("");
  const content = `
    <h1>${escapeHtml(blog.title || "Blog Post")}</h1>
    ${renderNotice(url)}
    <p class="muted">${escapeHtml(blog.description || "")}</p>
    <article class="card">${sanitizeRichHtml(blog.content || "<p>No content.</p>")}</article>
    <section style="margin-top:18px;" class="card">
      <h2>Leave a Comment</h2>
      <form class="form-grid" method="post" action="/blog/${encodeURIComponent(slug)}/comment">
        <div>
          <label>Name</label>
          <input type="text" name="name" required>
        </div>
        <div>
          <label>Email</label>
          <input type="email" name="email" required>
        </div>
        <div>
          <label>Comment</label>
          <textarea name="comment" required></textarea>
        </div>
        <button class="btn" type="submit">Submit Comment</button>
      </form>
      <p class="small muted">Comments are moderated server-side.</p>
    </section>
    <section style="margin-top:18px;">
      <h2>Comments</h2>
      <div class="grid">${commentsHtml || '<div class="card muted">No approved comments yet.</div>'}</div>
    </section>
  `;
  return htmlResponse(renderLayout({
    title: blog.title || "Blog",
    content
  }));
}
__name(renderBlogPost, "renderBlogPost");
async function handleBlogComment(env, req, url, slug) {
  const blog = await env.DB.prepare(
    "SELECT id FROM blogs WHERE slug = ? AND status = ? LIMIT 1"
  ).bind(slug, "published").first();
  if (!blog) {
    return redirectWithParams(url, "/blog", { err: "Blog post not found." });
  }
  const form = await readForm(req);
  const resp = await addBlogComment(env, {
    blog_id: Number(blog.id),
    name: form.name || "",
    email: form.email || "",
    comment: form.comment || ""
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, `/blog/${encodeURIComponent(slug)}`, {
      err: parsed.data.error || "Failed to submit comment."
    });
  }
  return redirectWithParams(url, `/blog/${encodeURIComponent(slug)}`, {
    ok: parsed.data.message || "Comment submitted for moderation."
  });
}
__name(handleBlogComment, "handleBlogComment");
async function renderForumList(env, url) {
  const result = await env.DB.prepare(`
    SELECT id, title, slug, content, name, reply_count, created_at
    FROM forum_questions
    WHERE status = 'approved'
    ORDER BY created_at DESC
    LIMIT 100
  `).all();
  const questions = result.results || [];
  const rows = questions.map((q) => `
    <article class="card">
      <h3><a href="${q.slug ? `/forum/${encodeURIComponent(q.slug)}` : `/forum/question.html?id=${encodeURIComponent(q.id || "")}`}">${escapeHtml(q.title || "Untitled")}</a></h3>
      <p class="muted">${escapeHtml((q.content || "").slice(0, 240))}</p>
      <p class="small muted">By ${escapeHtml(q.name || "User")} - ${escapeHtml(formatDate(q.created_at))} - Replies: ${escapeHtml(q.reply_count || 0)}</p>
    </article>
  `).join("");
  const content = `
    <h1>Forum</h1>
    ${renderNotice(url)}
    <section class="card">
      <h2>Ask a Question</h2>
      <form class="form-grid" method="post" action="/forum/ask">
        <div>
          <label>Name</label>
          <input type="text" name="name" required>
        </div>
        <div>
          <label>Email</label>
          <input type="email" name="email" required>
        </div>
        <div>
          <label>Title</label>
          <input type="text" name="title" required>
        </div>
        <div>
          <label>Question</label>
          <textarea name="content" required></textarea>
        </div>
        <button class="btn" type="submit">Submit Question</button>
      </form>
      <p class="small muted">Questions are moderated before they become public.</p>
    </section>
    <section style="margin-top:18px;" class="grid">${rows || '<div class="card">No approved questions yet.</div>'}</section>
  `;
  return htmlResponse(renderLayout({
    title: "Forum",
    content
  }));
}
__name(renderForumList, "renderForumList");
async function handleForumAsk(env, req, url) {
  const form = await readForm(req);
  const resp = await submitQuestion(env, {
    title: form.title || "",
    content: form.content || "",
    name: form.name || "",
    email: form.email || ""
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/forum", {
      err: parsed.data.error || "Failed to submit question."
    });
  }
  return redirectWithParams(url, "/forum", {
    ok: parsed.data.message || "Question submitted."
  });
}
__name(handleForumAsk, "handleForumAsk");
async function renderForumQuestion(env, url, slug) {
  let question = await env.DB.prepare(`
    SELECT *
    FROM forum_questions
    WHERE slug = ? AND status = 'approved'
    LIMIT 1
  `).bind(slug).first();
  const numericQuestionId = Number.parseInt(slug, 10);
  const numericPathMatch = Number.isFinite(numericQuestionId) && String(numericQuestionId) === slug;
  if (!question && numericPathMatch) {
    question = await env.DB.prepare(`
      SELECT *
      FROM forum_questions
      WHERE id = ? AND status = 'approved'
      LIMIT 1
    `).bind(numericQuestionId).first();
    if (question?.slug) {
      return Response.redirect(new URL(`/forum/${encodeURIComponent(question.slug)}`, url.origin).toString(), 301);
    }
  }
  if (!question) {
    return htmlResponse(renderLayout({
      title: "Question Not Found",
      content: '<h1>Question not found</h1><p><a class="btn secondary" href="/forum">Back to forum</a></p>'
    }), { status: 404 });
  }
  const repliesResult = await env.DB.prepare(`
    SELECT id, name, content, created_at
    FROM forum_replies
    WHERE question_id = ? AND status = 'approved'
    ORDER BY created_at ASC
    LIMIT 200
  `).bind(Number(question.id)).all();
  const replies = repliesResult.results || [];
  const repliesHtml = replies.map((r) => `
    <article class="card">
      <p><strong>${escapeHtml(r.name || "User")}</strong> <span class="small muted">${escapeHtml(formatDate(r.created_at))}</span></p>
      <p>${escapeHtml(r.content || "")}</p>
    </article>
  `).join("");
  const content = `
    <h1>${escapeHtml(question.title || "Question")}</h1>
    ${renderNotice(url)}
    <article class="card">
      <p>${escapeHtml(question.content || "")}</p>
      <p class="small muted">Asked by ${escapeHtml(question.name || "User")} on ${escapeHtml(formatDate(question.created_at))}</p>
    </article>
    <section style="margin-top:18px;" class="card">
      <h2>Post Reply</h2>
      <form class="form-grid" method="post" action="/forum/${encodeURIComponent(String(question.id))}/reply">
        <div>
          <label>Name</label>
          <input type="text" name="name" required>
        </div>
        <div>
          <label>Email</label>
          <input type="email" name="email" required>
        </div>
        <div>
          <label>Reply</label>
          <textarea name="content" required></textarea>
        </div>
        <button class="btn" type="submit">Submit Reply</button>
      </form>
      <p class="small muted">Replies are moderated before approval.</p>
    </section>
    <section style="margin-top:18px;">
      <h2>Replies</h2>
      <div class="grid">${repliesHtml || '<div class="card">No approved replies yet.</div>'}</div>
    </section>
  `;
  return htmlResponse(renderLayout({
    title: question.title || "Forum Question",
    content
  }));
}
__name(renderForumQuestion, "renderForumQuestion");
async function handleForumReply(env, req, url, questionId) {
  const form = await readForm(req);
  const question = await env.DB.prepare(
    "SELECT id, slug FROM forum_questions WHERE id = ? LIMIT 1"
  ).bind(Number(questionId)).first();
  const back = question ? question.slug ? `/forum/${encodeURIComponent(question.slug)}` : `/forum/question.html?id=${encodeURIComponent(question.id || questionId)}` : "/forum";
  const resp = await submitReply(env, {
    question_id: Number(questionId),
    content: form.content || "",
    name: form.name || "",
    email: form.email || ""
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, back, {
      err: parsed.data.error || "Failed to submit reply."
    });
  }
  return redirectWithParams(url, back, {
    ok: parsed.data.message || "Reply submitted."
  });
}
__name(handleForumReply, "handleForumReply");
function renderStatCard(title, value, note) {
  return `<article class="card"><h3>${escapeHtml(title)}</h3><p style="font-size:30px;margin:0;font-weight:800;">${escapeHtml(value)}</p><p class="muted">${escapeHtml(note || "")}</p></article>`;
}
__name(renderStatCard, "renderStatCard");
async function renderAdminDashboard(env, url) {
  const [products, orders, pages, blogs, reviews] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as c FROM products").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM orders").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM pages").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM blogs").first(),
    env.DB.prepare("SELECT COUNT(*) as c FROM reviews").first()
  ]);
  const content = `
    <h1>Admin Dashboard (Level 2)</h1>
    ${renderNotice(url)}
    <p class="muted">This admin is fully server-rendered and form-driven. No client-side JavaScript is required.</p>
    <section class="grid grid-3">
      ${renderStatCard("Products", products?.c || 0, "Catalog entries")}
      ${renderStatCard("Orders", orders?.c || 0, "All order records")}
      ${renderStatCard("Pages", pages?.c || 0, "Dynamic pages")}
      ${renderStatCard("Blogs", blogs?.c || 0, "Blog posts")}
      ${renderStatCard("Reviews", reviews?.c || 0, "Customer reviews")}
    </section>
  `;
  return htmlResponse(renderLayout({
    title: "Admin Dashboard",
    admin: true,
    content
  }), { admin: true });
}
__name(renderAdminDashboard, "renderAdminDashboard");
async function renderAdminProducts(env, url) {
  const editId = toNumber(url.searchParams.get("edit"));
  const rows = await env.DB.prepare(`
    SELECT id, title, slug, description, normal_price, sale_price, instant_delivery, normal_delivery_text, thumbnail_url, video_url, status
    FROM products
    ORDER BY id DESC
    LIMIT 300
  `).all();
  const products = rows.results || [];
  const edit = editId ? products.find((p) => Number(p.id) === editId) : null;
  const tableRows = products.map((p) => `
    <tr>
      <td>${escapeHtml(p.id)}</td>
      <td>${escapeHtml(p.title || "")}</td>
      <td>${escapeHtml(p.slug || "")}</td>
      <td>${formatMoney2(p.sale_price && Number(p.sale_price) > 0 ? p.sale_price : p.normal_price)}</td>
      <td>${escapeHtml(p.status || "active")}</td>
      <td>
        <div class="row">
          <a class="btn secondary small" href="/admin/products?edit=${encodeURIComponent(String(p.id))}">Edit</a>
          <form method="post" action="/admin/products/status">
            <input type="hidden" name="id" value="${escapeHtml(p.id)}">
            <input type="hidden" name="status" value="${p.status === "active" ? "inactive" : "active"}">
            <button class="btn secondary small" type="submit">${p.status === "active" ? "Disable" : "Enable"}</button>
          </form>
          <form method="post" action="/admin/products/delete">
            <input type="hidden" name="id" value="${escapeHtml(p.id)}">
            <button class="btn danger small" type="submit">Delete</button>
          </form>
        </div>
      </td>
    </tr>
  `).join("");
  const content = `
    <h1>Products</h1>
    ${renderNotice(url)}
    <section class="card">
      <h2>${edit ? "Edit Product #" + escapeHtml(edit.id) : "Create Product"}</h2>
      <form class="form-grid" method="post" action="/admin/products/save">
        <input type="hidden" name="id" value="${escapeHtml(edit?.id || "")}">
        <div><label>Title</label><input type="text" name="title" value="${escapeHtml(edit?.title || "")}" required></div>
        <div><label>Slug</label><input type="text" name="slug" value="${escapeHtml(edit?.slug || "")}"></div>
        <div><label>Description</label><textarea name="description">${escapeHtml(edit?.description || "")}</textarea></div>
        <div><label>Normal Price</label><input type="number" step="0.01" name="normal_price" value="${escapeHtml(edit?.normal_price || "0")}"></div>
        <div><label>Sale Price</label><input type="number" step="0.01" name="sale_price" value="${escapeHtml(edit?.sale_price || "")}"></div>
        <div><label>Delivery Days</label><input type="number" name="delivery_time_days" min="1" value="${escapeHtml(edit?.normal_delivery_text || "1")}"></div>
        <div><label>Thumbnail URL</label><input type="text" name="thumbnail_url" value="${escapeHtml(edit?.thumbnail_url || "")}"></div>
        <div><label>Video URL</label><input type="text" name="video_url" value="${escapeHtml(edit?.video_url || "")}"></div>
        <div>
          <label>Status</label>
          <select name="status">
            <option value="active" ${edit?.status !== "inactive" ? "selected" : ""}>Active</option>
            <option value="inactive" ${edit?.status === "inactive" ? "selected" : ""}>Inactive</option>
          </select>
        </div>
        <div>
          <label>Instant Delivery</label>
          <select name="instant_delivery">
            <option value="0" ${edit?.instant_delivery ? "" : "selected"}>No</option>
            <option value="1" ${edit?.instant_delivery ? "selected" : ""}>Yes</option>
          </select>
        </div>
        <button class="btn" type="submit">${edit ? "Update Product" : "Create Product"}</button>
      </form>
    </section>
    <section class="card" style="margin-top:18px;overflow:auto;">
      <h2>All Products</h2>
      <table>
        <thead><tr><th>ID</th><th>Title</th><th>Slug</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="6">No products found.</td></tr>'}</tbody>
      </table>
    </section>
  `;
  return htmlResponse(renderLayout({
    title: "Admin Products",
    admin: true,
    content
  }), { admin: true });
}
__name(renderAdminProducts, "renderAdminProducts");
async function handleAdminProductSave(env, req, url) {
  const form = await readForm(req);
  const body = {
    id: form.id ? Number(form.id) : void 0,
    title: form.title || "",
    slug: form.slug || slugifyStr(form.title || ""),
    description: form.description || "",
    normal_price: toNumber(form.normal_price, 0),
    sale_price: form.sale_price ? toNumber(form.sale_price, 0) : null,
    instant_delivery: String(form.instant_delivery || "0") === "1",
    delivery_time_days: toNumber(form.delivery_time_days, 1),
    normal_delivery_text: String(toNumber(form.delivery_time_days, 1)),
    thumbnail_url: form.thumbnail_url || "",
    video_url: form.video_url || ""
  };
  const resp = await saveProduct(env, body);
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/products", {
      err: parsed.data.error || "Failed to save product."
    });
  }
  const productId = parsed.data.id || body.id;
  const status = String(form.status || "active").toLowerCase();
  if (productId && (status === "active" || status === "inactive")) {
    await updateProductStatus(env, { id: Number(productId), status });
  }
  return redirectWithParams(url, "/admin/products", {
    ok: "Product saved."
  });
}
__name(handleAdminProductSave, "handleAdminProductSave");
async function handleAdminProductDelete(env, req, url) {
  const form = await readForm(req);
  const resp = await deleteProduct(env, Number(form.id || 0));
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/products", { err: parsed.data.error || "Delete failed." });
  }
  return redirectWithParams(url, "/admin/products", { ok: "Product deleted." });
}
__name(handleAdminProductDelete, "handleAdminProductDelete");
async function handleAdminProductStatus(env, req, url) {
  const form = await readForm(req);
  const resp = await updateProductStatus(env, {
    id: Number(form.id || 0),
    status: String(form.status || "").toLowerCase()
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/products", { err: parsed.data.error || "Status update failed." });
  }
  return redirectWithParams(url, "/admin/products", { ok: "Product status updated." });
}
__name(handleAdminProductStatus, "handleAdminProductStatus");
async function renderAdminOrders(env, url) {
  const selectedOrderId = String(url.searchParams.get("view") || "").trim();
  const rows = await env.DB.prepare(`
    SELECT o.order_id, o.status, o.created_at, o.delivery_time_minutes, o.delivered_video_url, o.encrypted_data, p.title as product_title
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    ORDER BY o.id DESC
    LIMIT 300
  `).all();
  const orders = rows.results || [];
  const selectedOrder = selectedOrderId ? orders.find((o) => String(o.order_id || "") === selectedOrderId) : null;
  const tableRows = orders.map((o) => {
    const data = parseOrderEncryptedData(o.encrypted_data || "{}");
    const email = escapeHtml(data.email || "-");
    const amount = formatMoney2(data.amount || 0);
    return `
      <tr>
        <td>${escapeHtml(o.order_id)}</td>
        <td>${escapeHtml(o.product_title || "-")}</td>
        <td>${email}</td>
        <td>${amount}</td>
        <td>${escapeHtml(o.status || "")}</td>
        <td>${escapeHtml(formatDate(o.created_at))}</td>
        <td>
          <form class="form-grid" method="post" action="/admin/orders/update">
            <input type="hidden" name="order_id" value="${escapeHtml(o.order_id)}">
            <select name="status">
              <option value="pending" ${o.status === "pending" ? "selected" : ""}>pending</option>
              <option value="PAID" ${o.status === "PAID" ? "selected" : ""}>PAID</option>
              <option value="delivered" ${o.status === "delivered" ? "selected" : ""}>delivered</option>
              <option value="revision" ${o.status === "revision" ? "selected" : ""}>revision</option>
            </select>
            <input type="number" name="delivery_time_minutes" min="1" value="${escapeHtml(o.delivery_time_minutes || 60)}">
            <button class="btn secondary small" type="submit">Update</button>
          </form>
          <form class="form-grid" method="post" action="/admin/orders/deliver" style="margin-top:8px;">
            <input type="hidden" name="order_id" value="${escapeHtml(o.order_id)}">
            <input type="text" name="download_url" placeholder="Delivered video URL">
            <input type="text" name="youtube_url" placeholder="YouTube URL (optional)">
            <button class="btn small" type="submit">Mark Delivered</button>
          </form>
          <form method="post" action="/admin/orders/delete" style="margin-top:8px;">
            <input type="hidden" name="order_id" value="${escapeHtml(o.order_id)}">
            <button class="btn danger small" type="submit">Delete</button>
          </form>
          <p style="margin-top:8px;"><a class="btn secondary small" href="/admin/orders?view=${encodeURIComponent(String(o.order_id || ""))}">View Details</a></p>
        </td>
      </tr>
    `;
  }).join("");
  const selectedOrderData = selectedOrder ? parseOrderEncryptedData(selectedOrder.encrypted_data || "{}") : null;
  const detailCard = selectedOrder ? `
    <section class="card" style="margin-bottom:16px;">
      <div class="row" style="justify-content:space-between;">
        <h2 style="margin:0;">Order Detail: ${escapeHtml(selectedOrder.order_id || "")}</h2>
        <a class="btn secondary small" href="/admin/orders">Close</a>
      </div>
      <div class="grid grid-2" style="margin-top:12px;">
        <div>
          <p><strong>Product:</strong> ${escapeHtml(selectedOrder.product_title || "-")}</p>
          <p><strong>Status:</strong> ${escapeHtml(selectedOrder.status || "-")}</p>
          <p><strong>Created:</strong> ${escapeHtml(formatDate(selectedOrder.created_at))}</p>
          <p><strong>Delivery ETA:</strong> ${escapeHtml(selectedOrder.delivery_time_minutes || 60)} minute(s)</p>
        </div>
        <div>
          <p><strong>Email:</strong> ${escapeHtml(selectedOrderData?.email || "-")}</p>
          <p><strong>Amount:</strong> ${formatMoney2(selectedOrderData?.amount || 0)}</p>
          <p><strong>Buyer Name:</strong> ${escapeHtml(selectedOrderData?.name || selectedOrderData?.customer_name || "-")}</p>
          <p><strong>Delivered URL:</strong> ${selectedOrder.delivered_video_url ? `<a href="${escapeHtml(selectedOrder.delivered_video_url)}" target="_blank" rel="noreferrer">Open</a>` : "-"}</p>
        </div>
      </div>
    </section>
  ` : "";
  const content = `
    <h1>Orders</h1>
    ${renderNotice(url)}
    ${detailCard}
    <section class="card" style="overflow:auto;">
      <table>
        <thead><tr><th>Order</th><th>Product</th><th>Email</th><th>Amount</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="7">No orders found.</td></tr>'}</tbody>
      </table>
    </section>
  `;
  return htmlResponse(renderLayout({
    title: "Admin Orders",
    admin: true,
    content
  }), { admin: true });
}
__name(renderAdminOrders, "renderAdminOrders");
async function handleAdminOrderUpdate(env, req, url) {
  const form = await readForm(req);
  const resp = await updateOrder(env, {
    orderId: form.order_id || "",
    status: form.status || "",
    delivery_time_minutes: toNumber(form.delivery_time_minutes, 60)
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/orders", { err: parsed.data.error || "Order update failed." });
  }
  return redirectWithParams(url, "/admin/orders", { ok: "Order updated." });
}
__name(handleAdminOrderUpdate, "handleAdminOrderUpdate");
async function handleAdminOrderDeliver(env, req, url) {
  const form = await readForm(req);
  const resp = await deliverOrder(env, {
    orderId: form.order_id || "",
    downloadUrl: form.download_url || "",
    youtubeUrl: form.youtube_url || ""
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/orders", { err: parsed.data.error || "Delivery update failed." });
  }
  return redirectWithParams(url, "/admin/orders", { ok: "Order marked as delivered." });
}
__name(handleAdminOrderDeliver, "handleAdminOrderDeliver");
async function handleAdminOrderDelete(env, req, url) {
  const form = await readForm(req);
  const resp = await deleteOrder(env, form.order_id || "");
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/orders", { err: parsed.data.error || "Delete failed." });
  }
  return redirectWithParams(url, "/admin/orders", { ok: "Order deleted." });
}
__name(handleAdminOrderDelete, "handleAdminOrderDelete");
async function renderAdminPages(env, url) {
  const editId = toNumber(url.searchParams.get("edit"));
  const rows = await env.DB.prepare(`
    SELECT id, slug, title, meta_description, content, page_type, is_default, status, updated_at
    FROM pages
    ORDER BY id DESC
    LIMIT 250
  `).all();
  const pages = rows.results || [];
  const edit = editId ? pages.find((p) => Number(p.id) === editId) : null;
  const tableRows = pages.map((p) => `
    <tr>
      <td>${escapeHtml(p.id)}</td>
      <td>${escapeHtml(p.slug || "")}</td>
      <td>${escapeHtml(p.title || "")}</td>
      <td>${escapeHtml(p.page_type || "custom")}</td>
      <td>${p.is_default ? "yes" : "no"}</td>
      <td>${escapeHtml(p.status || "")}</td>
      <td>${escapeHtml(formatDate(p.updated_at))}</td>
      <td>
        <div class="row">
          <a class="btn secondary small" href="/admin/pages?edit=${encodeURIComponent(String(p.id))}">Edit</a>
          <form method="post" action="/admin/pages/status">
            <input type="hidden" name="id" value="${escapeHtml(p.id)}">
            <input type="hidden" name="status" value="${p.status === "published" ? "draft" : "published"}">
            <button class="btn secondary small" type="submit">${p.status === "published" ? "Draft" : "Publish"}</button>
          </form>
          <form method="post" action="/admin/pages/delete">
            <input type="hidden" name="id" value="${escapeHtml(p.id)}">
            <button class="btn danger small" type="submit">Delete</button>
          </form>
        </div>
      </td>
    </tr>
  `).join("");
  const content = `
    <h1>Pages</h1>
    ${renderNotice(url)}
    <section class="card">
      <h2>${edit ? "Edit Page #" + escapeHtml(edit.id) : "Create Page"}</h2>
      <form class="form-grid" method="post" action="/admin/pages/save">
        <input type="hidden" name="id" value="${escapeHtml(edit?.id || "")}">
        <div><label>Title</label><input type="text" name="title" value="${escapeHtml(edit?.title || "")}" required></div>
        <div><label>Slug</label><input type="text" name="slug" value="${escapeHtml(edit?.slug || "")}"></div>
        <div><label>Meta Description</label><textarea name="meta_description">${escapeHtml(edit?.meta_description || "")}</textarea></div>
        <div><label>Content (HTML allowed)</label><textarea name="content">${escapeHtml(edit?.content || "")}</textarea></div>
        <div>
          <label>Page Type</label>
          <select name="page_type">
            <option value="custom" ${(edit?.page_type || "custom") === "custom" ? "selected" : ""}>custom</option>
            <option value="home" ${edit?.page_type === "home" ? "selected" : ""}>home</option>
            <option value="blog_archive" ${edit?.page_type === "blog_archive" ? "selected" : ""}>blog_archive</option>
            <option value="forum_archive" ${edit?.page_type === "forum_archive" ? "selected" : ""}>forum_archive</option>
            <option value="product_grid" ${edit?.page_type === "product_grid" ? "selected" : ""}>product_grid</option>
          </select>
        </div>
        <div>
          <label>Status</label>
          <select name="status">
            <option value="published" ${(edit?.status || "published") === "published" ? "selected" : ""}>published</option>
            <option value="draft" ${edit?.status === "draft" ? "selected" : ""}>draft</option>
          </select>
        </div>
        <div>
          <label>Set as default for type?</label>
          <select name="is_default">
            <option value="0" ${edit?.is_default ? "" : "selected"}>No</option>
            <option value="1" ${edit?.is_default ? "selected" : ""}>Yes</option>
          </select>
        </div>
        <button class="btn" type="submit">${edit ? "Update Page" : "Create Page"}</button>
      </form>
    </section>
    <section class="card" style="margin-top:18px;overflow:auto;">
      <table>
        <thead><tr><th>ID</th><th>Slug</th><th>Title</th><th>Type</th><th>Default</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="8">No pages found.</td></tr>'}</tbody>
      </table>
    </section>
  `;
  return htmlResponse(renderLayout({
    title: "Admin Pages",
    admin: true,
    content
  }), { admin: true });
}
__name(renderAdminPages, "renderAdminPages");
async function handleAdminPageSave(env, req, url) {
  const form = await readForm(req);
  const resp = await savePage(env, {
    id: form.id ? Number(form.id) : void 0,
    title: form.title || "",
    slug: form.slug || "",
    content: form.content || "",
    meta_description: form.meta_description || "",
    page_type: form.page_type || "custom",
    is_default: String(form.is_default || "0") === "1",
    status: form.status || "published"
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/pages", { err: parsed.data.error || "Failed to save page." });
  }
  return redirectWithParams(url, "/admin/pages", { ok: "Page saved." });
}
__name(handleAdminPageSave, "handleAdminPageSave");
async function handleAdminPageStatus(env, req, url) {
  const form = await readForm(req);
  const resp = await updatePageStatus(env, {
    id: Number(form.id || 0),
    status: form.status || ""
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/pages", { err: parsed.data.error || "Status update failed." });
  }
  return redirectWithParams(url, "/admin/pages", { ok: "Page status updated." });
}
__name(handleAdminPageStatus, "handleAdminPageStatus");
async function handleAdminPageDelete(env, req, url) {
  const form = await readForm(req);
  const resp = await deletePage(env, Number(form.id || 0));
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/pages", { err: parsed.data.error || "Delete failed." });
  }
  return redirectWithParams(url, "/admin/pages", { ok: "Page deleted." });
}
__name(handleAdminPageDelete, "handleAdminPageDelete");
async function renderAdminBlogs(env, url) {
  const editId = toNumber(url.searchParams.get("edit"));
  const rows = await env.DB.prepare(`
    SELECT id, title, slug, description, content, thumbnail_url, status, created_at, updated_at
    FROM blogs
    ORDER BY created_at DESC
    LIMIT 250
  `).all();
  const blogs = rows.results || [];
  const edit = editId ? blogs.find((b) => Number(b.id) === editId) : null;
  const tableRows = blogs.map((b) => `
    <tr>
      <td>${escapeHtml(b.id)}</td>
      <td>${escapeHtml(b.title || "")}</td>
      <td>${escapeHtml(b.slug || "")}</td>
      <td>${escapeHtml(b.status || "")}</td>
      <td>${escapeHtml(formatDate(b.updated_at || b.created_at))}</td>
      <td>
        <div class="row">
          <a class="btn secondary small" href="/admin/blogs?edit=${encodeURIComponent(String(b.id))}">Edit</a>
          <form method="post" action="/admin/blogs/status">
            <input type="hidden" name="id" value="${escapeHtml(b.id)}">
            <input type="hidden" name="status" value="${b.status === "published" ? "draft" : "published"}">
            <button class="btn secondary small" type="submit">${b.status === "published" ? "Draft" : "Publish"}</button>
          </form>
          <form method="post" action="/admin/blogs/delete">
            <input type="hidden" name="id" value="${escapeHtml(b.id)}">
            <button class="btn danger small" type="submit">Delete</button>
          </form>
        </div>
      </td>
    </tr>
  `).join("");
  const content = `
    <h1>Blogs</h1>
    ${renderNotice(url)}
    <section class="card">
      <h2>${edit ? "Edit Blog #" + escapeHtml(edit.id) : "Create Blog"}</h2>
      <form class="form-grid" method="post" action="/admin/blogs/save">
        <input type="hidden" name="id" value="${escapeHtml(edit?.id || "")}">
        <div><label>Title</label><input type="text" name="title" value="${escapeHtml(edit?.title || "")}" required></div>
        <div><label>Slug</label><input type="text" name="slug" value="${escapeHtml(edit?.slug || "")}"></div>
        <div><label>Description</label><textarea name="description">${escapeHtml(edit?.description || "")}</textarea></div>
        <div><label>Thumbnail URL</label><input type="text" name="thumbnail_url" value="${escapeHtml(edit?.thumbnail_url || "")}"></div>
        <div><label>Content (HTML allowed)</label><textarea name="content">${escapeHtml(edit?.content || "")}</textarea></div>
        <div>
          <label>Status</label>
          <select name="status">
            <option value="draft" ${(edit?.status || "draft") === "draft" ? "selected" : ""}>draft</option>
            <option value="published" ${edit?.status === "published" ? "selected" : ""}>published</option>
          </select>
        </div>
        <button class="btn" type="submit">${edit ? "Update Blog" : "Create Blog"}</button>
      </form>
    </section>
    <section class="card" style="margin-top:18px;overflow:auto;">
      <table>
        <thead><tr><th>ID</th><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="6">No blogs found.</td></tr>'}</tbody>
      </table>
    </section>
  `;
  return htmlResponse(renderLayout({
    title: "Admin Blogs",
    admin: true,
    content
  }), { admin: true });
}
__name(renderAdminBlogs, "renderAdminBlogs");
async function handleAdminBlogSave(env, req, url) {
  const form = await readForm(req);
  const resp = await saveBlog(env, {
    id: form.id ? Number(form.id) : void 0,
    title: form.title || "",
    slug: form.slug || "",
    description: form.description || "",
    thumbnail_url: form.thumbnail_url || "",
    content: form.content || "",
    status: form.status || "draft",
    custom_css: "",
    custom_js: ""
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/blogs", { err: parsed.data.error || "Failed to save blog." });
  }
  return redirectWithParams(url, "/admin/blogs", { ok: "Blog saved." });
}
__name(handleAdminBlogSave, "handleAdminBlogSave");
async function handleAdminBlogStatus(env, req, url) {
  const form = await readForm(req);
  const resp = await updateBlogStatus(env, {
    id: Number(form.id || 0),
    status: form.status || "draft"
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/blogs", { err: parsed.data.error || "Status update failed." });
  }
  return redirectWithParams(url, "/admin/blogs", { ok: "Blog status updated." });
}
__name(handleAdminBlogStatus, "handleAdminBlogStatus");
async function handleAdminBlogDelete(env, req, url) {
  const form = await readForm(req);
  const resp = await deleteBlog(env, Number(form.id || 0));
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/blogs", { err: parsed.data.error || "Delete failed." });
  }
  return redirectWithParams(url, "/admin/blogs", { ok: "Blog deleted." });
}
__name(handleAdminBlogDelete, "handleAdminBlogDelete");
async function renderAdminModeration(env, url) {
  const [reviewsR, commentsR, questionsR, repliesR] = await Promise.all([
    env.DB.prepare("SELECT id, author_name, rating, comment, status, created_at FROM reviews ORDER BY id DESC LIMIT 80").all(),
    env.DB.prepare("SELECT id, blog_id, name, comment, status, created_at FROM blog_comments ORDER BY id DESC LIMIT 80").all(),
    env.DB.prepare("SELECT id, title, name, status, created_at FROM forum_questions ORDER BY id DESC LIMIT 80").all(),
    env.DB.prepare("SELECT id, question_id, name, content, status, created_at FROM forum_replies ORDER BY id DESC LIMIT 80").all()
  ]);
  const reviews = reviewsR.results || [];
  const comments = commentsR.results || [];
  const questions = questionsR.results || [];
  const replies = repliesR.results || [];
  const reviewRows = reviews.map((r) => `
    <tr>
      <td>${escapeHtml(r.id)}</td>
      <td>${escapeHtml(r.author_name || "")}</td>
      <td>${escapeHtml(r.rating || 0)}</td>
      <td>${escapeHtml((r.comment || "").slice(0, 120))}</td>
      <td>${escapeHtml(r.status || "")}</td>
      <td>
        <form class="row" method="post" action="/admin/moderation/review">
          <input type="hidden" name="id" value="${escapeHtml(r.id)}">
          <select name="status">
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
          <button class="btn secondary small" type="submit">Apply</button>
        </form>
      </td>
    </tr>
  `).join("");
  const commentRows = comments.map((c) => `
    <tr>
      <td>${escapeHtml(c.id)}</td>
      <td>${escapeHtml(c.name || "")}</td>
      <td>${escapeHtml((c.comment || "").slice(0, 120))}</td>
      <td>${escapeHtml(c.status || "")}</td>
      <td>
        <form class="row" method="post" action="/admin/moderation/comment">
          <input type="hidden" name="id" value="${escapeHtml(c.id)}">
          <select name="status">
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
          <button class="btn secondary small" type="submit">Apply</button>
        </form>
      </td>
    </tr>
  `).join("");
  const questionRows = questions.map((q) => `
    <tr>
      <td>${escapeHtml(q.id)}</td>
      <td>${escapeHtml((q.title || "").slice(0, 120))}</td>
      <td>${escapeHtml(q.name || "")}</td>
      <td>${escapeHtml(q.status || "")}</td>
      <td>
        <form class="row" method="post" action="/admin/moderation/question">
          <input type="hidden" name="id" value="${escapeHtml(q.id)}">
          <select name="status">
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
          <button class="btn secondary small" type="submit">Apply</button>
        </form>
      </td>
    </tr>
  `).join("");
  const replyRows = replies.map((r) => `
    <tr>
      <td>${escapeHtml(r.id)}</td>
      <td>${escapeHtml(r.question_id || "")}</td>
      <td>${escapeHtml(r.name || "")}</td>
      <td>${escapeHtml((r.content || "").slice(0, 120))}</td>
      <td>${escapeHtml(r.status || "")}</td>
      <td>
        <form class="row" method="post" action="/admin/moderation/reply">
          <input type="hidden" name="id" value="${escapeHtml(r.id)}">
          <select name="status">
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
          <button class="btn secondary small" type="submit">Apply</button>
        </form>
      </td>
    </tr>
  `).join("");
  const content = `
    <h1>Moderation</h1>
    ${renderNotice(url)}
    <section class="card" style="overflow:auto;">
      <h2>Reviews</h2>
      <table><thead><tr><th>ID</th><th>Author</th><th>Rating</th><th>Comment</th><th>Status</th><th>Action</th></tr></thead><tbody>${reviewRows || '<tr><td colspan="6">No reviews.</td></tr>'}</tbody></table>
    </section>
    <section class="card" style="overflow:auto;margin-top:18px;">
      <h2>Blog Comments</h2>
      <table><thead><tr><th>ID</th><th>Name</th><th>Comment</th><th>Status</th><th>Action</th></tr></thead><tbody>${commentRows || '<tr><td colspan="5">No comments.</td></tr>'}</tbody></table>
    </section>
    <section class="card" style="overflow:auto;margin-top:18px;">
      <h2>Forum Questions</h2>
      <table><thead><tr><th>ID</th><th>Title</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody>${questionRows || '<tr><td colspan="5">No questions.</td></tr>'}</tbody></table>
    </section>
    <section class="card" style="overflow:auto;margin-top:18px;">
      <h2>Forum Replies</h2>
      <table><thead><tr><th>ID</th><th>Question ID</th><th>Name</th><th>Reply</th><th>Status</th><th>Action</th></tr></thead><tbody>${replyRows || '<tr><td colspan="6">No replies.</td></tr>'}</tbody></table>
    </section>
  `;
  return htmlResponse(renderLayout({
    title: "Admin Moderation",
    admin: true,
    content
  }), { admin: true });
}
__name(renderAdminModeration, "renderAdminModeration");
async function handleAdminModerationReview(env, req, url) {
  const form = await readForm(req);
  const resp = await updateReview(env, {
    id: Number(form.id || 0),
    status: form.status || "pending"
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/moderation", { err: parsed.data.error || "Review moderation failed." });
  }
  return redirectWithParams(url, "/admin/moderation", { ok: "Review updated." });
}
__name(handleAdminModerationReview, "handleAdminModerationReview");
async function handleAdminModerationComment(env, req, url) {
  const form = await readForm(req);
  const resp = await updateCommentStatus(env, {
    id: Number(form.id || 0),
    status: form.status || "pending"
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/moderation", { err: parsed.data.error || "Comment moderation failed." });
  }
  return redirectWithParams(url, "/admin/moderation", { ok: "Comment updated." });
}
__name(handleAdminModerationComment, "handleAdminModerationComment");
async function handleAdminModerationQuestion(env, req, url) {
  const form = await readForm(req);
  const resp = await updateQuestionStatus(env, {
    id: Number(form.id || 0),
    status: form.status || "pending"
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/moderation", { err: parsed.data.error || "Question moderation failed." });
  }
  return redirectWithParams(url, "/admin/moderation", { ok: "Question updated." });
}
__name(handleAdminModerationQuestion, "handleAdminModerationQuestion");
async function handleAdminModerationReply(env, req, url) {
  const form = await readForm(req);
  const resp = await updateReplyStatus(env, {
    id: Number(form.id || 0),
    status: form.status || "pending"
  });
  const parsed = await readJsonResponse(resp);
  if (!parsed.ok || !parsed.data.success) {
    return redirectWithParams(url, "/admin/moderation", { err: parsed.data.error || "Reply moderation failed." });
  }
  return redirectWithParams(url, "/admin/moderation", { ok: "Reply updated." });
}
__name(handleAdminModerationReply, "handleAdminModerationReply");
function renderNoJsAdminLoginPage(url) {
  const err = url.searchParams.get("err");
  const content = `
    <h1>Admin Login</h1>
    ${err ? `<div class="notice error">${escapeHtml(err)}</div>` : ""}
    <section class="card" style="max-width:520px;">
      <form class="form-grid" method="post" action="/admin/login">
        <div>
          <label>Email</label>
          <input type="email" name="email" required>
        </div>
        <div>
          <label>Password</label>
          <input type="password" name="password" required>
        </div>
        <button class="btn" type="submit">Sign In</button>
      </form>
    </section>
  `;
  return htmlResponse(renderLayout({
    title: "Admin Login",
    admin: true,
    content
  }), { admin: true });
}
__name(renderNoJsAdminLoginPage, "renderNoJsAdminLoginPage");
async function handleNoJsRoutes(req, env, url, path, method) {
  if (method === "GET" || method === "HEAD") {
    const canonicalRedirectPath = getCanonicalRedirectPath(path);
    if (canonicalRedirectPath) {
      const to = new URL(req.url);
      to.pathname = canonicalRedirectPath;
      return Response.redirect(to.toString(), 301);
    }
  }
  if (method === "GET" && (path === "/" || path === "/index.html")) {
    return renderHome(env, url);
  }
  if (method === "GET" && (path === "/products" || path === "/products/" || path === "/products.html" || path === "/products-grid" || path === "/products-grid/" || path === "/products-grid.html")) {
    return renderProductsArchive(env, url);
  }
  if (method === "GET" && (path === "/product" || path === "/product/")) {
    const pid = Number(url.searchParams.get("id") || 0);
    if (!pid) return Response.redirect(new URL("/", url.origin).toString(), 302);
    const canonical = await resolveProductPath(env, pid);
    if (url.searchParams.get("cancelled") === "1") {
      return redirectWithParams(url, canonical, { err: "Payment was cancelled." });
    }
    return Response.redirect(new URL(canonical, url.origin).toString(), 302);
  }
  if (method === "GET" && path.startsWith("/product/") && path.length > "/product/".length) {
    const canonical = await resolveProductPathBySlug(env, decodeURIComponent(path.slice("/product/".length)));
    if (canonical) {
      return Response.redirect(new URL(canonical, url.origin).toString(), 301);
    }
  }
  const bareCanonicalMatch = path.match(/^\/product-(\d+)\/?$/);
  if (method === "GET" && bareCanonicalMatch) {
    const canonical = await resolveProductPath(env, Number(bareCanonicalMatch[1]));
    if (canonical && canonical !== "/") {
      return Response.redirect(new URL(canonical, url.origin).toString(), 301);
    }
  }
  const productMatch = path.match(/^\/product-(\d+)(?:\/[^/]+)?\/?$/);
  if (method === "GET" && productMatch) {
    return renderProduct(env, url, Number(productMatch[1]));
  }
  if (method === "POST" && path === "/order/create") {
    return handleCreateOrder(env, req, url);
  }
  if (method === "GET" && (path === "/checkout" || path === "/checkout/" || path === "/checkout.html")) {
    const pid = Number(url.searchParams.get("id") || url.searchParams.get("product_id") || 0);
    if (pid > 0) {
      const canonical = await resolveProductPath(env, pid);
      return Response.redirect(new URL(canonical, url.origin).toString(), 302);
    }
    return redirectWithParams(url, "/products", { err: "Choose a product to continue checkout." }, 302);
  }
  if (method === "GET" && (path === "/success" || path === "/success.html")) {
    return renderSuccess(env, url, req);
  }
  if (method === "GET" && (path === "/order-success" || path === "/order-success/" || path === "/order-success.html")) {
    return Response.redirect(new URL("/success", url.origin).toString(), 302);
  }
  const orderMatch = path.match(/^\/order\/([^/]+)$/);
  if (method === "GET" && orderMatch) {
    return renderOrder(env, url, decodeURIComponent(orderMatch[1]));
  }
  if (method === "GET" && (path === "/buyer-order" || path === "/buyer-order/" || path === "/buyer-order.html")) {
    const orderId = String(url.searchParams.get("id") || "").trim();
    if (!orderId) return redirectWithParams(url, "/", { err: "Order id is required." }, 302);
    return Response.redirect(new URL(`/order/${encodeURIComponent(orderId)}`, url.origin).toString(), 302);
  }
  if (method === "GET" && (path === "/order-detail" || path === "/order-detail/" || path === "/order-detail.html")) {
    const orderId = String(url.searchParams.get("id") || "").trim();
    const target = orderId ? `/admin/orders?view=${encodeURIComponent(orderId)}` : "/admin/orders";
    return Response.redirect(new URL(target, url.origin).toString(), 302);
  }
  const orderReviewMatch = path.match(/^\/order\/([^/]+)\/review$/);
  if (method === "POST" && orderReviewMatch) {
    return handleOrderReview(env, req, url, decodeURIComponent(orderReviewMatch[1]));
  }
  if (method === "GET" && (path === "/blog" || path === "/blog/" || path === "/blog/index.html" || path === "/blog.html")) {
    return renderBlogList(env, url);
  }
  const blogCommentMatch = path.match(/^\/blog\/([^/]+)\/comment$/);
  if (method === "POST" && blogCommentMatch) {
    return handleBlogComment(env, req, url, decodeURIComponent(blogCommentMatch[1]));
  }
  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (method === "GET" && blogMatch) {
    return renderBlogPost(env, url, decodeURIComponent(blogMatch[1]));
  }
  if (method === "GET" && (path === "/forum" || path === "/forum/" || path === "/forum/index.html" || path === "/forum.html")) {
    return renderForumList(env, url);
  }
  if (method === "POST" && path === "/forum/ask") {
    return handleForumAsk(env, req, url);
  }
  const forumReplyMatch = path.match(/^\/forum\/(\d+)\/reply$/);
  if (method === "POST" && forumReplyMatch) {
    return handleForumReply(env, req, url, Number(forumReplyMatch[1]));
  }
  const forumQuestionMatch = path.match(/^\/forum\/([^/]+)$/);
  if (method === "GET" && forumQuestionMatch) {
    return renderForumQuestion(env, url, decodeURIComponent(forumQuestionMatch[1]));
  }
  if (method === "GET" && (path === "/admin" || path === "/admin/" || path === "/admin/dashboard.html")) {
    return renderAdminDashboard(env, url);
  }
  if (method === "GET" && (path === "/admin/products" || path === "/admin/product-form.html")) {
    return renderAdminProducts(env, url);
  }
  if (method === "POST" && path === "/admin/products/save") {
    return handleAdminProductSave(env, req, url);
  }
  if (method === "POST" && path === "/admin/products/delete") {
    return handleAdminProductDelete(env, req, url);
  }
  if (method === "POST" && path === "/admin/products/status") {
    return handleAdminProductStatus(env, req, url);
  }
  if (method === "GET" && (path === "/admin/orders" || path === "/admin/orders.html")) {
    return renderAdminOrders(env, url);
  }
  if (method === "POST" && path === "/admin/orders/update") {
    return handleAdminOrderUpdate(env, req, url);
  }
  if (method === "POST" && path === "/admin/orders/deliver") {
    return handleAdminOrderDeliver(env, req, url);
  }
  if (method === "POST" && path === "/admin/orders/delete") {
    return handleAdminOrderDelete(env, req, url);
  }
  if (method === "GET" && (path === "/admin/pages" || path === "/admin/page-builder.html" || path === "/admin/landing-builder.html")) {
    return renderAdminPages(env, url);
  }
  if (method === "POST" && path === "/admin/pages/save") {
    return handleAdminPageSave(env, req, url);
  }
  if (method === "POST" && path === "/admin/pages/status") {
    return handleAdminPageStatus(env, req, url);
  }
  if (method === "POST" && path === "/admin/pages/delete") {
    return handleAdminPageDelete(env, req, url);
  }
  if (method === "GET" && (path === "/admin/blogs" || path === "/admin/blog-form.html")) {
    return renderAdminBlogs(env, url);
  }
  if (method === "POST" && path === "/admin/blogs/save") {
    return handleAdminBlogSave(env, req, url);
  }
  if (method === "POST" && path === "/admin/blogs/status") {
    return handleAdminBlogStatus(env, req, url);
  }
  if (method === "POST" && path === "/admin/blogs/delete") {
    return handleAdminBlogDelete(env, req, url);
  }
  if (method === "GET" && (path === "/admin/moderation" || path === "/admin/migrate-reviews.html")) {
    return renderAdminModeration(env, url);
  }
  if (method === "POST" && path === "/admin/moderation/review") {
    return handleAdminModerationReview(env, req, url);
  }
  if (method === "POST" && path === "/admin/moderation/comment") {
    return handleAdminModerationComment(env, req, url);
  }
  if (method === "POST" && path === "/admin/moderation/question") {
    return handleAdminModerationQuestion(env, req, url);
  }
  if (method === "POST" && path === "/admin/moderation/reply") {
    return handleAdminModerationReply(env, req, url);
  }
  const customPageMatch = path.match(/^\/([a-z0-9][a-z0-9-]{0,79})\/?$/i);
  if (method === "GET" && customPageMatch) {
    const slug = String(customPageMatch[1] || "").trim().toLowerCase();
    if (!NOJS_RESERVED_PUBLIC_SLUGS.has(slug)) {
      const pageResponse = await renderCustomPage(env, url, slug);
      if (pageResponse) return pageResponse;
    }
  }
  if (method === "GET" && path.startsWith("/admin/") && !path.startsWith("/admin/login") && !path.startsWith("/admin/logout")) {
    return Response.redirect(new URL("/admin", url.origin).toString(), 302);
  }
  return null;
}
__name(handleNoJsRoutes, "handleNoJsRoutes");

// src/utils/component-ssr.js
function toNumber2(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
__name(toNumber2, "toNumber");
function clamp(value, min, max, fallback) {
  const number = toNumber2(value, fallback);
  return Math.min(max, Math.max(min, number));
}
__name(clamp, "clamp");
function buildBootstrapId(prefix, containerId) {
  const safeContainerId = String(containerId || "component").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${prefix}-${safeContainerId || "component"}`;
}
__name(buildBootstrapId, "buildBootstrapId");
function stringifyBootstrap(payload) {
  return JSON.stringify(payload || {}).replace(/</g, "\\u003c");
}
__name(stringifyBootstrap, "stringifyBootstrap");
function buildGridTemplate(columns, fallback = 3) {
  const count = clamp(columns, 1, 6, fallback);
  return `repeat(${count}, 1fr)`;
}
__name(buildGridTemplate, "buildGridTemplate");
function renderProductStars(ratingValue) {
  const rating = Math.max(0, Math.min(5, toNumber2(ratingValue, 5)));
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = "";
  for (let index = 0; index < 5; index += 1) {
    if (index < fullStars) {
      stars += '<span class="star star-full">&#9733;</span>';
    } else if (index === fullStars && hasHalfStar) {
      stars += '<span class="star star-half">&#9733;</span>';
    } else {
      stars += '<span class="star star-empty">&#9734;</span>';
    }
  }
  return `<div class="rating-stars">${stars}</div>`;
}
__name(renderProductStars, "renderProductStars");
function getDeliveryText(instantDelivery, deliveryDays) {
  if (instantDelivery === 1 || instantDelivery === true || instantDelivery === "1") {
    return "Instant Delivery in 60 Minutes";
  }
  const days = parseInt(deliveryDays, 10) || 1;
  if (days === 1) return "24 Hour Express Delivery";
  if (days === 2) return "2 Days Delivery";
  if (days === 3) return "3 Days Delivery";
  return `${days} Days Delivery`;
}
__name(getDeliveryText, "getDeliveryText");
function getDeliveryIcon(instantDelivery) {
  return instantDelivery === 1 || instantDelivery === true || instantDelivery === "1" ? "&#9889;" : "&#128640;";
}
__name(getDeliveryIcon, "getDeliveryIcon");
function formatMoney3(value) {
  return `$${toNumber2(value, 0)}`;
}
__name(formatMoney3, "formatMoney");
function truncateText(value, maxLength) {
  const input = String(value || "").trim();
  if (!input || input.length <= maxLength) return input;
  return `${input.slice(0, Math.max(0, maxLength - 3))}...`;
}
__name(truncateText, "truncateText");
function formatBlogDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
__name(formatBlogDate, "formatBlogDate");
function getVisibleCountForSlider() {
  return 3;
}
__name(getVisibleCountForSlider, "getVisibleCountForSlider");
function renderProductCard(product, options = {}) {
  const {
    id,
    title,
    slug,
    thumbnail_url: thumbnailUrl,
    normal_price: normalPrice,
    sale_price: salePriceInput,
    normal_delivery_text: normalDeliveryText,
    instant_delivery: instantDelivery,
    delivery_time_days: deliveryTimeDays,
    average_rating: averageRating,
    rating_average: ratingAverage,
    review_count: reviewCount
  } = product || {};
  const productTitle = escapeHtml(String(title || "Untitled Product"));
  const safeSlug = slug ? String(slug) : slugifyStr(title || "product");
  const productUrl = id ? canonicalProductPath({ id, slug: safeSlug, title }) : slug ? `/product/${encodeURIComponent(String(slug))}` : "/";
  const originalPrice = toNumber2(normalPrice, 0);
  const salePrice = toNumber2(salePriceInput, originalPrice);
  const hasDiscount = salePrice < originalPrice;
  const discount = hasDiscount && originalPrice > 0 ? Math.round((1 - salePrice / originalPrice) * 100) : 0;
  const rating = Number.isFinite(Number(averageRating)) ? Number(averageRating) : toNumber2(ratingAverage, 5);
  const showReviews = options.showReviews !== false;
  const showDelivery = options.showDelivery !== false;
  const deliveryText = getDeliveryText(instantDelivery, deliveryTimeDays || normalDeliveryText);
  const deliveryIcon = getDeliveryIcon(instantDelivery);
  return `
    <a href="${productUrl}" class="product-card" data-product-id="${escapeHtml(String(id || ""))}" style="text-decoration:none; color:inherit; display:block;">
      <div class="product-thumbnail">
        <img src="${escapeHtml(thumbnailUrl || "/placeholder.jpg")}" alt="${productTitle}" loading="lazy" width="400" height="225">
        ${hasDiscount ? `<div class="discount-badge">${discount}% OFF</div>` : ""}
      </div>
      <div class="product-content">
        <h3 class="product-title">${productTitle}</h3>
        <div class="product-meta-row">
          <div class="product-prices">
            ${hasDiscount ? `<span class="original-price">${formatMoney3(originalPrice)}</span>` : ""}
            <span class="sale-price">${formatMoney3(salePrice)}</span>
          </div>
          ${showReviews ? `
            <div class="product-reviews">
              ${renderProductStars(rating)}
              <span class="review-count">(${escapeHtml(String(reviewCount || 0))})</span>
            </div>
          ` : ""}
        </div>
        ${showDelivery ? `
          <div class="product-delivery">
            <span class="delivery-icon">${deliveryIcon}</span>
            <span class="delivery-text">${escapeHtml(deliveryText)}</span>
          </div>
        ` : ""}
        <div class="book-now-btn">Book Now</div>
      </div>
    </a>
  `;
}
__name(renderProductCard, "renderProductCard");
function renderProductGrid(products, options = {}) {
  const columns = clamp(options.columns, 1, 6, 3);
  return `
    <div class="product-cards-grid" style="display:grid;grid-template-columns:${buildGridTemplate(columns, 3)};gap:30px;max-width:1200px;margin:0 auto;">
      ${products.map((product) => renderProductCard(product, options)).join("")}
    </div>
  `;
}
__name(renderProductGrid, "renderProductGrid");
function renderProductSlider(products, options = {}, containerId = "product-slider") {
  const visibleCount = getVisibleCountForSlider();
  const totalSlides = Math.max(1, Math.ceil(products.length / visibleCount));
  return `
    <div class="product-slider-container">
      <button class="product-slider-btn prev" onclick="ProductCards.slideMove('${escapeHtml(containerId)}', -1)">&#10094;</button>
      <div class="product-slider-wrapper">
        <div class="product-slider-track" data-slide="0" data-total="${totalSlides}" data-visible="${visibleCount}">
          ${products.map((product) => renderProductCard(product, options)).join("")}
        </div>
      </div>
      <button class="product-slider-btn next" onclick="ProductCards.slideMove('${escapeHtml(containerId)}', 1)">&#10095;</button>
    </div>
    <div class="product-slider-dots">
      ${Array.from({ length: totalSlides }, (_, index) => `<button class="product-slider-dot${index === 0 ? " active" : ""}" onclick="ProductCards.slideTo('${escapeHtml(containerId)}', ${index})"></button>`).join("")}
    </div>
  `;
}
__name(renderProductSlider, "renderProductSlider");
function renderBlogCard(blog) {
  const slugOrId = String(blog?.slug || blog?.id || "").trim();
  const blogUrl = `/blog/${encodeURIComponent(slugOrId)}`;
  const title = escapeHtml(String(blog?.title || "Untitled"));
  const description = escapeHtml(truncateText(blog?.description || "", 120));
  const date = formatBlogDate(blog?.created_at);
  return `
    <a href="${blogUrl}" class="blog-card" style="text-decoration:none;color:inherit;display:block;">
      <div class="blog-thumbnail">
        <img src="${escapeHtml(blog?.thumbnail_url || "/placeholder.jpg")}" alt="${title}" loading="lazy" width="400" height="225">
      </div>
      <div class="blog-content">
        <h3 class="blog-title">${title}</h3>
        ${date ? `<div class="blog-date">&#128197; ${escapeHtml(date)}</div>` : ""}
        <p class="blog-description">${description}</p>
        <span class="blog-read-more">Read More &rarr;</span>
      </div>
    </a>
  `;
}
__name(renderBlogCard, "renderBlogCard");
function buildBlogPageHref(pageNumber, limit) {
  const page = Math.max(1, parseInt(pageNumber, 10) || 1);
  const pageLimit = Math.max(1, parseInt(limit, 10) || 30);
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (pageLimit !== 30) params.set("limit", String(pageLimit));
  const query = params.toString();
  return query ? `?${query}` : "?";
}
__name(buildBlogPageHref, "buildBlogPageHref");
function renderBlogPagination(pagination = {}, showPagination = true) {
  if (!showPagination) return "";
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const totalPages = Math.max(0, parseInt(pagination.totalPages, 10) || 0);
  const limit = Math.max(1, parseInt(pagination.limit, 10) || 30);
  if (totalPages <= 1) return "";
  let links = "";
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  if (startPage > 1) {
    links += `<a href="${buildBlogPageHref(1, limit)}" class="page-link">1</a>`;
    if (startPage > 2) links += '<span class="page-dots">...</span>';
  }
  for (let current = startPage; current <= endPage; current += 1) {
    if (current === page) {
      links += `<span class="page-link active">${current}</span>`;
    } else {
      links += `<a href="${buildBlogPageHref(current, limit)}" class="page-link">${current}</a>`;
    }
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) links += '<span class="page-dots">...</span>';
    links += `<a href="${buildBlogPageHref(totalPages, limit)}" class="page-link">${totalPages}</a>`;
  }
  return `
    <div class="blog-pagination">
      ${pagination.hasPrev ? `<a href="${buildBlogPageHref(page - 1, limit)}" class="page-link page-prev">&larr; Previous</a>` : ""}
      <div class="page-numbers">${links}</div>
      ${pagination.hasNext ? `<a href="${buildBlogPageHref(page + 1, limit)}" class="page-link page-next">Next &rarr;</a>` : ""}
    </div>
  `;
}
__name(renderBlogPagination, "renderBlogPagination");
function renderBlogGrid(blogs, options = {}, pagination = {}) {
  const columns = clamp(options.columns, 1, 6, 3);
  const showPagination = options.showPagination !== false && options.pagination !== false;
  return `
    <div class="blog-cards-grid" style="display:grid;grid-template-columns:${buildGridTemplate(columns, 3)};gap:30px;max-width:1200px;margin:0 auto;">
      ${blogs.map((blog) => renderBlogCard(blog)).join("")}
    </div>
    ${renderBlogPagination(pagination, showPagination)}
  `;
}
__name(renderBlogGrid, "renderBlogGrid");
function renderBlogSlider(blogs, containerId = "blog-slider") {
  const visibleCount = getVisibleCountForSlider();
  const totalSlides = Math.max(1, Math.ceil(blogs.length / visibleCount));
  return `
    <div class="blog-slider-container">
      <button class="blog-slider-btn prev" onclick="BlogCards.slideMove('${escapeHtml(containerId)}', -1)">&#10094;</button>
      <div class="blog-slider-wrapper">
        <div class="blog-slider-track" data-slide="0" data-total="${totalSlides}" data-visible="${visibleCount}">
          ${blogs.map((blog) => renderBlogCard(blog)).join("")}
        </div>
      </div>
      <button class="blog-slider-btn next" onclick="BlogCards.slideMove('${escapeHtml(containerId)}', 1)">&#10095;</button>
    </div>
    <div class="blog-slider-dots">
      ${Array.from({ length: totalSlides }, (_, index) => `<button class="blog-slider-dot${index === 0 ? " active" : ""}" onclick="BlogCards.slideTo('${escapeHtml(containerId)}', ${index})"></button>`).join("")}
    </div>
  `;
}
__name(renderBlogSlider, "renderBlogSlider");
function parseInlineRenderOptions(raw = "") {
  const input = String(raw || "").trim();
  if (!input) return {};
  let normalized = input.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":').replace(/'/g, '"').replace(/\bundefined\b/g, "null").replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(normalized);
  } catch (_) {
    return {};
  }
}
__name(parseInlineRenderOptions, "parseInlineRenderOptions");
function extractInlineRenderConfigs(html, globalName) {
  const configs = /* @__PURE__ */ new Map();
  const input = String(html || "");
  if (!input.includes(globalName + ".render")) {
    return configs;
  }
  const pattern = new RegExp(`${globalName}\\.(renderSlider|render)\\(\\s*['"]([^'"]+)['"]\\s*,\\s*({[\\s\\S]*?})\\s*\\)`, "g");
  let match;
  while ((match = pattern.exec(input)) !== null) {
    const [, method, containerId, rawOptions] = match;
    const options = parseInlineRenderOptions(rawOptions);
    if (method === "renderSlider") {
      options.layout = "slider";
    }
    configs.set(String(containerId), options);
  }
  return configs;
}
__name(extractInlineRenderConfigs, "extractInlineRenderConfigs");
function ensureStyleTag(html, styleTag, styleId) {
  const input = String(html || "");
  if (!styleTag || styleId && input.includes(`id="${styleId}"`)) {
    return input;
  }
  if (/<\/head>/i.test(input)) {
    return input.replace(/<\/head>/i, `${styleTag}
</head>`);
  }
  if (/<body[^>]*>/i.test(input)) {
    return input.replace(/<body([^>]*)>/i, `<body$1>
${styleTag}`);
  }
  return `${styleTag}${input}`;
}
__name(ensureStyleTag, "ensureStyleTag");
function replaceSimpleContainerById(html, containerId, innerHtml, attrs = {}, afterHtml = "") {
  const input = String(html || "");
  const escapedId = String(containerId || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<(div|section)([^>]*\\bid=["']${escapedId}["'][^>]*)>`, "i");
  const match = pattern.exec(input);
  if (!match) {
    return input;
  }
  const tagName = String(match[1] || "div").toLowerCase();
  const rawAttrs = match[2] || "";
  const openingTagIndex = match.index;
  const openingTagEnd = openingTagIndex + match[0].length;
  const closingTagIndex = findMatchingContainerCloseIndex(input, tagName, openingTagEnd);
  if (closingTagIndex < 0) {
    return input;
  }
  let nextAttrs = rawAttrs;
  Object.entries(attrs || {}).forEach(([key, value]) => {
    const attrPattern = new RegExp(`\\s${key}=["'][^"']*["']`, "i");
    const serialized = ` ${key}="${escapeHtml(String(value))}"`;
    nextAttrs = attrPattern.test(nextAttrs) ? nextAttrs.replace(attrPattern, serialized) : `${nextAttrs}${serialized}`;
  });
  const closeTag = `</${tagName}>`;
  const replacement = `<${tagName}${nextAttrs}>${innerHtml}</${tagName}>${afterHtml}`;
  return `${input.slice(0, openingTagIndex)}${replacement}${input.slice(closingTagIndex + closeTag.length)}`;
}
__name(replaceSimpleContainerById, "replaceSimpleContainerById");
function findMatchingContainerCloseIndex(html, tagName, searchFrom) {
  const tokenPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tokenPattern.lastIndex = searchFrom;
  let depth = 1;
  let tokenMatch;
  while (tokenMatch = tokenPattern.exec(html)) {
    const token = tokenMatch[0];
    const isClosing = /^<\//.test(token);
    const isSelfClosing = /\/>$/.test(token);
    if (isClosing) {
      depth -= 1;
      if (depth === 0) {
        return tokenMatch.index;
      }
      continue;
    }
    if (!isSelfClosing) {
      depth += 1;
    }
  }
  return -1;
}
__name(findMatchingContainerCloseIndex, "findMatchingContainerCloseIndex");
function renderProductCardsSsrMarkup({ containerId, products = [], options = {}, pagination = {} }) {
  const resolvedOptions = {
    limit: clamp(options.limit, 1, 100, 12),
    columns: clamp(options.columns, 1, 6, 3),
    filter: String(options.filter || "all"),
    ids: Array.isArray(options.ids) ? options.ids : [],
    layout: String(options.layout || "grid"),
    showReviews: options.showReviews !== false,
    showDelivery: options.showDelivery !== false
  };
  const innerHtml = resolvedOptions.layout === "slider" ? renderProductSlider(products, resolvedOptions, containerId) : renderProductGrid(products, resolvedOptions);
  const bootstrapId = buildBootstrapId("product-cards-bootstrap", containerId);
  const bootstrapScript = `<script type="application/json" id="${bootstrapId}">${stringifyBootstrap({
    containerId,
    options: resolvedOptions,
    products,
    pagination
  })}<\/script>`;
  return {
    innerHtml,
    afterHtml: bootstrapScript,
    attrs: {
      "data-ssr-product-cards": "1",
      "data-ssr-bootstrap-id": bootstrapId
    }
  };
}
__name(renderProductCardsSsrMarkup, "renderProductCardsSsrMarkup");
function renderBlogCardsSsrMarkup({ containerId, blogs = [], options = {}, pagination = {} }) {
  const resolvedOptions = {
    limit: clamp(options.limit, 1, 100, 30),
    columns: clamp(options.columns, 1, 6, 3),
    ids: Array.isArray(options.ids) ? options.ids : [],
    layout: String(options.layout || "grid"),
    showPagination: options.showPagination !== false && options.pagination !== false
  };
  const innerHtml = resolvedOptions.layout === "slider" ? renderBlogSlider(blogs, containerId) : renderBlogGrid(blogs, resolvedOptions, pagination);
  const bootstrapId = buildBootstrapId("blog-cards-bootstrap", containerId);
  const bootstrapScript = `<script type="application/json" id="${bootstrapId}">${stringifyBootstrap({
    containerId,
    options: resolvedOptions,
    blogs,
    pagination
  })}<\/script>`;
  return {
    innerHtml,
    afterHtml: bootstrapScript,
    attrs: {
      "data-ssr-blog-cards": "1",
      "data-ssr-bootstrap-id": bootstrapId
    }
  };
}
__name(renderBlogCardsSsrMarkup, "renderBlogCardsSsrMarkup");
var PRODUCT_CARDS_STYLE_TAG = `<style id="product-cards-styles">
  .product-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    contain: layout style paint;
  }
  .product-card:hover {
    box-shadow: 0 12px 24px rgba(0,0,0,0.15);
  }
  .product-thumbnail {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    overflow: hidden;
    background: #f3f4f6;
  }
  .product-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .product-card:hover .product-thumbnail img {
    transform: scale(1.05);
  }
  .discount-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.85em;
    box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
  }
  .product-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  }
  .product-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
    line-height: 1.4;
    min-height: 2.8em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .product-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .product-prices {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .original-price {
    font-size: 0.9rem;
    color: #9ca3af;
    text-decoration: line-through;
  }
  .sale-price {
    font-size: 1.5rem;
    font-weight: 700;
    color: #3b82f6;
  }
  .product-reviews {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .rating-stars {
    display: flex;
    gap: 2px;
  }
  .star {
    font-size: 1rem;
    line-height: 1;
  }
  .star-full {
    color: #fbbf24;
  }
  .star-half {
    color: #fbbf24;
    opacity: 0.5;
  }
  .star-empty {
    color: #d1d5db;
  }
  .review-count {
    font-size: 0.85rem;
    color: #6b7280;
  }
  .product-delivery {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #f0f9ff;
    border-radius: 6px;
    font-size: 0.9rem;
    color: #1e40af;
    font-weight: 500;
  }
  .delivery-icon {
    font-size: 1.1em;
  }
  .book-now-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: box-shadow 0.15s ease;
    margin-top: auto;
  }
  .book-now-btn:hover {
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  }
  @media (max-width: 768px) {
    .product-cards-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 20px !important;
    }
  }
  @media (max-width: 480px) {
    .product-cards-grid {
      grid-template-columns: 1fr !important;
    }
  }
  .product-slider-container {
    position: relative;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 50px;
  }
  .product-slider-wrapper {
    overflow: hidden;
  }
  .product-slider-track {
    display: flex;
    gap: 20px;
    transition: transform 0.4s ease;
    padding: 10px 0;
  }
  .product-slider-track .product-card {
    flex: 0 0 calc(33.333% - 14px);
    min-width: calc(33.333% - 14px);
  }
  .product-slider-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .product-slider-btn:hover:not(:disabled) {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
  .product-slider-btn.prev { left: 0; }
  .product-slider-btn.next { right: 0; }
  .product-slider-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .product-slider-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 20px;
  }
  .product-slider-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #d1d5db;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .product-slider-dot.active {
    background: #667eea;
    transform: scale(1.2);
  }
  @media (max-width: 900px) {
    .product-slider-track .product-card {
      flex: 0 0 calc(50% - 10px);
      min-width: calc(50% - 10px);
    }
  }
  @media (max-width: 600px) {
    .product-slider-container { padding: 0 10px; }
    .product-slider-track .product-card {
      flex: 0 0 100%;
      min-width: 100%;
    }
    .product-slider-btn { display: none; }
  }
</style>`;
var BLOG_CARDS_STYLE_TAG = `<style id="blog-cards-styles">
  .blog-loader {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .blog-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    contain: layout style paint;
  }
  .blog-card:hover {
    box-shadow: 0 12px 24px rgba(0,0,0,0.15);
  }
  .blog-thumbnail {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    overflow: hidden;
    background: #f3f4f6;
  }
  .blog-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .blog-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  }
  .blog-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .blog-date {
    font-size: 0.85rem;
    color: #6b7280;
  }
  .blog-description {
    font-size: 0.95rem;
    color: #4b5563;
    line-height: 1.5;
    margin: 0;
    flex: 1;
  }
  .blog-read-more {
    display: block;
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    transition: box-shadow 0.15s ease;
    margin-top: auto;
  }
  .blog-read-more:hover {
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  }
  .blog-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 50px;
    padding: 20px 0;
  }
  .page-numbers {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .page-link {
    padding: 10px 16px;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    color: #374151;
    text-decoration: none;
    font-weight: 600;
    transition: border-color 0.15s ease, color 0.15s ease;
  }
  .page-link:hover {
    border-color: #667eea;
    color: #667eea;
  }
  .page-link.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: transparent;
    color: white;
  }
  .page-dots {
    color: #9ca3af;
    padding: 0 5px;
  }
  .page-prev, .page-next {
    background: #f9fafb;
  }
  @media (max-width: 768px) {
    .blog-cards-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 20px !important;
    }
    .blog-pagination {
      flex-wrap: wrap;
    }
  }
  @media (max-width: 480px) {
    .blog-cards-grid {
      grid-template-columns: 1fr !important;
    }
    .page-numbers {
      order: 3;
      width: 100%;
      justify-content: center;
      margin-top: 10px;
    }
  }
  .blog-slider-container {
    position: relative;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 50px;
  }
  .blog-slider-wrapper {
    overflow: hidden;
  }
  .blog-slider-track {
    display: flex;
    gap: 20px;
    transition: transform 0.4s ease;
    padding: 10px 0;
  }
  .blog-slider-track .blog-card {
    flex: 0 0 calc(33.333% - 14px);
    min-width: calc(33.333% - 14px);
  }
  .blog-slider-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .blog-slider-btn:hover:not(:disabled) {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
  .blog-slider-btn.prev { left: 0; }
  .blog-slider-btn.next { right: 0; }
  .blog-slider-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .blog-slider-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 20px;
  }
  .blog-slider-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #d1d5db;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .blog-slider-dot.active {
    background: #667eea;
    transform: scale(1.2);
  }
  @media (max-width: 900px) {
    .blog-slider-track .blog-card {
      flex: 0 0 calc(50% - 10px);
      min-width: calc(50% - 10px);
    }
  }
  @media (max-width: 600px) {
    .blog-slider-container { padding: 0 10px; }
    .blog-slider-track .blog-card {
      flex: 0 0 100%;
      min-width: 100%;
    }
    .blog-slider-btn { display: none; }
  }
</style>`;

// src/utils/homepage-ssr.js
var HOME_PRODUCTS_BOOTSTRAP_ID = "home-products-bootstrap";
function clamp2(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
__name(clamp2, "clamp");
function safeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}
__name(safeDate, "safeDate");
function buildBootstrapId2(prefix, containerId) {
  const safeContainerId = String(containerId || "component").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${prefix}-${safeContainerId || "component"}`;
}
__name(buildBootstrapId2, "buildBootstrapId");
function stringifyBootstrap2(payload) {
  return JSON.stringify(payload || {}).replace(/</g, "\\u003c");
}
__name(stringifyBootstrap2, "stringifyBootstrap");
function renderReviewStars(ratingValue) {
  const rating = clamp2(ratingValue, 0, 5, 5);
  const fullStars = Math.floor(rating);
  let stars = "";
  for (let index = 0; index < 5; index += 1) {
    if (index < fullStars) {
      stars += '<span class="star star-full" aria-hidden="true">&#9733;</span>';
    } else {
      stars += '<span class="star star-empty" aria-hidden="true">&#9734;</span>';
    }
  }
  return `<div class="rating-stars" role="img" aria-label="${escapeHtml(String(rating))} out of 5 stars">${stars}</div>`;
}
__name(renderReviewStars, "renderReviewStars");
function extractYoutubeId(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  const match = value.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  return match ? String(match[1]) : "";
}
__name(extractYoutubeId, "extractYoutubeId");
function buildHomeProductsBootstrap(products = []) {
  const normalized = Array.isArray(products) ? products.slice(0, 24).map((product) => ({ ...product })) : [];
  const detailsById = Object.fromEntries(
    normalized.filter((product) => product && product.id != null).map((product) => [String(product.id), { product, addons: [] }])
  );
  return {
    products: normalized,
    detailsById
  };
}
__name(buildHomeProductsBootstrap, "buildHomeProductsBootstrap");
function renderHomepageProductGridSsr(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return '<p style="margin:0;text-align:center;color:#fff;opacity:0.85;">No products available right now.</p>';
  }
  return products.map((product) => {
    const productTitle = escapeHtml(String(product?.title || "Product"));
    const imageUrl = escapeHtml(String(product?.thumbnail_url || ""));
    const normalPrice = Number(product?.normal_price || 0);
    const salePrice = Number(product?.sale_price || normalPrice || 0);
    const hasDiscount = normalPrice > 0 && salePrice < normalPrice;
    const discount = hasDiscount ? Math.max(0, Math.round((1 - salePrice / normalPrice) * 100)) : 0;
    const rating = clamp2(product?.average_rating ?? product?.rating_average ?? 0, 0, 5, 0);
    const fullStars = Math.round(rating);
    const reviewCount = Math.max(0, parseInt(product?.review_count, 10) || 0);
    const productUrl = canonicalProductPath(product);
    return `
      <div class="product-card">
        <div class="media">
          <img src="${imageUrl}" alt="${productTitle}" loading="lazy" width="400" height="180">
          ${hasDiscount ? `<span class="badge">${discount}% OFF</span>` : ""}
        </div>
        <div class="info">
          <span class="stars">${"&#9733;".repeat(fullStars)}${"&#9734;".repeat(Math.max(0, 5 - fullStars))}</span>
          <span class="reviews">(${reviewCount} reviews)</span>
          <div class="price">$${salePrice.toFixed(0)}${hasDiscount ? `<span class="old-price">$${normalPrice.toFixed(0)}</span>` : ""}</div>
          <a class="book-btn" href="${productUrl}">Book Now</a>
        </div>
      </div>
    `;
  }).join("");
}
__name(renderHomepageProductGridSsr, "renderHomepageProductGridSsr");
function selectFeaturedHomeProducts(products = []) {
  return (Array.isArray(products) ? products : []).filter((product) => String(product?.video_url || "").trim() !== "").sort((left, right) => {
    const reviewDelta = Number(right?.review_count || 0) - Number(left?.review_count || 0);
    if (reviewDelta !== 0) return reviewDelta;
    const ratingDelta = Number(right?.average_rating ?? right?.rating_average ?? 0) - Number(left?.average_rating ?? left?.rating_average ?? 0);
    if (ratingDelta !== 0) return ratingDelta;
    return Number(right?.id || 0) - Number(left?.id || 0);
  }).slice(0, 4);
}
__name(selectFeaturedHomeProducts, "selectFeaturedHomeProducts");
function renderHomepageHeroPlayerSsr(products = []) {
  const featured = selectFeaturedHomeProducts(products);
  if (featured.length === 0) {
    return {
      innerHtml: `
        <div class="hero-player-stage" data-role="stage"></div>
        <div class="hero-player-dots" data-role="dots"></div>
        <a class="hero-player-cta" data-role="cta" href="/products">Book Now</a>
      `,
      targetHref: "/products",
      featured
    };
  }
  const current = featured[0];
  const title = escapeHtml(String(current?.title || "Featured product"));
  const targetHref = canonicalProductPath(current);
  const youtubeId = extractYoutubeId(current?.video_url);
  const stageMedia = youtubeId ? `<iframe src="https://www.youtube.com/embed/${escapeHtml(youtubeId)}?rel=0&amp;playsinline=1&amp;mute=1" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : `<video src="${escapeHtml(String(current?.video_url || ""))}" controls muted playsinline preload="metadata"></video>`;
  return {
    innerHtml: `
      <div class="hero-player-stage" data-role="stage">${stageMedia}</div>
      <div class="hero-player-dots" data-role="dots">
        ${featured.map((item, index) => `<button type="button" class="hero-player-dot${index === 0 ? " active" : ""}" aria-label="Play product ${index + 1}"></button>`).join("")}
      </div>
      <a class="hero-player-cta" data-role="cta" href="${targetHref}">Book Now</a>
    `,
    targetHref,
    featured
  };
}
__name(renderHomepageHeroPlayerSsr, "renderHomepageHeroPlayerSsr");
function isTruthyInstantDelivery(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}
__name(isTruthyInstantDelivery, "isTruthyInstantDelivery");
function resolveProductPrices(product) {
  const normalPrice = Number(product?.normal_price || 0);
  const salePrice = Number(product?.sale_price || normalPrice || 0);
  const hasDiscount = normalPrice > 0 && salePrice > 0 && salePrice < normalPrice;
  const discount = hasDiscount ? Math.max(0, Math.round((1 - salePrice / normalPrice) * 100)) : 0;
  return {
    normalPrice,
    salePrice,
    hasDiscount,
    discount
  };
}
__name(resolveProductPrices, "resolveProductPrices");
function renderLegacyStars(ratingValue) {
  const rating = clamp2(Math.round(Number(ratingValue || 0)), 0, 5, 5);
  return `${"&#9733;".repeat(rating)}${"&#9734;".repeat(Math.max(0, 5 - rating))}`;
}
__name(renderLegacyStars, "renderLegacyStars");
function renderLegacyPrice(finalPrice, originalPrice = 0, originalClassName = "original-price") {
  const price = Number(finalPrice || 0);
  const original = Number(originalPrice || 0);
  const safePrice = Number.isFinite(price) ? price.toFixed(0) : "0";
  const safeOriginal = Number.isFinite(original) && original > 0 ? original.toFixed(0) : "";
  return `<span class="current-price">$${safePrice}</span>${safeOriginal ? `<span class="${originalClassName}">$${safeOriginal}</span>` : ""}`;
}
__name(renderLegacyPrice, "renderLegacyPrice");
function renderLegacyHomepageProductSliderSsr(products = [], options = {}) {
  const mode = String(options.mode || "featured").trim().toLowerCase();
  const limit = clamp2(options.limit, 1, 24, mode === "instant" ? 8 : 8);
  const sourceProducts = Array.isArray(products) ? products : [];
  const filteredProducts = mode === "instant" ? sourceProducts.filter((product) => isTruthyInstantDelivery(product?.instant_delivery)) : sourceProducts.filter((product) => String(product?.thumbnail_url || product?.video_url || "").trim() !== "");
  const selectedProducts = filteredProducts.slice(0, limit);
  if (selectedProducts.length === 0) {
    return `<div class="pw-loading">${mode === "instant" ? "No instant delivery products available right now." : "No featured products available right now."}</div>`;
  }
  return selectedProducts.map((product) => {
    const productTitle = escapeHtml(String(product?.title || "Product"));
    const imageUrl = escapeHtml(String(product?.thumbnail_url || ""));
    const productUrl = canonicalProductPath(product);
    const reviewCount = Math.max(0, parseInt(product?.review_count, 10) || 0);
    const rating = Number(product?.average_rating ?? product?.rating_average ?? 0);
    const { normalPrice, salePrice, hasDiscount, discount } = resolveProductPrices(product);
    return `
      <div class="slider-item">
        <div class="product-card">
          <div class="product-image">
            <a href="${productUrl}"><img src="${imageUrl}" alt="${productTitle}" loading="lazy"></a>
            ${mode === "instant" ? '<span class="instant-badge">&#9889; 60 Min</span>' : ""}
            ${hasDiscount ? `<span class="product-badge">${discount}% OFF</span>` : ""}
          </div>
          <div class="product-info">
            <h3 class="product-title">${productTitle}</h3>
            <div class="product-rating">
              <span class="stars">${renderLegacyStars(rating)}</span>
              <span class="review-count">(${reviewCount})</span>
            </div>
            <div class="product-price">${renderLegacyPrice(salePrice, hasDiscount ? normalPrice : 0)}</div>
            <a href="${productUrl}" class="product-book-btn">Book Now</a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}
__name(renderLegacyHomepageProductSliderSsr, "renderLegacyHomepageProductSliderSsr");
function renderLegacyHomepageHeroPlayerSsr(products = []) {
  const featured = selectFeaturedHomeProducts(products);
  if (featured.length === 0) {
    return {
      stageHtml: '<div class="pw-loading">No products available</div>',
      thumbnailsHtml: "",
      dotsHtml: "",
      infoHtml: "",
      targetHref: "/products"
    };
  }
  const current = featured[0];
  const productTitle = escapeHtml(String(current?.title || "Featured product"));
  const thumbnailUrl = escapeHtml(String(current?.thumbnail_url || ""));
  const productUrl = canonicalProductPath(current);
  const youtubeId = extractYoutubeId(current?.video_url);
  const { normalPrice, salePrice, hasDiscount } = resolveProductPrices(current);
  const stageHtml = youtubeId ? `<iframe src="https://www.youtube.com/embed/${escapeHtml(youtubeId)}?rel=0&amp;playsinline=1&amp;mute=1" title="${productTitle}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>` : String(current?.video_url || "").trim() ? `<video src="${escapeHtml(String(current.video_url))}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>` : `<img src="${thumbnailUrl}" alt="${productTitle}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`;
  const thumbnailsHtml = featured.map((item, index) => {
    const itemTitle = escapeHtml(String(item?.title || "Product"));
    const itemThumb = escapeHtml(String(item?.thumbnail_url || ""));
    const hasVideo = String(item?.video_url || "").trim() !== "";
    return `
      <div class="player-thumb${index === 0 ? " active" : ""}" data-index="${index}">
        <img src="${itemThumb}" alt="${itemTitle}" loading="lazy">
        ${hasVideo ? '<div class="pw-thumb-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>' : ""}
      </div>
    `;
  }).join("");
  const dotsHtml = featured.map((_, index) => `<button class="hero-player-dot${index === 0 ? " active" : ""}" data-index="${index}" type="button" aria-label="Play product ${index + 1}"></button>`).join("");
  const infoHtml = `
    <div>
      <div class="hero-product-title">${productTitle}</div>
      <span class="hero-product-price">
        $${Number.isFinite(salePrice) ? salePrice.toFixed(0) : "0"}
        ${hasDiscount ? `<span class="pw-old-price">$${normalPrice.toFixed(0)}</span>` : ""}
      </span>
    </div>
  `;
  return {
    stageHtml,
    thumbnailsHtml,
    dotsHtml,
    infoHtml,
    targetHref: productUrl
  };
}
__name(renderLegacyHomepageHeroPlayerSsr, "renderLegacyHomepageHeroPlayerSsr");
function buildReviewerInitials(name) {
  const value = String(name || "").trim();
  if (!value) return "?";
  return value.split(/\s+/).map((part) => part.charAt(0)).join("").slice(0, 2).toUpperCase();
}
__name(buildReviewerInitials, "buildReviewerInitials");
function renderLegacyHomepageReviewsSliderSsr(reviews = []) {
  const items = Array.isArray(reviews) ? reviews.slice(0, 8) : [];
  if (items.length === 0) {
    return '<div style="text-align:center;padding:40px;color:#6b7280;">No reviews yet. Be the first to leave a review!</div>';
  }
  return items.map((review) => {
    const reviewerName = escapeHtml(String(review?.customer_name || review?.author_name || "Anonymous"));
    const reviewText = escapeHtml(String(review?.review_text || review?.comment || "No review text provided."));
    const productTitle = escapeHtml(String(review?.product_name || review?.product_title || ""));
    const dateText = escapeHtml(safeDate(review?.created_at));
    const initials = buildReviewerInitials(reviewerName);
    const rating = clamp2(parseInt(review?.rating, 10) || 5, 1, 5, 5);
    return `
      <div class="slider-item">
        <div class="review-card">
          <div class="review-header">
            <div class="review-avatar">${initials}</div>
            <div>
              <div class="review-author">${reviewerName}</div>
              <div class="review-date">${dateText}</div>
            </div>
          </div>
          <div class="review-stars stars">${renderLegacyStars(rating)}</div>
          <p class="review-text">${reviewText}</p>
          ${productTitle ? `<span class="review-product-tag">${productTitle}</span>` : ""}
        </div>
      </div>
    `;
  }).join("");
}
__name(renderLegacyHomepageReviewsSliderSsr, "renderLegacyHomepageReviewsSliderSsr");
function renderReviewsWidgetSsrMarkup({ containerId, reviews = [], options = {} }) {
  const resolvedOptions = {
    columns: clamp2(options.columns, 1, 6, 1),
    showAvatar: options.showAvatar !== false,
    limit: clamp2(options.limit, 1, 50, 10),
    minRating: options.minRating == null ? null : clamp2(options.minRating, 1, 5, null),
    rating: options.rating == null ? null : clamp2(options.rating, 1, 5, null),
    productId: options.productId ?? null,
    productIds: Array.isArray(options.productIds) ? options.productIds : [],
    ids: Array.isArray(options.ids) ? options.ids : []
  };
  const content = !Array.isArray(reviews) || reviews.length === 0 ? `
      <div style="text-align: center; padding: 40px; color: #6b7280;">
        <div style="font-size: 3rem; margin-bottom: 15px;">&#11088;</div>
        <p>No reviews yet. Be the first to review!</p>
      </div>
    ` : `
      <div class="reviews-grid" style="display: grid; grid-template-columns: repeat(${resolvedOptions.columns}, 1fr); gap: 25px; max-width: 1200px; margin: 0 auto;">
        ${reviews.map((review) => {
    const reviewerName = escapeHtml(String(review?.customer_name || review?.author_name || "Anonymous"));
    const reviewText = escapeHtml(String(review?.review_text || review?.comment || "No review text"));
    const productTitle = escapeHtml(String(review?.product_name || review?.product_title || ""));
    const dateText = escapeHtml(safeDate(review?.created_at));
    const createdAt = escapeHtml(String(review?.created_at || ""));
    const initials = reviewerName.charAt(0).toUpperCase();
    return `
            <article class="review-card" aria-label="Review by ${reviewerName}">
              <div class="review-header">
                ${resolvedOptions.showAvatar ? `<div class="review-avatar" aria-hidden="true">${initials}</div>` : ""}
                <div class="review-header-info">
                  <div class="review-author">${reviewerName}</div>
                  <div class="review-meta">
                    ${renderReviewStars(review?.rating)}
                    <span class="review-date"><time datetime="${createdAt}">${dateText}</time></span>
                  </div>
                </div>
              </div>
              ${productTitle ? `<div class="review-product"><span aria-hidden="true">&#128230;</span> ${productTitle}</div>` : ""}
              <div class="review-text">${reviewText}</div>
            </article>
          `;
  }).join("")}
      </div>
    `;
  const bootstrapId = buildBootstrapId2("reviews-widget-bootstrap", containerId);
  return {
    innerHtml: content,
    attrs: {
      "data-ssr-reviews-widget": "1",
      "data-ssr-bootstrap-id": bootstrapId
    },
    afterHtml: `<script type="application/json" id="${escapeHtml(bootstrapId)}">${stringifyBootstrap2({
      reviews,
      options: resolvedOptions
    })}<\/script>`
  };
}
__name(renderReviewsWidgetSsrMarkup, "renderReviewsWidgetSsrMarkup");
var REVIEWS_WIDGET_STYLE_TAG = `<style id="reviews-widget-styles">
  .review-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    min-height: 120px;
    contain: layout style paint;
  }
  .review-header {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }
  .review-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.2rem;
    flex-shrink: 0;
  }
  .review-header-info {
    flex: 1;
  }
  .review-author {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 5px;
  }
  .review-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rating-stars {
    display: flex;
    gap: 2px;
  }
  .star {
    font-size: 1rem;
    line-height: 1;
  }
  .star-full {
    color: #fbbf24;
  }
  .star-empty {
    color: #d1d5db;
  }
  .review-date {
    font-size: 0.85rem;
    color: #6b7280;
  }
  .review-product {
    font-size: 0.9rem;
    color: #6b7280;
    margin-bottom: 12px;
    padding: 6px 12px;
    background: #f3f4f6;
    border-radius: 6px;
    display: inline-block;
  }
  .review-text {
    color: #4b5563;
    line-height: 1.6;
    font-size: 0.95rem;
  }
  @media (max-width: 768px) {
    .reviews-grid {
      grid-template-columns: 1fr !important;
    }
  }
</style>`;

// src/utils/legal-pages.js
function renderTermsFallbackPageHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service</title>
  <meta name="description" content="Read the Terms of Service for using Prankwish.">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    body { margin: 0; background: #f8fafc; color: #111827; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .legal-shell { max-width: 960px; margin: 0 auto; padding: 56px 20px 80px; }
    .legal-card { background: #ffffff; border-radius: 20px; box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08); padding: 36px 28px; }
    .legal-kicker { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; background: #eef2ff; color: #4338ca; border-radius: 999px; font-size: 0.9rem; font-weight: 700; }
    h1 { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.1; margin: 18px 0 12px; color: #0f172a; }
    h2 { font-size: 1.25rem; margin: 28px 0 10px; color: #0f172a; }
    p, li { font-size: 1rem; line-height: 1.75; color: #475569; }
    ul { padding-left: 20px; }
    .legal-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    .legal-actions a { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 999px; text-decoration: none; font-weight: 700; }
    .legal-actions .primary { background: #4f46e5; color: #ffffff; }
    .legal-actions .secondary { background: #e2e8f0; color: #0f172a; }
  </style>
</head>
<body>
  <main class="legal-shell">
    <article class="legal-card">
      <span class="legal-kicker">Legal</span>
      <h1>Terms of Service</h1>
      <p>These terms explain how visitors may use Prankwish, place orders, and interact with personalized video products and related services.</p>

      <h2>Use of the Website</h2>
      <p>By using this website, you agree to use it lawfully, provide accurate information during checkout or support requests, and avoid misuse of the platform, payment systems, uploads, or messaging features.</p>

      <h2>Orders and Delivery</h2>
      <p>Product descriptions, turnaround times, and delivery expectations are shown on the relevant product or checkout pages. Delivery timing can vary based on creator availability, asset quality, and order complexity.</p>

      <h2>User Content</h2>
      <p>When you upload files, submit requests, or share names, messages, or other material, you confirm that you have permission to use that content and that it does not violate applicable law or third-party rights.</p>

      <h2>Refunds and Changes</h2>
      <p>Refund eligibility, revision handling, and order change limitations are governed by the current refund policy and any product-specific rules shown before purchase.</p>

      <h2>Platform Availability</h2>
      <p>We may update, improve, suspend, or remove parts of the service as the platform evolves. Temporary interruptions may happen during maintenance, deployment, security work, or third-party provider issues.</p>

      <h2>Contact</h2>
      <p>If you need clarification about these terms, contact support through the website contact page before placing an order.</p>

      <div class="legal-actions">
        <a class="primary" href="/contact">Contact Support</a>
        <a class="secondary" href="/refund">View Refund Policy</a>
      </div>
    </article>
  </main>
</body>
</html>`;
}
__name(renderTermsFallbackPageHtml, "renderTermsFallbackPageHtml");

// src/index.js
var CONTENT_SECURITY_POLICY = [
  "default-src 'self' https: data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "media-src 'self' data: blob: https:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https:",
  "frame-ancestors 'self'"
].join("; ");
function noStoreHeaders(extra = {}) {
  const headers = new Headers({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    ...extra
  });
  applySecurityHeadersToHeaders(headers);
  return headers;
}
__name(noStoreHeaders, "noStoreHeaders");
function applySecurityHeadersToHeaders(headers, req = null) {
  const out = headers instanceof Headers ? headers : new Headers(headers || {});
  if (!out.has("Content-Security-Policy")) {
    out.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  }
  if (!out.has("X-Frame-Options")) {
    out.set("X-Frame-Options", "SAMEORIGIN");
  }
  if (!out.has("X-Content-Type-Options")) {
    out.set("X-Content-Type-Options", "nosniff");
  }
  if (!out.has("Referrer-Policy")) {
    out.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  if (req) {
    try {
      const reqUrl = new URL(req.url);
      if (!isLocalHostname(reqUrl.hostname) && !isInsecureRequest(reqUrl, req) && !out.has("Strict-Transport-Security")) {
        out.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
      }
    } catch (_) {
    }
  }
  return out;
}
__name(applySecurityHeadersToHeaders, "applySecurityHeadersToHeaders");
function finalizeResponse(response, req) {
  if (!response) return response;
  const headers = applySecurityHeadersToHeaders(new Headers(response.headers), req);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
__name(finalizeResponse, "finalizeResponse");
function buildVersionedCacheKey(req, accept = "text/html") {
  const cacheUrl = new URL(req.url);
  cacheUrl.searchParams.set("__cv", VERSION || "0");
  const headers = new Headers();
  if (accept) {
    headers.set("Accept", accept);
  }
  return new Request(cacheUrl.toString(), {
    method: "GET",
    headers
  });
}
__name(buildVersionedCacheKey, "buildVersionedCacheKey");
function isLocalHostname(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost");
}
__name(isLocalHostname, "isLocalHostname");
function getCanonicalHostname(url, env) {
  const configured = String(env?.CANONICAL_HOST || "").trim().toLowerCase();
  if (configured) return configured;
  const current = String(url?.hostname || "").toLowerCase();
  if (current.startsWith("www.")) return current.slice(4);
  return current;
}
__name(getCanonicalHostname, "getCanonicalHostname");
function isInsecureRequest(url, req) {
  const forwardedProto = String(req.headers.get("x-forwarded-proto") || "").toLowerCase();
  if (forwardedProto) return forwardedProto !== "https";
  return url.protocol !== "https:";
}
__name(isInsecureRequest, "isInsecureRequest");
function isEnabledFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
__name(isEnabledFlag, "isEnabledFlag");
function isNoJsSsrEnabled(env) {
  return isEnabledFlag(env?.ENABLE_NOJS_SSR) || isEnabledFlag(env?.NOJS_SSR) || isEnabledFlag(env?.NOJS_MODE);
}
__name(isNoJsSsrEnabled, "isNoJsSsrEnabled");
var SCANNER_PREFIXES = [
  "/wp-admin",
  "/wp-content",
  "/wp-includes",
  "/phpmyadmin",
  "/pma",
  "/adminer",
  "/mysql",
  "/xmlrpc.php",
  "/cgi-bin",
  "/vendor/",
  "/boaform",
  "/hnap1",
  "/.git",
  "/.env"
];
var SCANNER_PATH_RE = /\.(php[0-9]?|phtml|asp|aspx|jsp|cgi|env|ini|sql|bak|old|log|swp)$/i;
var DYNAMIC_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
var KNOWN_API_SEGMENTS = /* @__PURE__ */ new Set([
  "admin",
  "backup",
  "blog",
  "blogs",
  "chat",
  "coupons",
  "debug",
  "forum",
  "health",
  "lead",
  "order",
  "orders",
  "page",
  "pages",
  "payment",
  "paypal",
  "product",
  "products",
  "purge-cache",
  "r2",
  "reviews",
  "settings",
  "time",
  "upload",
  "whop"
]);
function isLikelyScannerPath(pathname) {
  const p = String(pathname || "").toLowerCase();
  if (!p || p === "/") return false;
  if (SCANNER_PREFIXES.some((prefix) => p.startsWith(prefix))) return true;
  if (p.includes("/.git/") || p.includes("/.env")) return true;
  if (SCANNER_PATH_RE.test(p) && !p.endsWith(".html")) return true;
  return false;
}
__name(isLikelyScannerPath, "isLikelyScannerPath");
function canLookupDynamicSlug(slug) {
  const s = String(slug || "").toLowerCase();
  return DYNAMIC_SLUG_RE.test(s);
}
__name(canLookupDynamicSlug, "canLookupDynamicSlug");
function isKnownApiPath(pathname) {
  const p = String(pathname || "");
  if (!p.startsWith("/api/")) return true;
  const apiTail = p.slice("/api/".length);
  const firstSegment = apiTail.split("/")[0].toLowerCase();
  return !!firstSegment && KNOWN_API_SEGMENTS.has(firstSegment);
}
__name(isKnownApiPath, "isKnownApiPath");
function isMalformedNestedSlug(pathname, prefix) {
  const p = String(pathname || "");
  if (!p.startsWith(prefix) || p === prefix || p.includes(".")) return false;
  let slug = p.slice(prefix.length);
  if (slug.endsWith("/")) slug = slug.slice(0, -1);
  if (!slug) return false;
  if (slug.includes("/")) return true;
  return !canLookupDynamicSlug(slug);
}
__name(isMalformedNestedSlug, "isMalformedNestedSlug");
function escapeHtmlText(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
__name(escapeHtmlText, "escapeHtmlText");
var ALLOWED_PRODUCT_DESCRIPTION_TAGS = /* @__PURE__ */ new Set([
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "code",
  "pre",
  "hr",
  "span"
]);
function decodeBasicHtmlEntities(value) {
  let decoded = String(value || "");
  for (let i = 0; i < 2; i += 1) {
    const next = decoded.replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}
__name(decodeBasicHtmlEntities, "decodeBasicHtmlEntities");
function sanitizeProductDescriptionHtml(rawInput) {
  const raw = String(rawInput || "").trim();
  if (!raw) return "No description available.";
  const hasMarkupHint = /<[a-z!/][^>]*>/i.test(raw) || /&lt;[a-z!/]/i.test(raw);
  if (!hasMarkupHint) {
    return escapeHtmlText(raw).replace(/\n/g, "<br>");
  }
  let html = decodeBasicHtmlEntities(raw).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<iframe[\s\S]*?<\/iframe>/gi, "").replace(/<object[\s\S]*?<\/object>/gi, "").replace(/<embed[\s\S]*?>/gi, "").replace(/<link[\s\S]*?>/gi, "").replace(/<meta[\s\S]*?>/gi, "").replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/<[^>]*>/g, (tag) => {
    if (/^<!--/.test(tag)) return "";
    const closeMatch = tag.match(/^<\s*\/\s*([a-z0-9]+)\s*>$/i);
    if (closeMatch) {
      const tagName2 = String(closeMatch[1] || "").toLowerCase();
      return ALLOWED_PRODUCT_DESCRIPTION_TAGS.has(tagName2) ? `</${tagName2}>` : "";
    }
    const openMatch = tag.match(/^<\s*([a-z0-9]+)([^>]*)>$/i);
    if (!openMatch) return "";
    const tagName = String(openMatch[1] || "").toLowerCase();
    if (!ALLOWED_PRODUCT_DESCRIPTION_TAGS.has(tagName)) return "";
    if (tagName === "br" || tagName === "hr") return `<${tagName}>`;
    if (tagName === "a") {
      const attrs = String(openMatch[2] || "");
      const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const targetMatch = attrs.match(/\btarget\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const hrefRaw = String(
        hrefMatch && (hrefMatch[1] || hrefMatch[2] || hrefMatch[3]) || "#"
      ).trim();
      const safeHref = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(hrefRaw) ? hrefRaw : "#";
      const targetRaw = String(
        targetMatch && (targetMatch[1] || targetMatch[2] || targetMatch[3]) || ""
      ).trim().toLowerCase();
      if (targetRaw === "_blank") {
        return `<a href="${escapeHtmlText(safeHref)}" target="_blank" rel="noopener noreferrer">`;
      }
      return `<a href="${escapeHtmlText(safeHref)}">`;
    }
    return `<${tagName}>`;
  });
  const cleaned = html.trim();
  return cleaned || "No description available.";
}
__name(sanitizeProductDescriptionHtml, "sanitizeProductDescriptionHtml");
var PRODUCT_INITIAL_CONTENT_MARKER_RE = /<!--PRODUCT_INITIAL_CONTENT_START-->[\s\S]*?<!--PRODUCT_INITIAL_CONTENT_END-->/i;
var PRODUCT_CONTAINER_LOADING_RE = /id="product-container"\s+class="loading-state"/i;
function stripUrlQueryHash2(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return s.split("#")[0].split("?")[0];
}
__name(stripUrlQueryHash2, "stripUrlQueryHash");
function isLikelyVideoMediaUrl(value) {
  const s = stripUrlQueryHash2(value).toLowerCase();
  if (!s) return false;
  if (s.includes("youtube.com") || s.includes("youtu.be")) return true;
  return /\.(mp4|webm|mov|mkv|avi|m4v|flv|wmv|m3u8|mpd)(?:$)/i.test(s);
}
__name(isLikelyVideoMediaUrl, "isLikelyVideoMediaUrl");
function isLikelyImageMediaUrl(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return false;
  if (s.startsWith("data:image/")) return true;
  if (s.startsWith("/")) return true;
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("//")) return true;
  return false;
}
__name(isLikelyImageMediaUrl, "isLikelyImageMediaUrl");
function toGalleryArray(value) {
  if (Array.isArray(value)) return value;
  const s = String(value || "").trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  if (s.includes(",")) {
    return s.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [s];
}
__name(toGalleryArray, "toGalleryArray");
function normalizeGalleryForPlayerSsr(galleryValue, thumbnailUrl, videoUrl) {
  const input = toGalleryArray(galleryValue);
  const normalizedMain = stripUrlQueryHash2(thumbnailUrl);
  const normalizedVideo = stripUrlQueryHash2(videoUrl);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of input) {
    const raw = String(item || "").trim();
    if (!raw) continue;
    if (!isLikelyImageMediaUrl(raw)) continue;
    if (isLikelyVideoMediaUrl(raw)) continue;
    const normalized = stripUrlQueryHash2(raw);
    if (!normalized) continue;
    if (normalizedMain && normalized === normalizedMain) continue;
    if (normalizedVideo && normalized === normalizedVideo) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(raw);
    if (out.length >= 8) break;
  }
  return out;
}
__name(normalizeGalleryForPlayerSsr, "normalizeGalleryForPlayerSsr");
function optimizeThumbUrlForSsr(src, width = 280) {
  const raw = String(src || "").trim();
  if (!raw) return raw;
  if (!raw.includes("res.cloudinary.com")) return raw;
  const cloudinaryRegex = /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/;
  const match = raw.match(cloudinaryRegex);
  if (!match) return raw;
  return `${match[1]}f_auto,q_auto,w_${width}/${match[2]}`;
}
__name(optimizeThumbUrlForSsr, "optimizeThumbUrlForSsr");
function parseAddonGroupsForSsr(addonsInput) {
  if (Array.isArray(addonsInput)) return addonsInput;
  const s = String(addonsInput || "").trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}
__name(parseAddonGroupsForSsr, "parseAddonGroupsForSsr");
function formatPriceForSsr(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  const hasFraction = Math.abs(amount - Math.round(amount)) > 1e-4;
  if (hasFraction) {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  return amount.toLocaleString("en-US");
}
__name(formatPriceForSsr, "formatPriceForSsr");
function getDeliveryTextFromInstantDaysForSsr(isInstant, days) {
  if (isInstant) return "Instant Delivery In 60 Minutes";
  const dayNum = parseInt(days, 10) || 1;
  if (dayNum === 1) return "24 Hour Express Delivery";
  return `${dayNum} Days Delivery`;
}
__name(getDeliveryTextFromInstantDaysForSsr, "getDeliveryTextFromInstantDaysForSsr");
function computeInitialDeliveryLabelForSsr(product, addonGroups) {
  const deliveryField = (addonGroups || []).find((g) => g && g.id === "delivery-time" && (g.type === "radio" || g.type === "select") && Array.isArray(g.options));
  if (deliveryField) {
    const defaultOption = deliveryField.options.find((o) => o && o.default) || deliveryField.options[0];
    if (defaultOption) {
      if (defaultOption.delivery && typeof defaultOption.delivery === "object") {
        return getDeliveryTextFromInstantDaysForSsr(
          !!defaultOption.delivery.instant,
          parseInt(defaultOption.delivery.days, 10) || 1
        );
      }
      if (defaultOption.label) return String(defaultOption.label);
    }
  }
  return getDeliveryTextFromInstantDaysForSsr(
    !!product?.instant_delivery,
    parseInt(product?.delivery_time_days, 10) || parseInt(product?.normal_delivery_text, 10) || 1
  );
}
__name(computeInitialDeliveryLabelForSsr, "computeInitialDeliveryLabelForSsr");
function computeDeliveryBadgeForSsr(label) {
  const raw = String(label || "");
  const v = raw.toLowerCase();
  if (v.includes("instant") || v.includes("60") || v.includes("1 hour")) {
    return { icon: "&#9889;", text: raw || "Instant Delivery In 60 Minutes" };
  }
  if (v.includes("24") || v.includes("express") || v.includes("1 day") || v.includes("24 hour")) {
    return { icon: "&#128640;", text: raw || "24 Hour Express Delivery" };
  }
  if (v.includes("48") || v.includes("2 day")) {
    return { icon: "&#128230;", text: raw || "2 Days Delivery" };
  }
  if (v.includes("3 day") || v.includes("72")) {
    return { icon: "&#128197;", text: raw || "3 Days Delivery" };
  }
  const daysMatch = v.match(/(\d+)\s*day/i);
  if (daysMatch) {
    const numDays = parseInt(daysMatch[1], 10) || 2;
    return { icon: "&#128230;", text: raw || `${numDays} Days Delivery` };
  }
  return { icon: "&#128666;", text: raw || "2 Days Delivery" };
}
__name(computeDeliveryBadgeForSsr, "computeDeliveryBadgeForSsr");
function renderStarsForSsr(ratingAverage) {
  const rating = Number.isFinite(Number(ratingAverage)) ? Number(ratingAverage) : 5;
  const fullStars = Math.max(0, Math.min(5, Math.floor(rating)));
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = Math.max(0, 5 - fullStars - halfStar);
  return "\u2605".repeat(fullStars) + (halfStar ? "\u2606" : "") + "\u2606".repeat(emptyStars);
}
__name(renderStarsForSsr, "renderStarsForSsr");
function formatReviewDateForSsr(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US");
  } catch (_) {
    return "";
  }
}
__name(formatReviewDateForSsr, "formatReviewDateForSsr");
function parseReviewVideoMetadataForSsr(review) {
  if (!review || !review.delivered_video_metadata) return {};
  try {
    const parsed = JSON.parse(review.delivered_video_metadata);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}
__name(parseReviewVideoMetadataForSsr, "parseReviewVideoMetadataForSsr");
function extractYouTubeIdForSsr(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  const match = s.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i);
  return match ? String(match[1] || "").trim() : "";
}
__name(extractYouTubeIdForSsr, "extractYouTubeIdForSsr");
function resolveReviewVideoMediaForSsr(review) {
  const metadata = parseReviewVideoMetadataForSsr(review);
  const youtubeUrl = String(metadata.youtubeUrl || metadata.reviewYoutubeUrl || "").trim();
  const fallbackUrl = String(review?.delivered_video_url || metadata.downloadUrl || "").trim();
  const videoUrl = youtubeUrl || fallbackUrl;
  const isPublic = Number(review?.show_on_product) === 1;
  if (!videoUrl || !isPublic) {
    return { canWatch: false, videoUrl: "", posterUrl: "", isNativeVideo: false };
  }
  let posterUrl = String(
    review?.delivered_thumbnail_url || metadata.thumbnailUrl || metadata.posterUrl || metadata.previewImage || ""
  ).trim();
  const youtubeId = extractYouTubeIdForSsr(videoUrl);
  if (!posterUrl && youtubeId) {
    posterUrl = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }
  const normalizedVideo = stripUrlQueryHash2(videoUrl).toLowerCase();
  const isNativeVideo = /\.(mp4|webm|mov|m4v|m3u8|mpd)$/i.test(normalizedVideo) || normalizedVideo.includes("/video/upload/");
  return { canWatch: true, videoUrl, posterUrl, isNativeVideo };
}
__name(resolveReviewVideoMediaForSsr, "resolveReviewVideoMediaForSsr");
function renderReviewMediaDataAttrsForSsr(review, media) {
  const reviewerName = String(
    review?.customer_name || review?.author_name || "Customer"
  ).trim() || "Customer";
  const reviewTextRaw = String(review?.review_text || review?.comment || "").replace(/\s+/g, " ").trim();
  const reviewText = reviewTextRaw.length > 600 ? `${reviewTextRaw.slice(0, 597)}...` : reviewTextRaw;
  const attrs = [
    `data-review-video-url="${escapeHtmlText(String(media?.videoUrl || ""))}"`,
    `data-review-poster-url="${escapeHtmlText(String(media?.posterUrl || ""))}"`,
    `data-reviewer-name="${escapeHtmlText(reviewerName)}"`,
    `data-review-text="${escapeHtmlText(reviewText)}"`
  ];
  return attrs.join(" ");
}
__name(renderReviewMediaDataAttrsForSsr, "renderReviewMediaDataAttrsForSsr");
function renderSsrReviewCards(reviewsInput = []) {
  const reviews = Array.isArray(reviewsInput) ? reviewsInput.slice(0, 5) : [];
  if (reviews.length === 0) return "";
  return reviews.map((review) => {
    const reviewerName = escapeHtmlText(
      String(review?.customer_name || review?.author_name || "Anonymous")
    );
    const reviewText = escapeHtmlText(
      String(review?.review_text || review?.comment || "")
    ).replace(/\n/g, "<br>");
    const rating = Math.max(1, Math.min(5, parseInt(review?.rating, 10) || 5));
    const stars = "&#9733;".repeat(rating) + "&#9734;".repeat(5 - rating);
    const dateText = escapeHtmlText(formatReviewDateForSsr(review?.created_at));
    const reviewMedia = resolveReviewVideoMediaForSsr(review);
    const watchDataAttrs = renderReviewMediaDataAttrsForSsr(review, reviewMedia);
    const canWatch = !!reviewMedia.canWatch && !!reviewMedia.videoUrl;
    const posterThumb = reviewMedia.posterUrl ? `<img src="${escapeHtmlText(optimizeThumbUrlForSsr(reviewMedia.posterUrl, 520))}" alt="Review video thumbnail" loading="lazy" decoding="async" width="260" height="146" style="width:100%;height:100%;object-fit:cover;display:block;">` : '<div style="width:100%;height:100%;background:#0f172a;"></div>';
    const watchRowHtml = canWatch ? `
        <div class="review-portfolio-row" style="display:flex;align-items:center;gap:16px;margin-top:16px;padding-top:16px;border-top:1px solid #f3f4f6;flex-wrap:wrap;">
          <div data-review-watch="1" data-review-portfolio-thumb="1" ${watchDataAttrs} style="position:relative;min-width:260px;width:260px;height:146px;flex-shrink:0;cursor:pointer;border-radius:10px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);background:#000;">
            ${posterThumb}
            <div style="position:absolute;top:8px;right:8px;background:rgba(16,185,129,0.95);color:white;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">Review</div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;padding-left:3px;pointer-events:none;">&#9654;</div>
          </div>
          <button type="button" data-review-watch="1" ${watchDataAttrs} style="background:#111827;color:white;border:0;padding:12px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:15px;">&#9654; Watch Video</button>
        </div>` : "";
    return `
      <article data-ssr-review-card="1" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:6px;">
          <strong style="font-size:0.95rem;color:#1f2937;">${reviewerName}</strong>
          ${dateText ? `<span style="font-size:0.78rem;color:#6b7280;">${dateText}</span>` : ""}
        </div>
        <div style="color:#fbbf24;margin-bottom:8px;font-size:0.95rem;" aria-label="${rating} out of 5 stars">${stars}</div>
        <div style="font-size:0.92rem;color:#4b5563;line-height:1.5;">${reviewText || "No review text provided."}</div>
        ${watchRowHtml}
      </article>`;
  }).join("");
}
__name(renderSsrReviewCards, "renderSsrReviewCards");
function renderSsrReviewSliderThumbs(reviewsInput = []) {
  const reviews = Array.isArray(reviewsInput) ? reviewsInput : [];
  const reviewMediaList = reviews.map((review) => ({ review, media: resolveReviewVideoMediaForSsr(review) })).filter((item) => !!item.media.canWatch && !!item.media.videoUrl).slice(0, 20);
  if (reviewMediaList.length === 0) return "";
  return reviewMediaList.map(({ review, media }) => {
    const dataAttrs = renderReviewMediaDataAttrsForSsr(review, media);
    const posterHtml = media.posterUrl ? `<img src="${escapeHtmlText(optimizeThumbUrlForSsr(media.posterUrl, 280))}" alt="Review video thumbnail" loading="lazy" decoding="async" width="140" height="100" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;background:#1a1a2e;">` : '<div style="width:100%;height:100%;background:#1a1a2e;"></div>';
    return `
              <div data-review-slider-thumb="1" data-review-watch="1" ${dataAttrs} style="position:relative;min-width:140px;width:140px;height:100px;flex-shrink:0;cursor:pointer;border-radius:10px;overflow:hidden;border:3px solid transparent;transition:border-color 0.15s ease, transform 0.15s ease;background:#1a1a2e;">
                ${posterHtml}
                <div style="position:absolute;bottom:4px;right:4px;background:rgba(16,185,129,0.95);color:white;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;z-index:10;">Review</div>
                <div class="thumb-play-btn" aria-hidden="true" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;padding-left:2px;z-index:100;pointer-events:none;">&#9654;</div>
              </div>`;
  }).join("");
}
__name(renderSsrReviewSliderThumbs, "renderSsrReviewSliderThumbs");
function sanitizeAddonIdForSsr(raw, fallback = "addon") {
  const source = String(raw || "").trim() || String(fallback || "addon");
  const normalized = source.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return normalized || String(fallback || "addon");
}
__name(sanitizeAddonIdForSsr, "sanitizeAddonIdForSsr");
function renderAddonDataAttrsForSsr(optionInput = {}) {
  const option = optionInput && typeof optionInput === "object" ? optionInput : {};
  const attrs = [];
  const price = Number(option.price);
  attrs.push(`data-price="${escapeHtmlText(Number.isFinite(price) ? String(price) : "0")}"`);
  if (option.file) {
    attrs.push('data-needs-file="true"');
    attrs.push(`data-file-qty="${escapeHtmlText(String(parseInt(option.fileQuantity, 10) || 1))}"`);
  }
  if (option.textField) {
    attrs.push('data-needs-text="true"');
  }
  if (option.delivery && typeof option.delivery === "object") {
    attrs.push(`data-delivery-instant="${option.delivery.instant ? "true" : "false"}"`);
    attrs.push(`data-delivery-days="${escapeHtmlText(String(parseInt(option.delivery.days, 10) || 1))}"`);
  }
  return attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
}
__name(renderAddonDataAttrsForSsr, "renderAddonDataAttrsForSsr");
function renderSsrAddonField(fieldInput, index) {
  const field = fieldInput && typeof fieldInput === "object" ? fieldInput : {};
  const type = String(field.type || "text").trim().toLowerCase();
  const fallbackId = `addon-${index + 1}`;
  const baseId = sanitizeAddonIdForSsr(field.id || fallbackId, fallbackId);
  const labelText = escapeHtmlText(String(field.label || field.text || "").trim());
  const required = !!field.required;
  const requiredHtml = required ? ' <span style="color:red" aria-hidden="true">*</span><span class="sr-only"> (required)</span>' : "";
  if (type === "heading") {
    const headingText = escapeHtmlText(String(field.text || field.label || "").trim());
    if (!headingText) return "";
    return `
      <h3 style="margin-top:1.5rem;font-size:1.1rem;">${headingText}</h3>`;
  }
  const options = Array.isArray(field.options) ? field.options : [];
  if (type === "select") {
    const optionsHtml = options.map((optInput, idx) => {
      const opt = optInput && typeof optInput === "object" ? optInput : {};
      const optLabel = escapeHtmlText(String(opt.label || `Option ${idx + 1}`));
      const optPrice = Number(opt.price);
      const priceSuffix = Number.isFinite(optPrice) && optPrice > 0 ? ` (+$${formatPriceForSsr(optPrice)})` : "";
      const selectedAttr = opt.default ? " selected" : "";
      return `
          <option value="${optLabel}"${renderAddonDataAttrsForSsr(opt)}${selectedAttr}>${optLabel}${priceSuffix}</option>`;
    }).join("");
    return `
      <div class="addon-group" role="group" aria-label="${labelText || escapeHtmlText(baseId)}">
        ${labelText ? `<label class="addon-group-label" id="${escapeHtmlText(baseId)}-label" for="${escapeHtmlText(baseId)}">${labelText}${requiredHtml}</label>` : ""}
        <select class="form-select" name="${escapeHtmlText(baseId)}" id="${escapeHtmlText(baseId)}"${required ? " required" : ""}>
${optionsHtml}
        </select>
        <div class="addon-extras"></div>
      </div>`;
  }
  if (type === "radio" || type === "checkbox_group") {
    const isRadio = type === "radio";
    const optionCards = options.map((optInput, idx) => {
      const opt = optInput && typeof optInput === "object" ? optInput : {};
      const optLabel = escapeHtmlText(String(opt.label || `Option ${idx + 1}`));
      const optPrice = Number(opt.price);
      const priceHtml = Number.isFinite(optPrice) && optPrice > 0 ? `<span class="opt-price">+$${formatPriceForSsr(optPrice)}</span>` : "";
      const checkedAttr = opt.default ? " checked" : "";
      const selectedClass = opt.default ? " selected" : "";
      const requiredAttr2 = isRadio && required && idx === 0 ? " required" : "";
      if (isRadio) {
        return `
          <label class="addon-option-card${selectedClass}">
            <input type="radio"
                   name="${escapeHtmlText(baseId)}"
                   value="${optLabel}"
                   class="addon-radio"${renderAddonDataAttrsForSsr(opt)}${checkedAttr}${requiredAttr2}>
            ${optLabel}
            ${priceHtml}
          </label>`;
      }
      return `
          <div>
            <label class="addon-option-card${selectedClass}">
              <input type="checkbox"
                     name="${escapeHtmlText(baseId)}"
                     value="${optLabel}"
                     class="addon-checkbox"${renderAddonDataAttrsForSsr(opt)}${checkedAttr}>
              ${optLabel}
              ${priceHtml}
            </label>
            <div style="margin-left:1.5rem;"></div>
          </div>`;
    }).join("");
    return `
      <div class="addon-group" role="group" aria-label="${labelText || escapeHtmlText(baseId)}">
        ${labelText ? `<label class="addon-group-label" id="${escapeHtmlText(baseId)}-label">${labelText}${requiredHtml}</label>` : ""}
        <div>${optionCards}</div>
        ${isRadio ? '<div class="addon-extras"></div>' : ""}
      </div>`;
  }
  const isTextarea = type === "textarea";
  const safeType = isTextarea ? "" : escapeHtmlText(type || "text");
  const placeholder = String(field.placeholder || "").trim();
  const placeholderAttr = placeholder ? ` placeholder="${escapeHtmlText(placeholder)}"` : "";
  const requiredAttr = required ? " required" : "";
  const maxLength = isTextarea ? 2e3 : safeType === "email" ? 100 : safeType === "text" ? 200 : 0;
  const maxLengthAttr = maxLength > 0 ? ` maxlength="${maxLength}"` : "";
  const acceptAttr = safeType === "file" ? ' accept="image/*"' : "";
  if (isTextarea) {
    return `
      <div class="addon-group" role="group" aria-label="${labelText || escapeHtmlText(baseId)}">
        ${labelText ? `<label class="addon-group-label" id="${escapeHtmlText(baseId)}-label" for="${escapeHtmlText(baseId)}">${labelText}${requiredHtml}</label>` : ""}
        <textarea class="form-textarea" name="${escapeHtmlText(baseId)}" id="${escapeHtmlText(baseId)}"${placeholderAttr}${requiredAttr}${maxLengthAttr}></textarea>
        <div class="addon-extras"></div>
      </div>`;
  }
  return `
      <div class="addon-group" role="group" aria-label="${labelText || escapeHtmlText(baseId)}">
        ${labelText ? `<label class="addon-group-label" id="${escapeHtmlText(baseId)}-label" for="${escapeHtmlText(baseId)}">${labelText}${requiredHtml}</label>` : ""}
        <input class="form-input" type="${safeType || "text"}" name="${escapeHtmlText(baseId)}" id="${escapeHtmlText(baseId)}"${placeholderAttr}${requiredAttr}${maxLengthAttr}${acceptAttr}>
        <div class="addon-extras"></div>
      </div>`;
}
__name(renderSsrAddonField, "renderSsrAddonField");
function renderSsrAddonsForm(addonGroupsInput, basePriceText) {
  const addonGroups = Array.isArray(addonGroupsInput) ? addonGroupsInput : [];
  const fieldsHtml = addonGroups.map((field, idx) => renderSsrAddonField(field, idx)).join("");
  const fallbackHtml = fieldsHtml ? fieldsHtml : '<div class="addon-group" style="color:#6b7280;">No add-ons configured for this product.</div>';
  return `
                <form id="addons-form" style="padding-top:1.5rem;border-top:1px solid #e5e7eb;margin-top:1.5rem;">
${fallbackHtml}
                </form>
                <div data-checkout-footer="1" style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e5e5;">
                  <button id="checkout-btn" type="button" class="btn-buy">Proceed to Checkout - $${basePriceText}</button>
                </div>`;
}
__name(renderSsrAddonsForm, "renderSsrAddonsForm");
function renderProductStep1PlayerShell(product, addonsInput = [], reviewsInput = []) {
  if (!product || typeof product !== "object") return "";
  const addonGroups = parseAddonGroupsForSsr(addonsInput);
  const title = String(product.title || "Product");
  const safeTitle = escapeHtmlText(title);
  const thumbSrcRaw = String(product.thumbnail_url || "").trim() || "https://via.placeholder.com/1280x720?text=Preview";
  const thumbSrc = escapeHtmlText(thumbSrcRaw);
  const hasVideo = !!String(product.video_url || "").trim();
  const safeVideoUrl = escapeHtmlText(String(product.video_url || "").trim());
  const reviewCount = Math.max(0, parseInt(product.review_count, 10) || 0);
  const ratingAverage = Number(product.rating_average);
  const normalizedRating = Number.isFinite(ratingAverage) && ratingAverage > 0 ? ratingAverage : 5;
  const stars = renderStarsForSsr(normalizedRating);
  const reviewText = reviewCount === 0 ? "No reviews yet" : `${normalizedRating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? "Review" : "Reviews"})`;
  const normalPrice = Number(product.normal_price) || 0;
  const salePrice = Number(product.sale_price) || 0;
  const basePrice = salePrice > 0 ? salePrice : normalPrice;
  const basePriceText = formatPriceForSsr(basePrice);
  const normalPriceText = formatPriceForSsr(normalPrice);
  const discountOff = normalPrice > 0 && basePrice < normalPrice ? Math.round((normalPrice - basePrice) / normalPrice * 100) : 0;
  const initialDeliveryLabel = computeInitialDeliveryLabelForSsr(product, addonGroups);
  const deliveryBadge = computeDeliveryBadgeForSsr(initialDeliveryLabel);
  const mainImageTag = `
        <img
          src="${thumbSrc}"
          class="main-img"
          alt="${safeTitle || "Product Image"}"
          fetchpriority="high"
          loading="eager"
          decoding="async"
          width="800"
          height="450"
          style="width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;"
        >`;
  const playerHtml = hasVideo ? `
        <div class="video-facade"
             data-ssr-player-facade="1"
             data-video-url="${safeVideoUrl}"
             style="position:relative;width:100%;cursor:pointer;background:#000;aspect-ratio:16/9;border-radius:12px;overflow:hidden;">
          ${mainImageTag}
          <button class="play-btn-overlay"
                  type="button"
                  aria-label="Play video"
                  style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;background:rgba(0,0,0,0.7);border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;color:white;z-index:10;cursor:pointer;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white" aria-hidden="true" focusable="false">
              <path d="M8 5v14l11-7z"></path>
            </svg>
          </button>
        </div>` : mainImageTag;
  const galleryImages = normalizeGalleryForPlayerSsr(product.gallery_images, thumbSrcRaw, product.video_url);
  const galleryThumbHtml = galleryImages.map((src, idx) => {
    const optimizedSrc = optimizeThumbUrlForSsr(src, 280);
    const safeSrc = escapeHtmlText(optimizedSrc);
    const safeFullSrc = escapeHtmlText(src);
    return `
          <img
            src="${safeSrc}"
            class="thumb"
            alt="${safeTitle} - Gallery Image ${idx + 1}"
            data-media-kind="image"
            data-media-src="${safeFullSrc}"
            loading="lazy"
            decoding="async"
            width="140"
            height="100"
            style="min-width:140px;width:140px;height:100px;object-fit:cover;border-radius:10px;border:3px solid transparent;flex-shrink:0;"
          >`;
  }).join("");
  const reviewSliderThumbHtml = renderSsrReviewSliderThumbs(reviewsInput);
  const mainThumbHtml = hasVideo ? `
                <div class="thumb-wrapper" style="position:relative;display:inline-block;">
                  <img
                    src="${escapeHtmlText(optimizeThumbUrlForSsr(thumbSrcRaw, 280))}"
                    class="thumb active"
                    alt="${safeTitle} - Thumbnail"
                    data-media-kind="video-main"
                    data-media-src="${thumbSrc}"
                    loading="lazy"
                    decoding="async"
                    width="140"
                    height="100"
                    style="min-width:140px;width:140px;height:100px;object-fit:cover;border-radius:10px;border:3px solid #667eea;flex-shrink:0;"
                  >
                  <div class="thumb-play-btn"
                       aria-hidden="true"
                       style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:white;width:35px;height:35px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;padding-left:2px;pointer-events:none;opacity:1;visibility:visible;z-index:100;">\u25B6</div>
                </div>` : `
                <img
                  src="${escapeHtmlText(optimizeThumbUrlForSsr(thumbSrcRaw, 280))}"
                  class="thumb active"
                  alt="${safeTitle} - Thumbnail"
                  data-media-kind="image"
                  data-media-src="${thumbSrc}"
                  loading="lazy"
                  decoding="async"
                  width="140"
                  height="100"
                  style="min-width:140px;width:140px;height:100px;object-fit:cover;border-radius:10px;border:3px solid #667eea;flex-shrink:0;"
                >`;
  const safeDescriptionHtml = sanitizeProductDescriptionHtml(product.description);
  const reviewSummaryHtml = reviewCount > 0 ? `
      <div style="background:#f9fafb;padding:1.5rem;border-radius:8px;text-align:center;color:#6b7280;margin-bottom:2rem;">
        <span style="font-size:2rem;">&#11088; ${normalizedRating.toFixed(1)}</span>
        <p style="margin-top:0.5rem;">Based on ${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}</p>
      </div>` : `
      <div style="background:#f9fafb;padding:1.5rem;border-radius:8px;text-align:center;color:#6b7280;margin-bottom:2rem;">
        <div style="font-size:3rem;margin-bottom:15px;">&#11088;</div>
        <p>No reviews yet. Be the first to leave a review!</p>
      </div>`;
  const reviewCardsHtml = renderSsrReviewCards(reviewsInput);
  const reviewsContentHtml = reviewCardsHtml ? `<div style="display:grid;grid-template-columns:1fr;gap:14px;">${reviewCardsHtml}</div>` : "";
  const addonsFormShellHtml = renderSsrAddonsForm(addonGroups, basePriceText);
  return `
      <div class="product-page" data-ssr-step="player">
        <div class="product-main-row">
          <div class="product-media-col" data-ssr-player-col="1">
          <div id="review-highlight" style="display:none;background:#f0fdf4;padding:10px;margin-bottom:10px;border-radius:8px;"></div>
            <div class="video-wrapper" data-video-src="${safeVideoUrl}" style="aspect-ratio:16/9;width:100%;">
${playerHtml}
            </div>
            <div style="position:relative;margin-top:15px;" data-ssr-slider-state="pending">
              <div class="thumbnails" id="thumbnails-slider" style="display:flex;gap:12px;overflow-x:auto;scroll-behavior:smooth;padding:8px 0;scrollbar-width:thin;">
${mainThumbHtml}
${galleryThumbHtml}
${reviewSliderThumbHtml}
              </div>
              <button type="button"
                      data-ssr-slider-arrow="left"
                      aria-label="Previous thumbnails"
                      style="position:absolute;left:0;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);color:white;border:none;width:35px;height:35px;border-radius:50%;cursor:pointer;font-size:24px;z-index:10;display:none;">\u2039</button>
              <button type="button"
                      data-ssr-slider-arrow="right"
                      aria-label="Next thumbnails"
                      style="position:absolute;right:0;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);color:white;border:none;width:35px;height:35px;border-radius:50%;cursor:pointer;font-size:24px;z-index:10;display:none;">\u203A</button>
            </div>
          </div>
          <div class="product-info-col" data-ssr-info-col="1">
            <div class="product-info-panel">
              <h1 class="product-title">${safeTitle}</h1>
              <div class="rating-row" role="img" aria-label="Rating: ${normalizedRating.toFixed(1)} out of 5 stars, ${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}">
                <span class="stars" aria-hidden="true">${stars}</span>
                <span class="review-count">${escapeHtmlText(reviewText)}</span>
              </div>
              <div class="badges-row">
                <div class="badge-box badge-delivery" id="delivery-badge">
                  <div class="icon" id="delivery-badge-icon">${deliveryBadge.icon}</div>
                  <span id="delivery-badge-text">${escapeHtmlText(deliveryBadge.text)}</span>
                </div>
                <div class="badge-box badge-price">
                  <div class="price-final">$${basePriceText}</div>
                  ${discountOff > 0 ? `<div style="font-size:0.9rem"><span class="price-original">$${normalPriceText}</span></div><div class="discount-tag">${discountOff}% OFF</div>` : ""}
                </div>
              </div>
              <div class="digital-note" role="note">
                <span aria-hidden="true">&#128233;</span>
                <span><strong>Digital Delivery:</strong> Receive via WhatsApp/Email.</span>
              </div>
              <button id="book-now-trigger" type="button" class="btn-book-now" aria-expanded="false" aria-controls="addons-container">
                <span aria-hidden="true">&#127916;</span> Book Now - $${basePriceText}
              </button>
              <div id="addons-container" style="max-height:0;overflow:hidden;transition:max-height 0.4s ease-out, opacity 0.25s ease;opacity:0;" data-ssr-addons="1">
${addonsFormShellHtml}
              </div>
            </div>
          </div>
        </div>
        <div class="product-desc-row" data-ssr-desc="1">
          <div class="product-desc">
            <h2>Description</h2>
            <div>${safeDescriptionHtml}</div>
            <hr style="margin:2rem 0;border:0;border-top:1px solid #eee;">
            <h2>Customer Reviews</h2>
            ${reviewSummaryHtml}
            <div id="reviews-container" data-ssr-reviews="1">
              ${reviewsContentHtml}
            </div>
          </div>
        </div>
        <div id="product-navigation" class="product-navigation-section" data-ssr-nav="1">
          <div style="display:flex;justify-content:center;align-items:center;padding:30px 0;gap:20px;flex-wrap:wrap;">
            <div id="prev-product-btn" style="flex:1;max-width:300px;min-width:200px;display:none;"></div>
            <div id="next-product-btn" style="flex:1;max-width:300px;min-width:200px;display:none;"></div>
          </div>
        </div>
      </div>`;
}
__name(renderProductStep1PlayerShell, "renderProductStep1PlayerShell");
function injectProductInitialContent(html, contentHtml, removeLoadingState = false) {
  if (!html || !contentHtml) return html;
  let out = String(html);
  if (PRODUCT_INITIAL_CONTENT_MARKER_RE.test(out)) {
    out = out.replace(
      PRODUCT_INITIAL_CONTENT_MARKER_RE,
      `<!--PRODUCT_INITIAL_CONTENT_START-->
${contentHtml}
      <!--PRODUCT_INITIAL_CONTENT_END-->`
    );
  }
  if (removeLoadingState) {
    out = out.replace(PRODUCT_CONTAINER_LOADING_RE, 'id="product-container"');
  }
  return out;
}
__name(injectProductInitialContent, "injectProductInitialContent");
function replaceLegacyBrandTokens(text, siteTitle) {
  if (!text) return text;
  return String(text).replace(/\bWishVideo\b/gi, siteTitle).replace(/\bWishesU\b/gi, siteTitle);
}
__name(replaceLegacyBrandTokens, "replaceLegacyBrandTokens");
var DEFAULT_SITE_TITLE = "Prankwish";
var DEFAULT_SITE_DESCRIPTION = "Personalized prank video greetings, funny wishes, and surprise digital gifts from Prankwish.";
function resolveFallbackSiteTitle(urlObj) {
  const host = String(urlObj?.hostname || "").replace(/^www\./i, "").trim();
  if (!host) return DEFAULT_SITE_TITLE;
  if (host.includes("prankwish")) return DEFAULT_SITE_TITLE;
  return host;
}
__name(resolveFallbackSiteTitle, "resolveFallbackSiteTitle");
function resolveSiteDescription(seoSettings) {
  const configured = String(seoSettings?.site_description || "").trim();
  return configured || DEFAULT_SITE_DESCRIPTION;
}
__name(resolveSiteDescription, "resolveSiteDescription");
function buildSiteAwareTitle(currentTitle, siteTitle) {
  const safeSiteTitle = String(siteTitle || "").trim();
  const rewritten = replaceLegacyBrandTokens(String(currentTitle || "").trim(), safeSiteTitle).trim();
  if (!rewritten) return safeSiteTitle;
  if (!safeSiteTitle) return rewritten;
  if (rewritten.toLowerCase() === safeSiteTitle.toLowerCase()) return safeSiteTitle;
  const normalized = rewritten.toLowerCase();
  if (normalized === "home" || normalized === "loading..." || normalized === "loading product...") {
    return safeSiteTitle;
  }
  if (normalized.includes(safeSiteTitle.toLowerCase())) {
    return rewritten;
  }
  if (/^(products?|blog|forum|terms of service|privacy policy|contact)$/i.test(rewritten)) {
    return `${rewritten} | ${safeSiteTitle}`;
  }
  return rewritten;
}
__name(buildSiteAwareTitle, "buildSiteAwareTitle");
function extractHtmlTitle(html) {
  const match = String(html || "").match(/<title>([\s\S]*?)<\/title>/i);
  return match ? String(match[1] || "").trim() : "";
}
__name(extractHtmlTitle, "extractHtmlTitle");
function shouldReplaceSeoMetaContent(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized === "loading..." || normalized === "home" || normalized === "custom personalized video greetings from africa." || normalized.includes("wishvideo") || normalized.includes("wishesu");
}
__name(shouldReplaceSeoMetaContent, "shouldReplaceSeoMetaContent");
function upsertMetaTagsBatch(html, tags) {
  if (!html || !tags || !tags.length) return html;
  const toAppend = [];
  let out = html;
  for (const { type, name, content, alwaysReplace } of tags) {
    if (!content) continue;
    const attr = type === "property" ? "property" : "name";
    const escapedContent = escapeHtmlText(content);
    const tag = `<meta ${attr}="${name}" content="${escapedContent}">`;
    const cacheKey = `${attr}=${name}`;
    let regex = metaTagRegexCache.get(cacheKey);
    if (!regex) {
      regex = new RegExp(`<meta\\s+${attr}=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i");
      metaTagRegexCache.set(cacheKey, regex);
    }
    const match = regex.exec(out);
    if (match) {
      const currentContent = match[1];
      if (alwaysReplace || shouldReplaceSeoMetaContent(currentContent)) {
        out = out.slice(0, match.index) + tag + out.slice(match.index + match[0].length);
      }
    } else {
      toAppend.push(tag);
    }
  }
  if (toAppend.length) {
    out = out.replace(/<\/head>/i, `${toAppend.join("\n")}
</head>`);
  }
  return out;
}
__name(upsertMetaTagsBatch, "upsertMetaTagsBatch");
async function getSeoSettingsObject(env) {
  try {
    return await getSettings(env) || {};
  } catch (_) {
  }
  return {};
}
__name(getSeoSettingsObject, "getSeoSettingsObject");
function resolveSiteTitle(seoSettings, urlObj) {
  const configured = String(seoSettings?.site_title || "").trim();
  if (configured) return configured;
  return resolveFallbackSiteTitle(urlObj);
}
__name(resolveSiteTitle, "resolveSiteTitle");
function applySiteTitleToHtml(html, siteTitle) {
  if (!html || !siteTitle) return html;
  const safeSiteTitle = escapeHtmlText(siteTitle);
  return html.replace(/<title>([\s\S]*?)<\/title>/i, (match, currentTitle) => {
    const rewritten = buildSiteAwareTitle(currentTitle, safeSiteTitle);
    return `<title>${escapeHtmlText(rewritten)}</title>`;
  });
}
__name(applySiteTitleToHtml, "applySiteTitleToHtml");
function stripControlCharacters(value) {
  return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]+/g, " ");
}
__name(stripControlCharacters, "stripControlCharacters");
function normalizeSeoText(value, maxLength = 0) {
  let text = stripControlCharacters(String(value || "")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (maxLength > 0 && text.length > maxLength) {
    text = text.slice(0, maxLength).trimEnd();
  }
  return text;
}
__name(normalizeSeoText, "normalizeSeoText");
function escapeRegexText(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
__name(escapeRegexText, "escapeRegexText");
function ensureHeadSection(html) {
  if (!html) return html;
  let out = String(html);
  if (!/<head[\s>]/i.test(out)) {
    if (/<html[^>]*>/i.test(out)) {
      out = out.replace(/<html([^>]*)>/i, "<html$1>\n<head>\n</head>");
    } else if (/<body[^>]*>/i.test(out)) {
      out = out.replace(/<body([^>]*)>/i, "<head>\n</head>\n<body$1>");
    } else {
      out = `<head>
</head>
${out}`;
    }
  }
  if (!/<\/head>/i.test(out)) {
    if (/<body[^>]*>/i.test(out)) {
      out = out.replace(/<body([^>]*)>/i, "</head>\n<body$1>");
    } else {
      out = `${out}
</head>`;
    }
  }
  return out;
}
__name(ensureHeadSection, "ensureHeadSection");
function appendToHead(html, markup) {
  if (!markup) return html;
  return ensureHeadSection(html).replace(/<\/head>/i, `${markup}
</head>`);
}
__name(appendToHead, "appendToHead");
function upsertTitleTag(html, title) {
  const safeTitle = escapeHtmlText(normalizeSeoText(title));
  if (!safeTitle) return html;
  const out = ensureHeadSection(html).replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "");
  return appendToHead(out, `<title>${safeTitle}</title>`);
}
__name(upsertTitleTag, "upsertTitleTag");
function appendJsonLdToHead(html, schemaJson, schemaId = "") {
  const safeSchemaJson = String(schemaJson || "").trim();
  if (!safeSchemaJson || safeSchemaJson === "{}") return html;
  let out = ensureHeadSection(html);
  if (schemaId) {
    const idRegex = new RegExp(`<script\\s+[^>]*id=["']${escapeRegexText(schemaId)}["'][^>]*>[\\s\\S]*?<\\/script>`, "gi");
    out = out.replace(idRegex, "");
  }
  const idAttr = schemaId ? ` id="${escapeHtmlText(schemaId)}"` : "";
  return appendToHead(out, `<script type="application/ld+json"${idAttr}>${safeSchemaJson}<\/script>`);
}
__name(appendJsonLdToHead, "appendJsonLdToHead");
function normalizeStoredPageHtml(html) {
  if (!html) return html;
  let out = ensureHeadSection(String(html));
  const closeMatch = /<\/head>/i.exec(out);
  if (!closeMatch) return out;
  const closeIndex = closeMatch.index;
  const closeEnd = closeIndex + closeMatch[0].length;
  const extracted = [];
  const bodyHeadTagRegex = /<(?:title\b[^>]*>[\s\S]*?<\/title>|meta\b[^>]*>|link\b[^>]*>|style\b[^>]*>[\s\S]*?<\/style>|script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>)/gi;
  const cleanedTail = out.slice(closeEnd).replace(bodyHeadTagRegex, (match) => {
    extracted.push(match.trim());
    return "";
  });
  out = `${out.slice(0, closeEnd)}${cleanedTail}`;
  if (extracted.length > 0) {
    out = appendToHead(out, extracted.join("\n"));
  }
  const titleCount = (out.match(/<title\b/gi) || []).length;
  const descCount = (out.match(/<meta\s+[^>]*name=["']description["']/gi) || []).length;
  if (titleCount <= 1 && descCount <= 1) {
    return out.replace(/\n{3,}/g, "\n\n");
  }
  const preferred = [];
  for (const pattern of SINGLETON_PATTERNS) {
    const matches = out.match(pattern);
    if (!matches || matches.length === 0) continue;
    preferred.push(matches[matches.length - 1].trim());
    out = out.replace(pattern, "");
  }
  if (preferred.length) {
    out = appendToHead(out, preferred.join("\n"));
  }
  return out.replace(/\n{3,}/g, "\n\n");
}
__name(normalizeStoredPageHtml, "normalizeStoredPageHtml");
function applyDefaultPageMetadata(html, pageType, seo = {}) {
  const siteTitle = String(seo.siteTitle || DEFAULT_SITE_TITLE).trim() || DEFAULT_SITE_TITLE;
  const canonical = String(seo.canonical || "").trim();
  let pageTitle = "";
  let description = "";
  switch (pageType) {
    case "home":
      pageTitle = buildSiteAwareTitle("Custom Video Gifts & Personalized Greetings", siteTitle);
      description = "Order personalized video greetings for birthdays, holidays, and special occasions. Unique custom video gifts delivered digitally in 24-48 hours.";
      break;
    case "product_grid":
      pageTitle = buildSiteAwareTitle("Personalized Video Gifts for Birthdays, Weddings and Pranks", siteTitle);
      description = "Browse custom prank videos, funny birthday greetings, wedding surprises, office roasts, and other personalized video gifts ready to order online.";
      break;
    case "blog_archive":
      pageTitle = buildSiteAwareTitle("Blog: Video Gift Ideas, Scripts and Occasion Guides", siteTitle);
      description = "Read practical ideas for personalized video gifts, request-writing tips, occasion guides, and customer-friendly gifting advice.";
      break;
    case "forum_archive":
      pageTitle = buildSiteAwareTitle("Forum: Customer Questions and Gift Help", siteTitle);
      description = "Browse real customer questions about orders, video gifts, delivery, and personalized surprise ideas before you buy.";
      break;
    default:
      return html;
  }
  const ogImage = String(seo.ogImage || "").trim();
  const siteOrigin = canonical ? (() => {
    try {
      return new URL(canonical).origin;
    } catch (_) {
      return "";
    }
  })() : "";
  const defaultOgImage = ogImage || (siteOrigin ? siteOrigin + "/favicon.svg" : "/favicon.svg");
  let out = upsertTitleTag(html, pageTitle);
  const metaTags = [
    { type: "name", name: "description", content: description, alwaysReplace: true },
    { type: "property", name: "og:title", content: pageTitle, alwaysReplace: true },
    { type: "property", name: "og:description", content: description, alwaysReplace: true },
    { type: "property", name: "og:type", content: "website", alwaysReplace: true },
    { type: "property", name: "og:image", content: defaultOgImage, alwaysReplace: true },
    { type: "property", name: "og:image:width", content: "1200", alwaysReplace: true },
    { type: "property", name: "og:image:height", content: "630", alwaysReplace: true },
    { type: "name", name: "twitter:card", content: "summary_large_image", alwaysReplace: true },
    { type: "name", name: "twitter:title", content: pageTitle, alwaysReplace: true },
    { type: "name", name: "twitter:description", content: description, alwaysReplace: true },
    { type: "name", name: "twitter:image", content: defaultOgImage, alwaysReplace: true }
  ];
  if (canonical) {
    metaTags.push({ type: "property", name: "og:url", content: canonical, alwaysReplace: true });
  }
  return upsertMetaTagsBatch(out, metaTags);
}
__name(applyDefaultPageMetadata, "applyDefaultPageMetadata");
var CANONICAL_ALIAS_MAP2 = /* @__PURE__ */ new Map([
  ["/index.html", "/"],
  ["/home", "/"],
  ["/home/", "/"],
  ["/page-builder", "/admin/page-builder.html"],
  ["/page-builder/", "/admin/page-builder.html"],
  ["/page-builder.html", "/admin/page-builder.html"],
  ["/landing-builder", "/admin/landing-builder.html"],
  ["/landing-builder/", "/admin/landing-builder.html"],
  ["/landing-builder.html", "/admin/landing-builder.html"],
  ["/blog/index.html", "/blog"],
  ["/blog.html", "/blog"],
  ["/forum/index.html", "/forum"],
  ["/forum.html", "/forum"],
  ["/terms/", "/terms"],
  ["/terms/index.html", "/terms"],
  ["/terms.html", "/terms"],
  ["/products/index.html", "/products"],
  ["/products.html", "/products"],
  ["/products-grid", "/products"],
  ["/products-grid/", "/products"],
  ["/products-grid.html", "/products"],
  ["/checkout/", "/checkout"],
  ["/checkout/index.html", "/checkout"],
  ["/success.html", "/success"],
  ["/buyer-order/", "/buyer-order"],
  ["/buyer-order.html", "/buyer-order"],
  ["/order-detail/", "/order-detail"],
  ["/order-detail.html", "/order-detail"],
  ["/order-success", "/success"],
  ["/order-success.html", "/success"]
]);
var DIRECT_INTERNAL_ALIAS_PATHS = /* @__PURE__ */ new Set([
  "/index.html",
  "/home",
  "/home/",
  "/blog/index.html",
  "/blog.html",
  "/forum/index.html",
  "/forum.html",
  "/terms",
  "/terms/",
  "/terms/index.html",
  "/terms.html",
  "/products.html",
  "/products-grid",
  "/products-grid/",
  "/products-grid.html",
  "/products/index.html",
  "/checkout/",
  "/checkout/index.html",
  "/success/",
  "/success.html",
  "/buyer-order/",
  "/buyer-order.html",
  "/order-detail/",
  "/order-detail.html",
  "/order-success",
  "/order-success.html"
]);
var NON_REDIRECT_ALIAS_PATHS2 = /* @__PURE__ */ new Set([
  "/checkout/",
  "/checkout/index.html",
  "/buyer-order/",
  "/buyer-order.html",
  "/order-detail/",
  "/order-detail.html"
]);
function shouldServeCanonicalAliasDirectly(pathname) {
  const raw = String(pathname || "/").trim() || "/";
  return DIRECT_INTERNAL_ALIAS_PATHS.has(raw);
}
__name(shouldServeCanonicalAliasDirectly, "shouldServeCanonicalAliasDirectly");
function normalizeCanonicalPath2(pathname) {
  let p = String(pathname || "/").trim() || "/";
  p = CANONICAL_ALIAS_MAP2.get(p) || p;
  if (p.length > 1 && p.endsWith("/") && !p.startsWith("/admin/") && !p.startsWith("/api/")) {
    p = p.slice(0, -1);
  }
  return p || "/";
}
__name(normalizeCanonicalPath2, "normalizeCanonicalPath");
function getCanonicalRedirectPath2(pathname) {
  const raw = String(pathname || "/").trim() || "/";
  if (raw === "/admin/" || raw === "/api/") return null;
  if (raw.startsWith("/admin/") || raw.startsWith("/api/")) return null;
  if (NON_REDIRECT_ALIAS_PATHS2.has(raw)) return null;
  const normalized = normalizeCanonicalPath2(raw);
  return normalized !== raw ? normalized : null;
}
__name(getCanonicalRedirectPath2, "getCanonicalRedirectPath");
function isLocalDevHost(hostname) {
  const h = String(hostname || "").trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}
__name(isLocalDevHost, "isLocalDevHost");
function isSensitiveNoindexPath2(pathname) {
  const p = normalizeCanonicalPath2(pathname);
  if (p === "/checkout" || p === "/success" || p === "/buyer-order" || p === "/order-detail") {
    return true;
  }
  if (p === "/admin" || p.startsWith("/admin/")) return true;
  if (p === "/api" || p.startsWith("/api/")) return true;
  if (p === "/order" || p.startsWith("/order/")) return true;
  if (p === "/download" || p.startsWith("/download/")) return true;
  return false;
}
__name(isSensitiveNoindexPath2, "isSensitiveNoindexPath");
var SITE_COMPONENTS_SSR_TTL_MS = 3 * 60 * 1e3;
var settingsCache2 = /* @__PURE__ */ new Map();
var SETTINGS_CACHE_TTL = 3 * 60 * 1e3;
async function getCachedSettings(env, keys) {
  const now = Date.now();
  const missing = [];
  const result = /* @__PURE__ */ new Map();
  for (const key of keys) {
    const kvCacheKey = `api_cache:ssr:settings:${key}`;
    const cached = settingsCache2.get(kvCacheKey);
    if (cached && now - cached.ts < SETTINGS_CACHE_TTL) {
      result.set(key, cached.value);
    } else {
      try {
        const kvData = await env.PAGE_CACHE.get(kvCacheKey, "json");
        if (kvData !== null) {
          settingsCache2.set(kvCacheKey, { value: kvData.value, ts: now });
          result.set(key, kvData.value);
          continue;
        }
      } catch (err) {
      }
      missing.push(key);
    }
  }
  if (missing.length > 0 && env?.DB) {
    try {
      const rows = await env.DB.prepare(
        `SELECT key, value FROM settings WHERE key IN (${missing.map(() => "?").join(",")})`
      ).bind(...missing).all();
      const foundKeys = /* @__PURE__ */ new Set();
      for (const row of rows.results || []) {
        const k = String(row.key || "");
        const kvCacheKey = `api_cache:ssr:settings:${k}`;
        settingsCache2.set(kvCacheKey, { value: row.value, ts: now });
        result.set(k, row.value);
        foundKeys.add(k);
        try {
          await env.PAGE_CACHE.put(kvCacheKey, JSON.stringify({ value: row.value }), { expirationTtl: 86400 * 7 });
        } catch (e) {
        }
      }
      for (const key of missing) {
        if (!foundKeys.has(key)) {
          const kvCacheKey = `api_cache:ssr:settings:${key}`;
          settingsCache2.set(kvCacheKey, { value: null, ts: now });
          result.set(key, null);
          try {
            await env.PAGE_CACHE.put(kvCacheKey, JSON.stringify({ value: null }), { expirationTtl: 86400 * 7 });
          } catch (e) {
          }
        }
      }
    } catch (_) {
    }
  }
  return result;
}
__name(getCachedSettings, "getCachedSettings");
var SINGLETON_PATTERNS = [
  /<title\b[^>]*>[\s\S]*?<\/title>/gi,
  /<meta\s+[^>]*name=["']description["'][^>]*>/gi,
  /<meta\s+[^>]*name=["']keywords["'][^>]*>/gi,
  /<meta\s+[^>]*property=["']og:title["'][^>]*>/gi,
  /<meta\s+[^>]*property=["']og:description["'][^>]*>/gi,
  /<meta\s+[^>]*property=["']og:image["'][^>]*>/gi,
  /<meta\s+[^>]*property=["']og:url["'][^>]*>/gi,
  /<meta\s+[^>]*property=["']og:type["'][^>]*>/gi,
  /<meta\s+[^>]*property=["']og:site_name["'][^>]*>/gi,
  /<meta\s+[^>]*name=["']twitter:card["'][^>]*>/gi,
  /<meta\s+[^>]*name=["']twitter:title["'][^>]*>/gi,
  /<meta\s+[^>]*name=["']twitter:description["'][^>]*>/gi,
  /<meta\s+[^>]*name=["']twitter:image["'][^>]*>/gi,
  /<link\s+[^>]*rel=["']canonical["'][^>]*>/gi
];
var metaTagRegexCache = /* @__PURE__ */ new Map();
var siteComponentsSsrCache = {
  value: null,
  fetchedAt: 0,
  hasValue: false
};
function ensureGlobalComponentsRuntimeScript(html) {
  if (!html) return html;
  const source = String(html);
  if (source.includes("global-components.js")) return source;
  return source.replace(
    /<body([^>]*)>/i,
    '<body$1>\n<script defer src="/js/global-components.js"><\/script>'
  );
}
__name(ensureGlobalComponentsRuntimeScript, "ensureGlobalComponentsRuntimeScript");
function hasGlobalHeaderMarkup(html) {
  const source = String(html || "");
  if (!source.includes("global-header") && !source.includes("site-header")) return false;
  if (source.includes('id="global-header"') || source.includes("id='global-header'")) return true;
  return /class=["'][^"']*\bsite-header\b[^"']*["']/i.test(source);
}
__name(hasGlobalHeaderMarkup, "hasGlobalHeaderMarkup");
function hasGlobalFooterMarkup(html) {
  const source = String(html || "");
  if (!source.includes("global-footer") && !source.includes("site-footer")) return false;
  if (source.includes('id="global-footer"') || source.includes("id='global-footer'")) return true;
  return /class=["'][^"']*\bsite-footer\b[^"']*["']/i.test(source);
}
__name(hasGlobalFooterMarkup, "hasGlobalFooterMarkup");
function injectMarkupIntoSlot(html, slotId, markup) {
  if (!html || !slotId || !markup) return html;
  const slotRe = new RegExp(
    `<([a-zA-Z0-9:-]+)([^>]*)\\bid=["']${slotId}["']([^>]*)>[\\s\\S]*?<\\/\\1>`,
    "i"
  );
  if (!slotRe.test(html)) return html;
  return String(html).replace(slotRe, (_full, tagName, before = "", after = "") => {
    const attrsBase = `${before} id="${slotId}"${after}`;
    const attrs = /\bdata-injected\s*=/.test(attrsBase) ? attrsBase : `${attrsBase} data-injected="1"`;
    return `<${tagName}${attrs}>${markup}</${tagName}>`;
  });
}
__name(injectMarkupIntoSlot, "injectMarkupIntoSlot");
function injectGlobalHeaderSsr(html, headerCode) {
  if (!html || !headerCode || hasGlobalHeaderMarkup(html)) return html;
  const withSlot = injectMarkupIntoSlot(html, "global-header-slot", headerCode);
  if (withSlot !== html) return withSlot;
  if (!/<body[^>]*>/i.test(html)) return html;
  return String(html).replace(
    /<body([^>]*)>/i,
    `<body$1>
<header id="global-header" role="banner">${headerCode}</header>`
  );
}
__name(injectGlobalHeaderSsr, "injectGlobalHeaderSsr");
function injectGlobalFooterSsr(html, footerCode) {
  if (!html || !footerCode || hasGlobalFooterMarkup(html)) return html;
  const withSlot = injectMarkupIntoSlot(html, "global-footer-slot", footerCode);
  if (withSlot !== html) return withSlot;
  const source = String(html);
  if (/<\/body>/i.test(source)) {
    return source.replace(/<\/body>/i, `<footer id="global-footer" role="contentinfo">${footerCode}</footer>
</body>`);
  }
  return `${source}
<footer id="global-footer" role="contentinfo">${footerCode}</footer>`;
}
__name(injectGlobalFooterSsr, "injectGlobalFooterSsr");
function isExcludedFromGlobalComponents(excludedPages, pathname) {
  if (!Array.isArray(excludedPages) || excludedPages.length === 0) return false;
  const path = String(pathname || "/");
  for (const item of excludedPages) {
    const excluded = String(item || "").trim();
    if (!excluded) continue;
    if (excluded === path) return true;
    if (excluded.endsWith("/") && path.startsWith(excluded)) return true;
    if (path.startsWith(excluded + "/")) return true;
  }
  return false;
}
__name(isExcludedFromGlobalComponents, "isExcludedFromGlobalComponents");
function isTransactionalGlobalComponentsPath(pathname) {
  const normalized = normalizeCanonicalPath2(pathname || "/");
  return normalized === "/checkout" || normalized === "/success" || normalized === "/buyer-order" || normalized === "/order-detail";
}
__name(isTransactionalGlobalComponentsPath, "isTransactionalGlobalComponentsPath");
function resolveDefaultComponentCode(components, type) {
  if (!components || typeof components !== "object") return "";
  const isHeader = type === "header";
  const list = Array.isArray(isHeader ? components.headers : components.footers) ? isHeader ? components.headers : components.footers : [];
  const defaultId = isHeader ? components.defaultHeaderId : components.defaultFooterId;
  if (!defaultId) return "";
  const match = list.find((entry) => String(entry?.id || "") === String(defaultId));
  return String(match?.code || "").trim();
}
__name(resolveDefaultComponentCode, "resolveDefaultComponentCode");
async function getSiteComponentsForSsr(env) {
  if (!env?.DB) return null;
  const now = Date.now();
  if (siteComponentsSsrCache.hasValue && now - siteComponentsSsrCache.fetchedAt < SITE_COMPONENTS_SSR_TTL_MS) {
    return siteComponentsSsrCache.value;
  }
  const kvCacheKey = "api_cache:ssr:settings:site_components";
  try {
    const kvData = await env.PAGE_CACHE.get(kvCacheKey, "json");
    if (kvData !== null) {
      siteComponentsSsrCache.value = kvData.value;
      siteComponentsSsrCache.fetchedAt = now;
      siteComponentsSsrCache.hasValue = true;
      return kvData.value;
    }
  } catch (err) {
  }
  try {
    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = ?"
    ).bind("site_components").first();
    let parsed = null;
    if (row && row.value) {
      try {
        const candidate = JSON.parse(row.value);
        if (candidate && typeof candidate === "object") {
          parsed = normalizeSiteComponentsPayload(candidate);
        }
      } catch (_) {
      }
    }
    siteComponentsSsrCache.value = parsed;
    siteComponentsSsrCache.fetchedAt = now;
    siteComponentsSsrCache.hasValue = true;
    try {
      await env.PAGE_CACHE.put(kvCacheKey, JSON.stringify({ value: parsed }), { expirationTtl: 86400 * 7 });
    } catch (e) {
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to load site components for SSR:", error);
    if (siteComponentsSsrCache.hasValue) return siteComponentsSsrCache.value;
    siteComponentsSsrCache.value = null;
    siteComponentsSsrCache.fetchedAt = now;
    siteComponentsSsrCache.hasValue = true;
    return null;
  }
}
__name(getSiteComponentsForSsr, "getSiteComponentsForSsr");
async function applyGlobalComponentsSsr(env, html, pathname) {
  const currentPath = String(pathname || "/");
  const normalizedPath = normalizeCanonicalPath2(currentPath);
  const finalizeHtml = /* @__PURE__ */ __name((source) => rewriteLegacyInternalLinksInHtml(source), "finalizeHtml");
  if (!html || !/<body[^>]*>/i.test(html) || normalizedPath === "/admin" || normalizedPath.startsWith("/admin/") || isTransactionalGlobalComponentsPath(normalizedPath)) {
    return finalizeHtml(html);
  }
  let out = ensureGlobalComponentsRuntimeScript(html);
  if (!env?.DB) return finalizeHtml(out);
  const components = await getSiteComponentsForSsr(env);
  if (!components || typeof components !== "object") return finalizeHtml(out);
  if (isExcludedFromGlobalComponents(components.excludedPages, currentPath) || isExcludedFromGlobalComponents(components.excludedPages, normalizedPath)) {
    return finalizeHtml(out);
  }
  const enableHeader = components?.settings?.enableGlobalHeader !== false;
  const enableFooter = components?.settings?.enableGlobalFooter !== false;
  const headerCode = enableHeader ? resolveDefaultComponentCode(components, "header") : "";
  const footerCode = enableFooter ? resolveDefaultComponentCode(components, "footer") : "";
  let injectedHeader = false;
  let injectedFooter = false;
  if (headerCode && !hasGlobalHeaderMarkup(out)) {
    const withHeader = injectGlobalHeaderSsr(out, headerCode);
    injectedHeader = withHeader !== out;
    out = withHeader;
  }
  if (footerCode && !hasGlobalFooterMarkup(out)) {
    const withFooter = injectGlobalFooterSsr(out, footerCode);
    injectedFooter = withFooter !== out;
    out = withFooter;
  }
  if (injectedHeader || injectedFooter) {
    const attrs = [' data-components-ssr="1"'];
    if (injectedHeader) attrs.push(' data-global-header-ssr="1"');
    if (injectedFooter) attrs.push(' data-global-footer-ssr="1"');
    out = String(out).replace(/<body([^>]*)>/i, `<body$1${attrs.join("")}>`);
  }
  return finalizeHtml(out);
}
__name(applyGlobalComponentsSsr, "applyGlobalComponentsSsr");
var SITEMAP_MEMBERSHIP_TTL_MS = 5 * 60 * 1e3;
var sitemapMembershipCache = {
  fetchedAt: 0,
  urls: null
};
function decodeXmlEntities2(value) {
  return String(value || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
__name(decodeXmlEntities2, "decodeXmlEntities");
function normalizeUrlForSitemapCompare(rawUrl) {
  try {
    const u = new URL(String(rawUrl || "").trim());
    const protocol = String(u.protocol || "").toLowerCase() || "https:";
    const host = String(u.hostname || "").toLowerCase();
    if (!host) return "";
    const includePort = Boolean(
      u.port && !(protocol === "https:" && u.port === "443" || protocol === "http:" && u.port === "80")
    );
    const port = includePort ? `:${u.port}` : "";
    const path = normalizeCanonicalPath2(u.pathname || "/");
    return `${protocol}//${host}${port}${path}`;
  } catch (_) {
    return "";
  }
}
__name(normalizeUrlForSitemapCompare, "normalizeUrlForSitemapCompare");
async function getSitemapMembershipSet(env, req) {
  const now = Date.now();
  if (sitemapMembershipCache.urls && now - sitemapMembershipCache.fetchedAt < SITEMAP_MEMBERSHIP_TTL_MS) {
    return sitemapMembershipCache.urls;
  }
  const out = /* @__PURE__ */ new Set();
  try {
    const sitemap = await buildMinimalSitemapXml(env, req);
    const xml = String(sitemap?.body || "");
    const re = /<loc>([\s\S]*?)<\/loc>/gi;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const decoded = decodeXmlEntities2(m[1]);
      const normalized = normalizeUrlForSitemapCompare(decoded);
      if (normalized) out.add(normalized);
    }
  } catch (_) {
  }
  sitemapMembershipCache.urls = out;
  sitemapMembershipCache.fetchedAt = now;
  return out;
}
__name(getSitemapMembershipSet, "getSitemapMembershipSet");
async function isCanonicalInSitemap(env, req, canonicalUrl) {
  const normalizedCanonical = normalizeUrlForSitemapCompare(canonicalUrl);
  if (!normalizedCanonical) return true;
  const sitemapUrls = await getSitemapMembershipSet(env, req);
  if (!sitemapUrls || sitemapUrls.size === 0) return true;
  return sitemapUrls.has(normalizedCanonical);
}
__name(isCanonicalInSitemap, "isCanonicalInSitemap");
function normalizeSeoBaseUrl(rawBaseUrl, reqUrl, env) {
  let base = null;
  try {
    const raw = String(rawBaseUrl || "").trim();
    base = raw ? new URL(raw) : new URL(reqUrl.toString());
  } catch (_) {
    base = new URL(reqUrl.toString());
  }
  const canonicalHost = getCanonicalHostname(base, env) || getCanonicalHostname(reqUrl, env) || base.hostname;
  if (canonicalHost) base.hostname = canonicalHost;
  if (!isLocalHostname(base.hostname)) {
    base.protocol = "https:";
    if (base.port === "80" || base.port === "443") base.port = "";
  }
  base.pathname = "";
  base.search = "";
  base.hash = "";
  return base.origin;
}
__name(normalizeSeoBaseUrl, "normalizeSeoBaseUrl");
var SEO_REQUEST_CACHE_TTL_MS = 3 * 60 * 1e3;
var seoRequestCache = /* @__PURE__ */ new Map();
async function getSeoForRequest(env, req, opts = {}) {
  const url = new URL(req.url);
  const rawPathname = opts.path || url.pathname || "/";
  const pathname = normalizeCanonicalPath2(rawPathname);
  const cacheKey = opts.product ? null : pathname;
  if (cacheKey) {
    const cached = seoRequestCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < SEO_REQUEST_CACHE_TTL_MS) {
      return cached.value;
    }
  }
  const seoSettings = await getSeoSettingsObject(env);
  const siteTitle = resolveSiteTitle(seoSettings, url);
  const configuredBaseUrl = seoSettings && seoSettings.site_url && String(seoSettings.site_url).trim() ? String(seoSettings.site_url).trim() : url.origin;
  const baseUrl = normalizeSeoBaseUrl(configuredBaseUrl, url, env);
  let canonical = "";
  if (opts.product) {
    const product = opts.product;
    if (product.seo_canonical && String(product.seo_canonical).trim()) {
      canonical = String(product.seo_canonical).trim();
    } else {
      try {
        canonical = baseUrl + canonicalProductPath(product);
      } catch (e) {
        canonical = baseUrl + normalizeCanonicalPath2(pathname);
      }
    }
  } else {
    canonical = baseUrl + normalizeCanonicalPath2(pathname);
  }
  let robots = "index, follow";
  if (isSensitiveNoindexPath2(pathname)) {
    robots = "noindex, nofollow";
  } else {
    try {
      const explicitRule = await getSeoVisibilityRuleMatch(env, {
        pathname,
        rawPathname,
        url,
        requestUrl: req.url
      });
      if (explicitRule === "index") {
        robots = "index, follow";
      } else if (explicitRule === "noindex") {
        robots = "noindex, nofollow";
      } else {
        const inSitemap = await isCanonicalInSitemap(env, req, canonical);
        robots = inSitemap ? "index, follow" : "noindex, nofollow";
      }
    } catch (e) {
    }
  }
  const result = {
    robots,
    canonical,
    siteTitle,
    siteDescription: resolveSiteDescription(seoSettings),
    ogImage: String(seoSettings?.og_image || "").trim()
  };
  if (cacheKey) {
    seoRequestCache.set(cacheKey, { value: result, ts: Date.now() });
    if (seoRequestCache.size > 200) {
      const oldest = seoRequestCache.keys().next().value;
      seoRequestCache.delete(oldest);
    }
  }
  return result;
}
__name(getSeoForRequest, "getSeoForRequest");
function applySeoToHtml(html, robots, canonical, meta = {}) {
  if (!html) return html;
  let out = normalizeStoredPageHtml(String(html));
  const headAppend = [];
  if (robots) {
    const robotsRegex = /<meta\s+name=["']robots["'][^>]*>/i;
    const robotsTag = `<meta name="robots" content="${robots}">`;
    if (robotsRegex.test(out)) {
      out = out.replace(robotsRegex, robotsTag);
    } else {
      headAppend.push(robotsTag);
    }
  }
  if (canonical) {
    const canonicalRegex = /<link\s+rel=["']canonical["'][^>]*>/i;
    const canonicalTag = `<link rel="canonical" href="${canonical}">`;
    if (canonicalRegex.test(out)) {
      out = out.replace(canonicalRegex, canonicalTag);
    } else {
      headAppend.push(canonicalTag);
    }
  }
  if (!/<link\s+rel=["'](?:icon|shortcut icon)["'][^>]*>/i.test(out)) {
    headAppend.push(`<link rel="icon" type="image/svg+xml" href="/favicon.svg">`);
    headAppend.push(`<link rel="icon" href="/favicon.ico" sizes="any">`);
  }
  if (headAppend.length) {
    out = out.replace(/<\/head>/i, `${headAppend.join("\n")}
</head>`);
  }
  const effectiveTitle = buildSiteAwareTitle(extractHtmlTitle(out) || meta.siteTitle || "", meta.siteTitle || "");
  const description = String(meta.siteDescription || "").trim();
  const ogImage = String(meta.ogImage || "").trim();
  const siteTitle = String(meta.siteTitle || "").trim();
  const metaTags = [
    { type: "name", name: "description", content: description },
    { type: "property", name: "og:title", content: effectiveTitle },
    { type: "property", name: "og:description", content: description },
    { type: "property", name: "og:url", content: canonical },
    { type: "property", name: "og:site_name", content: siteTitle || effectiveTitle, alwaysReplace: true },
    { type: "name", name: "twitter:card", content: "summary_large_image", alwaysReplace: true },
    { type: "name", name: "twitter:title", content: effectiveTitle },
    { type: "name", name: "twitter:description", content: description }
  ];
  const effectiveOgImage = ogImage || (canonical ? (() => {
    try {
      return new URL(canonical).origin;
    } catch (_) {
      return "";
    }
  })() : "") + "/favicon.svg" || "/favicon.svg";
  metaTags.push({ type: "property", name: "og:image", content: effectiveOgImage });
  metaTags.push({ type: "property", name: "og:image:width", content: "1200" });
  metaTags.push({ type: "property", name: "og:image:height", content: "630" });
  metaTags.push({ type: "name", name: "twitter:image", content: effectiveOgImage });
  out = upsertMetaTagsBatch(out, metaTags);
  return out;
}
__name(applySeoToHtml, "applySeoToHtml");
function enhanceCustomPageHtml(html, pageRow, baseUrl, seoSettings = {}) {
  let out = String(html || "");
  if (!out.includes(".sr-only")) {
    const srOnlyCss = "<style>.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}</style>";
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${srOnlyCss}
</head>`);
    }
  }
  const faqItems = [];
  const faqRegex = /<span[^>]*class="[^"]*faq-question[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<div[^>]*class="[^"]*faq-answer[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let faqMatch;
  while ((faqMatch = faqRegex.exec(out)) !== null) {
    const q = faqMatch[1].replace(/<[^>]+>/g, "").trim();
    const a = faqMatch[2].replace(/<[^>]+>/g, "").trim();
    if (q && a) faqItems.push({ question: q, answer: a });
  }
  if (!/<main[\s>]/i.test(out)) {
    const bodyOpenMatch = out.match(/<body[^>]*>/i);
    const bodyCloseMatch = out.match(/<\/body>/i);
    if (bodyOpenMatch && bodyCloseMatch) {
      const bodyOpenEnd = bodyOpenMatch.index + bodyOpenMatch[0].length;
      const bodyCloseStart = bodyCloseMatch.index;
      const bodyContent = out.slice(bodyOpenEnd, bodyCloseStart);
      out = out.slice(0, bodyOpenEnd) + '\n<main role="main">\n<article>\n' + bodyContent + "\n</article>\n</main>\n" + out.slice(bodyCloseStart);
    }
  }
  if (pageRow && pageRow.title && !/<h1[\s>]/i.test(out)) {
    const safeTitle = escapeHtmlText(pageRow.title);
    const mainMatch = out.match(/<main[^>]*>/i);
    if (mainMatch) {
      const insertPos = mainMatch.index + mainMatch[0].length;
      const afterMain = out.slice(insertPos, insertPos + 200);
      const articleMatch = afterMain.match(/<article[^>]*>/i);
      if (articleMatch) {
        const articleEnd = insertPos + articleMatch.index + articleMatch[0].length;
        out = out.slice(0, articleEnd) + `
<h1 class="sr-only">${safeTitle}</h1>` + out.slice(articleEnd);
      } else {
        out = out.slice(0, insertPos) + `
<h1 class="sr-only">${safeTitle}</h1>` + out.slice(insertPos);
      }
    }
  }
  if (pageRow && baseUrl) {
    try {
      const webPageSchema = generateWebPageSchema(pageRow, baseUrl, seoSettings);
      out = appendJsonLdToHead(out, webPageSchema, "custom-page-schema");
    } catch (_) {
    }
  }
  if (faqItems.length > 0 && baseUrl) {
    try {
      const faqSchema = generateFAQPageSchema(faqItems, baseUrl);
      out = appendJsonLdToHead(out, faqSchema, "faq-page-schema");
    } catch (_) {
    }
  }
  return out;
}
__name(enhanceCustomPageHtml, "enhanceCustomPageHtml");
function formatBlogArchiveDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
__name(formatBlogArchiveDate, "formatBlogArchiveDate");
function truncateBlogArchiveText(value, maxLength = 120) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}
__name(truncateBlogArchiveText, "truncateBlogArchiveText");
function buildBlogArchivePageHref(pageNumber, limit) {
  const n = Math.max(1, parseInt(pageNumber, 10) || 1);
  const l = Math.max(1, parseInt(limit, 10) || 30);
  const params = new URLSearchParams();
  if (n > 1) params.set("page", String(n));
  if (l !== 30) params.set("limit", String(l));
  const q = params.toString();
  return q ? `?${q}` : "?";
}
__name(buildBlogArchivePageHref, "buildBlogArchivePageHref");
function renderBlogArchivePaginationSsr(pagination) {
  const page = Math.max(1, parseInt(pagination?.page, 10) || 1);
  const totalPages = Math.max(0, parseInt(pagination?.totalPages, 10) || 0);
  const hasNext = !!pagination?.hasNext;
  const hasPrev = !!pagination?.hasPrev;
  const limit = Math.max(1, parseInt(pagination?.limit, 10) || 30);
  if (totalPages <= 1) return "";
  let pageLinks = "";
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  if (startPage > 1) {
    pageLinks += `<a href="${buildBlogArchivePageHref(1, limit)}" class="page-link">1</a>`;
    if (startPage > 2) {
      pageLinks += '<span class="page-dots">...</span>';
    }
  }
  for (let i = startPage; i <= endPage; i += 1) {
    if (i === page) {
      pageLinks += `<span class="page-link active">${i}</span>`;
    } else {
      pageLinks += `<a href="${buildBlogArchivePageHref(i, limit)}" class="page-link">${i}</a>`;
    }
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pageLinks += '<span class="page-dots">...</span>';
    }
    pageLinks += `<a href="${buildBlogArchivePageHref(totalPages, limit)}" class="page-link">${totalPages}</a>`;
  }
  return `
    <div class="blog-pagination">
      ${hasPrev ? `<a href="${buildBlogArchivePageHref(page - 1, limit)}" class="page-link page-prev">Previous</a>` : ""}
      <div class="page-numbers">${pageLinks}</div>
      ${hasNext ? `<a href="${buildBlogArchivePageHref(page + 1, limit)}" class="page-link page-next">Next</a>` : ""}
    </div>
  `;
}
__name(renderBlogArchivePaginationSsr, "renderBlogArchivePaginationSsr");
function renderBlogArchiveCardsSsr(blogs = [], pagination = {}) {
  const safeBlogs = Array.isArray(blogs) ? blogs : [];
  const cardsHtml = safeBlogs.map((blog) => {
    const slugOrId = String(blog.slug || blog.id || "").trim();
    if (!slugOrId) return "";
    const blogUrl = `/blog/${encodeURIComponent(slugOrId)}`;
    const title = escapeHtmlText(blog.title || "Untitled");
    const description = escapeHtmlText(truncateBlogArchiveText(blog.description || "", 120));
    const dateText = escapeHtmlText(formatBlogArchiveDate(blog.created_at));
    const thumb = escapeHtmlText(
      String(blog.thumbnail_url || "").trim() || "https://via.placeholder.com/400x225?text=No+Image"
    );
    return `
      <article class="blog-card">
        <a class="blog-card-link" href="${blogUrl}">
          <div class="blog-thumbnail">
            <img src="${thumb}" alt="${title}" loading="lazy">
          </div>
          <div class="blog-content">
            <h3 class="blog-title">${title}</h3>
            ${dateText ? `<div class="blog-date">${dateText}</div>` : ""}
            <p class="blog-description">${description}</p>
            <span class="blog-read-more">Read More -></span>
          </div>
        </a>
      </article>
    `;
  }).join("");
  const styles = `
    <style id="blog-archive-ssr-style">
      #blog-archive .blog-cards-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 30px;
        max-width: 1200px;
        margin: 0 auto;
      }
      #blog-archive .blog-card {
        background: #fff;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      }
      #blog-archive .blog-card-link {
        display: block;
        color: inherit;
        text-decoration: none;
      }
      #blog-archive .blog-thumbnail {
        width: 100%;
        aspect-ratio: 16 / 9;
        background: #eef2ff;
      }
      #blog-archive .blog-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      #blog-archive .blog-content {
        padding: 18px;
      }
      #blog-archive .blog-title {
        margin: 0 0 8px;
        font-size: 1.1rem;
        color: #111827;
        line-height: 1.35;
      }
      #blog-archive .blog-date {
        margin-bottom: 10px;
        color: #6b7280;
        font-size: 0.88rem;
      }
      #blog-archive .blog-description {
        margin: 0 0 14px;
        color: #374151;
        line-height: 1.6;
        font-size: 0.95rem;
      }
      #blog-archive .blog-read-more {
        color: #1d4ed8;
        font-size: 0.92rem;
        font-weight: 600;
      }
      #blog-archive .blog-pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-top: 32px;
        flex-wrap: wrap;
      }
      #blog-archive .page-numbers {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #blog-archive .page-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        height: 40px;
        border-radius: 10px;
        border: 1px solid #d1d5db;
        background: #fff;
        color: #111827;
        text-decoration: none;
        font-weight: 600;
        padding: 0 12px;
      }
      #blog-archive .page-link.active {
        background: #111827;
        border-color: #111827;
        color: #fff;
      }
      #blog-archive .page-dots {
        color: #9ca3af;
      }
      @media (max-width: 1024px) {
        #blog-archive .blog-cards-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }
      }
      @media (max-width: 680px) {
        #blog-archive .blog-cards-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }
      }
    </style>
  `;
  if (!cardsHtml) {
    return `${styles}<p style="text-align:center;padding:60px 20px;color:#6b7280;font-size:1.05rem;">No blog posts found.</p>`;
  }
  return `${styles}<div class="blog-cards-grid">${cardsHtml}</div>${renderBlogArchivePaginationSsr(pagination)}`;
}
__name(renderBlogArchiveCardsSsr, "renderBlogArchiveCardsSsr");
function normalizeSsrInteger(value, fallback, min = 1, max = 100) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
__name(normalizeSsrInteger, "normalizeSsrInteger");
function normalizeSsrIdList(idsInput = []) {
  if (!Array.isArray(idsInput)) return [];
  return idsInput.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 50);
}
__name(normalizeSsrIdList, "normalizeSsrIdList");
var productQueryCache = /* @__PURE__ */ new Map();
var PRODUCT_QUERY_CACHE_TTL = 3 * 60 * 1e3;
async function queryProductsForComponentSsr(env, options = {}) {
  const limit = normalizeSsrInteger(options.limit, 12, 1, 100);
  const page = normalizeSsrInteger(options.page, 1, 1, 100);
  const offset = (page - 1) * limit;
  const filter = String(options.filter || "all").trim().toLowerCase();
  const requestedIds = normalizeSsrIdList(options.ids);
  const cacheKeyStr = requestedIds.length > 0 ? `ids:${requestedIds.join(",")}:${limit}` : `${filter}:${page}:${limit}`;
  const kvCacheKey = `api_cache:ssr:products:${cacheKeyStr}`;
  const cached = productQueryCache.get(kvCacheKey);
  if (cached && Date.now() - cached.ts < PRODUCT_QUERY_CACHE_TTL) {
    return cached.value;
  }
  try {
    const kvData = await env.PAGE_CACHE.get(kvCacheKey, "json");
    if (kvData) {
      productQueryCache.set(kvCacheKey, { value: kvData, ts: Date.now() });
      if (productQueryCache.size > 100) productQueryCache.delete(productQueryCache.keys().next().value);
      return kvData;
    }
  } catch (err) {
  }
  if (requestedIds.length > 0) {
    const numericIds = requestedIds.filter((item) => /^\d+$/.test(item));
    const slugIds = requestedIds.filter((item) => !/^\d+$/.test(item));
    const conditions = [];
    const bindings = [];
    if (numericIds.length > 0) {
      conditions.push(`CAST(p.id AS TEXT) IN (${numericIds.map(() => "?").join(",")})`);
      bindings.push(...numericIds);
    }
    if (slugIds.length > 0) {
      conditions.push(`p.slug IN (${slugIds.map(() => "?").join(",")})`);
      bindings.push(...slugIds);
    }
    if (conditions.length === 0) {
      return { products: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
    }
    const rows2 = await env.DB.prepare(`
      SELECT
        p.id, p.title, p.slug, p.normal_price, p.sale_price,
        p.thumbnail_url, p.video_url, p.normal_delivery_text, p.instant_delivery,
        p.featured, p.description,
        COUNT(r.id) as review_count,
        AVG(r.rating) as rating_average
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
      WHERE ${buildPublicProductStatusWhere("p.status")}
      AND (${conditions.join(" OR ")})
      GROUP BY p.id
      ORDER BY p.sort_order ASC, p.id DESC
    `).bind(...bindings).all();
    const ordered = requestedIds.map((requestedId) => (rows2.results || []).find((item) => String(item.id) === requestedId || String(item.slug || "") === requestedId)).filter(Boolean).slice(0, limit).map((item) => ({
      ...item,
      delivery_time_days: parseInt(item.normal_delivery_text, 10) || 1,
      review_count: item.review_count || 0,
      average_rating: item.rating_average ? Math.round(item.rating_average * 10) / 10 : 0
    }));
    const result2 = {
      products: ordered,
      pagination: { page: 1, limit, total: ordered.length, pages: 1 }
    };
    productQueryCache.set(kvCacheKey, { value: result2, ts: Date.now() });
    if (productQueryCache.size > 100) productQueryCache.delete(productQueryCache.keys().next().value);
    try {
      await env.PAGE_CACHE.put(kvCacheKey, JSON.stringify(result2), { expirationTtl: 86400 * 7 });
    } catch (e) {
    }
    return result2;
  }
  let whereClause = `WHERE ${buildPublicProductStatusWhere("p.status")}`;
  if (filter === "featured") {
    whereClause += " AND p.featured = 1";
  }
  const [totalRow, rows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as count FROM products p ${whereClause}`).first(),
    env.DB.prepare(`
      SELECT
        p.id, p.title, p.slug, p.normal_price, p.sale_price,
        p.thumbnail_url, p.video_url, p.normal_delivery_text, p.instant_delivery,
        p.featured, p.description,
        COUNT(r.id) as review_count,
        AVG(r.rating) as rating_average
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.sort_order ASC, p.id DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()
  ]);
  const products = (rows.results || []).map((item) => ({
    ...item,
    delivery_time_days: parseInt(item.normal_delivery_text, 10) || 1,
    review_count: item.review_count || 0,
    average_rating: item.rating_average ? Math.round(item.rating_average * 10) / 10 : 0
  }));
  const result = {
    products,
    pagination: {
      page,
      limit,
      total: totalRow?.count || 0,
      pages: Math.max(1, Math.ceil((totalRow?.count || 0) / limit))
    }
  };
  productQueryCache.set(kvCacheKey, { value: result, ts: Date.now() });
  if (productQueryCache.size > 100) productQueryCache.delete(productQueryCache.keys().next().value);
  try {
    await env.PAGE_CACHE.put(kvCacheKey, JSON.stringify(result), { expirationTtl: 86400 * 7 });
  } catch (e) {
  }
  return result;
}
__name(queryProductsForComponentSsr, "queryProductsForComponentSsr");
var blogQueryCache = /* @__PURE__ */ new Map();
var BLOG_QUERY_CACHE_TTL = 3 * 60 * 1e3;
async function queryBlogsForComponentSsr(env, options = {}) {
  const limit = normalizeSsrInteger(options.limit, 30, 1, 100);
  const page = normalizeSsrInteger(options.page, 1, 1, 100);
  const offset = (page - 1) * limit;
  const requestedIds = normalizeSsrIdList(options.ids);
  const cacheKeyStr = requestedIds.length > 0 ? `ids:${requestedIds.join(",")}:${limit}` : `all:${page}:${limit}`;
  const kvCacheKey = `api_cache:ssr:blogs:${cacheKeyStr}`;
  const cached = blogQueryCache.get(kvCacheKey);
  if (cached && Date.now() - cached.ts < BLOG_QUERY_CACHE_TTL) {
    return cached.value;
  }
  try {
    const kvData = await env.PAGE_CACHE.get(kvCacheKey, "json");
    if (kvData) {
      blogQueryCache.set(kvCacheKey, { value: kvData, ts: Date.now() });
      if (blogQueryCache.size > 100) blogQueryCache.delete(blogQueryCache.keys().next().value);
      return kvData;
    }
  } catch (err) {
  }
  if (requestedIds.length > 0) {
    const numericIds = requestedIds.filter((item) => /^\d+$/.test(item));
    const slugIds = requestedIds.filter((item) => !/^\d+$/.test(item));
    const conditions = [];
    const bindings = [];
    if (numericIds.length > 0) {
      conditions.push(`CAST(id AS TEXT) IN (${numericIds.map(() => "?").join(",")})`);
      bindings.push(...numericIds);
    }
    if (slugIds.length > 0) {
      conditions.push(`slug IN (${slugIds.map(() => "?").join(",")})`);
      bindings.push(...slugIds);
    }
    if (conditions.length === 0) {
      return { blogs: [], pagination: { page: 1, limit, total: 0, totalPages: 1, hasNext: false, hasPrev: false } };
    }
    const rows2 = await env.DB.prepare(`
      SELECT id, title, slug, description, thumbnail_url, created_at
      FROM blogs
      WHERE status = 'published' AND (${conditions.join(" OR ")})
      ORDER BY created_at DESC
    `).bind(...bindings).all();
    const blogs = requestedIds.map((requestedId) => (rows2.results || []).find((item) => String(item.id) === requestedId || String(item.slug || "") === requestedId)).filter(Boolean).slice(0, limit);
    const result2 = {
      blogs,
      pagination: { page: 1, limit, total: blogs.length, totalPages: 1, hasNext: false, hasPrev: false }
    };
    blogQueryCache.set(kvCacheKey, { value: result2, ts: Date.now() });
    if (blogQueryCache.size > 100) blogQueryCache.delete(blogQueryCache.keys().next().value);
    try {
      await env.PAGE_CACHE.put(kvCacheKey, JSON.stringify(result2), { expirationTtl: 86400 * 7 });
    } catch (e) {
    }
    return result2;
  }
  const [countResult, rows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as total FROM blogs WHERE status = 'published'`).first(),
    env.DB.prepare(`
      SELECT id, title, slug, description, thumbnail_url, created_at
      FROM blogs
      WHERE status = 'published'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()
  ]);
  const total = countResult?.total || 0;
  const result = {
    blogs: rows.results || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: offset + limit < total,
      hasPrev: page > 1
    }
  };
  blogQueryCache.set(kvCacheKey, { value: result, ts: Date.now() });
  if (blogQueryCache.size > 100) blogQueryCache.delete(blogQueryCache.keys().next().value);
  try {
    await env.PAGE_CACHE.put(kvCacheKey, JSON.stringify(result), { expirationTtl: 86400 * 7 });
  } catch (e) {
  }
  return result;
}
__name(queryBlogsForComponentSsr, "queryBlogsForComponentSsr");
var forumQueryCache = /* @__PURE__ */ new Map();
var FORUM_QUERY_CACHE_TTL = 3 * 60 * 1e3;
async function queryForumQuestionsForSsr(env, options = {}) {
  const limit = normalizeSsrInteger(options.limit, 20, 1, 100);
  const page = normalizeSsrInteger(options.page, 1, 1, 100);
  const offset = (page - 1) * limit;
  const kvCacheKey = `api_cache:ssr:forum:${page}:${limit}`;
  const cached = forumQueryCache.get(kvCacheKey);
  if (cached && Date.now() - cached.ts < FORUM_QUERY_CACHE_TTL) {
    return cached.value;
  }
  try {
    const kvData = await env.PAGE_CACHE.get(kvCacheKey, "json");
    if (kvData) {
      forumQueryCache.set(kvCacheKey, { value: kvData, ts: Date.now() });
      if (forumQueryCache.size > 100) forumQueryCache.delete(forumQueryCache.keys().next().value);
      return kvData;
    }
  } catch (err) {
  }
  const [countResult, rows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as total FROM forum_questions WHERE status = 'approved'`).first(),
    env.DB.prepare(`
      SELECT id, title, slug, content, name, reply_count, created_at
      FROM forum_questions
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()
  ]);
  const total = countResult?.total || 0;
  const result = {
    questions: rows.results || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: offset + limit < total,
      hasPrev: page > 1
    }
  };
  forumQueryCache.set(kvCacheKey, { value: result, ts: Date.now() });
  if (forumQueryCache.size > 100) forumQueryCache.delete(forumQueryCache.keys().next().value);
  try {
    await env.PAGE_CACHE.put(kvCacheKey, JSON.stringify(result), { expirationTtl: 86400 * 7 });
  } catch (e) {
  }
  return result;
}
__name(queryForumQuestionsForSsr, "queryForumQuestionsForSsr");
var reviewQueryCache = /* @__PURE__ */ new Map();
var REVIEW_QUERY_CACHE_TTL = 3 * 60 * 1e3;
async function queryReviewsForSsr(env, options = {}) {
  const limit = normalizeSsrInteger(options.limit, 6, 1, 50);
  const requestedProductIds = normalizeSsrIdList(options.productIds);
  const requestedReviewIds = normalizeSsrIdList(options.ids);
  const rating = options.rating == null ? null : normalizeSsrInteger(options.rating, null, 1, 5);
  const minRating = options.minRating == null ? null : normalizeSsrInteger(options.minRating, null, 1, 5);
  const productId = options.productId == null ? null : normalizeSsrInteger(options.productId, null, 1, Number.MAX_SAFE_INTEGER);
  const cacheKeyStr = `${limit}:${requestedProductIds.join(",")}:${requestedReviewIds.join(",")}:${rating}:${minRating}:${productId}`;
  const kvCacheKey = `api_cache:ssr:reviews:${cacheKeyStr}`;
  const cached = reviewQueryCache.get(kvCacheKey);
  if (cached && Date.now() - cached.ts < REVIEW_QUERY_CACHE_TTL) {
    return cached.value;
  }
  try {
    const kvData = await env.PAGE_CACHE.get(kvCacheKey, "json");
    if (kvData) {
      reviewQueryCache.set(kvCacheKey, { value: kvData, ts: Date.now() });
      if (reviewQueryCache.size > 100) reviewQueryCache.delete(reviewQueryCache.keys().next().value);
      return kvData;
    }
  } catch (err) {
  }
  let sql = `
    SELECT r.*, p.title as product_title
    FROM reviews r
    LEFT JOIN products p ON r.product_id = p.id
    WHERE r.status = 'approved'
  `;
  const bindings = [];
  if (rating != null) {
    sql += " AND r.rating = ?";
    bindings.push(rating);
  }
  if (minRating != null) {
    sql += " AND r.rating >= ?";
    bindings.push(minRating);
  }
  if (productId != null) {
    sql += " AND r.product_id = ?";
    bindings.push(productId);
  }
  if (requestedProductIds.length > 0) {
    const numericProductIds = requestedProductIds.map((value) => parseInt(value, 10)).filter((value) => Number.isFinite(value));
    if (numericProductIds.length > 0) {
      sql += ` AND r.product_id IN (${numericProductIds.map(() => "?").join(",")})`;
      bindings.push(...numericProductIds);
    }
  }
  if (requestedReviewIds.length > 0) {
    const numericReviewIds = requestedReviewIds.map((value) => parseInt(value, 10)).filter((value) => Number.isFinite(value));
    if (numericReviewIds.length > 0) {
      sql += ` AND r.id IN (${numericReviewIds.map(() => "?").join(",")})`;
      bindings.push(...numericReviewIds);
    }
  }
  sql += " ORDER BY r.created_at DESC LIMIT ?";
  bindings.push(limit);
  const rows = await env.DB.prepare(sql).bind(...bindings).all();
  const result = rows.results || [];
  reviewQueryCache.set(kvCacheKey, { value: result, ts: Date.now() });
  if (reviewQueryCache.size > 100) reviewQueryCache.delete(reviewQueryCache.keys().next().value);
  try {
    await env.PAGE_CACHE.put(kvCacheKey, JSON.stringify(result), { expirationTtl: 86400 * 7 });
  } catch (e) {
  }
  return result;
}
__name(queryReviewsForSsr, "queryReviewsForSsr");
function replaceSimpleTextByIdSsr(html, elementId, value) {
  const escapedId = String(elementId || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<(span|div|p)([^>]*\\bid=["']${escapedId}["'][^>]*)>([\\s\\S]*?)</\\1>`, "i");
  return String(html || "").replace(pattern, `<$1$2>${escapeHtmlText(String(value ?? ""))}</$1>`);
}
__name(replaceSimpleTextByIdSsr, "replaceSimpleTextByIdSsr");
function replaceAnchorHrefById(html, elementId, href) {
  const escapedId = String(elementId || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(<a[^>]*\\bid=["']${escapedId}["'][^>]*\\bhref=["'])[^"']*(["'])`, "i");
  return String(html || "").replace(pattern, `$1${escapeHtmlText(String(href || "#"))}$2`);
}
__name(replaceAnchorHrefById, "replaceAnchorHrefById");
function buildForumQuestionHref(question) {
  const slug = String(question?.slug || "").trim();
  if (slug) {
    return `/forum/${encodeURIComponent(slug)}`;
  }
  const questionId = Number.parseInt(question?.id, 10);
  if (Number.isFinite(questionId) && questionId > 0) {
    return `/forum/question.html?id=${questionId}`;
  }
  return "/forum";
}
__name(buildForumQuestionHref, "buildForumQuestionHref");
function renderForumArchiveCardsSsr(questions = []) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return '<div class="no-questions"><p>No questions yet. Be the first to ask!</p></div>';
  }
  const cards = questions.map((question) => {
    const date = question.created_at ? new Date(question.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    const initial = escapeHtmlText(String(question.name || "A").charAt(0).toUpperCase());
    const href = buildForumQuestionHref(question);
    return `
      <a class="question-card question-link-card" id="qcard-${escapeHtmlText(question.id)}" href="${href}" style="display:block;text-decoration:none;color:inherit;">
        <div class="question-header">
          <div class="q-avatar">${initial}</div>
          <div class="q-content">
            <div class="q-title">${escapeHtmlText(question.title || "")}</div>
            <div class="q-preview">${escapeHtmlText(question.content || "")}</div>
            <div class="q-meta">
              <span>&#128100; ${escapeHtmlText(question.name || "")}</span>
              <span>&#128197; ${escapeHtmlText(date)}</span>
              <span class="reply-count">&#128172; ${escapeHtmlText(question.reply_count || 0)} replies</span>
            </div>
          </div>
          <div class="expand-icon">&rarr;</div>
        </div>
      </a>
    `;
  }).join("");
  return `<div class="questions-list">${cards}</div>`;
}
__name(renderForumArchiveCardsSsr, "renderForumArchiveCardsSsr");
function renderForumArchivePaginationSsr(pagination = {}) {
  const totalPages = Math.max(0, parseInt(pagination.totalPages, 10) || 0);
  if (totalPages <= 1) return "";
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  let html = `<button class="page-btn" onclick="loadQuestions(${page - 1})" ${!pagination.hasPrev ? "disabled" : ""}>&larr;</button>`;
  for (let index = 1; index <= totalPages; index += 1) {
    html += `<button class="page-btn ${index === page ? "active" : ""}" onclick="loadQuestions(${index})">${index}</button>`;
  }
  html += `<button class="page-btn" onclick="loadQuestions(${page + 1})" ${!pagination.hasNext ? "disabled" : ""}>&rarr;</button>`;
  return html;
}
__name(renderForumArchivePaginationSsr, "renderForumArchivePaginationSsr");
function renderEmbeddedForumQuestionsSsr(questions = []) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return '<p style="text-align:center;color:#6b7280;padding:40px;background:white;border-radius:12px;">No questions yet. Be the first to ask!</p>';
  }
  return `<h3 style="margin-bottom:20px;color:#1f2937;">Recent Questions</h3>${questions.map((question) => {
    const preview = escapeHtmlText(String(question.content || "").slice(0, 150) + (String(question.content || "").length > 150 ? "..." : ""));
    const href = buildForumQuestionHref(question);
    return `<a href="${href}" style="display:block;background:white;border-radius:12px;padding:20px;margin-bottom:15px;box-shadow:0 2px 8px rgba(0,0,0,0.06);text-decoration:none;transition:transform 0.2s,box-shadow 0.2s;"><h4 style="color:#1f2937;margin-bottom:8px;font-size:1.1rem;">${escapeHtmlText(question.title || "")}</h4><p style="color:#6b7280;font-size:0.9rem;line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${preview}</p><div style="display:flex;gap:15px;font-size:0.85rem;color:#9ca3af;"><span>&#128100; ${escapeHtmlText(question.name || "")}</span><span>&#128172; ${escapeHtmlText(question.reply_count || 0)} replies</span></div></a>`;
  }).join("")}`;
}
__name(renderEmbeddedForumQuestionsSsr, "renderEmbeddedForumQuestionsSsr");
function renderEmbeddedForumPaginationSsr(pagination = {}) {
  const totalPages = Math.max(0, parseInt(pagination.totalPages, 10) || 0);
  if (totalPages <= 1) return "";
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  let html = "";
  if (pagination.hasPrev) {
    html += `<button onclick="loadForumQuestions(${page - 1})" style="padding:8px 16px;border:1px solid #e5e7eb;background:white;border-radius:8px;cursor:pointer;">&larr; Prev</button>`;
  }
  for (let index = 1; index <= totalPages; index += 1) {
    if (index === page) {
      html += `<button style="padding:8px 16px;border:none;background:#10b981;color:white;border-radius:8px;">${index}</button>`;
    } else if (index === 1 || index === totalPages || Math.abs(index - page) <= 2) {
      html += `<button onclick="loadForumQuestions(${index})" style="padding:8px 16px;border:1px solid #e5e7eb;background:white;border-radius:8px;cursor:pointer;">${index}</button>`;
    } else if (Math.abs(index - page) === 3) {
      html += '<span style="padding:8px;">...</span>';
    }
  }
  if (pagination.hasNext) {
    html += `<button onclick="loadForumQuestions(${page + 1})" style="padding:8px 16px;border:1px solid #e5e7eb;background:white;border-radius:8px;cursor:pointer;">Next &rarr;</button>`;
  }
  return html;
}
__name(renderEmbeddedForumPaginationSsr, "renderEmbeddedForumPaginationSsr");
async function applyComponentSsrToHtml(env, html, url, path) {
  if (!env?.DB || !html) return html;
  let output = String(html);
  let needsProductStyles = false;
  let needsBlogStyles = false;
  let needsReviewsStyles = false;
  const productConfigs = extractInlineRenderConfigs(output, "ProductCards");
  const blogConfigs = extractInlineRenderConfigs(output, "BlogCards");
  const reviewConfigs = extractInlineRenderConfigs(output, "ReviewsWidget");
  const needsHomepageProducts = output.includes('id="product-grid"') || output.includes('id="hero-featured-player"');
  const isRootHomepage = path === "/" || path === "/index.html";
  const needsLegacyHomepageHero = isRootHomepage && output.includes('id="heroPlayerStage"');
  const needsLegacyHomepageInstant = isRootHomepage && output.includes('id="instantTrack"');
  const needsLegacyHomepageFeatured = isRootHomepage && output.includes('id="featuredTrack"');
  const needsLegacyHomepageReviews = isRootHomepage && output.includes('id="reviewsTrack"');
  if (output.includes('id="reviews-widget"') && !reviewConfigs.has("reviews-widget")) {
    reviewConfigs.set("reviews-widget", { limit: 8, columns: 3, minRating: 5 });
  }
  if (isRootHomepage && !productConfigs.has("product-list") && output.includes('id="product-list"')) {
    productConfigs.set("product-list", { filter: "all", columns: 3, limit: 9, showReviews: true, showDelivery: true });
  }
  let homeProductsBootstrap = null;
  const getHomeProductsBootstrap = /* @__PURE__ */ __name(async () => {
    if (homeProductsBootstrap) return homeProductsBootstrap;
    const result = await queryProductsForComponentSsr(env, { limit: 24, page: 1 });
    homeProductsBootstrap = buildHomeProductsBootstrap(result.products || []);
    return homeProductsBootstrap;
  }, "getHomeProductsBootstrap");
  for (const [containerId, config] of productConfigs.entries()) {
    if (!output.includes(`id="${containerId}"`) && !output.includes(`id='${containerId}'`)) continue;
    const productResult = await queryProductsForComponentSsr(env, {
      ...config,
      page: url.searchParams.get("page") || config.page || 1
    });
    const rendered = renderProductCardsSsrMarkup({
      containerId,
      products: productResult.products,
      options: config,
      pagination: productResult.pagination
    });
    output = replaceSimpleContainerById(output, containerId, rendered.innerHtml, rendered.attrs, rendered.afterHtml);
    needsProductStyles = true;
  }
  for (const [containerId, config] of blogConfigs.entries()) {
    if (!output.includes(`id="${containerId}"`) && !output.includes(`id='${containerId}'`)) continue;
    const blogResult = await queryBlogsForComponentSsr(env, {
      ...config,
      page: url.searchParams.get("page") || config.page || 1
    });
    const rendered = renderBlogCardsSsrMarkup({
      containerId,
      blogs: blogResult.blogs,
      options: config,
      pagination: blogResult.pagination
    });
    output = replaceSimpleContainerById(output, containerId, rendered.innerHtml, rendered.attrs, rendered.afterHtml);
    needsBlogStyles = true;
  }
  for (const [containerId, config] of reviewConfigs.entries()) {
    if (!output.includes(`id="${containerId}"`) && !output.includes(`id='${containerId}'`)) continue;
    const reviews = await queryReviewsForSsr(env, config);
    const rendered = renderReviewsWidgetSsrMarkup({
      containerId,
      reviews,
      options: config
    });
    output = replaceSimpleContainerById(output, containerId, rendered.innerHtml, rendered.attrs, rendered.afterHtml);
    needsReviewsStyles = true;
  }
  if (needsHomepageProducts) {
    const bootstrap = await getHomeProductsBootstrap();
    const products = Array.isArray(bootstrap?.products) ? bootstrap.products : [];
    const bootstrapTag = `<script type="application/json" id="${HOME_PRODUCTS_BOOTSTRAP_ID}">${JSON.stringify(bootstrap || {}).replace(/</g, "\\u003c")}<\/script>`;
    let injectedHomeBootstrap = false;
    if (output.includes('id="product-grid"')) {
      output = replaceSimpleContainerById(
        output,
        "product-grid",
        renderHomepageProductGridSsr(products.slice(0, 12)),
        { "data-ssr-home-products": "1" },
        bootstrapTag
      );
      injectedHomeBootstrap = true;
    }
    if (output.includes('id="hero-featured-player"')) {
      const hero = renderHomepageHeroPlayerSsr(products);
      output = replaceSimpleContainerById(
        output,
        "hero-featured-player",
        hero.innerHtml,
        { "data-ssr-home-hero": "1" },
        injectedHomeBootstrap ? "" : bootstrapTag
      );
      output = replaceAnchorHrefById(output, "hero-order-link", hero.targetHref);
      output = replaceAnchorHrefById(output, "cta-order-link", hero.targetHref);
    }
  }
  if (needsLegacyHomepageHero || needsLegacyHomepageInstant || needsLegacyHomepageFeatured || needsLegacyHomepageReviews) {
    const bootstrap = await getHomeProductsBootstrap();
    const products = Array.isArray(bootstrap?.products) ? bootstrap.products : [];
    if (needsLegacyHomepageHero) {
      const hero = renderLegacyHomepageHeroPlayerSsr(products);
      output = replaceSimpleContainerById(output, "heroPlayerStage", hero.stageHtml, { "data-ssr-home-hero": "1" });
      if (output.includes('id="heroThumbnails"')) {
        output = replaceSimpleContainerById(output, "heroThumbnails", hero.thumbnailsHtml);
      }
      if (output.includes('id="heroDots"')) {
        output = replaceSimpleContainerById(output, "heroDots", hero.dotsHtml);
      }
      if (output.includes('id="heroProductInfo"')) {
        output = replaceSimpleContainerById(output, "heroProductInfo", hero.infoHtml);
      }
      output = replaceAnchorHrefById(output, "heroBookBtn", hero.targetHref);
    }
    if (needsLegacyHomepageInstant) {
      output = replaceSimpleContainerById(
        output,
        "instantTrack",
        renderLegacyHomepageProductSliderSsr(products, { mode: "instant", limit: 8 }),
        { "data-ssr-home-products": "1" }
      );
    }
    if (needsLegacyHomepageFeatured) {
      output = replaceSimpleContainerById(
        output,
        "featuredTrack",
        renderLegacyHomepageProductSliderSsr(products, { mode: "featured", limit: 8 }),
        { "data-ssr-home-products": "1" }
      );
    }
    if (needsLegacyHomepageReviews) {
      const reviews = await queryReviewsForSsr(env, { limit: 8 });
      output = replaceSimpleContainerById(
        output,
        "reviewsTrack",
        renderLegacyHomepageReviewsSliderSsr(reviews),
        { "data-ssr-home-reviews": "1" }
      );
    }
  }
  const embedMatches = [...output.matchAll(/<(div|section)([^>]*\bdata-embed='([^']+)'[^>]*)>([\s\S]*?)<\/\1>/gi)];
  for (let embedIndex = 0; embedIndex < embedMatches.length; embedIndex += 1) {
    const match = embedMatches[embedIndex];
    const [fullMatch, tagName, rawAttrs, rawConfig] = match;
    let config;
    try {
      config = JSON.parse(rawConfig);
    } catch (_) {
      continue;
    }
    let replacement = null;
    if (config.type === "product") {
      const productResult = await queryProductsForComponentSsr(env, config);
      const rendered = renderProductCardsSsrMarkup({
        containerId: `embed-product-${embedIndex + 1}`,
        products: productResult.products,
        options: config,
        pagination: productResult.pagination
      });
      const renderedAttrs = Object.entries(rendered.attrs || {}).map(([key, value]) => ` ${key}="${escapeHtmlText(String(value))}"`).join("");
      replacement = `<${tagName}${rawAttrs}${renderedAttrs}>${rendered.innerHtml}</${tagName}>${rendered.afterHtml}`;
      needsProductStyles = true;
    } else if (config.type === "blog") {
      const blogResult = await queryBlogsForComponentSsr(env, config);
      const rendered = renderBlogCardsSsrMarkup({
        containerId: `embed-blog-${embedIndex + 1}`,
        blogs: blogResult.blogs,
        options: {
          ...config,
          showPagination: false,
          pagination: false
        },
        pagination: blogResult.pagination
      });
      const renderedAttrs = Object.entries(rendered.attrs || {}).map(([key, value]) => ` ${key}="${escapeHtmlText(String(value))}"`).join("");
      replacement = `<${tagName}${rawAttrs}${renderedAttrs}>${rendered.innerHtml}</${tagName}>${rendered.afterHtml}`;
      needsBlogStyles = true;
    } else if (config.type === "review") {
      const reviews = await queryReviewsForSsr(env, config);
      const rendered = renderReviewsWidgetSsrMarkup({
        containerId: `embed-review-${embedIndex + 1}`,
        reviews,
        options: config
      });
      const renderedAttrs = Object.entries(rendered.attrs || {}).map(([key, value]) => ` ${key}="${escapeHtmlText(String(value))}"`).join("");
      replacement = `<${tagName}${rawAttrs}${renderedAttrs}>${rendered.innerHtml}</${tagName}>${rendered.afterHtml}`;
      needsReviewsStyles = true;
    } else if (config.type === "forum") {
      const forumResult = await queryForumQuestionsForSsr(env, { limit: 6, page: 1 });
      replacement = `<${tagName}${rawAttrs}>${renderEmbeddedForumQuestionsSsr(forumResult.questions)}</${tagName}>`;
    }
    if (replacement) {
      output = output.replace(fullMatch, replacement);
    }
  }
  if (output.includes('id="questions-container"')) {
    const forumResult = await queryForumQuestionsForSsr(env, {
      limit: 20,
      page: url.searchParams.get("page") || 1
    });
    output = replaceSimpleContainerById(output, "questions-container", renderForumArchiveCardsSsr(forumResult.questions));
    output = replaceSimpleContainerById(output, "pagination", renderForumArchivePaginationSsr(forumResult.pagination));
    output = replaceSimpleTextByIdSsr(output, "total-count", forumResult.pagination.total || 0);
  }
  if (output.includes('id="forum-questions-container"')) {
    const forumResult = await queryForumQuestionsForSsr(env, {
      limit: 20,
      page: url.searchParams.get("page") || 1
    });
    output = replaceSimpleContainerById(output, "forum-questions-container", renderEmbeddedForumQuestionsSsr(forumResult.questions));
    output = replaceSimpleContainerById(output, "forum-pagination", renderEmbeddedForumPaginationSsr(forumResult.pagination));
  }
  if (needsProductStyles) {
    output = ensureStyleTag(output, PRODUCT_CARDS_STYLE_TAG, "product-cards-styles");
  }
  if (needsBlogStyles) {
    output = ensureStyleTag(output, BLOG_CARDS_STYLE_TAG, "blog-cards-styles");
  }
  if (needsReviewsStyles) {
    output = ensureStyleTag(output, REVIEWS_WIDGET_STYLE_TAG, "reviews-widget-styles");
  }
  return output;
}
__name(applyComponentSsrToHtml, "applyComponentSsrToHtml");
function generateBlogPostHTML(blog, previousBlogs = [], comments = []) {
  const date = blog.created_at ? new Date(blog.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }) : "";
  const prevBlogsHTML = previousBlogs.length > 0 ? `
    <div class="related-posts">
      <h3>Previous Posts</h3>
      <div class="related-grid">
        ${previousBlogs.map((p) => `
          <a href="/blog/${p.slug}" class="related-card">
            <div class="related-thumb">
              <img src="${p.thumbnail_url || "https://via.placeholder.com/300x169?text=No+Image"}" alt="${p.title}" loading="lazy">
            </div>
            <div class="related-content">
              <h4>${p.title}</h4>
              <p>${p.description ? p.description.length > 80 ? p.description.substring(0, 80) + "..." : p.description : ""}</p>
            </div>
          </a>
        `).join("")}
      </div>
    </div>
  ` : "";
  const commentsHTML = comments.map((c) => {
    const commentDate = c.created_at ? new Date(c.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }) : "";
    const safeName = (c.name || "Anonymous").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeComment = (c.comment || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    return `
      <div class="comment-item">
        <div class="comment-header">
          <div class="comment-avatar">${safeName.charAt(0).toUpperCase()}</div>
          <div class="comment-info">
            <div class="comment-name">${safeName}</div>
            <div class="comment-date">${commentDate}</div>
          </div>
        </div>
        <div class="comment-text">${safeComment}</div>
      </div>
    `;
  }).join("");
  const blogTitle = normalizeSeoText(blog.seo_title || blog.title || "Blog Post");
  const safeTitle = escapeHtmlText(blogTitle);
  const safeMetaTitle = escapeHtmlText(buildSiteAwareTitle(blogTitle, DEFAULT_SITE_TITLE));
  const safeDesc = escapeHtmlText(normalizeSeoText(blog.seo_description || blog.description || blog.content || blogTitle, 160));
  const safeKeywords = escapeHtmlText(normalizeSeoText(blog.seo_keywords || ""));
  const safeImage = escapeHtmlText(blog.thumbnail_url || "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeMetaTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="keywords" content="${safeKeywords}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="${safeImage ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; line-height: 1.6; }
    
    .blog-hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
    }
    .blog-hero-inner {
      max-width: 900px;
      margin: 0 auto;
      text-align: center;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: rgba(255,255,255,0.9);
      text-decoration: none;
      font-weight: 500;
      margin-bottom: 30px;
      transition: color 0.2s;
    }
    .back-link:hover { color: white; }
    .blog-hero h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 20px;
      line-height: 1.3;
    }
    .blog-meta {
      display: flex;
      justify-content: center;
      gap: 20px;
      opacity: 0.9;
      font-size: 1rem;
    }
    
    .blog-container {
      max-width: 900px;
      margin: -60px auto 0;
      padding: 0 20px 60px;
      position: relative;
      z-index: 10;
    }
    
    .blog-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    
    .blog-featured-image {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
    }
    
    .blog-body {
      padding: 40px;
    }
    
    .blog-content {
      font-size: 1.1rem;
      color: #374151;
      line-height: 1.8;
    }
    .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4 {
      color: #1f2937;
      margin: 30px 0 15px;
      line-height: 1.3;
    }
    .blog-content h1 { font-size: 2rem; }
    .blog-content h2 { font-size: 1.6rem; }
    .blog-content h3 { font-size: 1.3rem; }
    .blog-content p { margin: 15px 0; }
    .blog-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 20px 0;
    }
    .blog-content a { color: #667eea; }
    .blog-content ul, .blog-content ol {
      margin: 15px 0;
      padding-left: 25px;
    }
    .blog-content li { margin: 8px 0; }
    .blog-content blockquote {
      border-left: 4px solid #667eea;
      margin: 20px 0;
      padding: 15px 25px;
      background: #f9fafb;
      font-style: italic;
      color: #4b5563;
    }
    .blog-content pre {
      background: #1f2937;
      color: #e5e7eb;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9rem;
      margin: 20px 0;
    }
    .blog-content code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
    }
    .blog-content pre code {
      background: none;
      padding: 0;
    }
    
    /* Related Posts */
    .related-posts {
      margin-top: 50px;
      padding-top: 40px;
      border-top: 2px solid #e5e7eb;
    }
    .related-posts h3 {
      font-size: 1.5rem;
      color: #1f2937;
      margin-bottom: 25px;
      text-align: center;
    }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 25px;
    }
    .related-card {
      background: #f9fafb;
      border-radius: 12px;
      overflow: hidden;
      text-decoration: none;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    .related-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .related-thumb {
      aspect-ratio: 16/9;
      overflow: hidden;
    }
    .related-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
    .related-card:hover .related-thumb img {
      transform: scale(1.05);
    }
    .related-content {
      padding: 20px;
    }
    .related-content h4 {
      font-size: 1.1rem;
      color: #1f2937;
      margin: 0 0 10px;
      line-height: 1.4;
    }
    .related-content p {
      font-size: 0.9rem;
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
    }
    
    /* Comments Section */
    .comments-section {
      margin-top: 50px;
      padding-top: 40px;
      border-top: 2px solid #e5e7eb;
    }
    .comments-section h3 {
      font-size: 1.5rem;
      color: #1f2937;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .comment-count {
      background: #667eea;
      color: white;
      font-size: 0.9rem;
      padding: 4px 12px;
      border-radius: 20px;
    }
    
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 40px;
    }
    .comment-item {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .comment-avatar {
      width: 45px;
      height: 45px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1.2rem;
    }
    .comment-info { flex: 1; }
    .comment-name {
      font-weight: 600;
      color: #1f2937;
    }
    .comment-date {
      font-size: 0.85rem;
      color: #6b7280;
    }
    .comment-text {
      color: #374151;
      line-height: 1.6;
    }
    
    .no-comments {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 12px;
    }
    
    /* Comment Form */
    .comment-form-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 25px;
    }
    .comment-form-card h4 {
      font-size: 1.2rem;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group.full { grid-column: span 2; }
    .form-group label {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }
    .form-group input,
    .form-group textarea {
      padding: 12px 15px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    .form-group textarea {
      min-height: 120px;
      resize: vertical;
    }
    .submit-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
    }
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .form-message {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: none;
    }
    .form-message.success {
      background: #d1fae5;
      color: #065f46;
      display: block;
    }
    .form-message.error {
      background: #fee2e2;
      color: #991b1b;
      display: block;
    }
    .form-message.warning {
      background: #fef3c7;
      color: #92400e;
      display: block;
    }
    
    .pending-notice {
      background: #fef3c7;
      color: #92400e;
      padding: 15px 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    
    @media (max-width: 768px) {
      .blog-hero h1 { font-size: 1.8rem; }
      .blog-body { padding: 25px; }
      .blog-content { font-size: 1rem; }
      .related-grid { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
      .form-group.full { grid-column: span 1; }
    }
    
    ${blog.custom_css || ""}
  </style>
</head>
<body>
  <script src="/js/global-components.js"><\/script>
  <div class="blog-hero">
    <div class="blog-hero-inner">
      <a href="/blog/" class="back-link">&larr; Back to Blog</a>
      <h1>${safeTitle}</h1>
      ${date ? `<div class="blog-meta"><span>Date: ${date}</span></div>` : ""}
    </div>
  </div>
  
  <div class="blog-container">
    <article class="blog-card">
      ${blog.thumbnail_url ? `<img src="${blog.thumbnail_url}" alt="${safeTitle}" class="blog-featured-image">` : ""}
      <div class="blog-body">
        <div class="blog-content">
          ${blog.content || ""}
        </div>
        
        <!-- Comments Section -->
        <div class="comments-section">
          <h3>\u{1F4AC} Comments <span class="comment-count">${comments.length}</span></h3>
          
          ${comments.length > 0 ? `
            <div class="comments-list">
              ${commentsHTML}
            </div>
          ` : `
            <div class="no-comments">
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          `}
          
          <!-- Comment Form -->
          <div class="comment-form-card">
            <h4>Leave a Comment</h4>
            <div id="form-message" class="form-message"></div>
            <div id="pending-notice" class="pending-notice" style="display:none;">
              You have a comment awaiting approval. Please wait for it to be approved before posting another.
            </div>
            <form id="comment-form">
              <input type="hidden" id="blog-id" value="${blog.id}">
              <div class="form-row">
                <div class="form-group">
                  <label for="comment-name">Name * <small style="color:#6b7280;font-weight:normal">(max 50)</small></label>
                  <input type="text" id="comment-name" placeholder="Your name" required maxlength="50">
                </div>
                <div class="form-group">
                  <label for="comment-email">Email * <small style="color:#6b7280;font-weight:normal">(max 100)</small></label>
                  <input type="email" id="comment-email" placeholder="your@email.com" required maxlength="100">
                </div>
              </div>
              <div class="form-group full">
                <label for="comment-text">Comment * <small style="color:#6b7280;font-weight:normal">(3-2000 chars)</small></label>
                <textarea id="comment-text" placeholder="Write your comment here..." required minlength="3" maxlength="2000"></textarea>
                <div style="text-align:right;font-size:0.75rem;color:#6b7280;margin-top:2px"><span id="comment-count">0</span>/2000</div>
              </div>
              <button type="submit" class="submit-btn" id="submit-btn">Submit Comment</button>
            </form>
          </div>
        </div>
        
        ${prevBlogsHTML}
      </div>
    </article>
  </div>
  
  <script>
    const blogId = ${blog.id};
    const form = document.getElementById('comment-form');
    const formMessage = document.getElementById('form-message');
    const pendingNotice = document.getElementById('pending-notice');
    const submitBtn = document.getElementById('submit-btn');
    const emailInput = document.getElementById('comment-email');
    
    // Character counter for comment
    document.getElementById('comment-text').addEventListener('input', function() {
      document.getElementById('comment-count').textContent = this.value.length;
    });
    
    // Check for pending comment when email is entered
    let checkTimeout;
    emailInput.addEventListener('blur', async function() {
      const email = this.value.trim();
      if (!email) return;
      
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(async () => {
        try {
          const res = await fetch('/api/blog/comments/check-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blog_id: blogId, email: email })
          });
          const data = await res.json();
          
          if (data.hasPending) {
            pendingNotice.style.display = 'block';
            submitBtn.disabled = true;
          } else {
            pendingNotice.style.display = 'none';
            submitBtn.disabled = false;
          }
        } catch (err) {
          console.error('Check pending error:', err);
        }
      }, 500);
    });
    
    // Submit comment
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const name = document.getElementById('comment-name').value.trim();
      const email = document.getElementById('comment-email').value.trim();
      const comment = document.getElementById('comment-text').value.trim();
      
      if (!name || !email || !comment) {
        showMessage('Please fill in all fields.', 'error');
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      try {
        const res = await fetch('/api/blog/comments/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blog_id: blogId,
            name: name,
            email: email,
            comment: comment
          })
        });
        const data = await res.json();
        
        if (data.success) {
          showMessage(data.message || 'Comment submitted successfully! It will appear after admin approval.', 'success');
          form.reset();
          pendingNotice.style.display = 'block';
          submitBtn.disabled = true;
        } else {
          if (data.hasPending) {
            pendingNotice.style.display = 'block';
            submitBtn.disabled = true;
          }
          showMessage(data.error || 'Failed to submit comment.', 'error');
        }
      } catch (err) {
        console.error('Submit error:', err);
        showMessage('An error occurred. Please try again.', 'error');
      }
      
      submitBtn.textContent = 'Submit Comment';
    });
    
    function showMessage(msg, type) {
      formMessage.textContent = msg;
      formMessage.className = 'form-message ' + type;
      formMessage.style.display = 'block';
      
      if (type === 'success') {
        setTimeout(() => {
          formMessage.style.display = 'none';
        }, 5000);
      }
    }
  <\/script>
  ${blog.custom_js ? `<script>${blog.custom_js}<\/script>` : ""}
</body>
</html>`;
}
__name(generateBlogPostHTML, "generateBlogPostHTML");
function generateForumQuestionHTML(question, replies = [], sidebar = {}) {
  const date = question.created_at ? new Date(question.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }) : "";
  const questionTitle = normalizeSeoText(question.title || "Forum Question");
  const questionDescription = normalizeSeoText(question.content || question.title || "", 160) || questionTitle;
  const safeTitle = escapeHtmlText(questionTitle);
  const safeMetaTitle = escapeHtmlText(`${questionTitle} - Forum - ${DEFAULT_SITE_TITLE}`);
  const safeDescription = escapeHtmlText(questionDescription);
  const safeContent = escapeHtmlText(stripControlCharacters(question.content || "")).replace(/\n/g, "<br>");
  const repliesHTML = replies.map((r) => {
    const replyDate = r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }) : "";
    const safeName = (r.name || "Anonymous").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeReply = (r.content || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    return `
      <div class="reply-item">
        <div class="reply-header">
          <div class="reply-avatar">${safeName.charAt(0).toUpperCase()}</div>
          <div class="reply-info">
            <div class="reply-name">${safeName}</div>
            <div class="reply-date">${replyDate}</div>
          </div>
        </div>
        <div class="reply-content">${safeReply}</div>
      </div>
    `;
  }).join("");
  const productsHTML = (sidebar.products || []).map((p) => `
    <a href="/product-${p.id}/${p.slug || p.id}" class="sidebar-card">
      <img src="${p.thumbnail_url || "https://via.placeholder.com/150x84?text=Product"}" alt="${p.title}">
      <div class="sidebar-card-info">
        <div class="sidebar-card-title">${(p.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        <div class="sidebar-card-price">$${p.sale_price || p.normal_price || 0}</div>
      </div>
    </a>
  `).join("");
  const blogsHTML = (sidebar.blogs || []).map((b) => `
    <a href="/blog/${b.slug}" class="sidebar-card">
      <img src="${b.thumbnail_url || "https://via.placeholder.com/150x84?text=Blog"}" alt="${b.title}">
      <div class="sidebar-card-info">
        <div class="sidebar-card-title">${(b.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>
    </a>
  `).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeMetaTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; line-height: 1.6; }
    
    .forum-hero {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 40px 20px;
    }
    .forum-hero-inner {
      max-width: 1200px;
      margin: 0 auto;
      text-align: center;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: rgba(255,255,255,0.9);
      text-decoration: none;
      font-weight: 500;
      margin-bottom: 20px;
      transition: color 0.2s;
    }
    .back-link:hover { color: white; }
    .forum-hero h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 15px;
      line-height: 1.3;
    }
    .forum-meta {
      display: flex;
      justify-content: center;
      gap: 20px;
      opacity: 0.9;
      font-size: 0.95rem;
    }
    
    .forum-layout {
      max-width: 1200px;
      margin: -40px auto 0;
      padding: 0 20px 60px;
      display: grid;
      grid-template-columns: 200px 1fr 200px;
      gap: 30px;
      position: relative;
      z-index: 10;
    }
    
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .sidebar-section h4 {
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sidebar-card {
      display: block;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.3s;
      margin-bottom: 12px;
    }
    .sidebar-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
    .sidebar-card img {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
    }
    .sidebar-card-info {
      padding: 12px;
    }
    .sidebar-card-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sidebar-card-price {
      color: #10b981;
      font-weight: 700;
      margin-top: 5px;
    }
    
    .main-content {
      min-width: 0;
    }
    
    .question-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    
    .question-body {
      padding: 35px;
    }
    
    .question-author {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .author-avatar {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1.3rem;
    }
    .author-info { flex: 1; }
    .author-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 1.1rem;
    }
    .author-date {
      font-size: 0.9rem;
      color: #6b7280;
    }
    
    .question-content {
      font-size: 1.1rem;
      color: #374151;
      line-height: 1.8;
    }
    
    /* Replies Section */
    .replies-section {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    .replies-section h3 {
      font-size: 1.3rem;
      color: #1f2937;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .reply-count-badge {
      background: #10b981;
      color: white;
      font-size: 0.85rem;
      padding: 4px 12px;
      border-radius: 20px;
    }
    
    .replies-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 35px;
    }
    .reply-item {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid #10b981;
    }
    .reply-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .reply-avatar {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1rem;
    }
    .reply-info { flex: 1; }
    .reply-name {
      font-weight: 600;
      color: #1f2937;
    }
    .reply-date {
      font-size: 0.85rem;
      color: #6b7280;
    }
    .reply-content {
      color: #374151;
      line-height: 1.6;
    }
    
    .no-replies {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 12px;
    }
    
    /* Reply Form */
    .reply-form-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 25px;
    }
    .reply-form-card h4 {
      font-size: 1.1rem;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group.full { grid-column: span 2; }
    .form-group label {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }
    .form-group input,
    .form-group textarea {
      padding: 12px 15px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #10b981;
    }
    .form-group textarea {
      min-height: 120px;
      resize: vertical;
    }
    .submit-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(16, 185, 129, 0.4);
    }
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .form-message {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: none;
    }
    .form-message.success { background: #d1fae5; color: #065f46; display: block; }
    .form-message.error { background: #fee2e2; color: #991b1b; display: block; }
    
    .pending-notice {
      background: #fef3c7;
      color: #92400e;
      padding: 15px 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    
    @media (max-width: 1024px) {
      .forum-layout {
        grid-template-columns: 1fr;
      }
      .sidebar { display: none; }
    }
    
    @media (max-width: 768px) {
      .forum-hero h1 { font-size: 1.5rem; }
      .question-body { padding: 25px; }
      .form-row { grid-template-columns: 1fr; }
      .form-group.full { grid-column: span 1; }
    }
  </style>
</head>
<body>
  <script src="/js/global-components.js"><\/script>
  <div class="forum-hero">
    <div class="forum-hero-inner">
      <a href="/forum/" class="back-link">\u2190 Back to Forum</a>
      <h1>${safeTitle}</h1>
      <div class="forum-meta">
        <span>\u{1F464} ${(question.name || "Anonymous").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
        ${date ? `<span>\u{1F4C5} ${date}</span>` : ""}
        <span>\u{1F4AC} ${replies.length} ${replies.length === 1 ? "Reply" : "Replies"}</span>
      </div>
    </div>
  </div>
  
  <div class="forum-layout">
    <!-- Left Sidebar - Products -->
    <div class="sidebar">
      <div class="sidebar-section">
        <h4>\u{1F4E6} Products</h4>
        ${productsHTML || '<p style="color:#9ca3af;font-size:0.9rem;">No products</p>'}
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
      <div class="question-card">
        <div class="question-body">
          <div class="question-author">
            <div class="author-avatar">${(question.name || "A").charAt(0).toUpperCase()}</div>
            <div class="author-info">
              <div class="author-name">${(question.name || "Anonymous").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              <div class="author-date">${date}</div>
            </div>
          </div>
          
          <div class="question-content">${safeContent}</div>
          
          <!-- Replies Section -->
          <div class="replies-section">
            <h3>\u{1F4AC} Replies <span class="reply-count-badge">${replies.length}</span></h3>
            
            ${replies.length > 0 ? `
              <div class="replies-list">${repliesHTML}</div>
            ` : `
              <div class="no-replies">
                <p>No replies yet. Be the first to help!</p>
              </div>
            `}
            
            <!-- Reply Form -->
            <div class="reply-form-card">
              <h4>Post a Reply</h4>
              <div id="form-message" class="form-message"></div>
              <div id="pending-notice" class="pending-notice" style="display:none;">
                \u23F3 You have a pending question or reply awaiting approval. Please wait for it to be approved.
              </div>
              <form id="reply-form">
                <input type="hidden" id="question-id" value="${question.id}">
                <div class="form-row">
                  <div class="form-group">
                    <label for="reply-name">Name *</label>
                    <input type="text" id="reply-name" placeholder="Your name" required>
                  </div>
                  <div class="form-group">
                    <label for="reply-email">Email *</label>
                    <input type="email" id="reply-email" placeholder="your@email.com" required>
                  </div>
                </div>
                <div class="form-group full">
                  <label for="reply-content">Your Reply *</label>
                  <textarea id="reply-content" placeholder="Write your helpful reply..." required></textarea>
                </div>
                <button type="submit" class="submit-btn" id="submit-btn">Submit Reply</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Right Sidebar - Blogs -->
    <div class="sidebar">
      <div class="sidebar-section">
        <h4>\u{1F4DD} Blog Posts</h4>
        ${blogsHTML || '<p style="color:#9ca3af;font-size:0.9rem;">No posts</p>'}
      </div>
    </div>
  </div>
  
  <script>
    const questionId = ${question.id};
    const form = document.getElementById('reply-form');
    const formMessage = document.getElementById('form-message');
    const pendingNotice = document.getElementById('pending-notice');
    const submitBtn = document.getElementById('submit-btn');
    const emailInput = document.getElementById('reply-email');
    
    // Check for pending when email entered
    let checkTimeout;
    emailInput.addEventListener('blur', async function() {
      const email = this.value.trim();
      if (!email) return;
      
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(async () => {
        try {
          const res = await fetch('/api/forum/check-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
          });
          const data = await res.json();
          
          if (data.hasPending) {
            pendingNotice.style.display = 'block';
            submitBtn.disabled = true;
          } else {
            pendingNotice.style.display = 'none';
            submitBtn.disabled = false;
          }
        } catch (err) {
          console.error('Check pending error:', err);
        }
      }, 500);
    });
    
    // Submit reply
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const name = document.getElementById('reply-name').value.trim();
      const email = document.getElementById('reply-email').value.trim();
      const content = document.getElementById('reply-content').value.trim();
      
      if (!name || !email || !content) {
        showMessage('Please fill in all fields.', 'error');
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      try {
        const res = await fetch('/api/forum/submit-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_id: questionId,
            name: name,
            email: email,
            content: content
          })
        });
        const data = await res.json();
        
        if (data.success) {
          showMessage(data.message || 'Reply submitted! It will appear after admin approval.', 'success');
          form.reset();
          pendingNotice.style.display = 'block';
          submitBtn.disabled = true;
        } else {
          if (data.hasPending) {
            pendingNotice.style.display = 'block';
            submitBtn.disabled = true;
          }
          showMessage(data.error || 'Failed to submit reply.', 'error');
        }
      } catch (err) {
        console.error('Submit error:', err);
        showMessage('An error occurred. Please try again.', 'error');
      }
      
      submitBtn.textContent = 'Submit Reply';
    });
    
    function showMessage(msg, type) {
      formMessage.textContent = msg;
      formMessage.className = 'form-message ' + type;
      formMessage.style.display = 'block';
      
      if (type === 'success') {
        setTimeout(() => { formMessage.style.display = 'none'; }, 5000);
      }
    }
  <\/script>
</body>
</html>`;
}
__name(generateForumQuestionHTML, "generateForumQuestionHTML");
var index_default = {
  async fetch(req, env, ctx2) {
    const url = new URL(req.url);
    const path = url.pathname;
    const isCacheableHtmlGet = req.method === "GET" && !path.startsWith("/admin") && !path.startsWith("/api") && !path.startsWith("/download") && (path === "/" || path.startsWith("/blog") || path.startsWith("/forum") || path.startsWith("/product") || path.startsWith("/page") || !path.includes("."));
    let cacheKey = null;
    if (isCacheableHtmlGet && env.PAGE_CACHE) {
      cacheKey = `page_html:${path}${url.search}`;
      try {
        const cachedHtml = await env.PAGE_CACHE.get(cacheKey);
        if (cachedHtml) {
          return new Response(cachedHtml, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=120",
              "X-KV-Cache": "Hit",
              "X-Worker-Version": env.VERSION || "27"
            }
          });
        }
      } catch (err) {
        console.error("KV Cache read error:", err);
      }
    }
    const response = await this.fetchOriginal(req, env, ctx2);
    if (isCacheableHtmlGet && response && response.status === 200) {
      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("text/html")) {
        if (!env.PAGE_CACHE) {
          const newHeaders = new Headers(response.headers);
          newHeaders.set("X-KV-Debug", "NO_ENV_PAGE_CACHE");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        }
        try {
          const html = await response.clone().text();
          ctx2.waitUntil(env.PAGE_CACHE.put(cacheKey, html));
          const newHeaders = new Headers(response.headers);
          newHeaders.set("X-KV-Cache", "Miss");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        } catch (err) {
          console.error("KV Cache write error:", err);
          const newHeaders = new Headers(response.headers);
          newHeaders.set("X-KV-Debug", "WRITE_ERROR: " + err.message);
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        }
      }
    }
    return response;
  },
  async fetchOriginal(req, env, ctx2) {
    setVersion(env.VERSION);
    const url = new URL(req.url);
    const method = req.method;
    if ((method === "GET" || method === "HEAD") && !isLocalHostname(url.hostname)) {
      const canonicalHostname = getCanonicalHostname(url, env);
      const needsHttpsRedirect = isInsecureRequest(url, req);
      const needsHostRedirect = canonicalHostname && url.hostname.toLowerCase() !== canonicalHostname;
      const collapsedPathname = (url.pathname || "/").replace(/\/+/g, "/");
      const canonicalPathForPrimaryRedirect = getCanonicalRedirectPath2(collapsedPathname);
      if (needsHttpsRedirect || needsHostRedirect) {
        const target = new URL(req.url);
        target.protocol = "https:";
        if (needsHostRedirect) target.hostname = canonicalHostname;
        if (canonicalPathForPrimaryRedirect) target.pathname = canonicalPathForPrimaryRedirect;
        if (target.port === "80" || target.port === "443") target.port = "";
        return new Response(null, {
          status: 301,
          headers: {
            "Location": target.toString(),
            "Cache-Control": "public, max-age=3600",
            // Ensure duplicate host/protocol URLs are explicitly deindexed.
            "X-Robots-Tag": "noindex, nofollow",
            "Link": `<${target.toString()}>; rel="canonical"`
          }
        });
      }
    }
    let path = url.pathname.replace(/\/+/g, "/");
    if (!path.startsWith("/")) {
      path = "/" + path;
    }
    if (method !== "GET" && method !== "HEAD" && shouldServeCanonicalAliasDirectly(path)) {
      const directPath = normalizeCanonicalPath2(path);
      if (directPath && directPath !== path) {
        path = directPath;
        url.pathname = directPath;
      }
    }
    if ((method === "GET" || method === "HEAD" || method === "POST") && isLikelyScannerPath(path)) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=300",
          "X-Worker-Version": VERSION
        }
      });
    }
    if (method !== "OPTIONS" && path.startsWith("/api/") && !isKnownApiPath(path)) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: {
          ...CORS,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Worker-Version": VERSION
        }
      });
    }
    if ((method === "GET" || method === "HEAD") && (isMalformedNestedSlug(path, "/blog/") || isMalformedNestedSlug(path, "/forum/"))) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=300",
          "X-Worker-Version": VERSION
        }
      });
    }
    if (env.DB) {
      if (ctx2 && ctx2.waitUntil) {
        ctx2.waitUntil(initDB(env, ctx2).catch((e) => console.warn("DB init error in background:", e)));
      }
    }
    const isAdminUI = path === "/admin" || path === "/admin/" || path.startsWith("/admin/");
    const isAdminAPI = path.startsWith("/api/admin/");
    const isLoginRoute = path === "/admin/login" || path === "/admin/login/";
    const isLogoutRoute = path === "/admin/logout" || path === "/admin/logout/";
    const noJsSsrEnabled = isNoJsSsrEnabled(env);
    const isAdminProtectedPage = path === "/order-detail" || path === "/order-detail/" || path === "/order-detail.html" || path === "/page-builder" || path === "/page-builder/" || path === "/page-builder.html" || path === "/landing-builder" || path === "/landing-builder/" || path === "/landing-builder.html";
    async function requireAdmin2() {
      const ok = await isAdminAuthed(req, env);
      if (ok) return null;
      if (isAdminAPI) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...CORS, "Content-Type": "application/json" }
        });
      }
      return Response.redirect(new URL("/admin/login", req.url).toString(), 302);
    }
    __name(requireAdmin2, "requireAdmin");
    if (isLoginRoute && method === "GET") {
      if (await isAdminAuthed(req, env)) {
        return Response.redirect(new URL("/admin", req.url).toString(), 302);
      }
      if (noJsSsrEnabled) {
        return renderNoJsAdminLoginPage(url);
      }
      if (env.ASSETS) {
        const loginAssetReq = new Request(new URL("/admin/login.html", req.url).toString(), { method: "GET" });
        const loginAssetResp = await env.ASSETS.fetch(loginAssetReq);
        if (loginAssetResp.status === 200) {
          const html = await loginAssetResp.text();
          const headers = new Headers(loginAssetResp.headers);
          headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
          headers.set("Pragma", "no-cache");
          headers.set("X-Worker-Version", VERSION);
          applySecurityHeadersToHeaders(headers, req);
          return new Response(html, { status: 200, headers });
        }
      }
      return new Response("Admin login page not found.", {
        status: 404,
        headers: noStoreHeaders({ "Content-Type": "text/plain; charset=utf-8" })
      });
    }
    if (isLoginRoute && method === "POST") {
      let email = "";
      let password = "";
      try {
        const form = await req.formData();
        email = (form.get("email") || "").toString().trim();
        password = (form.get("password") || "").toString();
      } catch (_) {
        try {
          const raw = await req.text();
          const params = new URLSearchParams(raw || "");
          email = (params.get("email") || "").toString().trim();
          password = (params.get("password") || "").toString();
        } catch (_2) {
          email = "";
          password = "";
        }
      }
      if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
        return new Response("Admin login is not configured (missing secrets).", { status: 500, headers: noStoreHeaders() });
      }
      if (email === (env.ADMIN_EMAIL || "") && password === (env.ADMIN_PASSWORD || "")) {
        const cookieVal = await createAdminSessionCookie(env);
        return new Response(null, {
          status: 302,
          headers: noStoreHeaders({
            "Set-Cookie": cookieVal,
            "Location": new URL("/admin", req.url).toString()
          })
        });
      }
      return new Response("Invalid login", {
        status: 302,
        headers: noStoreHeaders({
          "Set-Cookie": createLogoutCookie(),
          "Location": new URL(noJsSsrEnabled ? "/admin/login?err=Invalid%20login" : "/admin/login?e=1", req.url).toString()
        })
      });
    }
    if (isLogoutRoute) {
      return new Response(null, {
        status: 302,
        headers: noStoreHeaders({
          "Set-Cookie": createLogoutCookie(),
          "Location": new URL("/admin/login", req.url).toString()
        })
      });
    }
    if ((isAdminUI || isAdminAPI || isAdminProtectedPage) && !isLoginRoute) {
      const gate = await requireAdmin2();
      if (gate) return gate;
    }
    if (method === "GET" || method === "HEAD") {
      const canonicalRedirectPath = getCanonicalRedirectPath2(path);
      if (canonicalRedirectPath) {
        const to = new URL(req.url);
        to.pathname = canonicalRedirectPath;
        return new Response(null, {
          status: 301,
          headers: {
            "Location": to.toString(),
            "Cache-Control": "public, max-age=3600",
            // Old aliases (/home, *.html, etc.) should not be indexed.
            "X-Robots-Tag": "noindex, nofollow",
            "Link": `<${to.toString()}>; rel="canonical"`
          }
        });
      }
    }
    if (noJsSsrEnabled) {
      const noJsResponse = await handleNoJsRoutes(req, env, url, path, method);
      if (noJsResponse) return finalizeResponse(noJsResponse, req);
    }
    const shouldPurgeCache = (path.startsWith("/admin") || path.startsWith("/api/admin/") || path.startsWith("/api/whop/webhook")) && !path.startsWith("/admin/login") && !path.startsWith("/admin/logout");
    if (shouldPurgeCache) {
      await maybePurgeCache(env, initDB);
    }
    if (method === "OPTIONS") {
      return handleOptions(req);
    }
    const staticExtensions = /\.(css|js|ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|mp4|webm|mp3|pdf)$/i;
    if ((method === "GET" || method === "HEAD") && staticExtensions.test(path) && env.ASSETS) {
      const staticHeaders = new Headers(req.headers);
      staticHeaders.delete("If-None-Match");
      staticHeaders.delete("If-Modified-Since");
      const assetResp = await env.ASSETS.fetch(new Request(req.url, {
        method: req.method,
        headers: staticHeaders,
        redirect: "manual"
      }));
      if (assetResp.status === 200) {
        const headers = new Headers(assetResp.headers);
        headers.set("Alt-Svc", "clear");
        const isAdminAsset = path.startsWith("/js/admin/") || path.startsWith("/css/admin/");
        if (isAdminAsset) {
          headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
        } else if (!headers.has("Cache-Control")) {
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
        }
        if (path === "/favicon.ico") {
          headers.set("X-Robots-Tag", "noindex, nofollow");
        }
        applySecurityHeadersToHeaders(headers, req);
        headers.set("X-Worker-Version", VERSION);
        headers.set("Alt-Svc", "clear");
        return new Response(assetResp.body, { status: 200, headers });
      }
    }
    if (path === "/api/health" || path === "/_health") {
      const startTime = Date.now();
      let dbStatus = "not_configured";
      if (env.DB) {
        try {
          await initDB(env);
          await env.DB.prepare("SELECT 1 as health").first();
          dbStatus = "healthy";
        } catch (e) {
          dbStatus = "error: " + e.message;
        }
      }
      return finalizeResponse(new Response(JSON.stringify({
        status: "ok",
        version: VERSION,
        db: dbStatus,
        responseTime: Date.now() - startTime + "ms",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      }), req);
    }
    if (method === "GET" || method === "HEAD") {
      if (path === "/.well-known/apple-developer-merchantid-domain-association") {
        if (env.ASSETS) {
          let assetResp = await env.ASSETS.fetch(new Request(new URL("/.well-known/apple-developer-merchantid-domain-association", req.url)));
          if (assetResp.status !== 200) {
            assetResp = await env.ASSETS.fetch(new Request(new URL("/apple-developer-merchantid-domain-association", req.url)));
          }
          if (assetResp.status === 200) {
            const txt = await assetResp.text();
            return new Response(txt.trim(), {
              status: 200,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "public, max-age=300"
              }
            });
          }
        }
        return new Response("Not found", { status: 404 });
      }
      if (path === "/robots.txt") {
        if (env.DB) await initDB(env);
        const txt = await buildMinimalRobotsTxt(env, req);
        return new Response(txt, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300"
          }
        });
      }
      if (path === "/sitemap.xml") {
        if (env.DB) await initDB(env);
        const sm = await buildMinimalSitemapXml(env, req);
        return new Response(sm.body, {
          status: 200,
          headers: {
            "Content-Type": (sm.contentType || "application/xml") + "; charset=utf-8",
            "Cache-Control": "public, max-age=300"
          }
        });
      }
      if (path === "/manifest.json" || path === "/site.webmanifest") {
        return new Response(JSON.stringify({
          name: "Site",
          short_name: "Site",
          start_url: "/",
          display: "browser",
          icons: [
            { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
            { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }
          ]
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/manifest+json",
            "Cache-Control": "public, max-age=86400"
          }
        });
      }
      if (path === "/apple-touch-icon.png" || path === "/apple-touch-icon-precomposed.png" || path === "/apple-touch-icon-120x120.png" || path === "/apple-touch-icon-152x152.png" || path === "/apple-touch-icon-180x180.png") {
        return new Response(null, {
          status: 301,
          headers: { "Location": "/favicon.ico", "Cache-Control": "public, max-age=86400" }
        });
      }
      if (path === "/browserconfig.xml") {
        return new Response('<?xml version="1.0" encoding="utf-8"?><browserconfig><msapplication><tile><square150x150logo src="/favicon.ico"/><TileColor>#ffffff</TileColor></tile></msapplication></browserconfig>', {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=86400"
          }
        });
      }
    }
    try {
      if ((method === "GET" || method === "HEAD") && (path === "/_product_template.tpl" || path === "/_product_template" || path === "/_product_template.html")) {
        return new Response("Not found", { status: 404 });
      }
      if ((method === "GET" || method === "HEAD") && (path === "/product" || path.startsWith("/product/") || path.startsWith("/product-"))) {
        const isValidFormat = path === "/product" || path === "/product/" || /^\/product\/[^/]+$/.test(path) || /^\/product-\d+(\/.*)?$/.test(path);
        if (!isValidFormat) {
          return new Response("Not found", { status: 404 });
        }
        if (env.DB) {
          await initDB(env);
          const redirect = await handleProductRouting(env, url, path);
          if (redirect) return redirect;
        }
      }
      if ((method === "GET" || method === "HEAD") && path.startsWith("/blog/") && path !== "/blog/" && !path.includes(".")) {
        const slug = path.replace("/blog/", "").replace(/\/$/, "");
        if (method === "GET" && caches && caches.default) {
          try {
            const cacheKey = buildVersionedCacheKey(req);
            const cachedResp = await caches.default.match(cacheKey);
            if (cachedResp) {
              return cachedResp;
            }
          } catch (err) {
            console.warn("Blog cache match error:", err);
          }
        }
        if (slug && env.DB) {
          try {
            await initDB(env);
            let blog = null, previousBlogs = [], comments = [], seo = null;
            const cacheKey = `api_cache:ssr:blog:${slug}`;
            try {
              const cached = await env.PAGE_CACHE.get(cacheKey, "json");
              if (cached) {
                blog = cached.blog;
                previousBlogs = cached.previousBlogs;
                comments = cached.comments;
              }
            } catch (e) {
            }
            seo = await getSeoForRequest(env, req, { path });
            if (!blog) {
              blog = await env.DB.prepare(`
                SELECT * FROM blogs WHERE slug = ? AND status = 'published'
              `).bind(slug).first();
              if (blog) {
                const [prevResult, commentsResult] = await Promise.all([
                  env.DB.prepare(`
                    SELECT id, title, slug, description, thumbnail_url, created_at
                    FROM blogs 
                    WHERE status = 'published' AND id < ?
                    ORDER BY id DESC
                    LIMIT 2
                  `).bind(blog.id).all(),
                  env.DB.prepare(`
                    SELECT id, name, comment, created_at
                    FROM blog_comments 
                    WHERE blog_id = ? AND status = 'approved'
                    ORDER BY created_at DESC
                  `).bind(blog.id).all()
                ]);
                previousBlogs = prevResult.results || [];
                comments = commentsResult.results || [];
                try {
                  await env.PAGE_CACHE.put(cacheKey, JSON.stringify({ blog, previousBlogs, comments }), { expirationTtl: 86400 * 7 });
                } catch (e) {
                }
              }
            }
            if (blog) {
              const blogTitle = normalizeSeoText(blog.seo_title || blog.title || "Blog Post");
              const blogDescription = normalizeSeoText(blog.seo_description || blog.description || blog.content || blogTitle, 160);
              const htmlRaw = generateBlogPostHTML(blog, previousBlogs, comments);
              let html = applySeoToHtml(htmlRaw, seo.robots, seo.canonical, {
                ...seo,
                siteDescription: blogDescription,
                ogImage: blog.thumbnail_url || seo.ogImage || ""
              });
              html = applySiteTitleToHtml(html, seo.siteTitle);
              html = upsertTitleTag(html, buildSiteAwareTitle(blogTitle, seo.siteTitle));
              {
                const blogMetas = [
                  { type: "name", name: "description", content: blogDescription, alwaysReplace: true },
                  { type: "property", name: "og:title", content: blogTitle, alwaysReplace: true },
                  { type: "property", name: "og:description", content: blogDescription, alwaysReplace: true },
                  { type: "property", name: "og:url", content: seo.canonical, alwaysReplace: true },
                  { type: "property", name: "og:type", content: "article", alwaysReplace: true },
                  { type: "name", name: "twitter:card", content: blog.thumbnail_url ? "summary_large_image" : "summary", alwaysReplace: true },
                  { type: "name", name: "twitter:title", content: blogTitle, alwaysReplace: true },
                  { type: "name", name: "twitter:description", content: blogDescription, alwaysReplace: true }
                ];
                if (blog.thumbnail_url) {
                  blogMetas.push({ type: "property", name: "og:image", content: blog.thumbnail_url, alwaysReplace: true });
                  blogMetas.push({ type: "name", name: "twitter:image", content: blog.thumbnail_url, alwaysReplace: true });
                }
                html = upsertMetaTagsBatch(html, blogMetas);
              }
              try {
                const blogSchemaJson = generateBlogPostingSchema(blog, url.origin);
                html = appendJsonLdToHead(html, blogSchemaJson, "blogposting-schema");
              } catch (_) {
              }
              try {
                const breadcrumbJson = generateBreadcrumbSchema([
                  { name: "Home", url: url.origin },
                  { name: "Blog", url: `${url.origin}/blog` },
                  { name: blog.title || "", url: seo.canonical }
                ]);
                html = appendJsonLdToHead(html, breadcrumbJson, "blog-breadcrumb-schema");
              } catch (_) {
              }
              try {
                html = await injectAnalyticsAndMeta(env, html);
              } catch (e) {
              }
              html = await applyGlobalComponentsSsr(env, html, path);
              const resp = new Response(html, {
                status: 200,
                headers: {
                  "Content-Type": "text/html; charset=utf-8",
                  "X-Worker-Version": VERSION,
                  "X-Robots-Tag": seo.robots,
                  // Set a short max-age to hint caches while ensuring updates propagate
                  "Cache-Control": "public, max-age=120"
                }
              });
              if (method === "GET" && caches && caches.default) {
                try {
                  const cacheKey2 = buildVersionedCacheKey(req);
                  await caches.default.put(cacheKey2, resp.clone());
                } catch (err) {
                  console.warn("Blog cache put error:", err);
                }
              }
              return finalizeResponse(resp, req);
            }
          } catch (e) {
            console.error("Blog fetch error:", e);
          }
        }
      }
      if ((method === "GET" || method === "HEAD") && (path === "/forum/question.html" || path === "/forum/question")) {
        const questionId = parseInt(url.searchParams.get("id") || "", 10);
        if (Number.isFinite(questionId) && env.DB) {
          try {
            await initDB(env);
            const question = await env.DB.prepare(`
              SELECT slug
              FROM forum_questions
              WHERE id = ? AND status = 'approved'
            `).bind(questionId).first();
            if (question?.slug) {
              const legacyPath = `/forum/${encodeURIComponent(String(question.slug))}`;
              path = legacyPath;
              url.pathname = legacyPath;
              url.search = "";
            } else {
              path = "/forum/";
              url.pathname = "/forum/";
              url.search = "";
            }
          } catch (err) {
            console.warn("Legacy forum question redirect failed:", err);
            path = "/forum/";
            url.pathname = "/forum/";
            url.search = "";
          }
        } else {
          path = "/forum/";
          url.pathname = "/forum/";
          url.search = "";
        }
      }
      if ((method === "GET" || method === "HEAD") && path.startsWith("/forum/") && path !== "/forum/" && !path.includes(".")) {
        const slug = (() => {
          const raw = path.replace("/forum/", "").replace(/\/$/, "");
          try {
            return decodeURIComponent(raw);
          } catch (_) {
            return raw;
          }
        })();
        if (method === "GET" && caches && caches.default) {
          try {
            const cacheKey = buildVersionedCacheKey(req);
            const cachedResp = await caches.default.match(cacheKey);
            if (cachedResp) {
              return cachedResp;
            }
          } catch (err) {
            console.warn("Forum cache match error:", err);
          }
        }
        if (slug && env.DB) {
          try {
            await initDB(env);
            let question = await env.DB.prepare(`
              SELECT * FROM forum_questions WHERE slug = ? AND status = 'approved'
            `).bind(slug).first();
            const numericQuestionId = Number.parseInt(slug, 10);
            const numericPathMatch = Number.isFinite(numericQuestionId) && String(numericQuestionId) === slug;
            if (!question && numericPathMatch) {
              question = await env.DB.prepare(`
                SELECT * FROM forum_questions WHERE id = ? AND status = 'approved'
              `).bind(numericQuestionId).first();
              if (question?.slug) {
                return finalizeResponse(
                  Response.redirect(new URL(buildForumQuestionHref(question), req.url).toString(), 301),
                  req
                );
              }
            }
            if (question) {
              const forumSeoPath = question?.slug ? `/forum/${encodeURIComponent(String(question.slug).trim())}` : path;
              let replies = [], sidebar = { products: [], blogs: [] };
              const cacheKey = `api_cache:ssr:forum_detail:${question.id}`;
              try {
                const cached = await env.PAGE_CACHE.get(cacheKey, "json");
                if (cached) {
                  replies = cached.replies;
                  sidebar = cached.sidebar;
                }
              } catch (e) {
              }
              let seo = await getSeoForRequest(env, req, { path: forumSeoPath });
              if (replies.length === 0 && sidebar.products.length === 0 && sidebar.blogs.length === 0) {
                const [repliesResult, productsResult, blogsResult] = await Promise.all([
                  env.DB.prepare(`
                    SELECT id, name, content, created_at
                    FROM forum_replies 
                    WHERE question_id = ? AND status = 'approved'
                    ORDER BY created_at ASC
                  `).bind(question.id).all(),
                  env.DB.prepare(`
                    SELECT id, title, slug, thumbnail_url, sale_price, normal_price
                    FROM products 
                    WHERE ${buildPublicProductStatusWhere("status")}
                    ORDER BY id DESC
                    LIMIT 2 OFFSET ?
                  `).bind(Math.max(0, question.id - 1)).all(),
                  env.DB.prepare(`
                    SELECT id, title, slug, thumbnail_url, description
                    FROM blogs 
                    WHERE status = 'published'
                    ORDER BY id DESC
                    LIMIT 2 OFFSET ?
                  `).bind(Math.max(0, question.id - 1)).all()
                ]);
                replies = repliesResult.results || [];
                sidebar = {
                  products: productsResult.results || [],
                  blogs: blogsResult.results || []
                };
                try {
                  await env.PAGE_CACHE.put(cacheKey, JSON.stringify({ replies, sidebar }), { expirationTtl: 86400 * 7 });
                } catch (e) {
                }
              }
              const forumTitle = normalizeSeoText(question.title || "Forum Question");
              const forumDescription = normalizeSeoText(question.content || question.title || "", 160) || forumTitle;
              const htmlRaw = generateForumQuestionHTML(question, replies, sidebar);
              let html = applySeoToHtml(htmlRaw, seo.robots, seo.canonical, {
                ...seo,
                siteDescription: forumDescription
              });
              html = applySiteTitleToHtml(html, seo.siteTitle);
              html = upsertTitleTag(html, buildSiteAwareTitle(`${forumTitle} - Forum`, seo.siteTitle));
              html = upsertMetaTagsBatch(html, [
                { type: "name", name: "description", content: forumDescription, alwaysReplace: true },
                { type: "property", name: "og:title", content: forumTitle, alwaysReplace: true },
                { type: "property", name: "og:description", content: forumDescription, alwaysReplace: true },
                { type: "property", name: "og:url", content: seo.canonical, alwaysReplace: true },
                { type: "property", name: "og:type", content: "article", alwaysReplace: true },
                { type: "name", name: "twitter:card", content: "summary", alwaysReplace: true },
                { type: "name", name: "twitter:title", content: forumTitle, alwaysReplace: true },
                { type: "name", name: "twitter:description", content: forumDescription, alwaysReplace: true }
              ]);
              try {
                const qaSchemaJson = generateQAPageSchema(question, replies, url.origin);
                html = appendJsonLdToHead(html, qaSchemaJson, "forum-qa-schema");
              } catch (_) {
              }
              try {
                const breadcrumbJson = generateBreadcrumbSchema([
                  { name: "Home", url: url.origin },
                  { name: "Forum", url: `${url.origin}/forum` },
                  { name: question.title || "", url: seo.canonical }
                ]);
                html = appendJsonLdToHead(html, breadcrumbJson, "forum-breadcrumb-schema");
              } catch (_) {
              }
              try {
                html = await injectAnalyticsAndMeta(env, html);
              } catch (e) {
              }
              html = await applyGlobalComponentsSsr(env, html, path);
              const resp = new Response(html, {
                status: 200,
                headers: {
                  "Content-Type": "text/html; charset=utf-8",
                  "X-Worker-Version": VERSION,
                  "X-Robots-Tag": seo.robots,
                  "Cache-Control": "public, max-age=120"
                }
              });
              if (method === "GET" && caches && caches.default) {
                try {
                  const cacheKey2 = buildVersionedCacheKey(req);
                  await caches.default.put(cacheKey2, resp.clone());
                } catch (err) {
                  console.warn("Forum cache put error:", err);
                }
              }
              return finalizeResponse(resp, req);
            }
          } catch (e) {
            console.error("Forum question fetch error:", e);
          }
        }
      }
      if (path.startsWith("/api/") || path === "/submit-order") {
        const apiResponse = await routeApiRequest(req, env, url, path, method);
        if (apiResponse) {
          if (apiResponse.status >= 200 && apiResponse.status < 300 && method !== "GET" && method !== "HEAD") {
            if (path.startsWith("/api/admin/") || path === "/submit-order" || path.startsWith("/api/products/status")) {
              ctx2.waitUntil(purgeKVCache(env).catch((e) => console.error("Auto KV purge error:", e)));
            }
          }
          return finalizeResponse(apiResponse, req);
        }
      }
      if (path.startsWith("/download/")) {
        const orderId = path.split("/").pop();
        const downloadResponse = await handleSecureDownload(env, orderId, url.origin);
        return finalizeResponse(downloadResponse, req);
      }
      if ((path === "/admin" || path.startsWith("/admin/")) && !path.startsWith("/api/")) {
        const standaloneAdminPages = /* @__PURE__ */ new Map([
          ["/admin/product-form.html", "/admin/product-form.html"],
          ["/admin/blog-form.html", "/admin/blog-form.html"],
          // Source file currently lives at project root for legacy compatibility.
          ["/admin/page-builder.html", "/page-builder.html"],
          ["/admin/landing-builder.html", "/admin/landing-builder.html"],
          ["/admin/migrate-reviews.html", "/admin/migrate-reviews.html"]
        ]);
        if (standaloneAdminPages.has(path)) {
          if (env.ASSETS) {
            const assetPath = standaloneAdminPages.get(path);
            const assetResp = await env.ASSETS.fetch(new Request(new URL(assetPath, req.url)));
            const headers = new Headers(assetResp.headers);
            headers.set("Alt-Svc", "clear");
            headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
            headers.set("Pragma", "no-cache");
            headers.set("X-Worker-Version", VERSION);
            headers.set("Alt-Svc", "clear");
            return new Response(assetResp.body, { status: assetResp.status, headers });
          }
        } else {
          if (env.ASSETS) {
            const assetResp = await env.ASSETS.fetch(new Request(new URL("/admin/dashboard.html", req.url)));
            const headers = new Headers(assetResp.headers);
            headers.set("Alt-Svc", "clear");
            headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
            headers.set("Pragma", "no-cache");
            headers.set("X-Worker-Version", VERSION);
            headers.set("Alt-Svc", "clear");
            return new Response(assetResp.body, { status: assetResp.status, headers });
          }
        }
      }
      const coreStaticPages = ["index", "products", "products-grid", "product", "buyer-order", "order-detail", "order-success", "success", "checkout", "page-builder"];
      if (path.endsWith(".html") && !path.includes("/admin/") && !path.startsWith("/admin") && !path.startsWith("/blog/") && !path.startsWith("/forum/")) {
        const slug = path.slice(1).replace(/\.html$/, "");
        if (!coreStaticPages.includes(slug) && canLookupDynamicSlug(slug)) {
          try {
            if (env.DB) {
              await initDB(env);
              const row = await env.DB.prepare("SELECT * FROM pages WHERE slug = ? AND status = ?").bind(slug, "published").first();
              if (row && row.content) {
                let html = await applyComponentSsrToHtml(env, row.content, url, path);
                html = await applyGlobalComponentsSsr(env, html, path);
                let seoSettings = {};
                try {
                  const seo = await getSeoForRequest(env, req, { path: "/" + slug });
                  html = applySeoToHtml(html, seo.robots, seo.canonical, seo);
                  html = applySiteTitleToHtml(html, seo.siteTitle);
                  seoSettings = { site_title: seo.siteTitle, site_url: seo.canonical ? seo.canonical.replace("/" + slug, "") : "" };
                } catch (e) {
                }
                try {
                  const baseUrl = seoSettings.site_url || url.origin;
                  html = enhanceCustomPageHtml(html, row, baseUrl, seoSettings);
                } catch (_) {
                }
                try {
                  html = await injectAnalyticsAndMeta(env, html);
                } catch (_) {
                }
                return new Response(html, {
                  status: 200,
                  headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "X-Worker-Version": VERSION,
                    "Cache-Control": "public, max-age=120"
                  }
                });
              }
            }
          } catch (e) {
          }
        }
      }
      if (!path.includes(".") && !path.includes("/admin") && !path.startsWith("/api/") && path !== "/" && !path.startsWith("/blog/") && !path.startsWith("/forum/") && !path.startsWith("/product-") && !path.startsWith("/download/")) {
        const slug = path.slice(1).replace(/\/$/, "");
        if (slug && !coreStaticPages.includes(slug) && canLookupDynamicSlug(slug)) {
          try {
            if (env.DB) {
              await initDB(env);
              const row = await env.DB.prepare("SELECT * FROM pages WHERE slug = ? AND status = ?").bind(slug, "published").first();
              if (row && row.content) {
                let html = await applyComponentSsrToHtml(env, row.content, url, path);
                html = await applyGlobalComponentsSsr(env, html, path);
                let seoSettings = {};
                try {
                  const seo = await getSeoForRequest(env, req, { path: "/" + slug });
                  html = applySeoToHtml(html, seo.robots, seo.canonical, seo);
                  html = applySiteTitleToHtml(html, seo.siteTitle);
                  seoSettings = { site_title: seo.siteTitle, site_url: seo.canonical ? seo.canonical.replace("/" + slug, "") : "" };
                } catch (e) {
                }
                try {
                  const baseUrl = seoSettings.site_url || url.origin;
                  html = enhanceCustomPageHtml(html, row, baseUrl, seoSettings);
                } catch (_) {
                }
                try {
                  html = await injectAnalyticsAndMeta(env, html);
                } catch (_) {
                }
                return new Response(html, {
                  status: 200,
                  headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "X-Worker-Version": VERSION,
                    "Cache-Control": "public, max-age=120"
                  }
                });
              }
            }
          } catch (e) {
          }
        }
      }
      if ((method === "GET" || method === "HEAD") && path === "/terms") {
        let html = renderTermsFallbackPageHtml();
        let robots = "index, follow";
        let canonical = new URL("/terms", req.url).toString();
        let siteTitle = "";
        let siteDescription = DEFAULT_SITE_DESCRIPTION;
        let ogImage = "";
        try {
          const seo = await getSeoForRequest(env, req, { path: "/terms" });
          robots = seo.robots || robots;
          canonical = seo.canonical || canonical;
          siteTitle = seo.siteTitle || "";
          siteDescription = seo.siteDescription || siteDescription;
          ogImage = seo.ogImage || "";
        } catch (_) {
        }
        html = applySiteTitleToHtml(html, siteTitle);
        html = applySeoToHtml(html, robots, canonical, { siteTitle, siteDescription, ogImage });
        html = await applyGlobalComponentsSsr(env, html, "/terms");
        try {
          html = await injectAnalyticsAndMeta(env, html);
        } catch (_) {
        }
        const headers = new Headers({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Worker-Version": VERSION
        });
        headers.set("X-Robots-Tag", robots);
        applySecurityHeadersToHeaders(headers, req);
        if (method === "HEAD") {
          return new Response(null, { status: 200, headers });
        }
        return new Response(html, { status: 200, headers });
      }
      if (method === "GET" || method === "HEAD") {
        const htmlAssetTargets = {
          // Checkout and order flows are always served from static assets.
          "/checkout": "/checkout.html",
          "/checkout/": "/checkout.html",
          "/checkout/index.html": "/checkout.html",
          "/success": "/success.html",
          "/success/": "/success.html",
          "/success/index.html": "/success.html",
          "/buyer-order": "/buyer-order.html",
          "/buyer-order/": "/buyer-order.html",
          "/buyer-order/index.html": "/buyer-order.html",
          "/order-detail": "/order-detail.html",
          "/order-detail/": "/order-detail.html",
          "/order-detail/index.html": "/order-detail.html",
          "/products": "/products-grid.html",
          "/products/": "/products-grid.html",
          "/products/index.html": "/products-grid.html",
          "/products-grid": "/products-grid.html",
          "/products-grid/": "/products-grid.html",
          // Map blog and forum to their index files so these archives load
          // without needing to redirect to `/blog` or `/forum`.
          "/blog": "/blog/index.html",
          "/blog/": "/blog/index.html",
          "/blog.html": "/blog/index.html",
          "/forum": "/forum/index.html",
          "/forum/": "/forum/index.html",
          "/forum.html": "/forum/index.html"
        };
        const target = htmlAssetTargets[path];
        if (target) {
          if (env.ASSETS) {
            const assetResp = await env.ASSETS.fetch(new Request(new URL(target, req.url)));
            const headers = new Headers(assetResp.headers);
            headers.set("Alt-Svc", "clear");
            headers.set("X-Worker-Version", VERSION);
            const normalizedPath = normalizeCanonicalPath2(path);
            const sensitiveMappedPage = isSensitiveNoindexPath2(normalizedPath);
            if (sensitiveMappedPage) {
              headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
              headers.set("Pragma", "no-cache");
            } else {
              headers.set("Cache-Control", "public, max-age=300");
            }
            applySecurityHeadersToHeaders(headers, req);
            const contentType = headers.get("content-type") || headers.get("Content-Type") || "";
            const isHtmlTarget = contentType.includes("text/html") || target.endsWith(".html");
            if (assetResp.status === 200 && method === "GET" && isHtmlTarget) {
              let html = await assetResp.text();
              html = await applyComponentSsrToHtml(env, html, url, path);
              html = await applyGlobalComponentsSsr(env, html, path);
              try {
                const seo = await getSeoForRequest(env, req, { path: normalizedPath });
                html = applySeoToHtml(html, seo.robots, seo.canonical, seo);
                html = applySiteTitleToHtml(html, seo.siteTitle);
                headers.set("X-Robots-Tag", seo.robots);
                const noindexTags = await getNoindexMetaTags(env, {
                  pathname: normalizedPath,
                  rawPathname: path,
                  url
                });
                if (noindexTags) {
                  html = html.replace(/<\/head>/i, `
    ${noindexTags}
  </head>`);
                }
              } catch (_) {
              }
              try {
                html = await injectAnalyticsAndMeta(env, html);
              } catch (_) {
              }
              headers.set("Content-Type", "text/html; charset=utf-8");
              return new Response(html, { status: 200, headers });
            }
            return new Response(assetResp.body, { status: assetResp.status, headers });
          }
        }
      }
      if ((method === "GET" || method === "HEAD") && env.DB) {
        let defaultPageType = null;
        if (path === "/" || path === "/index.html") {
          defaultPageType = "home";
        } else if (path === "/blog/" || path === "/blog/index.html" || path === "/blog" || path === "/blog.html") {
          defaultPageType = "blog_archive";
        } else if (path === "/forum/" || path === "/forum/index.html" || path === "/forum" || path === "/forum.html") {
          defaultPageType = "forum_archive";
        } else if (path === "/products" || path === "/products/" || path === "/products/index.html" || path === "/products.html" || path === "/products-grid" || path === "/products-grid/" || path === "/products-grid.html") {
          defaultPageType = "product_grid";
        }
        if (defaultPageType) {
          try {
            await initDB(env);
            const defaultPage = await env.DB.prepare(
              "SELECT content FROM pages WHERE page_type = ? AND is_default = 1 AND status = ?"
            ).bind(defaultPageType, "published").first();
            if (defaultPage && defaultPage.content) {
              let html = await applyComponentSsrToHtml(env, defaultPage.content, url, path);
              html = await applyGlobalComponentsSsr(env, html, path);
              const responseHeaders = {
                "Content-Type": "text/html; charset=utf-8",
                "X-Worker-Version": VERSION,
                "X-Default-Page": defaultPageType,
                "Cache-Control": "public, max-age=120"
              };
              try {
                const seo = await getSeoForRequest(env, req, { path });
                html = applyDefaultPageMetadata(html, defaultPageType, seo);
                html = applySeoToHtml(html, seo.robots, seo.canonical, seo);
                html = applySiteTitleToHtml(html, seo.siteTitle);
                responseHeaders["X-Robots-Tag"] = seo.robots;
                const noindexTags = await getNoindexMetaTags(env, {
                  pathname: normalizeCanonicalPath2(path),
                  rawPathname: path,
                  url
                });
                if (noindexTags) {
                  html = html.replace(/<\/head>/i, `
    ${noindexTags}
  </head>`);
                }
                try {
                  html = await injectAnalyticsAndMeta(env, html);
                } catch (_) {
                }
                if (defaultPageType === "home") {
                  try {
                    const seoSettings = await getSettings(env) || {};
                    if (!seoSettings.site_url) seoSettings.site_url = url.origin;
                    if (!seoSettings.site_title) seoSettings.site_title = DEFAULT_SITE_TITLE;
                    const orgSchema = generateOrganizationSchema(seoSettings);
                    const siteSchema = generateWebSiteSchema(seoSettings);
                    if (!/"@type"\s*:\s*"Organization"/.test(html)) {
                      html = appendJsonLdToHead(html, orgSchema, "home-organization-schema");
                    }
                    if (!/"@type"\s*:\s*"WebSite"/.test(html)) {
                      html = appendJsonLdToHead(html, siteSchema, "home-website-schema");
                    }
                  } catch (_) {
                  }
                  try {
                    const faqItems = [];
                    const faqRegex = /<span[^>]*class="[^"]*faq-question[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<div[^>]*class="[^"]*faq-answer[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
                    let faqMatch;
                    while ((faqMatch = faqRegex.exec(html)) !== null) {
                      const q = faqMatch[1].replace(/<[^>]+>/g, "").trim();
                      const a = faqMatch[2].replace(/<[^>]+>/g, "").trim();
                      if (q && a) faqItems.push({ question: q, answer: a });
                    }
                    if (faqItems.length > 0) {
                      const faqSchema = generateFAQPageSchema(faqItems, url.origin);
                      html = appendJsonLdToHead(html, faqSchema, "home-faq-schema");
                    }
                  } catch (_) {
                  }
                }
                if (defaultPageType === "blog_archive") {
                  try {
                    const [countResult, blogsResult] = await Promise.all([
                      env.DB.prepare(`SELECT COUNT(*) as total FROM blogs WHERE status = 'published'`).first(),
                      env.DB.prepare(`SELECT id, title, slug, description, thumbnail_url, created_at FROM blogs WHERE status = 'published' ORDER BY created_at DESC, id DESC LIMIT 30 OFFSET 0`).all()
                    ]);
                    const blogs = Array.isArray(blogsResult?.results) ? blogsResult.results : [];
                    if (blogs.length > 0) {
                      const blogCollectionSchema = {
                        "@context": "https://schema.org",
                        "@type": "CollectionPage",
                        name: "Blog",
                        url: `${url.origin}/blog`,
                        mainEntity: {
                          "@type": "ItemList",
                          itemListOrder: "https://schema.org/ItemListOrderDescending",
                          numberOfItems: blogs.length,
                          itemListElement: blogs.map((blog, idx) => ({
                            "@type": "ListItem",
                            position: idx + 1,
                            url: `${url.origin}/blog/${encodeURIComponent(String(blog.slug || blog.id || "").trim())}`,
                            name: String(blog.title || "")
                          }))
                        }
                      };
                      html = html.replace("</head>", `<script type="application/ld+json">${JSON.stringify(blogCollectionSchema)}<\/script>
</head>`);
                    }
                    const total = Number(countResult?.total || 0);
                    const pagination = { page: 1, limit: 30, total, totalPages: total > 0 ? Math.ceil(total / 30) : 0, hasNext: 30 < total, hasPrev: false };
                    const archiveMarkup = renderBlogArchiveCardsSsr(blogs, pagination);
                    const archiveContainerRe = /<div id="blog-archive"([^>]*)>[\s\S]*?<\/div>/i;
                    if (archiveContainerRe.test(html)) {
                      html = html.replace(archiveContainerRe, (_full, attrs = "") => {
                        const cleanAttrs = String(attrs || "").replace(/\sdata-ssr="[^"]*"/gi, "");
                        return `<div id="blog-archive"${cleanAttrs} data-ssr="1">${archiveMarkup}</div>`;
                      });
                    }
                    if (!html.includes('id="blog-archive-bootstrap"')) {
                      const bootstrapJson = JSON.stringify({ blogs, pagination }).replace(/</g, "\\u003c");
                      html = html.replace("</head>", `<script type="application/json" id="blog-archive-bootstrap">${bootstrapJson}<\/script>
</head>`);
                    }
                  } catch (_) {
                  }
                }
                if (defaultPageType === "forum_archive") {
                  try {
                    const forumResult = await queryForumQuestionsForSsr(env, { limit: 20, page: 1 });
                    const questions = forumResult.questions || [];
                    if (questions.length > 0) {
                      const forumCollectionSchema = {
                        "@context": "https://schema.org",
                        "@type": "CollectionPage",
                        name: "Customer Forum",
                        url: `${url.origin}/forum`,
                        description: "Browse customer questions about personalized video gifts, orders, delivery, and surprise ideas.",
                        mainEntity: {
                          "@type": "ItemList",
                          itemListOrder: "https://schema.org/ItemListOrderDescending",
                          numberOfItems: forumResult.pagination.total || questions.length,
                          itemListElement: questions.map((q, idx) => ({
                            "@type": "ListItem",
                            position: idx + 1,
                            url: `${url.origin}${buildForumQuestionHref(q)}`,
                            name: String(q.title || "")
                          }))
                        }
                      };
                      html = html.replace("</head>", `<script type="application/ld+json">${JSON.stringify(forumCollectionSchema)}<\/script>
</head>`);
                    }
                  } catch (_) {
                  }
                }
                if (defaultPageType === "product_grid") {
                  try {
                    const cachedResult = await queryProductsForComponentSsr(env, { limit: 50, page: 1 });
                    const products = cachedResult.products || [];
                    if (products.length > 0) {
                      const schemaJson = generateCollectionSchema(products, url.origin);
                      html = injectSchemaIntoHTML(html, "collection-schema", schemaJson);
                    }
                  } catch (_) {
                  }
                }
              } catch (e) {
              }
              const headers = applySecurityHeadersToHeaders(new Headers(responseHeaders), req);
              return new Response(html, {
                status: 200,
                headers
              });
            }
          } catch (e) {
            console.error("Default page error:", e);
          }
        }
      }
      if (env.ASSETS) {
        let assetReq = req;
        let assetPath = path;
        let schemaProductId = null;
        let schemaProduct = null;
        if (method === "GET" || method === "HEAD") {
          const canonicalMatch = assetPath.match(/^\/product-(\d+)\/(.+)$/);
          if (canonicalMatch) {
            const pid = Number(canonicalMatch[1]);
            if (!Number.isNaN(pid)) {
              schemaProductId = pid;
              const rewritten = new URL(req.url);
              rewritten.pathname = "/_product_template.tpl";
              rewritten.searchParams.set("id", String(schemaProductId));
              assetReq = new Request(rewritten.toString(), req);
              assetPath = "/_product_template.tpl";
            }
          }
          const archiveAssetAliases = {
            "/blog": "/blog/index.html",
            "/blog/": "/blog/index.html",
            "/forum": "/forum/index.html",
            "/forum/": "/forum/index.html",
            "/products": "/products-grid.html",
            "/products/": "/products-grid.html",
            "/products/index.html": "/products-grid.html",
            "/products-grid": "/products-grid.html",
            "/products-grid/": "/products-grid.html",
            "/checkout": "/checkout.html",
            "/checkout/": "/checkout.html",
            "/success": "/success.html",
            "/success/": "/success.html",
            "/buyer-order": "/buyer-order.html",
            "/buyer-order/": "/buyer-order.html",
            "/order-detail": "/order-detail.html",
            "/order-detail/": "/order-detail.html"
          };
          const archiveTarget = archiveAssetAliases[assetPath];
          if (archiveTarget) {
            const rewritten = new URL(req.url);
            rewritten.pathname = archiveTarget;
            assetReq = new Request(rewritten.toString(), req);
            assetPath = archiveTarget;
          }
          if (!archiveTarget && !assetPath.includes(".") && assetPath !== "/") {
            const cleanPath = assetPath.endsWith("/") ? assetPath.slice(0, -1) : assetPath;
            const rewritten = new URL(req.url);
            rewritten.pathname = cleanPath + ".html";
            assetReq = new Request(rewritten.toString(), req);
            assetPath = cleanPath + ".html";
          }
        }
        const skipAssetFetch = (
          // Double-extension probes (e.g. /file.php.bak)
          /\.[a-z]{2,5}\.[a-z]{2,5}$/i.test(assetPath) || // Extremely long paths (>120 chars) are almost always scanner noise
          assetPath.length > 120 || // Paths with encoded traversal or null bytes
          assetPath.includes("%00") || assetPath.includes("..")
        );
        if (skipAssetFetch) {
          return new Response("Not found", {
            status: 404,
            headers: {
              "Content-Type": "text/plain",
              "Cache-Control": "public, max-age=300",
              "X-Worker-Version": VERSION
            }
          });
        }
        const strippedHeaders = new Headers(assetReq.headers);
        strippedHeaders.delete("If-None-Match");
        strippedHeaders.delete("If-Modified-Since");
        assetReq = new Request(assetReq.url, {
          method: assetReq.method,
          headers: strippedHeaders,
          redirect: "manual"
        });
        let assetResp = await env.ASSETS.fetch(assetReq);
        if ([301, 302, 307, 308].includes(assetResp.status)) {
          const location = assetResp.headers.get("Location");
          if (location) {
            try {
              const redirectUrl = new URL(location, req.url);
              const redirectReq = new Request(redirectUrl.toString(), {
                method: method === "HEAD" ? "HEAD" : "GET",
                headers: strippedHeaders,
                redirect: "manual"
              });
              const redirectResp = await env.ASSETS.fetch(redirectReq);
              if (redirectResp.status === 200) {
                assetResp = redirectResp;
                assetPath = redirectUrl.pathname;
              }
            } catch (_) {
            }
          }
        }
        const contentType = assetResp.headers.get("content-type") || "";
        const isHTML = contentType.includes("text/html") || assetPath === "/_product_template.tpl";
        const isSuccess = assetResp.status === 200;
        const normalizedAssetPathForCache = normalizeCanonicalPath2(path);
        const localDevRequest = isLocalDevHost(url.hostname);
        const shouldCache = isHTML && isSuccess && !localDevRequest && !path.startsWith("/admin") && !path.includes("/admin/") && !isSensitiveNoindexPath2(normalizedAssetPathForCache);
        const cacheKey = buildVersionedCacheKey(req, "text/html");
        if (shouldCache) {
          try {
            const cachedResponse = await caches.default.match(cacheKey);
            if (cachedResponse) {
              const headers2 = new Headers(cachedResponse.headers);
              headers2.set("X-Cache", "HIT");
              applySecurityHeadersToHeaders(headers2, req);
              headers2.set("X-Worker-Version", VERSION);
              headers2.set("Alt-Svc", "clear");
              return new Response(cachedResponse.body, {
                status: cachedResponse.status,
                headers: headers2
              });
            }
          } catch (cacheError) {
          }
        }
        if (isHTML && isSuccess) {
          try {
            const baseUrl = url.origin;
            let html = await assetResp.text();
            if ((assetPath === "/blog/" || assetPath === "/blog/index.html") && env.DB) {
              try {
                await initDB(env);
                const pageRaw = parseInt(url.searchParams.get("page") || "1", 10);
                const limitRaw = parseInt(url.searchParams.get("limit") || "30", 10);
                const pageNumber = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
                const limitNumber = Number.isFinite(limitRaw) ? Math.max(1, Math.min(60, limitRaw)) : 30;
                const offset = (pageNumber - 1) * limitNumber;
                const [countResult, blogsResult] = await Promise.all([
                  env.DB.prepare(`SELECT COUNT(*) as total FROM blogs WHERE status = 'published'`).first(),
                  env.DB.prepare(`
                    SELECT id, title, slug, description, thumbnail_url, created_at
                    FROM blogs
                    WHERE status = 'published'
                    ORDER BY created_at DESC, id DESC
                    LIMIT ? OFFSET ?
                  `).bind(limitNumber, offset).all()
                ]);
                const total = Number(countResult?.total || 0);
                const totalPages = total > 0 ? Math.ceil(total / limitNumber) : 0;
                const pagination = {
                  page: pageNumber,
                  limit: limitNumber,
                  total,
                  totalPages,
                  hasNext: offset + limitNumber < total,
                  hasPrev: pageNumber > 1
                };
                const blogs = Array.isArray(blogsResult?.results) ? blogsResult.results : [];
                const archiveMarkup = renderBlogArchiveCardsSsr(blogs, pagination);
                const archiveContainerRe = /<div id="blog-archive"([^>]*)>[\s\S]*?<\/div>/i;
                if (archiveContainerRe.test(html)) {
                  html = html.replace(archiveContainerRe, (_full, attrs = "") => {
                    const cleanAttrs = String(attrs || "").replace(/\sdata-ssr="[^"]*"/gi, "");
                    return `<div id="blog-archive"${cleanAttrs} data-ssr="1">${archiveMarkup}</div>`;
                  });
                }
                if (!html.includes('id="blog-archive-bootstrap"')) {
                  const bootstrapData = {
                    blogs,
                    pagination
                  };
                  const bootstrapJson = JSON.stringify(bootstrapData).replace(/</g, "\\u003c");
                  const bootstrapTag = `<script type="application/json" id="blog-archive-bootstrap">${bootstrapJson}<\/script>`;
                  html = html.replace("</head>", `${bootstrapTag}
</head>`);
                }
                if (blogs.length > 0) {
                  const itemListSchema = {
                    "@context": "https://schema.org",
                    "@type": "CollectionPage",
                    name: "Blog",
                    url: `${baseUrl}/blog`,
                    mainEntity: {
                      "@type": "ItemList",
                      itemListOrder: "https://schema.org/ItemListOrderDescending",
                      numberOfItems: blogs.length,
                      itemListElement: blogs.map((blog, idx) => ({
                        "@type": "ListItem",
                        position: idx + 1,
                        url: `${baseUrl}/blog/${encodeURIComponent(String(blog.slug || blog.id || "").trim())}`,
                        name: String(blog.title || "")
                      }))
                    }
                  };
                  html = html.replace(
                    "</head>",
                    `<script type="application/ld+json">${JSON.stringify(itemListSchema)}<\/script>
</head>`
                  );
                }
              } catch (archiveErr) {
                console.warn("Blog archive SSR injection error:", archiveErr);
              }
            }
            if ((assetPath === "/forum/" || assetPath === "/forum/index.html") && env.DB) {
              try {
                await initDB(env);
                const forumResult = await queryForumQuestionsForSsr(env, { limit: 20, page: 1 });
                const questions = forumResult.questions || [];
                if (questions.length > 0) {
                  const forumCollectionSchema = {
                    "@context": "https://schema.org",
                    "@type": "CollectionPage",
                    name: "Customer Forum",
                    url: `${baseUrl}/forum`,
                    description: "Browse customer questions about personalized video gifts, orders, delivery, and surprise ideas.",
                    mainEntity: {
                      "@type": "ItemList",
                      itemListOrder: "https://schema.org/ItemListOrderDescending",
                      numberOfItems: forumResult.pagination.total || questions.length,
                      itemListElement: questions.map((q, idx) => ({
                        "@type": "ListItem",
                        position: idx + 1,
                        url: `${baseUrl}${buildForumQuestionHref(q)}`,
                        name: String(q.title || "")
                      }))
                    }
                  };
                  html = html.replace(
                    "</head>",
                    `<script type="application/ld+json">${JSON.stringify(forumCollectionSchema)}<\/script>
</head>`
                  );
                }
              } catch (forumSchemaErr) {
                console.warn("Forum archive schema injection error:", forumSchemaErr);
              }
            }
            if (assetPath === "/_product_template.tpl" || assetPath === "/product.html" || assetPath === "/product") {
              const productId = schemaProductId ? String(schemaProductId) : url.searchParams.get("id");
              if (productId && env.DB) {
                await initDB(env);
                const numPid = Number(productId);
                const cacheKey2 = `api_cache:ssr:product_detail:${numPid}`;
                let product = null, reviews = [], adjacent = { previous: null, next: null }, whopGateway = null;
                try {
                  const cached = await env.PAGE_CACHE.get(cacheKey2, "json");
                  if (cached) {
                    product = cached.product;
                    reviews = cached.reviews;
                    adjacent = cached.adjacent;
                    whopGateway = cached.whopGateway;
                  }
                } catch (e) {
                }
                const settingsMap = await getCachedSettings(env, ["site_branding", "site_components", "whop"]);
                if (!product) {
                  const [productResult, reviewsResult, whopGatewayResult] = await Promise.all([
                    env.DB.prepare(`
                      SELECT p.*,
                        COUNT(r.id) as review_count,
                        AVG(r.rating) as rating_average
                      FROM products p
                      LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                      WHERE p.id = ? AND ${buildPublicProductStatusWhere("p.status")}
                      GROUP BY p.id
                    `).bind(numPid).first(),
                    env.DB.prepare(
                      "SELECT * FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC LIMIT 5"
                    ).bind(numPid, "approved").all(),
                    env.DB.prepare(`
                      SELECT whop_product_id, whop_theme, webhook_secret, whop_api_key
                      FROM payment_gateways
                      WHERE gateway_type = 'whop'
                      ORDER BY is_enabled DESC, id DESC
                      LIMIT 1
                    `).first().catch(() => null)
                  ]);
                  product = productResult;
                  reviews = reviewsResult.results || [];
                  whopGateway = whopGatewayResult;
                  if (product) {
                    try {
                      const [prev, next] = await Promise.all([
                        env.DB.prepare(`
                          SELECT id, title, slug, thumbnail_url
                          FROM products
                          WHERE ${buildPublicProductStatusWhere("status")}
                          AND (sort_order < ? OR (sort_order = ? AND id > ?))
                          ORDER BY sort_order DESC, id ASC
                          LIMIT 1
                        `).bind(product.sort_order, product.sort_order, product.id).first(),
                        env.DB.prepare(`
                          SELECT id, title, slug, thumbnail_url
                          FROM products
                          WHERE ${buildPublicProductStatusWhere("status")}
                          AND (sort_order > ? OR (sort_order = ? AND id < ?))
                          ORDER BY sort_order ASC, id DESC
                          LIMIT 1
                        `).bind(product.sort_order, product.sort_order, product.id).first()
                      ]);
                      adjacent = { previous: prev || null, next: next || null };
                    } catch (e) {
                    }
                    try {
                      await env.PAGE_CACHE.put(cacheKey2, JSON.stringify({ product, reviews, adjacent, whopGateway }), { expirationTtl: 86400 * 7 });
                    } catch (e) {
                    }
                  }
                }
                if (product) {
                  schemaProduct = product;
                  let siteBranding = { logo_url: "", favicon_url: "" };
                  let siteComponents = {};
                  let whopSettingsBootstrap = {};
                  const prev = adjacent.previous;
                  const next = adjacent.next;
                  try {
                    try {
                      const brandingRaw = settingsMap.get("site_branding");
                      if (brandingRaw) {
                        const parsed = JSON.parse(brandingRaw);
                        if (parsed && typeof parsed === "object") {
                          siteBranding = {
                            logo_url: parsed.logo_url || "",
                            favicon_url: parsed.favicon_url || ""
                          };
                        }
                      }
                    } catch (_) {
                    }
                    try {
                      const componentsRaw = settingsMap.get("site_components");
                      if (componentsRaw) {
                        const parsed = JSON.parse(componentsRaw);
                        if (parsed && typeof parsed === "object") {
                          siteComponents = normalizeSiteComponentsPayload(parsed, url.origin);
                        }
                      }
                    } catch (_) {
                    }
                    try {
                      const whopLegacyRaw = settingsMap.get("whop");
                      if (whopLegacyRaw) {
                        const parsed = JSON.parse(whopLegacyRaw);
                        if (parsed && typeof parsed === "object") {
                          whopSettingsBootstrap = { ...parsed };
                        }
                      }
                    } catch (_) {
                    }
                    if (whopGateway) {
                      whopSettingsBootstrap.default_product_id = whopGateway.whop_product_id || whopSettingsBootstrap.default_product_id || "";
                      whopSettingsBootstrap.product_id = whopGateway.whop_product_id || whopSettingsBootstrap.product_id || "";
                      whopSettingsBootstrap.theme = whopGateway.whop_theme || whopSettingsBootstrap.theme || "light";
                      whopSettingsBootstrap.webhook_secret = whopGateway.webhook_secret || whopSettingsBootstrap.webhook_secret || "";
                      if (env.WHOP_API_KEY || whopGateway.whop_api_key) {
                        whopSettingsBootstrap.api_key = "********";
                      }
                    }
                    adjacent = {
                      previous: prev ? {
                        id: prev.id,
                        title: prev.title,
                        slug: prev.slug,
                        thumbnail_url: prev.thumbnail_url,
                        url: `/product-${prev.id}/${encodeURIComponent(prev.slug || "")}`
                      } : null,
                      next: next ? {
                        id: next.id,
                        title: next.title,
                        slug: next.slug,
                        thumbnail_url: next.thumbnail_url,
                        url: `/product-${next.id}/${encodeURIComponent(next.slug || "")}`
                      } : null
                    };
                  } catch (_) {
                  }
                  const schemaJson = generateProductSchema(product, baseUrl, reviews);
                  html = injectSchemaIntoHTML(html, "product-schema", schemaJson);
                  try {
                    if (!html.includes('id="product-bootstrap"')) {
                      let addons = [];
                      try {
                        addons = JSON.parse(product.addons_json || "[]");
                      } catch (_) {
                        addons = [];
                      }
                      const deliveryTimeDays = parseInt(product.normal_delivery_text) || 1;
                      const bootstrap = {
                        product: {
                          id: product.id,
                          title: product.title,
                          description: product.description || "",
                          normal_price: product.normal_price,
                          sale_price: product.sale_price,
                          instant_delivery: product.instant_delivery,
                          normal_delivery_text: product.normal_delivery_text,
                          delivery_time_days: deliveryTimeDays,
                          thumbnail_url: product.thumbnail_url,
                          video_url: product.video_url,
                          gallery_images: product.gallery_images,
                          review_count: parseInt(product.review_count) || 0,
                          rating_average: product.rating_average ? Math.round(Number(product.rating_average) * 10) / 10 : 0,
                          reviews,
                          adjacent
                        },
                        addons,
                        whopSettings: whopSettingsBootstrap,
                        siteBranding,
                        siteComponents
                      };
                      const bootstrapJson = JSON.stringify(bootstrap).replace(/</g, "\\u003c");
                      const bootstrapTag = `<script type="application/json" id="product-bootstrap">${bootstrapJson}<\/script>`;
                      html = html.replace("</head>", `${bootstrapTag}
</head>`);
                    }
                  } catch (_) {
                  }
                  try {
                    const playerShellHtml = renderProductStep1PlayerShell(
                      product,
                      product.addons_json || "[]",
                      reviews
                    );
                    if (playerShellHtml) {
                      html = injectProductInitialContent(html, playerShellHtml, true);
                    }
                    const prodTitle = String(product.title || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                    if (prodTitle) {
                      html = html.replace(
                        /<h1 class="sr-only">Personalized Video Greeting<\/h1>/i,
                        `<h1 class="sr-only">${prodTitle}</h1>`
                      );
                    }
                  } catch (_) {
                  }
                  const videoSchemaJson = generateVideoSchema(product, baseUrl);
                  if (videoSchemaJson && videoSchemaJson !== "{}") {
                    const videoSchemaTag = `<script type="application/ld+json" id="video-schema">${videoSchemaJson}<\/script>`;
                    html = html.replace("</head>", `${videoSchemaTag}
</head>`);
                  }
                  if (product.video_url || product.preview_video_url) {
                    const videoUrl = product.video_url || product.preview_video_url;
                    html = upsertMetaTagsBatch(html, [
                      { type: "property", name: "og:type", content: "video.other", alwaysReplace: true },
                      { type: "name", name: "twitter:card", content: "player", alwaysReplace: true }
                    ]);
                    const videoMetaTags = `
    <meta property="og:video" content="${videoUrl}">
    <meta property="og:video:url" content="${videoUrl}">
    <meta property="og:video:secure_url" content="${videoUrl}">
    <meta property="og:video:type" content="video/mp4">
    <meta property="og:video:width" content="1280">
    <meta property="og:video:height" content="720">
    <meta name="twitter:player" content="${videoUrl}">
    <meta name="twitter:player:width" content="1280">
    <meta name="twitter:player:height" content="720">`;
                    html = html.replace("</head>", `${videoMetaTags}
</head>`);
                  }
                  if (product.thumbnail_url) {
                    let lcpImageUrl = product.thumbnail_url;
                    if (lcpImageUrl.includes("res.cloudinary.com")) {
                      lcpImageUrl = lcpImageUrl.replace(
                        /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/,
                        "$1f_auto,q_auto,w_800/$2"
                      );
                    }
                    const preloadTag = `<link rel="preload" as="image" href="${lcpImageUrl}" fetchpriority="high">`;
                    html = html.replace("</head>", `${preloadTag}
</head>`);
                  }
                  const safeTitle = String(product.seo_title || product.title || "").replace(/"/g, "&quot;");
                  const safeDesc = String(product.seo_description || product.description || "").substring(0, 160).replace(/"/g, "&quot;").replace(/\n/g, " ");
                  const productImage = String(product.thumbnail_url || "").trim();
                  const productOgImage = productImage || baseUrl + "/favicon.svg";
                  html = upsertTitleTag(html, `${safeTitle} | ${DEFAULT_SITE_TITLE}`);
                  const productMetaTags = [
                    { type: "name", name: "description", content: safeDesc, alwaysReplace: true },
                    { type: "property", name: "og:title", content: safeTitle, alwaysReplace: true },
                    { type: "property", name: "og:description", content: safeDesc, alwaysReplace: true },
                    { type: "property", name: "og:image", content: productOgImage, alwaysReplace: true },
                    { type: "property", name: "og:image:width", content: "1200", alwaysReplace: true },
                    { type: "property", name: "og:image:height", content: "630", alwaysReplace: true },
                    { type: "name", name: "twitter:title", content: safeTitle, alwaysReplace: true },
                    { type: "name", name: "twitter:description", content: safeDesc, alwaysReplace: true },
                    { type: "name", name: "twitter:image", content: productOgImage, alwaysReplace: true }
                  ];
                  html = upsertMetaTagsBatch(html, productMetaTags);
                  try {
                    const productSeo = await getSeoForRequest(env, req, { product });
                    const ogUrlTag = `<meta property="og:url" content="${productSeo.canonical}">`;
                    const breadcrumbJson = generateBreadcrumbSchema([
                      { name: "Home", url: baseUrl },
                      { name: "Products", url: `${baseUrl}/products` },
                      { name: product.title || "", url: productSeo.canonical }
                    ]);
                    html = html.replace("</head>", `${ogUrlTag}
<script type="application/ld+json">${breadcrumbJson}<\/script>
</head>`);
                  } catch (_) {
                  }
                }
              }
            }
            if (assetPath === "/index.html" || assetPath === "/" || assetPath === "/products" || assetPath === "/products/" || assetPath === "/products.html" || assetPath === "/products-grid.html") {
              if (env.DB) {
                await initDB(env);
                const cachedResult = await queryProductsForComponentSsr(env, { limit: 50, page: 1 });
                const products = cachedResult.products || [];
                if (products.length > 0) {
                  const schemaJson = generateCollectionSchema(products, baseUrl);
                  html = injectSchemaIntoHTML(html, "collection-schema", schemaJson);
                }
              }
              if (assetPath === "/index.html" || assetPath === "/") {
                try {
                  const seoSettings2 = await getSettings(env) || {};
                  if (!seoSettings2.site_url) seoSettings2.site_url = baseUrl;
                  if (!seoSettings2.site_title) seoSettings2.site_title = DEFAULT_SITE_TITLE;
                  const orgSchema = generateOrganizationSchema(seoSettings2);
                  const siteSchema = generateWebSiteSchema(seoSettings2);
                  if (!/"@type"\s*:\s*"Organization"/.test(html)) {
                    html = appendJsonLdToHead(html, orgSchema, "home-organization-schema");
                  }
                  if (!/"@type"\s*:\s*"WebSite"/.test(html)) {
                    html = appendJsonLdToHead(html, siteSchema, "home-website-schema");
                  }
                } catch (_) {
                }
                try {
                  const faqItems = [];
                  const faqRegex = /<span[^>]*class="[^"]*faq-question[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<div[^>]*class="[^"]*faq-answer[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
                  let faqMatch;
                  while ((faqMatch = faqRegex.exec(html)) !== null) {
                    const q = faqMatch[1].replace(/<[^>]+>/g, "").trim();
                    const a = faqMatch[2].replace(/<[^>]+>/g, "").trim();
                    if (q && a) faqItems.push({ question: q, answer: a });
                  }
                  if (faqItems.length > 0) {
                    const faqSchema = generateFAQPageSchema(faqItems, baseUrl);
                    html = appendJsonLdToHead(html, faqSchema, "home-faq-schema");
                  }
                } catch (_) {
                }
              }
            }
            html = await applyComponentSsrToHtml(env, html, url, path);
            html = await applyGlobalComponentsSsr(env, html, path);
            const normalizedRequestPath = normalizeCanonicalPath2(path);
            const sensitiveHtmlPath = isSensitiveNoindexPath2(normalizedRequestPath);
            const headers2 = new Headers();
            headers2.set("Alt-Svc", "clear");
            headers2.set("Content-Type", "text/html; charset=utf-8");
            headers2.set("X-Worker-Version", VERSION);
            headers2.set("Alt-Svc", "clear");
            headers2.set("X-Cache", "MISS");
            if (sensitiveHtmlPath) {
              headers2.set("Cache-Control", "no-store, no-cache, must-revalidate");
              headers2.set("Pragma", "no-cache");
            } else {
              headers2.set("Cache-Control", "public, max-age=300");
            }
            if (!isAdminUI && !isAdminAPI) {
              try {
                const seo = await getSeoForRequest(env, req, schemaProduct ? { product: schemaProduct } : { path });
                html = applySeoToHtml(html, seo.robots, seo.canonical, seo);
                html = applySiteTitleToHtml(html, seo.siteTitle);
                headers2.set("X-Robots-Tag", seo.robots);
                const noindexTags = await getNoindexMetaTags(env, {
                  pathname: normalizedRequestPath,
                  rawPathname: path,
                  url
                });
                if (noindexTags) {
                  html = html.replace("</head>", `
    ${noindexTags}
  </head>`);
                }
                try {
                  html = await injectAnalyticsAndMeta(env, html);
                } catch (_) {
                }
              } catch (e) {
              }
            }
            applySecurityHeadersToHeaders(headers2, req);
            const response = new Response(html, { status: 200, headers: headers2 });
            if (shouldCache) {
              try {
                const cacheResponse = new Response(html, {
                  status: 200,
                  headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "public, max-age=300",
                    // 5 minutes
                    "X-Worker-Version": VERSION,
                    "X-Cache-Created": (/* @__PURE__ */ new Date()).toISOString()
                  }
                });
                ctx2.waitUntil(caches.default.put(cacheKey, cacheResponse));
                console.log("Cached response for:", req.url);
              } catch (cacheError) {
                console.warn("Cache storage failed:", cacheError);
              }
            }
            return response;
          } catch (e) {
            console.error("Schema injection error:", e);
          }
        }
        const headers = new Headers(assetResp.headers);
        headers.set("Alt-Svc", "clear");
        headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
        headers.set("Pragma", "no-cache");
        applySecurityHeadersToHeaders(headers, req);
        headers.set("X-Worker-Version", VERSION);
        headers.set("Alt-Svc", "clear");
        return new Response(assetResp.body, { status: assetResp.status, headers });
      }
      return new Response("Not found", {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=60",
          "X-Worker-Version": VERSION
        }
      });
    } catch (e) {
      console.error("Worker error:", e);
      const isTimeoutError = e.message?.includes("timeout") || e.message?.includes("abort");
      const isConnectionError = e.message?.includes("connection") || e.message?.includes("network");
      if (isTimeoutError || isConnectionError) {
        return new Response(JSON.stringify({
          error: "Service temporarily unavailable. Please retry.",
          code: "COLD_START_RETRY"
        }), {
          status: 503,
          headers: {
            ...CORS,
            "Content-Type": "application/json",
            "Retry-After": "2",
            "Cache-Control": "no-store"
          }
        });
      }
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
  },
  // Scheduled handler for cron jobs
  // WARMING: This runs every 5 minutes (configure in wrangler.toml)
  // Keeps DB connection warm and prevents cold start issues
  async scheduled(event, env, ctx2) {
    setVersion(env.VERSION);
    console.log("Cron job started:", event.cron, "at", (/* @__PURE__ */ new Date()).toISOString());
    try {
      if (env.DB) {
        const isDailyMaintenanceCron = event.cron === "0 2 * * *";
        if (isDailyMaintenanceCron) {
          await initDB(env);
        } else {
          await env.DB.prepare("SELECT 1 as warm").first();
        }
        if (isDailyMaintenanceCron) {
          try {
            const baseUrl = env.PUBLIC_BASE_URL || env.SITE_URL || env.BASE_URL || null;
            const backupResp = await createBackup(env, { trigger: "cron", base_url: baseUrl });
            if (!backupResp?.ok) {
              const errBody = await backupResp.text().catch(() => "");
              console.log("Daily backup API returned non-OK:", backupResp?.status, errBody);
            } else {
              const payload = await backupResp.clone().json().catch(() => ({}));
              console.log("Daily backup created:", payload?.id || "unknown-id");
            }
          } catch (e) {
            console.log("Daily backup failed:", e?.message || e);
          }
        }
        if (isDailyMaintenanceCron) {
          await Promise.all([
            env.DB.prepare("SELECT 1 as warm").first(),
            env.DB.prepare(`SELECT id FROM products WHERE ${buildPublicProductStatusWhere("status")} LIMIT 1`).first().catch(() => null),
            env.DB.prepare("SELECT id FROM orders LIMIT 1").first().catch(() => null),
            env.DB.prepare("SELECT id FROM reviews LIMIT 1").first().catch(() => null),
            env.DB.prepare("SELECT id FROM blogs WHERE status = ? LIMIT 1").bind("published").first().catch(() => null),
            env.DB.prepare("SELECT id FROM forum_questions LIMIT 1").first().catch(() => null)
          ]);
          console.log("Daily maintenance DB health check completed");
        } else {
          console.log("DB connection warmed with lightweight ping");
        }
        if (isDailyMaintenanceCron) {
          const result = await cleanupExpired(env);
          try {
            const data = await result.json();
            console.log("Cleanup result:", data);
          } catch (_) {
            console.log("Cleanup finished (non-JSON response)");
          }
        }
      }
    } catch (e) {
      console.error("Cron job error:", e);
    }
  }
};
export {
  index_default as default,
  getCanonicalRedirectPath2 as getCanonicalRedirectPath,
  shouldServeCanonicalAliasDirectly
};
//# sourceMappingURL=index.js.map
