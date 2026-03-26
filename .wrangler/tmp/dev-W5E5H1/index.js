var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// .wrangler/tmp/bundle-LDcSRV/checked-fetch.js
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
var urls;
var init_checked_fetch = __esm({
  ".wrangler/tmp/bundle-LDcSRV/checked-fetch.js"() {
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_checked_fetch();
    init_modules_watch_stub();
  }
});

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/utils/formatting.js
function escapeHtml(input) {
  return String(input ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function slugifyStr(input) {
  return String(input || "").toLowerCase().trim().replace(/['"`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
}
function canonicalProductPath(product) {
  const id = product && product.id != null ? String(product.id) : "";
  const slug = product && product.slug ? String(product.slug) : slugifyStr(product && product.title ? product.title : "product");
  return `/product-${id}/${encodeURIComponent(slug)}`;
}
function normalizeQuickAction(text) {
  return String(text || "").trim().replace(/\s+/g, " ").toLowerCase();
}
function toISO8601(sqliteDate) {
  if (!sqliteDate) return null;
  const d = /* @__PURE__ */ new Date(sqliteDate.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? sqliteDate : d.toISOString();
}
var init_formatting = __esm({
  "src/utils/formatting.js"() {
    init_checked_fetch();
    init_modules_watch_stub();
    __name(escapeHtml, "escapeHtml");
    __name(slugifyStr, "slugifyStr");
    __name(canonicalProductPath, "canonicalProductPath");
    __name(normalizeQuickAction, "normalizeQuickAction");
    __name(toISO8601, "toISO8601");
  }
});

// src/utils/component-ssr.js
var init_component_ssr = __esm({
  "src/utils/component-ssr.js"() {
    init_checked_fetch();
    init_modules_watch_stub();
    init_formatting();
  }
});

// .wrangler/tmp/bundle-LDcSRV/middleware-loader.entry.ts
init_checked_fetch();
init_modules_watch_stub();

// .wrangler/tmp/bundle-LDcSRV/middleware-insertion-facade.js
init_checked_fetch();
init_modules_watch_stub();

// src/index.js
init_checked_fetch();
init_modules_watch_stub();

// src/config/cors.js
init_checked_fetch();
init_modules_watch_stub();
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache"
};
function handleOptions() {
  return new Response(null, { headers: CORS });
}
__name(handleOptions, "handleOptions");

// src/config/db.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/product-visibility.js
init_checked_fetch();
init_modules_watch_stub();
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
async function initDB(env) {
  if (dbReady || !env.DB) return;
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
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, size INTEGER DEFAULT 0, media_count INTEGER DEFAULT 0, data TEXT)`),
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
      console.log(`DB init completed in ${Date.now() - initStartTime}ms`);
      if (!migrationsDone) {
        Promise.resolve().then(() => runMigrations(env).then(() => {
          migrationsDone = true;
        }).catch(() => {
        }));
      }
      if (!pagesMigrationDone) {
        Promise.resolve().then(() => runPagesMigration(env).then(() => {
          pagesMigrationDone = true;
        }).catch(() => {
        }));
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
    { table: "orders", column: "revision_reason", type: "TEXT" }
  ];
  await Promise.allSettled(
    migrations.map(
      (m) => env.DB.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`).run().catch(() => {
      })
    )
  );
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
  clearProductTableColumnsCache();
}
__name(runMigrations, "runMigrations");

// src/config/constants.js
init_checked_fetch();
init_modules_watch_stub();
var VERSION = "15";

// src/router.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/response.js
init_checked_fetch();
init_modules_watch_stub();
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

// src/utils/auth.js
init_checked_fetch();
init_modules_watch_stub();
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

// src/router.js
init_formatting();

// src/controllers/products.js
init_checked_fetch();
init_modules_watch_stub();
init_formatting();
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
  const now = Date.now();
  if (!limitStr && filter === "all" && productsCache && now - productsCacheTime < PRODUCTS_CACHE_TTL) {
    return cachedJson({ products: productsCache, pagination: { page: 1, limit: 1e3, total: productsCache.length, pages: 1 } }, 120);
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
  return cachedJson({
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }, 120);
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
  return json({
    product: {
      ...row,
      delivery_time_days: deliveryTimeDays,
      addons,
      review_count: stats?.cnt || 0,
      rating_average: stats?.avg ? Math.round(stats.avg * 10) / 10 : 5,
      reviews
    },
    addons
  });
}
__name(getProduct, "getProduct");
async function saveProduct(env, body) {
  const title = (body.title || "").trim();
  if (!title) return json({ error: "Title required" }, 400);
  productsCache = null;
  productsCacheTime = 0;
  const slug = (body.slug || "").trim() || slugifyStr(title);
  const addonsJson = JSON.stringify(body.addons || []);
  const galleryJson = JSON.stringify(normalizeGalleryImages(body));
  const { hasCreatedAt, hasUpdatedAt } = await getProductTimestampSupport(env);
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
      return null;
    }
  }
  if (path.startsWith("/product/") && path.length > "/product/".length) {
    const slugIn = decodeURIComponent(path.slice("/product/".length));
    const row = await getProductBySlug(slugIn);
    if (row) {
      return null;
    }
  }
  return null;
}
__name(handleProductRouting, "handleProductRouting");

// src/controllers/orders.js
init_checked_fetch();
init_modules_watch_stub();
init_formatting();

// src/config/secrets.js
init_checked_fetch();
init_modules_watch_stub();
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
init_checked_fetch();
init_modules_watch_stub();
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
init_checked_fetch();
init_modules_watch_stub();
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

// src/utils/order-email-notifier.js
init_checked_fetch();
init_modules_watch_stub();
init_formatting();

// src/utils/fetch-timeout.js
init_checked_fetch();
init_modules_watch_stub();
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
    buyerLink: `${baseUrl}/buyer-order.html?id=${encodeURIComponent(orderId)}`,
    adminLink: `${baseUrl}/order-detail.html?id=${encodeURIComponent(orderId)}&admin=1`
  };
}
__name(enrichOrderData, "enrichOrderData");
async function sendOrderNotificationEmails(env, orderData = {}) {
  const apiKey = String(env.BREVO_API_KEY || "").trim();
  if (!apiKey) {
    return { skipped: true, reason: "BREVO_API_KEY missing" };
  }
  const data = await enrichOrderData(env, orderData);
  if (!data.orderId) {
    return { skipped: true, reason: "Missing orderId" };
  }
  const fromEmail = resolveFromEmail(env);
  const fromName = resolveFromName(env);
  const adminEmail = resolveAdminEmail(env, orderData);
  const buyerEmail = data.customerEmail;
  if (!fromEmail) {
    return { skipped: true, reason: "Missing sender email" };
  }
  const tasks = [];
  if (buyerEmail) {
    tasks.push(sendBrevoEmail(env, {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: buyerEmail }],
      subject: `Order Confirmed #${data.orderId} - ${data.productTitle}`,
      htmlContent: buildBuyerHtml(data),
      textContent: buildBuyerText(data),
      tags: ["order", "buyer", "confirmation"]
    }));
  }
  if (adminEmail) {
    tasks.push(sendBrevoEmail(env, {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: adminEmail }],
      subject: `New Order #${data.orderId} - ${data.productTitle}`,
      htmlContent: buildAdminHtml(data),
      textContent: buildAdminText(data),
      tags: ["order", "admin", "new-order"]
    }));
  }
  if (!tasks.length) {
    return { skipped: true, reason: "No buyer/admin email configured" };
  }
  const settled = await Promise.allSettled(tasks);
  const failures = settled.filter((x) => x.status === "rejected");
  if (failures.length) {
    console.error("Order email(s) failed:", failures.map((f) => f.reason?.message || f.reason));
  }
  return {
    attempted: tasks.length,
    failed: failures.length,
    success: failures.length === 0
  };
}
__name(sendOrderNotificationEmails, "sendOrderNotificationEmails");

// src/controllers/webhooks.js
init_checked_fetch();
init_modules_watch_stub();
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
    trackingUrl: orderData.trackingUrl || orderData.tracking_url
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
    videoUrl: orderData.videoUrl || orderData.video_url
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
init_checked_fetch();
init_modules_watch_stub();
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
    await sendOrderNotificationEmails(env, {
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
    await sendOrderNotificationEmails(env, {
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
  notifyCustomerOrderDelivered(env, {
    orderId,
    email: customerEmail,
    productTitle: orderResult?.product_title || "Your Order"
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
          deliveryUrl: downloadUrl || deliveredVideoUrl,
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
  const orderResult = await env.DB.prepare(
    "SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?"
  ).bind(body.orderId).first();
  await env.DB.prepare(
    "UPDATE orders SET revision_requested=1, revision_count=revision_count+1, revision_reason=?, status=? WHERE order_id=?"
  ).bind(body.reason || "No reason provided", "revision", body.orderId).run();
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl && orderResult) {
      let customerEmail = "";
      try {
        const decrypted = JSON.parse(orderResult.encrypted_data);
        customerEmail = decrypted.email || "";
      } catch (e) {
        console.warn("Could not decrypt order data for email");
      }
      const gsPayload = {
        event: "order.revision_requested",
        data: {
          orderId: body.orderId,
          productTitle: orderResult.product_title || "Your Order",
          customerEmail,
          revisionReason: body.reason || "No reason provided",
          revisionCount: (orderResult.revision_count || 0) + 1,
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
init_checked_fetch();
init_modules_watch_stub();
init_formatting();
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
  let sql = "SELECT r.*, p.title as product_title FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.status = ?";
  const binds = ["approved"];
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
  return isAdminBypassCache ? json({ reviews }) : cachedJson({ reviews }, 120);
}
__name(getReviews, "getReviews");
async function getProductReviews(env, productId) {
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
  return json({ reviews });
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
async function addReview(env, body) {
  if (!body.productId || !body.rating) return json({ error: "productId and rating required" }, 400);
  const authorName = String(body.author || "Customer").trim().substring(0, REVIEW_LIMITS.author_name);
  const comment = String(body.comment || "").trim().substring(0, REVIEW_LIMITS.comment);
  const rating = Math.min(REVIEW_LIMITS.rating_max, Math.max(REVIEW_LIMITS.rating_min, parseInt(body.rating) || 5));
  if (authorName.length < 1) {
    return json({ error: "Name is required" }, 400);
  }
  if (comment.length > 0 && comment.length < 3) {
    return json({ error: "Comment must be at least 3 characters" }, 400);
  }
  await env.DB.prepare(
    "INSERT INTO reviews (product_id, author_name, rating, comment, status, order_id, show_on_product, delivered_video_url, delivered_thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    Number(body.productId),
    authorName,
    rating,
    comment,
    "approved",
    body.orderId || null,
    body.showOnProduct !== void 0 ? body.showOnProduct ? 1 : 0 : 1,
    body.deliveredVideoUrl || null,
    body.deliveredThumbnailUrl || null
  ).run();
  let productTitle = "";
  try {
    const product = await env.DB.prepare("SELECT title FROM products WHERE id = ?").bind(Number(body.productId)).first();
    productTitle = product?.title || "";
  } catch (e) {
  }
  notifyReviewSubmitted(env, { productTitle, rating, authorName, comment }).catch(() => {
  });
  return json({ success: true });
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

// src/controllers/chat.js
init_checked_fetch();
init_modules_watch_stub();
init_formatting();

// src/utils/validation.js
init_checked_fetch();
init_modules_watch_stub();
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
      await Promise.all(otherIds.map(async (sid) => {
        await env.DB.prepare(
          `UPDATE chat_messages SET session_id = ? WHERE session_id = ?`
        ).bind(canonicalId, sid).run();
        await env.DB.prepare(
          `DELETE FROM chat_sessions WHERE id = ?`
        ).bind(sid).run();
      }));
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
init_checked_fetch();
init_modules_watch_stub();
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
            await sendOrderNotificationEmails(env, {
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
init_checked_fetch();
init_modules_watch_stub();
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
        brand_name: "WishVideo",
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
        await sendOrderNotificationEmails(env, {
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
            await sendOrderNotificationEmails(env, {
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
init_checked_fetch();
init_modules_watch_stub();
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
init_checked_fetch();
init_modules_watch_stub();
var gatewaysCache = null;
var cacheTime2 = 0;
var CACHE_TTL2 = 6e4;
var migrationDone = false;
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
async function ensureTable(env) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(`
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
    `).run();
    const columns = ["gateway_type", "whop_product_id", "whop_api_key", "whop_theme"];
    for (const col of columns) {
      try {
        await env.DB.prepare(`ALTER TABLE payment_gateways ADD COLUMN ${col} TEXT DEFAULT ''`).run();
      } catch (e) {
      }
    }
    if (!migrationDone) {
      await migrateLegacyWhopSettings(env);
      migrationDone = true;
    }
  } catch (e) {
    console.error("Payment gateways table error:", e);
  }
}
__name(ensureTable, "ensureTable");
async function migrateLegacyWhopSettings(env) {
  try {
    const existingWhop = await env.DB.prepare(
      "SELECT id FROM payment_gateways WHERE gateway_type = ? LIMIT 1"
    ).bind("whop").first();
    if (existingWhop) {
      console.log("Whop gateway already exists, skipping migration");
      return;
    }
    const settingsRow = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = ?"
    ).bind("whop").first();
    let legacySettings = {};
    if (settingsRow && settingsRow.value) {
      try {
        legacySettings = JSON.parse(settingsRow.value);
      } catch (e) {
        console.log("Failed to parse legacy Whop settings:", e);
      }
    }
    const productId = legacySettings.default_product_id || legacySettings.product_id || "";
    const webhookSecret = legacySettings.webhook_secret || env.WHOP_WEBHOOK_SECRET || "";
    const theme = legacySettings.theme || "light";
    const hasEnvApiKey = !!env.WHOP_API_KEY;
    const hasLegacySettings = !!settingsRow;
    if (!hasEnvApiKey && !hasLegacySettings && !productId) {
      console.log("No Whop configuration found (no env.WHOP_API_KEY, no legacy settings)");
      return;
    }
    const webhookUrl = "/api/whop/webhook";
    await env.DB.prepare(`
      INSERT INTO payment_gateways
      (name, gateway_type, webhook_url, webhook_secret, is_enabled, whop_product_id, whop_api_key, whop_theme)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      "Whop",
      "whop",
      webhookUrl,
      webhookSecret,
      1,
      // enabled
      productId,
      "",
      // Don't store API key in DB - use env variable WHOP_API_KEY
      theme
    ).run();
    console.log("\u2705 Whop gateway created in payment_gateways");
    console.log("   Product ID:", productId || "(not set - please configure in Payment tab)");
    console.log("   API Key: Using env.WHOP_API_KEY =", hasEnvApiKey ? "SET" : "NOT SET");
    gatewaysCache = null;
  } catch (e) {
    console.error("Failed to migrate legacy Whop settings:", e);
  }
}
__name(migrateLegacyWhopSettings, "migrateLegacyWhopSettings");
async function getPaymentGateways(env) {
  const now = Date.now();
  if (gatewaysCache && now - cacheTime2 < CACHE_TTL2) {
    return gatewaysCache;
  }
  await ensureTable(env);
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
    await ensureTable(env);
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
    await ensureTable(env);
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
    await ensureTable(env);
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
    await ensureTable(env);
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
    await ensureTable(env);
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
      return new Response(JSON.stringify({ received: true, gateway: "unknown" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    console.log(`Processing webhook for gateway: ${gateway.name}`, {
      gateway_type: gateway.gateway_type,
      event_type: payload.type || payload.event_type
    });
    if (gateway.webhook_secret && gateway.webhook_secret.trim()) {
      const isValid = await verifyWebhookSignature(rawBody, headers, gateway.webhook_secret);
      if (!isValid) {
        console.error(`Invalid signature for gateway: ${gateway.name}`);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    await processPaymentEvent(env, gateway, payload, headers);
    return new Response(JSON.stringify({
      received: true,
      gateway: gateway.name,
      processed: true
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Universal webhook error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
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
    await env.DB.prepare(`
      INSERT INTO webhook_events (gateway, event_type, payload, processed_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(gateway.name, eventType, JSON.stringify(payload)).run();
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
  return new Response(JSON.stringify({
    success: true,
    message: "Universal Payment Gateway System is operational",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    headers: { "Content-Type": "application/json" }
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
init_checked_fetch();
init_modules_watch_stub();
init_formatting();
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
  const r = await env.DB.prepare(
    "SELECT id, slug, title, meta_description, page_type, is_default, created_at, updated_at FROM pages WHERE status = ? ORDER BY id DESC"
  ).bind("published").all();
  const pages = (r.results || []).map((page) => {
    if (page.created_at) page.created_at = toISO8601(page.created_at);
    if (page.updated_at) page.updated_at = toISO8601(page.updated_at);
    return page;
  });
  return cachedJson({ pages }, 120);
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
  const row = await env.DB.prepare("SELECT * FROM pages WHERE slug = ?").bind(slug).first();
  if (!row) return json({ error: "Page not found" }, 404);
  if (row.created_at) row.created_at = toISO8601(row.created_at);
  if (row.updated_at) row.updated_at = toISO8601(row.updated_at);
  return json({ page: row });
}
__name(getPage, "getPage");
async function getDefaultPage(env, pageType) {
  try {
    const row = await env.DB.prepare(
      "SELECT * FROM pages WHERE page_type = ? AND is_default = 1 AND status = ?"
    ).bind(pageType, "published").first();
    if (!row) return json({ page: null });
    if (row.created_at) row.created_at = toISO8601(row.created_at);
    if (row.updated_at) row.updated_at = toISO8601(row.updated_at);
    row.public_url = isRootHomePage(row.page_type, row.is_default) ? "/" : `/${row.slug}`;
    return json({ page: row });
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
  const finalSlug = forcedHomeSlug ? "home" : sanitizePageSlug(
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
    const slugOwner = await env.DB.prepare(
      "SELECT id FROM pages WHERE slug = ? LIMIT 1"
    ).bind(finalSlug).first();
    if (slugOwner && Number(slugOwner.id) !== updateId) {
      return json({ error: "slug already exists" }, 409);
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
  const name = forcedHomeSlug ? "home" : sanitizePageSlug((body.name || "").trim());
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
    const slugOwner = await env.DB.prepare("SELECT id FROM pages WHERE slug = ? LIMIT 1").bind(name).first();
    if (slugOwner && Number(slugOwner.id) !== Number(existing.id)) {
      return json({ error: "slug already exists" }, 409);
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
init_checked_fetch();
init_modules_watch_stub();
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
    return cachedJson({
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
    });
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
    const blog = await env.DB.prepare(`
      SELECT * FROM blogs WHERE slug = ? AND status = 'published'
    `).bind(slug).first();
    if (!blog) {
      return json({ error: "Blog post not found" }, 404);
    }
    return json({ success: true, blog });
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
init_checked_fetch();
init_modules_watch_stub();
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
init_checked_fetch();
init_modules_watch_stub();
init_formatting();
var forumSchemaValidated = false;
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
async function normalizeExistingForumQuestionSlugs(env) {
  const rows = await env.DB.prepare(`
    SELECT id, title, slug
    FROM forum_questions
    ORDER BY created_at ASC, id ASC
  `).all();
  const questions = rows.results || [];
  const used = /* @__PURE__ */ new Set();
  for (const question of questions) {
    const stableSeed = question?.id || Date.now();
    const preferredBase = buildForumQuestionBaseSlug(question?.slug || question?.title || "", stableSeed);
    let candidate = preferredBase;
    let suffix = 1;
    while (used.has(candidate)) {
      candidate = `${preferredBase}-${suffix++}`;
    }
    if (String(question?.slug || "") !== candidate) {
      await env.DB.prepare(`
        UPDATE forum_questions
        SET slug = ?, updated_at = ?
        WHERE id = ?
      `).bind(candidate, Date.now(), question.id).run();
    }
    used.add(candidate);
  }
  await env.DB.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_questions_slug_unique
    ON forum_questions(slug)
  `).run();
}
__name(normalizeExistingForumQuestionSlugs, "normalizeExistingForumQuestionSlugs");
async function ensureForumTables(env) {
  if (forumSchemaValidated) return;
  try {
    let repliesOk = false;
    let questionsOk = false;
    try {
      await env.DB.prepare(`SELECT question_id FROM forum_replies LIMIT 1`).first();
      repliesOk = true;
    } catch (e) {
    }
    try {
      await env.DB.prepare(`SELECT email FROM forum_questions LIMIT 1`).first();
      questionsOk = true;
    } catch (e) {
    }
    if (repliesOk && questionsOk) {
      await normalizeExistingForumQuestionSlugs(env);
      forumSchemaValidated = true;
      return;
    }
    if (!repliesOk) {
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
      if (existingReplies.length > 0) {
        const batch = existingReplies.map(
          (r) => env.DB.prepare(`INSERT INTO forum_replies (id, question_id, name, email, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(r.id || null, r.question_id || 0, r.name || "", r.email || "", r.content || "", r.status || "pending", r.created_at || Date.now())
        );
        for (let i = 0; i < batch.length; i += 10) {
          await Promise.all(batch.slice(i, i + 10).map((stmt) => stmt.run().catch(() => {
          })));
        }
      }
    }
    if (!questionsOk) {
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
      if (existingQuestions.length > 0) {
        const usedForumSlugs = /* @__PURE__ */ new Set();
        const buildRestoredForumSlug = /* @__PURE__ */ __name((question, fallbackIndex) => {
          const baseSlug = buildForumQuestionBaseSlug(question?.slug || question?.title || "", fallbackIndex);
          let candidate = baseSlug;
          let suffix = 1;
          while (usedForumSlugs.has(candidate)) {
            candidate = `${baseSlug}-${suffix++}`;
          }
          usedForumSlugs.add(candidate);
          return candidate;
        }, "buildRestoredForumSlug");
        const batch = existingQuestions.map(
          (q) => env.DB.prepare(`INSERT INTO forum_questions (id, title, slug, content, name, email, status, reply_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(q.id || null, q.title || "", buildRestoredForumSlug(q, q.id || Date.now()), q.content || "", q.name || "", q.email || "", q.status || "pending", q.reply_count || 0, q.created_at || Date.now(), q.updated_at || Date.now())
        );
        for (let i = 0; i < batch.length; i += 10) {
          await Promise.all(batch.slice(i, i + 10).map((stmt) => stmt.run().catch(() => {
          })));
        }
      }
    }
    await normalizeExistingForumQuestionSlugs(env);
    forumSchemaValidated = true;
  } catch (e) {
    console.error("Forum table creation error:", e);
  }
}
__name(ensureForumTables, "ensureForumTables");
async function getPublishedQuestions(env, url) {
  try {
    await ensureForumTables(env);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
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
    return cachedJson({
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
    }, 120);
  } catch (err) {
    console.error("getPublishedQuestions error:", err);
    return json({ error: err.message, questions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }, 500);
  }
}
__name(getPublishedQuestions, "getPublishedQuestions");
async function getQuestion(env, slug) {
  try {
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
    return json({
      success: true,
      question,
      replies: replies.results || []
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getQuestion, "getQuestion");
async function getQuestionById(env, id) {
  try {
    await ensureForumTables(env);
    if (!id) {
      return json({ error: "Question ID required" }, 400);
    }
    const question = await env.DB.prepare(`
      SELECT * FROM forum_questions WHERE id = ? AND status = 'approved'
    `).bind(parseInt(id)).first();
    if (!question) {
      return json({ error: "Question not found" }, 404);
    }
    return json({
      success: true,
      question
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
__name(getQuestionById, "getQuestionById");
async function getQuestionReplies(env, questionId) {
  try {
    await ensureForumTables(env);
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
    await ensureForumTables(env);
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
    await ensureForumTables(env);
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
    await ensureForumTables(env);
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
    await ensureForumTables(env);
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
    await ensureForumTables(env);
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

// src/controllers/admin.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/upload-helper.js
init_checked_fetch();
init_modules_watch_stub();
function sanitizeFilename(filename) {
  return String(filename || "file").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").substring(0, 200);
}
__name(sanitizeFilename, "sanitizeFilename");

// src/controllers/admin.js
init_formatting();
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
async function ensurePaymentGatewaysTable(env) {
  try {
    await env.DB.prepare(`
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
    `).run();
  } catch (e) {
  }
}
__name(ensurePaymentGatewaysTable, "ensurePaymentGatewaysTable");
async function getWhopSettings(env) {
  await ensurePaymentGatewaysTable(env);
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
  await ensurePaymentGatewaysTable(env);
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
async function uploadEncryptedFile(env, req, url) {
  return uploadTempFile(env, req, url);
}
__name(uploadEncryptedFile, "uploadEncryptedFile");
var brandingCache = null;
var brandingCacheTime = 0;
var BRANDING_CACHE_TTL = 3e5;
async function getBrandingSettings(env) {
  const now = Date.now();
  if (brandingCache && now - brandingCacheTime < BRANDING_CACHE_TTL) {
    return json({ success: true, branding: brandingCache });
  }
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("site_branding").first();
    if (row?.value) {
      brandingCache = JSON.parse(row.value);
      brandingCacheTime = now;
      return json({ success: true, branding: brandingCache });
    }
    brandingCache = { logo_url: "", favicon_url: "" };
    brandingCacheTime = now;
    return json({ success: true, branding: brandingCache });
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
async function getSiteComponents(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("site_components").first();
    if (row && row.value) {
      try {
        const components = JSON.parse(row.value);
        return json({ components });
      } catch (e) {
        return json({ components: null });
      }
    }
    return json({ components: null });
  } catch (e) {
    console.error("Failed to get components:", e);
    return json({ components: null, error: e.message });
  }
}
__name(getSiteComponents, "getSiteComponents");
async function saveSiteComponents(env, body) {
  try {
    const dataToSave = body.data || body;
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
init_checked_fetch();
init_modules_watch_stub();
init_formatting();
var cache = null;
var cacheTime3 = 0;
var TTL = 6e4;
var DEFAULT = {
  site_url: "",
  site_title: "",
  site_description: "",
  sitemap_enabled: 1,
  robots_enabled: 1,
  og_enabled: 0,
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
async function ensureTable2(env) {
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
    console.error("SEO table error:", e);
  }
}
__name(ensureTable2, "ensureTable");
async function getSettings(env) {
  const now = Date.now();
  if (cache && now - cacheTime3 < TTL) return cache;
  await ensureTable2(env);
  try {
    const row = await env.DB.prepare("SELECT * FROM seo_minimal WHERE id = 1").first();
    cache = row || DEFAULT;
    cacheTime3 = now;
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
    await ensureTable2(env);
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
  const urls2 = [];
  urls2.push({
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
      urls2.push({
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
      urls2.push({
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
      urls2.push({
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
      urls2.push({
        loc: `${base}/forum/${q.slug}`,
        lastmod,
        changefreq: "weekly",
        priority: 0.5
      });
    }
  } catch (e) {
  }
  urls2.push(
    { loc: `${base}/products`, changefreq: "daily", priority: 0.9 },
    { loc: `${base}/blog`, changefreq: "daily", priority: 0.8 },
    { loc: `${base}/forum`, changefreq: "daily", priority: 0.7 }
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls2.slice(0, 5e4).map((u) => `  <url>
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
init_checked_fetch();
init_modules_watch_stub();
var analyticsCache = null;
var analyticsCacheTime = 0;
var ANALYTICS_CACHE_TTL = 6e4;
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
async function ensureAnalyticsTable(env) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS analytics_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        ga_id TEXT,
        google_verify TEXT,
        bing_verify TEXT,
        fb_pixel_id TEXT,
        custom_script TEXT
      )
    `).run();
    const columns = [
      ["ga_id", "TEXT"],
      ["google_verify", "TEXT"],
      ["bing_verify", "TEXT"],
      ["fb_pixel_id", "TEXT"],
      ["custom_script", "TEXT"]
    ];
    for (const [col, def] of columns) {
      try {
        await env.DB.prepare(`ALTER TABLE analytics_settings ADD COLUMN ${col} ${def}`).run();
      } catch (e) {
      }
    }
  } catch (e) {
    console.error("Analytics table error:", e);
  }
}
__name(ensureAnalyticsTable, "ensureAnalyticsTable");
async function getAnalyticsSettings(env) {
  const now = Date.now();
  if (analyticsCache && now - analyticsCacheTime < ANALYTICS_CACHE_TTL) {
    return analyticsCache;
  }
  await ensureAnalyticsTable(env);
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
    await ensureAnalyticsTable(env);
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

// src/controllers/email.js
init_checked_fetch();
init_modules_watch_stub();
init_formatting();
var templatesCache = null;
var templatesCacheTime = 0;
var TEMPLATES_CACHE_TTL = 6e4;
var BREVO_API_URL2 = "https://api.brevo.com/v3/smtp/email";
var BREVO_TIMEOUT_MS2 = 1e4;
async function ensureEmailTables(env) {
  if (!env.DB) return;
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT UNIQUE,
      subject TEXT,
      body TEXT,
      updated_at INTEGER
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      name TEXT,
      source TEXT,
      created_at INTEGER
    )
  `).run();
}
__name(ensureEmailTables, "ensureEmailTables");
async function getEmailTemplates(env, type = null) {
  const now = Date.now();
  if (templatesCache && now - templatesCacheTime < TEMPLATES_CACHE_TTL) {
    if (type) {
      return templatesCache.filter((t) => t.type === type);
    }
    return templatesCache;
  }
  await ensureEmailTables(env);
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
    await ensureEmailTables(env);
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
    await ensureEmailTables(env);
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
init_checked_fetch();
init_modules_watch_stub();
init_formatting();
var CACHE_TTL3 = 6e4;
var EMPTY_RULES = Object.freeze({ noindex: [], index: [] });
var PREVIEW_LIMIT = 250;
var rulesCache = null;
var cacheTime4 = 0;
function clearRulesCache() {
  rulesCache = null;
  cacheTime4 = 0;
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
function wildcardToRegex(pattern, caseInsensitive = false) {
  const escaped = pattern.split("*").map((part) => escapeRegExp(part)).join(".*");
  return new RegExp(`^${escaped}$`, caseInsensitive ? "i" : "");
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
async function ensureTables(env) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS noindex_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url_pattern TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS index_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url_pattern TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } catch (e) {
    console.error("SEO visibility table error:", e);
  }
}
__name(ensureTables, "ensureTables");
async function getRulePatterns(env) {
  const now = Date.now();
  if (rulesCache && now - cacheTime4 < CACHE_TTL3) return rulesCache;
  await ensureTables(env);
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
    await ensureTables(env);
    const mode = normalizeMode(body?.mode);
    const rule = normalizeRuleInput(body?.url);
    if (!rule) {
      return json({ error: "Valid URL pattern is required (relative path or full http/https URL)" }, 400);
    }
    const table = mode === "index" ? "index_pages" : "noindex_pages";
    await env.DB.prepare(`INSERT OR IGNORE INTO ${table} (url_pattern) VALUES (?)`).bind(rule).run();
    clearRulesCache();
    return json({ success: true, mode, url: rule });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(addNoindexUrl, "addNoindexUrl");
async function removeNoindexUrl(env, body) {
  try {
    await ensureTables(env);
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
    clearRulesCache();
    return json({ success: true, mode, url: rule });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(removeNoindexUrl, "removeNoindexUrl");
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

// src/controllers/backup.js
init_checked_fetch();
init_modules_watch_stub();

// src/middleware/api-auth.js
init_checked_fetch();
init_modules_watch_stub();
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
async function ensureBackupsTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        size INTEGER DEFAULT 0,
        media_count INTEGER DEFAULT 0,
        r2_key TEXT
      )`
  ).run();
  const info = await env.DB.prepare("PRAGMA table_info(backups)").all();
  const cols = new Set((info?.results || []).map((r) => r.name));
  if (!cols.has("created_at") && cols.has("timestamp")) {
    await env.DB.prepare("ALTER TABLE backups ADD COLUMN created_at DATETIME").run();
    await env.DB.prepare("UPDATE backups SET created_at = timestamp WHERE created_at IS NULL").run();
    cols.add("created_at");
  } else if (!cols.has("created_at")) {
    await env.DB.prepare("ALTER TABLE backups ADD COLUMN created_at DATETIME").run();
    cols.add("created_at");
  }
  if (!cols.has("size")) {
    await env.DB.prepare("ALTER TABLE backups ADD COLUMN size INTEGER DEFAULT 0").run();
    cols.add("size");
  }
  if (!cols.has("media_count")) {
    await env.DB.prepare("ALTER TABLE backups ADD COLUMN media_count INTEGER DEFAULT 0").run();
    cols.add("media_count");
  }
  if (!cols.has("r2_key")) {
    await env.DB.prepare("ALTER TABLE backups ADD COLUMN r2_key TEXT").run();
    cols.add("r2_key");
  }
}
__name(ensureBackupsTable, "ensureBackupsTable");
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
    await ensureBackupsTable(env);
    const res = await env.DB.prepare("SELECT id, created_at as timestamp, size, media_count FROM backups ORDER BY created_at DESC LIMIT 30").all();
    return json({ ok: true, backups: res?.results || [] });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(getBackupHistory, "getBackupHistory");
async function createBackupInternal(env, meta = {}) {
  await ensureBackupsTable(env);
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
    await ensureBackupsTable(env);
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
    await ensureBackupsTable(env);
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
init_checked_fetch();
init_modules_watch_stub();
var settingsCache = null;
var cacheTime5 = 0;
var CACHE_TTL4 = 6e4;
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
async function ensureTable3(env) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS clean_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        site_title TEXT NOT NULL,
        site_description TEXT NOT NULL,
        admin_email TEXT NOT NULL,
        enable_paypal INTEGER DEFAULT 0,
        enable_stripe INTEGER DEFAULT 0,
        paypal_client_id TEXT,
        paypal_secret TEXT,
        stripe_pub_key TEXT,
        stripe_secret_key TEXT,
        enable_rate_limit INTEGER DEFAULT 1,
        rate_limit INTEGER DEFAULT 10
      )
    `).run();
    const columns = [
      ["site_title", "TEXT DEFAULT ''"],
      ["site_description", "TEXT DEFAULT ''"],
      ["admin_email", "TEXT DEFAULT ''"],
      ["enable_paypal", "INTEGER DEFAULT 0"],
      ["enable_stripe", "INTEGER DEFAULT 0"],
      ["paypal_client_id", "TEXT DEFAULT ''"],
      ["paypal_secret", "TEXT DEFAULT ''"],
      ["stripe_pub_key", "TEXT DEFAULT ''"],
      ["stripe_secret_key", "TEXT DEFAULT ''"],
      ["enable_rate_limit", "INTEGER DEFAULT 1"],
      ["rate_limit", "INTEGER DEFAULT 10"]
    ];
    for (const [col, def] of columns) {
      try {
        await env.DB.prepare(`ALTER TABLE clean_settings ADD COLUMN ${col} ${def}`).run();
      } catch (e) {
      }
    }
  } catch (e) {
    console.error("Settings table error:", e);
  }
}
__name(ensureTable3, "ensureTable");
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
  if (settingsCache && now - cacheTime5 < CACHE_TTL4) {
    return settingsCache;
  }
  await ensureTable3(env);
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
    await ensureTable3(env);
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
init_checked_fetch();
init_modules_watch_stub();
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
async function ensureMediaTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      r2_key TEXT NOT NULL UNIQUE,
      size_bytes INTEGER DEFAULT 0,
      content_type TEXT DEFAULT 'video/mp4',
      uploaded_at INTEGER NOT NULL
    )
  `).run();
  const columns = [
    ["filename", "TEXT DEFAULT 'video.mp4'"],
    ["r2_key", "TEXT DEFAULT ''"],
    ["size_bytes", "INTEGER DEFAULT 0"],
    ["content_type", "TEXT DEFAULT 'video/mp4'"],
    ["uploaded_at", "INTEGER DEFAULT 0"]
  ];
  for (const [column, definition] of columns) {
    try {
      await env.DB.prepare(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN ${column} ${definition}`
      ).run();
    } catch (_) {
    }
  }
}
__name(ensureMediaTable, "ensureMediaTable");
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
    await ensureMediaTable(env);
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
    await ensureMediaTable(env);
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
    await ensureMediaTable(env);
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
    await ensureMediaTable(env);
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
init_checked_fetch();
init_modules_watch_stub();
var couponsCache = null;
var couponsCacheTime = 0;
var COUPONS_CACHE_TTL = 6e4;
async function getCoupons(env) {
  try {
    await env.DB.prepare(`
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
    `).run();
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
  const now = Date.now();
  if (couponsCache && now - couponsCacheTime < COUPONS_CACHE_TTL) {
    return cachedJson({ success: true, coupons: couponsCache }, 60);
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
    return cachedJson({ success: true, coupons: couponsCache }, 60);
  } catch (e) {
    console.error("Get active coupons error:", e);
    return json({ success: true, coupons: [] });
  }
}
__name(getActiveCoupons, "getActiveCoupons");
async function getCouponsEnabled(env) {
  try {
    await env.DB.prepare(`
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
    `).run();
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
init_checked_fetch();
init_modules_watch_stub();
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

// src/utils/api-protector.js
init_checked_fetch();
init_modules_watch_stub();

// src/config/api-permissions.js
init_checked_fetch();
init_modules_watch_stub();

// src/router.js
var HEAD_SAFE_EXACT_API_PATHS = /* @__PURE__ */ new Set([
  "/api/health",
  "/api/time",
  "/api/debug",
  "/api/products",
  "/api/products/list",
  "/api/reviews",
  "/api/blogs/published",
  "/api/forum/questions",
  "/api/forum/question-replies",
  "/api/forum/question-by-id",
  "/api/forum/sidebar",
  "/api/payment/methods",
  "/api/settings/components",
  "/api/settings/branding",
  "/api/settings/whop",
  "/api/settings/cobalt",
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
function isHeadCompatibleApiPath(path) {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) return false;
  if (HEAD_SAFE_EXACT_API_PATHS.has(normalizedPath)) return true;
  return HEAD_SAFE_API_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}
__name(isHeadCompatibleApiPath, "isHeadCompatibleApiPath");
function toHeadResponse(response) {
  if (!response) return response;
  return new Response(null, {
    status: response.status,
    headers: new Headers(response.headers)
  });
}
__name(toHeadResponse, "toHeadResponse");
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
    return getDebugInfo(env);
  }
  if (method === "GET" && path === "/api/whop/test-webhook") {
    return testWebhook2();
  }
  if (method === "POST" && path === "/api/upload/temp-file") {
    return uploadTempFile(env, req, url);
  }
  if (method === "POST" && path === "/api/upload/archive-credentials") {
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
    return getOrders(env);
  }
  if (method === "POST" && (path === "/api/order/create" || path === "/submit-order")) {
    const body = await req.json();
    if (body.manualOrder === true) {
      return createManualOrder(env, body);
    }
    return createOrder(env, body);
  }
  if (method === "GET" && path.startsWith("/api/order/buyer/")) {
    const orderId = path.split("/").pop();
    return getBuyerOrder(env, orderId);
  }
  if (method === "DELETE" && path === "/api/order/delete") {
    const id = url.searchParams.get("id");
    return deleteOrder(env, id);
  }
  if (method === "POST" && path === "/api/admin/orders/delete-all") {
    return deleteAllOrders(env);
  }
  if (method === "POST" && path === "/api/order/update") {
    const body = await req.json();
    return updateOrder(env, body);
  }
  if (method === "POST" && path === "/api/order/deliver") {
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
    const body = await req.json();
    return updateArchiveLink(env, body);
  }
  if (method === "POST" && path === "/api/order/tip-paid") {
    const body = await req.json();
    return markTipPaid(env, body);
  }
  if (method === "POST" && path === "/api/order/upload-encrypted-file") {
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
  if (method === "GET" && path === "/api/settings/whop") {
    return getWhopSettings(env);
  }
  if (method === "POST" && path === "/api/settings/whop") {
    const body = await req.json();
    return saveWhopSettings(env, body);
  }
  if (method === "GET" && path === "/api/settings/branding") {
    return getBrandingSettings(env);
  }
  if (method === "POST" && path === "/api/settings/branding") {
    const body = await req.json();
    return saveBrandingSettings(env, body);
  }
  if (method === "GET" && path === "/api/settings/cobalt") {
    return getCobaltSettings(env);
  }
  if (method === "POST" && path === "/api/settings/cobalt") {
    const body = await req.json();
    return saveCobaltSettings(env, body);
  }
  if (method === "GET" && path === "/api/settings/components") {
    return getSiteComponents(env);
  }
  if (method === "POST" && path === "/api/settings/components") {
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
    const key = url.searchParams.get("key");
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
init_checked_fetch();
init_modules_watch_stub();
init_formatting();

// src/index.js
init_formatting();

// src/controllers/nojs.js
init_checked_fetch();
init_modules_watch_stub();
init_formatting();
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
  const title = escapeHtml(opts.title || "WishVideo");
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
      <a class="brand" href="${opts.admin ? "/admin" : "/"}">WishVideo No-JS</a>
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
  return new Response(html, { status: opts.status || 200, headers });
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
    title: page?.title || opts.title || "WishVideo Store",
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
    title: "WishVideo Store",
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
      <h3><a href="/forum/${encodeURIComponent(q.slug || "")}">${escapeHtml(q.title || "Untitled")}</a></h3>
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
  const question = await env.DB.prepare(`
    SELECT *
    FROM forum_questions
    WHERE slug = ? AND status = 'approved'
    LIMIT 1
  `).bind(slug).first();
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
    "SELECT slug FROM forum_questions WHERE id = ? LIMIT 1"
  ).bind(Number(questionId)).first();
  const back = question ? `/forum/${encodeURIComponent(question.slug || "")}` : "/forum";
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
  if (method === "POST" && path === "/admin/login") {
    const formData = await req.formData();
    const email = formData.get("email") || "";
    const password = formData.get("password") || "";
    const adminEmail = env.ADMIN_EMAIL || "admin@prankwish.com";
    const adminPassword = env.ADMIN_PASSWORD || "admin123";
    if (email === adminEmail && password === adminPassword) {
      const cookie = await createAdminSessionCookie(env);
      return Response.redirect(new URL("/admin", url.origin).toString(), 302, {
        headers: cookie ? { "Set-Cookie": cookie } : {}
      });
    }
    return Response.redirect(new URL("/admin/login?err=Invalid credentials", url.origin).toString(), 302);
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

// src/index.js
init_component_ssr();

// src/utils/homepage-ssr.js
init_checked_fetch();
init_modules_watch_stub();
init_formatting();

// src/utils/legal-pages.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/cache-headers.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/cache-keys.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/hostname-helpers.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/feature-flags.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/path-detection.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/html-entities.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/html-sanitizer.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/url-helpers.js
init_checked_fetch();
init_modules_watch_stub();

// src/ssr/product-player.js
init_checked_fetch();
init_modules_watch_stub();

// src/ssr/product-ssr.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/price-formatter.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/star-renderer.js
init_checked_fetch();
init_modules_watch_stub();

// src/ssr/product-renderer.js
init_checked_fetch();
init_modules_watch_stub();

// src/ssr/review-ssr.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/date-formatter.js
init_checked_fetch();
init_modules_watch_stub();

// src/ssr/review-media.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/json-helpers.js
init_checked_fetch();
init_modules_watch_stub();

// src/routing/path-aliases.js
init_checked_fetch();
init_modules_watch_stub();
var CANONICAL_ALIAS_MAP = /* @__PURE__ */ new Map([
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
function shouldServeCanonicalAliasDirectly(pathname) {
  const raw = String(pathname || "/").trim() || "/";
  return DIRECT_INTERNAL_ALIAS_PATHS.has(raw);
}
__name(shouldServeCanonicalAliasDirectly, "shouldServeCanonicalAliasDirectly");
function normalizeCanonicalPath(pathname) {
  let p = String(pathname || "/").trim() || "/";
  p = CANONICAL_ALIAS_MAP.get(p) || p;
  if (p.length > 1 && p.endsWith("/") && !p.startsWith("/admin/") && !p.startsWith("/api/")) {
    p = p.slice(0, -1);
  }
  return p || "/";
}
__name(normalizeCanonicalPath, "normalizeCanonicalPath");
function getCanonicalRedirectPath(pathname) {
  const raw = String(pathname || "/").trim() || "/";
  if (raw === "/admin/" || raw === "/api/") return null;
  if (raw.startsWith("/admin/") || raw.startsWith("/api/")) return null;
  if (raw === "/blog/" || raw === "/forum/" || raw === "/products/") return null;
  if (shouldServeCanonicalAliasDirectly(raw)) return null;
  const normalized = normalizeCanonicalPath(raw);
  return normalized !== raw ? normalized : null;
}
__name(getCanonicalRedirectPath, "getCanonicalRedirectPath");

// src/seo/seo-helpers.js
init_checked_fetch();
init_modules_watch_stub();

// src/seo/sitemap-helpers.js
init_checked_fetch();
init_modules_watch_stub();
var SITEMAP_MEMBERSHIP_TTL_MS = 2 * 60 * 1e3;

// src/seo/seo-tags.js
init_checked_fetch();
init_modules_watch_stub();
init_formatting();

// src/utils/html-injector.js
init_checked_fetch();
init_modules_watch_stub();

// src/components/global-components.js
init_checked_fetch();
init_modules_watch_stub();
var SITE_COMPONENTS_SSR_TTL_MS = 10 * 1e3;

// src/utils/settings-helper.js
init_checked_fetch();
init_modules_watch_stub();
var SETTINGS_CACHE_TTL = 30 * 1e3;

// src/ssr/query-helpers.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/db-helpers.js
init_checked_fetch();
init_modules_watch_stub();

// src/ssr/component-applier.js
init_checked_fetch();
init_modules_watch_stub();
init_component_ssr();

// src/utils/string-helpers.js
init_checked_fetch();
init_modules_watch_stub();

// src/index.js
async function requireAdmin2(req, env) {
  const cookie = req.headers.get("Cookie") || "";
  if (!cookie.includes("admin_session=")) {
    return { authorized: false, error: "No session" };
  }
  const sessionId = cookie.match(/admin_session=([^;]+)/)?.[1];
  if (!sessionId) {
    return { authorized: false, error: "No session ID" };
  }
  try {
    await initDB(env);
    const session = await env.DB.prepare(
      "SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > ?"
    ).bind(sessionId, Date.now()).first();
    if (!session) {
      return { authorized: false, error: "Invalid session" };
    }
    return { authorized: true, admin: session };
  } catch (e) {
    return { authorized: false, error: e.message };
  }
}
__name(requireAdmin2, "requireAdmin");
var src_default = {
  async fetch(request, env, ctx2) {
    if (!env) {
      return new Response("Missing environment", { status: 500 });
    }
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    if (method === "OPTIONS") {
      return handleOptions(request);
    }
    try {
      await initDB(env);
    } catch (e) {
      console.error("DB init error:", e.message);
    }
    try {
      if (env.ENABLE_NOJS_SSR === "true" || env.ENABLE_NOJS_SSR === "1") {
        const nojsResult = await handleNoJsRoutes(request, env, url, path, method);
        if (nojsResult) return nojsResult;
      }
    } catch (e) {
      console.error("NoJS route error:", e.message);
    }
    const isApi = path.startsWith("/api/") || path.startsWith("/admin/api/");
    if (isApi) {
      const apiResponse = await routeApiRequest(request, env, url, path, method);
      if (apiResponse) return apiResponse;
    }
    const redirectPath = getCanonicalRedirectPath(path);
    if (redirectPath && !path.startsWith("/api/")) {
      return Response.redirect(`${url.origin}${redirectPath}${url.search}`, 301);
    }
    if (path === "/blog" && !path.endsWith("/")) {
      return Response.redirect(`${url.origin}/blog/${url.search}`, 301);
    }
    if (path === "/forum" && !path.endsWith("/")) {
      return Response.redirect(`${url.origin}/forum/${url.search}`, 301);
    }
    if (path === "/products" && !path.endsWith("/")) {
      return Response.redirect(`${url.origin}/products/${url.search}`, 301);
    }
    if (path === "/robots.txt") {
      const robots = buildMinimalRobotsTxt(env);
      return new Response(robots, { headers: { "Content-Type": "text/plain" } });
    }
    if (path === "/sitemap.xml") {
      const sitemap = await buildMinimalSitemapXml(env, request);
      return new Response(sitemap.body, { headers: { "Content-Type": "application/xml" } });
    }
    try {
      const staticResponse = await env.ASSETS.fetch(request);
      if (staticResponse && staticResponse.status === 200) {
        const headers = new Headers(staticResponse.headers);
        headers.set("X-Worker-Version", VERSION || "0");
        return new Response(staticResponse.body, { status: staticResponse.status, headers });
      }
    } catch (e) {
      console.error("Asset fetch error:", e.message);
    }
    if (path === "/admin/login") {
      const loginPage = await renderNoJsAdminLoginPage(url);
      return new Response(loginPage, { headers: { "Content-Type": "text/html" } });
    }
    const adminMatch = path.match(/^\/admin(?:\/(.*))?$/);
    if (adminMatch) {
      const auth = await requireAdmin2(request, env);
      if (!auth.authorized) {
        return Response.redirect(`${url.origin}/admin/login`, 302);
      }
    }
    const productsResponse = await handleProductRouting(request, env, url, path);
    if (productsResponse) return productsResponse;
    return new Response("Not Found", { status: 404 });
  }
};

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_checked_fetch();
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_checked_fetch();
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-LDcSRV/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
init_checked_fetch();
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx2, dispatch2, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch: dispatch2,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx2, dispatch2, tail);
    }
  };
  return head(request, env, ctx2, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx2, dispatch2, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx2, dispatch2, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-LDcSRV/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx2) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx2);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx2) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx2);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx2, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx2) => {
      this.env = env;
      this.ctx = ctx2;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
