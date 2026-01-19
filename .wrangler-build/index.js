var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/config/cors.js
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
            sort_order INTEGER DEFAULT 0
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
function warmupDB(env, ctx2) {
  if (dbReady || !env.DB) return;
  if (ctx2 && ctx2.waitUntil) {
    ctx2.waitUntil(initDB(env).catch(() => {
    }));
  }
}
__name(warmupDB, "warmupDB");
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
    { table: "orders", column: "delivered_video_metadata", type: "TEXT" },
    { table: "orders", column: "tip_paid", type: "INTEGER DEFAULT 0" },
    { table: "orders", column: "tip_amount", type: "REAL" },
    { table: "reviews", column: "delivered_video_url", type: "TEXT" },
    { table: "reviews", column: "delivered_thumbnail_url", type: "TEXT" },
    { table: "chat_sessions", column: "blocked", type: "INTEGER DEFAULT 0" },
    { table: "chat_sessions", column: "last_message_content", type: "TEXT" },
    { table: "chat_sessions", column: "last_message_at", type: "DATETIME" },
    { table: "checkout_sessions", column: "metadata", type: "TEXT" }
  ];
  await Promise.allSettled(
    migrations.map(
      (m) => env.DB.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`).run().catch(() => {
      })
    )
  );
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

// src/controllers/products.js
var productsCache = null;
var productsCacheTime = 0;
var PRODUCTS_CACHE_TTL = 3e4;
var productSlugCache = /* @__PURE__ */ new Map();
var SLUG_CACHE_TTL = 3e5;
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
  let whereClause = "WHERE p.status = 'active'";
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
async function getProduct(env, id) {
  let row;
  if (isNaN(Number(id))) {
    row = await env.DB.prepare("SELECT * FROM products WHERE slug = ?").bind(id).first();
  } else {
    row = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(Number(id)).first();
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
      `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url 
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
  if (body.id) {
    const galleryJson2 = Array.isArray(body.gallery_images) ? JSON.stringify(body.gallery_images) : body.gallery_images || "[]";
    const deliveryDays2 = body.delivery_time_days || body.normal_delivery_text || "1";
    await env.DB.prepare(`
      UPDATE products SET title=?, slug=?, description=?, normal_price=?, sale_price=?,
      instant_delivery=?, normal_delivery_text=?, thumbnail_url=?, video_url=?,
      gallery_images=?, addons_json=?, seo_title=?, seo_description=?, seo_keywords=?, seo_canonical=?,
      whop_plan=?, whop_price_map=?, whop_product_id=? WHERE id=?
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
      galleryJson2,
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
  const galleryJson = Array.isArray(body.gallery_images) ? JSON.stringify(body.gallery_images) : body.gallery_images || "[]";
  const deliveryDays = body.delivery_time_days || body.normal_delivery_text || "1";
  const r = await env.DB.prepare(`
    INSERT INTO products (title, slug, description, normal_price, sale_price,
    instant_delivery, normal_delivery_text, thumbnail_url, video_url,
    gallery_images, addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
    whop_plan, whop_price_map, whop_product_id, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
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
  await env.DB.prepare("UPDATE products SET status = ? WHERE id = ?").bind(status, Number(id)).run();
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
  const r = await env.DB.prepare(
    `INSERT INTO products (
      title, slug, description, normal_price, sale_price,
      instant_delivery, normal_delivery_text, thumbnail_url, video_url,
      addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
      whop_plan, whop_price_map, status, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    "SELECT id, sort_order FROM products WHERE id = ? AND status = ?"
  ).bind(productId, "active").first();
  if (!current) return json({ error: "Product not found" }, 404);
  const [prev, next] = await Promise.all([
    // Get previous product (higher sort_order or lower id if same sort_order)
    env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url 
      FROM products 
      WHERE status = 'active' 
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
      WHERE status = 'active' 
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
      const slug = p.slug ? String(p.slug) : slugifyStr(p.title);
      if (!p.slug) {
        try {
          await env.DB.prepare("UPDATE products SET slug = ? WHERE id = ?").bind(slug, Number(p.id)).run();
        } catch (e) {
        }
      }
      const canonical = `/product-${p.id}/${encodeURIComponent(slug)}`;
      return Response.redirect(`${url.origin}${canonical}`, 301);
    }
  }
  if (path.startsWith("/product/") && path.length > "/product/".length) {
    const slugIn = decodeURIComponent(path.slice("/product/".length));
    const row = await getProductBySlug(slugIn);
    if (row) {
      const canonicalSlug = row.slug ? String(row.slug) : slugifyStr(row.title);
      if (!row.slug) {
        try {
          await env.DB.prepare("UPDATE products SET slug = ? WHERE id = ?").bind(canonicalSlug, Number(row.id)).run();
        } catch (e) {
        }
      }
      const canonical = `/product-${row.id}/${encodeURIComponent(canonicalSlug)}`;
      return Response.redirect(`${url.origin}${canonical}`, 301);
    }
  }
  return null;
}
__name(handleProductRouting, "handleProductRouting");

// src/config/secrets.js
async function getWhopApiKey(env) {
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
    console.error("Error reading API key from database:", e);
  }
  return env.WHOP_API_KEY || null;
}
__name(getWhopApiKey, "getWhopApiKey");
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

// src/controllers/automation.js
var configCache = null;
var configCacheTime = 0;
var CACHE_TTL = 6e4;
async function getConfig(env, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && configCache && now - configCacheTime < CACHE_TTL) {
    return configCache;
  }
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("automation_config_v2").first();
    if (row?.value) {
      configCache = JSON.parse(row.value);
    } else {
      configCache = getDefaultConfig();
    }
    configCacheTime = now;
    return configCache;
  } catch (e) {
    console.error("Failed to load automation config:", e);
    return getDefaultConfig();
  }
}
__name(getConfig, "getConfig");
function getDefaultConfig() {
  return {
    enabled: false,
    adminEmail: "",
    webhooks: [],
    emailServices: [],
    routing: {
      new_order: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      new_tip: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      new_review: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      blog_comment: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      forum_question: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      forum_reply: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      chat_message: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      customer_order_confirmed: { webhooks: [], emailService: null, adminEmail: false, enabled: true },
      customer_order_delivered: { webhooks: [], emailService: null, adminEmail: false, enabled: true },
      customer_chat_reply: { webhooks: [], emailService: null, adminEmail: false, enabled: true },
      customer_forum_reply: { webhooks: [], emailService: null, adminEmail: false, enabled: true }
    }
  };
}
__name(getDefaultConfig, "getDefaultConfig");
async function saveConfig(env, config) {
  try {
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("automation_config_v2", JSON.stringify(config)).run();
    configCache = config;
    configCacheTime = Date.now();
    return true;
  } catch (e) {
    console.error("Failed to save automation config:", e);
    return false;
  }
}
__name(saveConfig, "saveConfig");
async function getAutomationSettings(env) {
  try {
    const config = await getConfig(env, true);
    const safeConfig = JSON.parse(JSON.stringify(config));
    safeConfig.emailServices = (safeConfig.emailServices || []).map((s) => ({
      ...s,
      apiKey: s.apiKey ? "\u2022\u2022\u2022\u2022" + s.apiKey.slice(-4) : ""
    }));
    safeConfig.webhooks = (safeConfig.webhooks || []).map((w) => ({
      ...w,
      secret: w.secret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
    }));
    return json({ success: true, config: safeConfig });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getAutomationSettings, "getAutomationSettings");
async function saveAutomationSettings(env, body) {
  try {
    const currentConfig = await getConfig(env, true);
    const newConfig = body.config || body;
    if (newConfig.emailServices) {
      newConfig.emailServices = newConfig.emailServices.map((s) => {
        if (s.apiKey?.startsWith("\u2022\u2022\u2022\u2022")) {
          const existing = currentConfig.emailServices?.find((e) => e.id === s.id);
          s.apiKey = existing?.apiKey || "";
        }
        return s;
      });
    }
    if (newConfig.webhooks) {
      newConfig.webhooks = newConfig.webhooks.map((w) => {
        if (w.secret === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
          const existing = currentConfig.webhooks?.find((e) => e.id === w.id);
          w.secret = existing?.secret || "";
        }
        return w;
      });
    }
    const success = await saveConfig(env, newConfig);
    return json({ success });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(saveAutomationSettings, "saveAutomationSettings");
async function logAutomation(env, type, target, title, message, status, response = "") {
  if (status === "sent" || status === "success") {
    return;
  }
  try {
    await env.DB.prepare(`
      INSERT INTO automation_logs (type, target, title, message, status, response, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(type, target || "", title || "", message || "", status, (response || "").substring(0, 500)).run();
  } catch (e) {
    console.error("Log error:", e);
  }
}
__name(logAutomation, "logAutomation");
async function getAutomationLogs(env, limit = 50) {
  try {
    const r = await env.DB.prepare("SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT ?").bind(limit).all();
    return json({ success: true, logs: r.results || [] });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(getAutomationLogs, "getAutomationLogs");
async function clearAutomationLogs(env) {
  try {
    await env.DB.prepare("DELETE FROM automation_logs").run();
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
__name(clearAutomationLogs, "clearAutomationLogs");
async function sendWebhook(env, webhook, payload) {
  if (!webhook?.enabled || !webhook.url) return { success: false, error: "Disabled" };
  try {
    let body, headers = { "Content-Type": "application/json" };
    switch (webhook.type) {
      case "slack":
        body = JSON.stringify({
          text: payload.title,
          blocks: [
            { type: "header", text: { type: "plain_text", text: payload.title } },
            { type: "section", text: { type: "mrkdwn", text: payload.message } }
          ]
        });
        break;
      case "discord":
        body = JSON.stringify({
          content: payload.title,
          embeds: [{ title: payload.title, description: payload.message, color: 6717162 }]
        });
        break;
      case "custom":
      default:
        if (webhook.headers) {
          try {
            headers = { ...headers, ...JSON.parse(webhook.headers) };
          } catch (e) {
          }
        }
        if (webhook.secret) headers["X-Webhook-Secret"] = webhook.secret;
        if (webhook.bodyTemplate) {
          body = webhook.bodyTemplate.replace(/\{\{event\}\}/g, payload.event || "").replace(/\{\{title\}\}/g, payload.title || "").replace(/\{\{message\}\}/g, JSON.stringify(payload.message || "").slice(1, -1)).replace(/\{\{data\}\}/g, JSON.stringify(payload.data || {}));
        } else {
          body = JSON.stringify({ event: payload.event, title: payload.title, message: payload.message, data: payload.data, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        }
    }
    const res = await fetch(webhook.url, { method: webhook.method || "POST", headers, body });
    const resText = await res.text();
    await logAutomation(env, "webhook", webhook.name, payload.title, "", res.ok ? "sent" : "failed", resText);
    return { success: res.ok };
  } catch (e) {
    await logAutomation(env, "webhook", webhook.name, payload.title, "", "error", e.message);
    return { success: false, error: e.message };
  }
}
__name(sendWebhook, "sendWebhook");
async function sendToWebhooks(env, webhookIds, payload, allWebhooks) {
  if (!webhookIds?.length) return [];
  const webhooks = allWebhooks.filter((w) => webhookIds.includes(w.id) && w.enabled);
  const results = await Promise.allSettled(webhooks.map((w) => sendWebhook(env, w, payload)));
  return results.map((r, i) => ({ webhook: webhooks[i].name, success: r.status === "fulfilled" && r.value?.success }));
}
__name(sendToWebhooks, "sendToWebhooks");
async function sendEmail(env, service, to, subject, htmlBody, textBody) {
  if (!service?.enabled || !service.apiKey || !service.fromEmail) {
    return { success: false, error: "Service not configured" };
  }
  const { type, apiKey, fromName, fromEmail } = service;
  try {
    let res;
    switch (type) {
      case "resend":
        res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [to], subject, html: htmlBody, text: textBody })
        });
        break;
      case "sendgrid":
        res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail, name: fromName },
            subject,
            content: [{ type: "text/plain", value: textBody }, { type: "text/html", value: htmlBody }]
          })
        });
        break;
      case "mailgun":
        const domain = fromEmail.split("@")[1];
        const fd = new FormData();
        fd.append("from", `${fromName} <${fromEmail}>`);
        fd.append("to", to);
        fd.append("subject", subject);
        fd.append("html", htmlBody);
        fd.append("text", textBody);
        res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
          method: "POST",
          headers: { "Authorization": `Basic ${btoa(`api:${apiKey}`)}` },
          body: fd
        });
        break;
      case "postmark":
        res = await fetch("https://api.postmarkapp.com/email", {
          method: "POST",
          headers: { "X-Postmark-Server-Token": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ From: `${fromName} <${fromEmail}>`, To: to, Subject: subject, HtmlBody: htmlBody, TextBody: textBody })
        });
        break;
      case "brevo":
        res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email: to }], subject, htmlContent: htmlBody, textContent: textBody })
        });
        break;
      case "elasticemail":
        res = await fetch("https://api.elasticemail.com/v4/emails", {
          method: "POST",
          headers: { "X-ElasticEmail-ApiKey": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            Recipients: [{ Email: to }],
            Content: { From: fromEmail, FromName: fromName, Subject: subject, Body: [{ ContentType: "HTML", Content: htmlBody }, { ContentType: "PlainText", Content: textBody }] }
          })
        });
        break;
      case "custom":
        if (!service.customUrl) return { success: false, error: "Custom URL missing" };
        let headers = { "Content-Type": "application/json" };
        if (service.customHeaders) {
          try {
            headers = { ...headers, ...JSON.parse(service.customHeaders) };
          } catch (e) {
          }
        }
        const replacePlaceholders = /* @__PURE__ */ __name((str) => str.replace(/\{\{to\}\}/g, to).replace(/\{\{subject\}\}/g, subject).replace(/\{\{html\}\}/g, JSON.stringify(htmlBody).slice(1, -1)).replace(/\{\{text\}\}/g, JSON.stringify(textBody).slice(1, -1)).replace(/\{\{from_name\}\}/g, fromName).replace(/\{\{from_email\}\}/g, fromEmail).replace(/\{\{api_key\}\}/g, apiKey), "replacePlaceholders");
        for (const k of Object.keys(headers)) headers[k] = replacePlaceholders(String(headers[k]));
        res = await fetch(service.customUrl, {
          method: service.customMethod || "POST",
          headers,
          body: replacePlaceholders(service.customBody || "{}")
        });
        break;
      default:
        return { success: false, error: `Unknown type: ${type}` };
    }
    const resText = await res.text();
    await logAutomation(env, "email", to, subject, "", res.ok ? "sent" : "failed", resText);
    return { success: res.ok };
  } catch (e) {
    await logAutomation(env, "email", to, subject, "", "error", e.message);
    return { success: false, error: e.message };
  }
}
__name(sendEmail, "sendEmail");
function generateEmailHTML(title, message, buttonText, buttonUrl) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:24px;">${title}</h1></td></tr>
<tr><td style="padding:30px;"><div style="color:#333;font-size:15px;line-height:1.6;white-space:pre-line;">${message}</div>
${buttonText && buttonUrl ? `<div style="text-align:center;margin-top:25px;"><a href="${buttonUrl}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">${buttonText}</a></div>` : ""}
</td></tr>
<tr><td style="background:#f9fafb;padding:15px;text-align:center;color:#666;font-size:12px;">Sent via WishesU</td></tr>
</table></td></tr></table></body></html>`;
}
__name(generateEmailHTML, "generateEmailHTML");
async function dispatchNotification(env, notificationType, payload, recipientEmail = null) {
  const config = await getConfig(env);
  if (!config.enabled) return { success: false, error: "Automation disabled" };
  const routing = config.routing?.[notificationType];
  if (!routing?.enabled) return { success: false, error: "Route disabled" };
  const results = { webhooks: [], email: null };
  if (routing.webhooks?.length) {
    results.webhooks = await sendToWebhooks(env, routing.webhooks, payload, config.webhooks || []);
  }
  const service = routing.emailService ? (config.emailServices || []).find((s) => s.id === routing.emailService) : null;
  const to = recipientEmail || (routing.adminEmail ? config.adminEmail : null);
  if (to && (service || routing.adminEmail)) {
    const emailService = service || (config.emailServices || []).find((s) => s.enabled);
    if (emailService) {
      const html = generateEmailHTML(payload.title, payload.message, payload.buttonText, payload.buttonUrl);
      results.email = await sendEmail(env, emailService, to, payload.title, html, payload.message);
    }
  }
  return { success: true, results };
}
__name(dispatchNotification, "dispatchNotification");
async function notifyNewOrder(env, data) {
  return dispatchNotification(env, "new_order", {
    event: "new_order",
    title: "\u{1F389} New Order Received!",
    message: `Order #${data.orderId || data.id}
Product: ${data.productTitle || data.product_title}
Amount: $${data.amount || data.total}
Customer: ${data.customerName || data.customer_name}
Email: ${data.email}`,
    data,
    buttonText: "View Order",
    buttonUrl: data.adminUrl || "/admin/dashboard.html#orders"
  });
}
__name(notifyNewOrder, "notifyNewOrder");
async function notifyNewTip(env, data) {
  return dispatchNotification(env, "new_tip", {
    event: "new_tip",
    title: "\u{1F4B0} New Tip Received!",
    message: `Amount: $${data.amount}
From: ${data.name || "Anonymous"}
Message: ${data.message || "No message"}`,
    data
  });
}
__name(notifyNewTip, "notifyNewTip");
async function notifyNewReview(env, data) {
  return dispatchNotification(env, "new_review", {
    event: "new_review",
    title: "\u2B50 New Review!",
    message: `Product: ${data.productTitle || data.product_title}
Rating: ${"\u2B50".repeat(data.rating || 5)}
Customer: ${data.customerName || data.customer_name}
Review: ${data.reviewText || data.review_text || "No comment"}`,
    data,
    buttonText: "Manage Reviews",
    buttonUrl: "/admin/dashboard.html#reviews"
  });
}
__name(notifyNewReview, "notifyNewReview");
async function notifyBlogComment(env, data) {
  return dispatchNotification(env, "blog_comment", {
    event: "blog_comment",
    title: "\u{1F4AC} New Blog Comment!",
    message: `Post: ${data.postTitle || data.post_title}
Author: ${data.authorName || data.author_name}
Comment: ${data.content || data.comment}`,
    data,
    buttonText: "Moderate",
    buttonUrl: "/admin/dashboard.html#blog-comments"
  });
}
__name(notifyBlogComment, "notifyBlogComment");
async function notifyForumQuestion(env, data) {
  return dispatchNotification(env, "forum_question", {
    event: "forum_question",
    title: "\u2753 New Forum Question!",
    message: `Title: ${data.title}
Author: ${data.authorName || data.author_name}
Question: ${data.content || data.body}`,
    data,
    buttonText: "View",
    buttonUrl: data.url || `/forum/question.html?id=${data.id}`
  });
}
__name(notifyForumQuestion, "notifyForumQuestion");
async function notifyForumReply(env, data) {
  return dispatchNotification(env, "forum_reply", {
    event: "forum_reply",
    title: "\u{1F4AC} New Forum Reply!",
    message: `Question: ${data.questionTitle || data.question_title}
Reply by: ${data.authorName || data.author_name}
Reply: ${data.content || data.body}`,
    data
  });
}
__name(notifyForumReply, "notifyForumReply");
async function notifyChatMessage(env, data) {
  return dispatchNotification(env, "chat_message", {
    event: "chat_message",
    title: "\u{1F4AC} New Chat Message!",
    message: `From: ${data.senderName || data.sender_name || "Customer"}
Message: ${data.message || data.content}`,
    data,
    buttonText: "View Chats",
    buttonUrl: "/admin/dashboard.html#chats"
  });
}
__name(notifyChatMessage, "notifyChatMessage");
async function notifyOrderDelivered(env, data) {
  return dispatchNotification(env, "customer_order_delivered", {
    event: "order_delivered",
    title: "\u{1F3AC} Your Video is Ready!",
    message: `Hi ${data.customerName || "there"}!

Your video for "${data.productTitle || data.product_title}" is ready!

Click below to view and download.`,
    data,
    buttonText: "View Video",
    buttonUrl: data.deliveryUrl || data.delivery_url
  }, data.email);
}
__name(notifyOrderDelivered, "notifyOrderDelivered");
async function notifyCustomerOrderConfirmed(env, data) {
  return dispatchNotification(env, "customer_order_confirmed", {
    event: "order_confirmed",
    title: "\u2705 Order Confirmed!",
    message: `Hi ${data.customerName || "there"}!

Thank you for your order!

Order #${data.orderId || data.order_id}
Product: ${data.productTitle || data.product_title}
Amount: $${data.amount || data.total}

We'll notify you when ready!`,
    data,
    buttonText: "Track Order",
    buttonUrl: data.trackingUrl || data.tracking_url
  }, data.email);
}
__name(notifyCustomerOrderConfirmed, "notifyCustomerOrderConfirmed");
async function notifyCustomerChatReply(env, data) {
  return dispatchNotification(env, "customer_chat_reply", {
    event: "chat_reply",
    title: "\u{1F4AC} New Reply!",
    message: `Hi ${data.customerName || "there"}!

You have a new reply:
"${data.replyMessage || data.reply}"`,
    data,
    buttonText: "View",
    buttonUrl: data.chatUrl
  }, data.customerEmail);
}
__name(notifyCustomerChatReply, "notifyCustomerChatReply");
async function notifyCustomerForumReply(env, data) {
  return dispatchNotification(env, "customer_forum_reply", {
    event: "forum_reply",
    title: "\u{1F4AC} Reply to Your Question",
    message: `Hi ${data.customerName || "there"}!

Someone replied to "${data.questionTitle || data.question_title}":

"${data.replyContent || data.reply}"`,
    data,
    buttonText: "View",
    buttonUrl: data.questionUrl
  }, data.customerEmail);
}
__name(notifyCustomerForumReply, "notifyCustomerForumReply");
async function testWebhook(env, webhookId) {
  const config = await getConfig(env, true);
  const webhook = (config.webhooks || []).find((w) => w.id === webhookId);
  if (!webhook) return json({ success: false, error: "Webhook not found" });
  const result = await sendWebhook(env, { ...webhook, enabled: true }, {
    event: "test",
    title: "\u{1F9EA} Test Notification",
    message: "Test from WishesU Automation",
    data: { test: true }
  });
  return json(result);
}
__name(testWebhook, "testWebhook");
async function testEmail(env, serviceId, testEmail2) {
  const config = await getConfig(env, true);
  const service = (config.emailServices || []).find((s) => s.id === serviceId);
  if (!service) return json({ success: false, error: "Service not found" });
  const to = testEmail2 || config.adminEmail;
  if (!to) return json({ success: false, error: "No email address" });
  const html = generateEmailHTML("\u{1F9EA} Test Email", "This is a test email from WishesU Automation.\n\nIf you received this, your email service is configured correctly!", "Dashboard", "/admin/dashboard.html");
  const result = await sendEmail(env, { ...service, enabled: true }, to, "\u{1F9EA} Test Email - WishesU", html, "Test email");
  return json(result);
}
__name(testEmail, "testEmail");
async function testNotification(env, body) {
  const testData = {
    new_order: { orderId: "TEST-001", productTitle: "Test Product", amount: 25, customerName: "Test Customer", email: "test@example.com" },
    new_tip: { amount: 10, name: "Test Tipper", message: "Great!" },
    new_review: { productTitle: "Test Product", rating: 5, customerName: "Happy Customer", reviewText: "Amazing!" },
    blog_comment: { postTitle: "Test Post", authorName: "Commenter", content: "Great article!" },
    forum_question: { title: "Test Question", authorName: "User", content: "How does this work?" },
    chat_message: { senderName: "Customer", message: "Hello!" }
  };
  const data = testData[body.type] || testData.new_order;
  const fn = { new_order: notifyNewOrder, new_tip: notifyNewTip, new_review: notifyNewReview, blog_comment: notifyBlogComment, forum_question: notifyForumQuestion, chat_message: notifyChatMessage };
  const result = await (fn[body.type] || notifyNewOrder)(env, data);
  return json(result);
}
__name(testNotification, "testNotification");

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
      if (addon.field) {
        addonMap[addon.field.toLowerCase().trim()] = addon;
      }
    });
    selectedAddons.forEach((selected) => {
      const fieldName = (selected.field || "").toLowerCase().trim();
      const addonDef = addonMap[fieldName];
      if (addonDef && addonDef.options && Array.isArray(addonDef.options)) {
        const selectedValue = (selected.value || "").trim();
        const option = addonDef.options.find(
          (opt) => (opt.label || "").toLowerCase().trim() === selectedValue || (opt.value || "").toLowerCase().trim() === selectedValue
        );
        if (option && option.price) {
          totalAddonPrice += Number(option.price) || 0;
        }
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
    let email = "", amount2 = null, addons = [];
    try {
      if (row.encrypted_data && row.encrypted_data[0] === "{") {
        const d = JSON.parse(row.encrypted_data);
        email = d.email || "";
        amount2 = d.amount;
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
    return { ...row, email, amount: amount2, addons };
  });
  return json({ orders });
}
__name(getOrders, "getOrders");
function computeProductDeliveryMinutes(product) {
  if (!product) return 60;
  const instant = product.instant_delivery === 1 || product.instant_delivery === true;
  if (instant) return 60;
  const days = parseInt(product.normal_delivery_text, 10);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 1;
  return safeDays * 24 * 60;
}
__name(computeProductDeliveryMinutes, "computeProductDeliveryMinutes");
function getEffectiveDeliveryMinutes(orderRow, productRow) {
  const stored = Number(orderRow?.delivery_time_minutes);
  const hasProduct = !!productRow && (productRow.instant_delivery !== void 0 || productRow.normal_delivery_text !== void 0);
  const productMinutes = hasProduct ? computeProductDeliveryMinutes(productRow) : null;
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
  let amount2 = 0;
  let productTitle = "";
  let deliveryMinutes = 0;
  try {
    amount2 = await calculateServerSidePrice(env, body.productId, addons, body.couponCode);
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
      deliveryMinutes = computeProductDeliveryMinutes(product);
    }
  } catch (e) {
    console.log("Could not get product details:", e);
  }
  if (!deliveryMinutes || !Number.isFinite(deliveryMinutes) || deliveryMinutes <= 0) {
    deliveryMinutes = 60;
  }
  const orderId = body.orderId || crypto.randomUUID().split("-")[0].toUpperCase();
  const data = JSON.stringify({
    email,
    amount: amount2,
    productId: body.productId,
    addons,
    whop_checkout_id: body.checkoutSessionId || null,
    source: "frontend"
  });
  await env.DB.prepare(
    "INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes) VALUES (?, ?, ?, ?, ?)"
  ).bind(orderId, Number(body.productId), data, "PAID", deliveryMinutes).run();
  console.log("\u{1F4E6} Order created:", orderId, "Delivery:", deliveryMinutes, "minutes", "Amount:", amount2);
  const deliveryTime = deliveryMinutes < 1440 ? `${Math.round(deliveryMinutes / 60)} hour(s)` : `${Math.round(deliveryMinutes / 1440)} day(s)`;
  notifyNewOrder(env, { orderId, email, amount: amount2, productTitle }).catch(() => {
  });
  notifyCustomerOrderConfirmed(env, { orderId, email, amount: amount2, productTitle, deliveryTime }).catch(() => {
  });
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl) {
      await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "order.created",
          order: {
            order_id: orderId,
            product_id: body.productId,
            product_title: productTitle,
            email,
            amount: amount2,
            delivery_time_minutes: deliveryMinutes,
            delivery_time_text: deliveryTime,
            status: "paid",
            created_at: Date.now()
          }
        })
      }).catch((err) => console.error("Failed to send new order webhook:", err));
    }
  } catch (err) {
    console.error("Error triggering new order webhook:", err);
  }
  return json({ success: true, orderId, amount: amount2 });
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
  await env.DB.prepare(
    "INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes) VALUES (?, ?, ?, ?, ?)"
  ).bind(
    orderId,
    Number(body.productId),
    encryptedData,
    body.status || "paid",
    Number(body.deliveryTime) || 60
  ).run();
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
  let addons = [], email = "", amount2 = null;
  try {
    if (row.encrypted_data && row.encrypted_data[0] === "{") {
      const d = JSON.parse(row.encrypted_data);
      addons = d.addons || [];
      email = d.email || "";
      amount2 = d.amount;
    }
  } catch (e) {
    console.error("Failed to parse order encrypted_data for buyer order:", orderId, e.message);
  }
  const orderData = {
    ...row,
    addons,
    email,
    amount: amount2,
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
  const asNumber = Number(id);
  if (!Number.isNaN(asNumber) && String(id).trim() === String(asNumber)) {
    await env.DB.prepare("DELETE FROM reviews WHERE order_id IN (SELECT order_id FROM orders WHERE id = ?)").bind(asNumber).run();
    await env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(asNumber).run();
    return json({ success: true });
  }
  const orderId = String(id).trim();
  await env.DB.prepare("DELETE FROM reviews WHERE order_id = ?").bind(orderId).run();
  await env.DB.prepare("DELETE FROM orders WHERE order_id = ?").bind(orderId).run();
  return json({ success: true });
}
__name(deleteOrder, "deleteOrder");
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
async function deliverOrder(env, body) {
  if (!body.orderId || !body.videoUrl) return json({ error: "orderId and videoUrl required" }, 400);
  const orderResult = await env.DB.prepare(
    "SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?"
  ).bind(body.orderId).first();
  const deliveredVideoMetadata = JSON.stringify({
    embedUrl: body.embedUrl,
    itemId: body.itemId,
    subtitlesUrl: body.subtitlesUrl,
    tracks: Array.isArray(body.tracks) ? body.tracks : void 0,
    deliveredAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await env.DB.prepare(
    "UPDATE orders SET delivered_video_url=?, delivered_thumbnail_url=?, status=?, delivered_at=CURRENT_TIMESTAMP, delivered_video_metadata=? WHERE order_id=?"
  ).bind(body.videoUrl, body.thumbnailUrl || null, "delivered", deliveredVideoMetadata, body.orderId).run();
  let customerEmail = "";
  try {
    if (orderResult?.encrypted_data) {
      const decrypted = JSON.parse(orderResult.encrypted_data);
      customerEmail = decrypted.email || "";
    }
  } catch (e) {
  }
  notifyOrderDelivered(env, {
    orderId: body.orderId,
    email: customerEmail,
    productTitle: orderResult?.product_title || "Your Order"
  }).catch(() => {
  });
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (googleScriptUrl && orderResult) {
      await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "order.delivered",
          order: {
            order_id: body.orderId,
            product_title: orderResult.product_title || "Your Order",
            email: customerEmail,
            delivered_video_url: body.videoUrl,
            status: "delivered"
          }
        })
      }).catch((err) => console.error("Failed to send delivery webhook:", err));
    }
  } catch (err) {
    console.error("Error triggering delivery webhook:", err);
  }
  return json({ success: true });
}
__name(deliverOrder, "deliverOrder");
async function requestRevision(env, body) {
  if (!body.orderId) return json({ error: "orderId required" }, 400);
  const orderResult = await env.DB.prepare(
    "SELECT orders.*, products.title as product_title FROM orders LEFT JOIN products ON orders.product_id = products.id WHERE orders.order_id = ?"
  ).bind(body.orderId).first();
  await env.DB.prepare(
    "UPDATE orders SET revision_requested=1, revision_count=revision_count+1, status=? WHERE order_id=?"
  ).bind("revision", body.orderId).run();
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
      await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "order.revision_requested",
          order: {
            order_id: body.orderId,
            product_title: orderResult.product_title || "Your Order",
            email: customerEmail,
            revision_reason: body.reason || "No reason provided",
            revision_count: (orderResult.revision_count || 0) + 1,
            status: "revision"
          }
        })
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
  await env.DB.prepare("UPDATE orders SET archive_url=? WHERE order_id=?").bind(body.archiveUrl, body.orderId).run();
  return json({ success: true });
}
__name(updateArchiveLink, "updateArchiveLink");
async function markTipPaid(env, body) {
  const { orderId, amount: amount2 } = body;
  if (!orderId) return json({ error: "orderId required" }, 400);
  await env.DB.prepare(
    "UPDATE orders SET tip_paid = 1, tip_amount = ? WHERE order_id = ?"
  ).bind(Number(amount2) || 0, orderId).run();
  let email = "";
  try {
    const order = await env.DB.prepare("SELECT encrypted_data FROM orders WHERE order_id = ?").bind(orderId).first();
    if (order?.encrypted_data) {
      const data = JSON.parse(order.encrypted_data);
      email = data.email || "";
    }
  } catch (e) {
  }
  notifyNewTip(env, { orderId, amount: Number(amount2) || 0, email }).catch(() => {
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
  return cachedJson({ reviews }, 120);
}
__name(getReviews, "getReviews");
async function getProductReviews(env, productId) {
  const r = await env.DB.prepare(
    `SELECT reviews.*, orders.delivered_video_url, orders.delivered_thumbnail_url 
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
    "INSERT INTO reviews (product_id, author_name, rating, comment, status, order_id, show_on_product) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    Number(body.productId),
    authorName,
    rating,
    comment,
    "approved",
    body.orderId || null,
    body.showOnProduct !== void 0 ? body.showOnProduct ? 1 : 0 : 1
  ).run();
  let productTitle = "";
  try {
    const product = await env.DB.prepare("SELECT title FROM products WHERE id = ?").bind(Number(body.productId)).first();
    productTitle = product?.title || "";
  } catch (e) {
  }
  notifyNewReview(env, { productTitle, rating, authorName, comment }).catch(() => {
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

// src/controllers/whop.js
var WHOP_API_TIMEOUT = 1e4;
function calculateAddonPrice2(productAddonsJson, selectedAddons) {
  if (!productAddonsJson || !selectedAddons || !Array.isArray(selectedAddons)) {
    return 0;
  }
  let totalAddonPrice = 0;
  try {
    const addonConfig = typeof productAddonsJson === "string" ? JSON.parse(productAddonsJson) : productAddonsJson;
    if (!Array.isArray(addonConfig)) return 0;
    const addonMap = {};
    addonConfig.forEach((addon) => {
      if (addon.field) {
        addonMap[addon.field.toLowerCase().trim()] = addon;
      }
    });
    selectedAddons.forEach((selected) => {
      const fieldName = (selected.field || "").toLowerCase().trim();
      const addonDef = addonMap[fieldName];
      if (addonDef && addonDef.options && Array.isArray(addonDef.options)) {
        const selectedValue = (selected.value || "").trim();
        const option = addonDef.options.find(
          (opt) => (opt.label || "").toLowerCase().trim() === selectedValue || (opt.value || "").toLowerCase().trim() === selectedValue
        );
        if (option && option.price) {
          totalAddonPrice += Number(option.price) || 0;
        }
      }
    });
  } catch (e) {
    console.error("Failed to calculate addon price:", e);
  }
  return totalAddonPrice;
}
__name(calculateAddonPrice2, "calculateAddonPrice");
async function calculateServerSidePrice2(env, productId, selectedAddons, couponCode) {
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
  const addonPrice = calculateAddonPrice2(product.addons_json, selectedAddons);
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
__name(calculateServerSidePrice2, "calculateServerSidePrice");
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
          error: errorData.message || errorData.error || "Failed to create checkout"
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
  const { product_id, email, metadata, deliveryTimeMinutes: bodyDeliveryTime, couponCode } = body || {};
  if (!product_id) {
    return json({ error: "Product ID required" }, 400);
  }
  const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(Number(product_id)).first();
  if (!product) {
    return json({ error: "Product not found" }, 404);
  }
  let deliveryTimeMinutes = bodyDeliveryTime || metadata?.deliveryTimeMinutes;
  if (!deliveryTimeMinutes) {
    if (product.instant_delivery) {
      deliveryTimeMinutes = 60;
    } else {
      const days = parseInt(product.normal_delivery_text) || 1;
      deliveryTimeMinutes = days * 24 * 60;
    }
  }
  deliveryTimeMinutes = Number(deliveryTimeMinutes) || 60;
  console.log("\u{1F4E6} Delivery time calculated:", deliveryTimeMinutes, "minutes");
  let priceValue = 0;
  try {
    const selectedAddons = metadata?.addons || body?.addons || [];
    priceValue = await calculateServerSidePrice2(env, product_id, selectedAddons, couponCode);
  } catch (e) {
    console.error("Failed to calculate server-side price:", e);
    return json({ error: "Failed to calculate order price" }, 400);
  }
  if (isNaN(priceValue) || priceValue < 0) {
    return json({ error: "Invalid price" }, 400);
  }
  const directProdId = (product.whop_product_id || "").trim();
  let finalProdId = directProdId;
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
      if (settings && settings.default_product_id) {
        finalProdId = (settings.default_product_id || "").trim();
      }
    } catch (e) {
      console.log("Failed to load whop settings for default product ID:", e);
    }
  }
  if (!finalProdId) {
    return json({ error: "whop_product_id not configured for this product and no default_product_id set" }, 400);
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
        msg = j.message || j.error || msg;
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
      addons: metadata?.addons || [],
      email: email || "",
      amount: priceValue,
      // Use server-side calculated price
      deliveryTimeMinutes,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      await env.DB.prepare(`
        INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, metadata, expires_at, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).bind("plan_" + planId, product.id, planId, JSON.stringify(checkoutMetadata), expiryTime).run();
    } catch (e) {
      console.log("Plan tracking insert failed:", e.message);
    }
    const checkoutBody = {
      plan_id: planId,
      redirect_url: `${origin}/success.html?product=${product.id}`,
      metadata: checkoutMetadata
    };
    if (email && email.includes("@")) {
      checkoutBody.prefill = { email: email.trim() };
    }
    const checkoutResp = await fetchWithTimeout("https://api.whop.com/api/v2/checkout_sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(checkoutBody)
    }, WHOP_API_TIMEOUT);
    if (!checkoutResp.ok) {
      const errorText = await checkoutResp.text();
      console.error("Whop checkout session error:", errorText);
      return json({
        success: true,
        plan_id: planId,
        product_id: product.id,
        email,
        metadata: {
          product_id: product.id.toString(),
          product_title: product.title,
          addons: metadata?.addons || [],
          amount: amount || priceValue
        },
        expires_in: "15 minutes",
        warning: "Email prefill not available"
      });
    }
    const checkoutData = await checkoutResp.json();
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
        addons: metadata?.addons || [],
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
async function handleWebhook(env, webhookData) {
  try {
    const eventType = webhookData.type;
    console.log("Whop webhook received:", eventType);
    if (eventType === "payment.succeeded") {
      const checkoutSessionId = webhookData.data?.checkout_session_id;
      const membershipId = webhookData.data?.id;
      let metadata = webhookData.data?.metadata || {};
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
      if (checkoutSessionId && (!metadata.addons || !metadata.addons.length || !metadata.amount)) {
        try {
          const sessionRow = await env.DB.prepare(
            "SELECT metadata FROM checkout_sessions WHERE checkout_id = ?"
          ).bind(checkoutSessionId).first();
          if (sessionRow?.metadata) {
            const storedMetadata = JSON.parse(sessionRow.metadata);
            console.log("Retrieved stored metadata from DB:", storedMetadata);
            metadata = {
              ...metadata,
              ...storedMetadata,
              // Ensure addons come from stored metadata if available
              addons: storedMetadata.addons || metadata.addons || [],
              // Ensure amount comes from stored metadata (server-side calculated)
              amount: storedMetadata.amount || metadata.amount || 0
            };
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
          if (!deliveryTimeMinutes || deliveryTimeMinutes <= 0) {
            try {
              const product = await env.DB.prepare("SELECT instant_delivery, normal_delivery_text FROM products WHERE id = ?").bind(Number(metadata.product_id)).first();
              if (product) {
                if (product.instant_delivery) {
                  deliveryTimeMinutes = 60;
                } else {
                  const days = parseInt(product.normal_delivery_text) || 1;
                  deliveryTimeMinutes = days * 24 * 60;
                }
              } else {
                deliveryTimeMinutes = 60;
              }
            } catch (e) {
              console.log("Could not get product delivery time:", e);
              deliveryTimeMinutes = 60;
            }
          }
          console.log("Final delivery time for order:", deliveryTimeMinutes, "minutes");
          const customerEmail2 = metadata.email || webhookData.data?.email || webhookData.data?.user?.email || "";
          const orderAmount = metadata.amount || 0;
          const encryptedData = JSON.stringify({
            email: customerEmail2,
            amount: orderAmount,
            productId: metadata.product_id,
            addons: metadata.addons || [],
            whop_membership_id: membershipId || null,
            whop_checkout_id: checkoutSessionId || null
          });
          await env.DB.prepare(
            'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))'
          ).bind(orderId, Number(metadata.product_id), encryptedData, "completed", deliveryTimeMinutes).run();
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
  const { product_id, amount: amount2, email, metadata, deliveryTimeMinutes } = body;
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
  const finalAmount = amount2 || basePrice;
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
        if (product.instant_delivery) {
          finalDeliveryTime = 60;
        } else {
          const days = product.delivery_time_days || 1;
          finalDeliveryTime = days * 24 * 60;
        }
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
      const amount2 = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || metadata.amount || 0;
      if (metadata && metadata.type === "tip") {
        const targetOrderId = metadata.orderId || metadata.order_id;
        const tipAmount = parseFloat(amount2) || parseFloat(metadata.tipAmount) || 0;
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
      let deliveryTimeMinutes = Number(metadata.deliveryTimeMinutes) || 0;
      if (!deliveryTimeMinutes || deliveryTimeMinutes <= 0) {
        try {
          const product = await env.DB.prepare("SELECT instant_delivery, delivery_time_days FROM products WHERE id = ?").bind(Number(productId)).first();
          if (product) {
            if (product.instant_delivery) {
              deliveryTimeMinutes = 60;
            } else {
              const days = parseInt(product.delivery_time_days) || 1;
              deliveryTimeMinutes = days * 24 * 60;
            }
          } else {
            deliveryTimeMinutes = 60;
          }
        } catch (e) {
          console.log("Could not get product delivery time for PayPal order:", e);
          deliveryTimeMinutes = 60;
        }
      }
      console.log("\u{1F17F}\uFE0F Delivery time for PayPal order:", deliveryTimeMinutes, "minutes");
      const encryptedData = JSON.stringify({
        email: buyerEmail,
        amount: parseFloat(amount2),
        productId,
        addons,
        paypalOrderId: order_id,
        payerId: captureData.payer?.payer_id
      });
      await env.DB.prepare(
        'INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))'
      ).bind(orderId, Number(productId), encryptedData, "PAID", deliveryTimeMinutes).run();
      console.log("\u{1F17F}\uFE0F Order created:", orderId, "Delivery:", deliveryTimeMinutes, "minutes");
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
async function handlePayPalWebhook(env, body, headers) {
  const eventType = body.event_type;
  console.log("PayPal webhook received:", eventType);
  if (eventType === "CHECKOUT.ORDER.APPROVED") {
    const orderId = body.resource?.id;
    console.log("Order approved:", orderId);
  }
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const captureId = body.resource?.id;
    console.log("Payment captured:", captureId);
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
      const whopRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
      if (whopRow?.value) {
        const whop = JSON.parse(whopRow.value);
        if (whop.api_key || env.WHOP_API_KEY) {
          methods.push({
            id: "whop",
            name: "All Payment Methods",
            icon: "\u{1F310}",
            description: "GPay, Apple Pay, Cards, Bank & more",
            enabled: true,
            priority: 2
          });
        }
      } else if (env.WHOP_API_KEY) {
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
    const whopRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
    if (whopRow?.value) {
      const whop = JSON.parse(whopRow.value);
      whopConfigured = !!whop.api_key;
    } else if (env.WHOP_API_KEY) {
      whopConfigured = true;
    }
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
    if (whopRow?.value) {
      const whop = JSON.parse(whopRow.value);
      settings.whop = {
        enabled: !!(whop.api_key || env.WHOP_API_KEY),
        has_api_key: !!(whop.api_key || env.WHOP_API_KEY),
        default_product_id: whop.default_product_id || "",
        default_plan_id: whop.default_plan_id || ""
      };
    } else if (env.WHOP_API_KEY) {
      settings.whop = { enabled: true, has_api_key: true };
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
  return json({ success: true });
}
__name(savePaymentMethodSettings, "savePaymentMethodSettings");

// src/controllers/pages.js
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
    return {
      id: page.id,
      name: page.slug || page.title || "Untitled",
      title: page.title || page.slug || "Untitled",
      url: `/${page.slug}`,
      size: sizeStr,
      uploaded,
      status: page.status || "draft",
      page_type: hasNewColumns ? page.page_type || "custom" : "custom",
      is_default: hasNewColumns ? page.is_default || 0 : 0
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
    await env.DB.prepare(
      "UPDATE pages SET is_default = 1, page_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(page_type, Number(id)).run();
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
  if (!body.slug || !body.title) return json({ error: "slug and title required" }, 400);
  const pageType = body.page_type || "custom";
  const isDefault = body.is_default ? 1 : 0;
  if (isDefault && pageType !== "custom") {
    await env.DB.prepare(
      "UPDATE pages SET is_default = 0 WHERE page_type = ?"
    ).bind(pageType).run();
  }
  if (body.id) {
    await env.DB.prepare(
      "UPDATE pages SET slug=?, title=?, content=?, meta_description=?, page_type=?, is_default=?, feature_image_url=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(body.slug, body.title, body.content || "", body.meta_description || "", pageType, isDefault, body.feature_image_url || "", body.status || "published", Number(body.id)).run();
    return json({ success: true, id: body.id });
  }
  const r = await env.DB.prepare(
    "INSERT INTO pages (slug, title, content, meta_description, page_type, is_default, feature_image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(body.slug, body.title, body.content || "", body.meta_description || "", pageType, isDefault, body.feature_image_url || "", body.status || "published").run();
  return json({ success: true, id: r.meta?.last_row_id });
}
__name(savePage, "savePage");
async function savePageBuilder(env, body) {
  const name = (body.name || "").trim();
  const content = body.content || "";
  const pageType = body.page_type || "custom";
  const isDefault = body.is_default ? 1 : 0;
  if (!name) return json({ error: "name required" }, 400);
  if (isDefault && pageType !== "custom") {
    try {
      await env.DB.prepare(
        "UPDATE pages SET is_default = 0 WHERE page_type = ?"
      ).bind(pageType).run();
    } catch (e) {
    }
  }
  const existing = await env.DB.prepare("SELECT id FROM pages WHERE slug = ?").bind(name).first();
  if (existing) {
    try {
      await env.DB.prepare(
        "UPDATE pages SET content=?, page_type=?, is_default=?, feature_image_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(content, pageType, isDefault, body.feature_image_url || "", existing.id).run();
    } catch (e) {
      await env.DB.prepare(
        "UPDATE pages SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(content, existing.id).run();
    }
    return json({ success: true, id: existing.id });
  }
  try {
    const r = await env.DB.prepare(
      "INSERT INTO pages (slug, title, content, page_type, is_default, feature_image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(name, name, content, pageType, isDefault, body.feature_image_url || "", "published").run();
    return json({ success: true, id: r.meta?.last_row_id });
  } catch (e) {
    const r = await env.DB.prepare(
      "INSERT INTO pages (slug, title, content, status) VALUES (?, ?, ?, ?)"
    ).bind(name, name, content, "published").run();
    return json({ success: true, id: r.meta?.last_row_id });
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
  const setDefault = is_default ? 1 : 0;
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
  const row = await env.DB.prepare("SELECT content, page_type, is_default, feature_image_url FROM pages WHERE slug = ?").bind(name).first();
  if (!row) return json({ content: "", page_type: "custom", is_default: 0, feature_image_url: "" });
  return json({
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
    const finalSlug = slug || title.toLowerCase().replace(/['"`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
    const now = Date.now();
    if (id) {
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
    const now = Date.now();
    const newSlug = `${original.slug}-copy-${Date.now()}`;
    const result = await env.DB.prepare(`
      INSERT INTO blogs (title, slug, description, content, thumbnail_url, custom_css, custom_js, seo_title, seo_description, seo_keywords, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(
      `${original.title} (Copy)`,
      newSlug,
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
    return json({ success: true, id: result.meta?.last_row_id });
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
var forumSchemaValidated = false;
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
          slug TEXT,
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
        const batch = existingQuestions.map(
          (q) => env.DB.prepare(`INSERT INTO forum_questions (id, title, slug, content, name, email, status, reply_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(q.id || null, q.title || "", q.slug || "", q.content || "", q.name || "", q.email || "", q.status || "pending", q.reply_count || 0, q.created_at || Date.now(), q.updated_at || Date.now())
        );
        for (let i = 0; i < batch.length; i += 10) {
          await Promise.all(batch.slice(i, i + 10).map((stmt) => stmt.run().catch(() => {
          })));
        }
      }
    }
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
    const slug = trimmedTitle.toLowerCase().replace(/['"`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 80) + "-" + Date.now();
    const now = Date.now();
    await env.DB.prepare(`
      INSERT INTO forum_questions (title, slug, content, name, email, status, reply_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
    `).bind(trimmedTitle, slug, trimmedContent, trimmedName, trimmedEmail, now, now).run();
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
async function getForumSidebar(env, questionId) {
  try {
    const products = await env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url, sale_price, normal_price
      FROM products 
      WHERE status = 'active'
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
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("whop").first();
  if (row && row.value) {
    try {
      const settings = JSON.parse(row.value);
      return json({ settings });
    } catch (e) {
      return json({ settings: {} });
    }
  }
  return json({ settings: {} });
}
__name(getWhopSettings, "getWhopSettings");
async function saveWhopSettings(env, body) {
  const value = JSON.stringify(body);
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
async function handleSecureDownload(env, orderId, baseUrl) {
  if (!orderId) return new Response("Order ID required", { status: 400 });
  const order = await env.DB.prepare("SELECT delivered_video_url FROM orders WHERE order_id = ?").bind(orderId).first();
  if (!order || !order.delivered_video_url) {
    return new Response("File not found", { status: 404 });
  }
  let sourceUrl = order.delivered_video_url;
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
    console.log("Proxy failed (" + fileResp.status + "), redirecting to source...");
    return Response.redirect(sourceUrl, 302);
  }
  const urlObj = new URL(sourceUrl, baseUrl || "https://wishesu.com");
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
    headers.set("Content-Length", contentLength || "");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    return new Response(fileResp.body, {
      status: 206,
      // Partial Content for range support
      statusText: "Partial Content",
      headers
    });
  }
  return Response.redirect(sourceUrl, 302);
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

// src/controllers/seo.js
var seoTablesReady = false;
var seoSeeded = false;
var cachedSettings = null;
var settingsCacheTime = 0;
var seoInitPromise = null;
var SETTINGS_CACHE_TTL = 6e4;
var SEO_INIT_TIMEOUT = 3e3;
var DEFAULT_SETTINGS = {
  id: 1,
  base_url: "",
  sitemap_enabled: 1,
  sitemap_include_pages: 1,
  sitemap_include_products: 1,
  sitemap_max_urls: 45e3,
  product_url_template: "/product-{id}/{slug}",
  force_noindex_on_workers_dev: 1,
  robots_enabled: 1,
  robots_extra: ""
};
var DEFAULT_PAGE_RULES = [
  // Main pages - clean URLs
  { path: "/", allow_index: 1, allow_follow: 1, include_in_sitemap: 1, canonical_override: "", changefreq: "daily", priority: 1 },
  { path: "/products", allow_index: 1, allow_follow: 1, include_in_sitemap: 1, canonical_override: "", changefreq: "daily", priority: 0.8 },
  { path: "/blog", allow_index: 1, allow_follow: 1, include_in_sitemap: 1, canonical_override: "", changefreq: "daily", priority: 0.7 },
  { path: "/forum", allow_index: 1, allow_follow: 1, include_in_sitemap: 1, canonical_override: "", changefreq: "daily", priority: 0.6 },
  // Sensitive/system pages - noindex
  { path: "/buyer-order", allow_index: 0, allow_follow: 0, include_in_sitemap: 0, canonical_override: "", changefreq: "never", priority: 0 },
  { path: "/order-detail", allow_index: 0, allow_follow: 0, include_in_sitemap: 0, canonical_override: "", changefreq: "never", priority: 0 },
  { path: "/order-success", allow_index: 0, allow_follow: 0, include_in_sitemap: 0, canonical_override: "", changefreq: "never", priority: 0 },
  { path: "/success", allow_index: 0, allow_follow: 0, include_in_sitemap: 0, canonical_override: "", changefreq: "never", priority: 0 }
];
function normalizePath(p) {
  if (!p) return "/";
  let out = String(p).trim();
  if (!out.startsWith("/")) out = "/" + out;
  out = out.replace(/\/+/g, "/");
  return out;
}
__name(normalizePath, "normalizePath");
function safeNumber(n, fallback) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}
__name(safeNumber, "safeNumber");
async function ensureSeoTables(env) {
  if (seoTablesReady || !env?.DB) return;
  if (seoInitPromise) {
    try {
      await Promise.race([
        seoInitPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("SEO init timeout")), SEO_INIT_TIMEOUT))
      ]);
    } catch (e) {
      console.warn("SEO tables init timeout, proceeding");
    }
    return;
  }
  seoInitPromise = (async () => {
    try {
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
      seoTablesReady = true;
    } catch (e) {
      seoTablesReady = true;
    }
  })();
  try {
    await Promise.race([
      seoInitPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("SEO init timeout")), SEO_INIT_TIMEOUT))
    ]);
  } catch (e) {
    console.warn("SEO tables init timeout");
  }
}
__name(ensureSeoTables, "ensureSeoTables");
async function ensureSettingsRow(env) {
  await ensureSeoTables(env);
  if (cachedSettings && Date.now() - settingsCacheTime < SETTINGS_CACHE_TTL) {
    return cachedSettings;
  }
  const row = await env.DB.prepare("SELECT * FROM seo_settings WHERE id = 1").first();
  if (row) {
    cachedSettings = row;
    settingsCacheTime = Date.now();
    return row;
  }
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
  const newRow = await env.DB.prepare("SELECT * FROM seo_settings WHERE id = 1").first() || { ...DEFAULT_SETTINGS };
  cachedSettings = newRow;
  settingsCacheTime = Date.now();
  return newRow;
}
__name(ensureSettingsRow, "ensureSettingsRow");
async function seedDefaultRulesIfEmpty(env) {
  if (seoSeeded) return;
  await ensureSeoTables(env);
  const countRow = await env.DB.prepare("SELECT COUNT(1) as c FROM seo_page_rules").first();
  const c = countRow?.c ? Number(countRow.c) : 0;
  if (c > 0) {
    seoSeeded = true;
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const batch = DEFAULT_PAGE_RULES.map(
    (r) => env.DB.prepare(`
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
      r.changefreq || "weekly",
      safeNumber(r.priority, 0.6),
      now
    )
  );
  await env.DB.batch(batch);
  seoSeeded = true;
}
__name(seedDefaultRulesIfEmpty, "seedDefaultRulesIfEmpty");
async function getSeoSettings(env, request) {
  if (!env?.DB) return { ...DEFAULT_SETTINGS, __force_noindex: 0 };
  const row = await ensureSettingsRow(env);
  await seedDefaultRulesIfEmpty(env);
  const url = new URL(request.url);
  const host = url.hostname || "";
  const forceNoindex = row.force_noindex_on_workers_dev && host.endsWith("workers.dev");
  return {
    ...DEFAULT_SETTINGS,
    ...row,
    __force_noindex: forceNoindex ? 1 : 0
  };
}
__name(getSeoSettings, "getSeoSettings");
async function adminGetSeoSettings(env, request) {
  const s = await getSeoSettings(env, request);
  return json(s);
}
__name(adminGetSeoSettings, "adminGetSeoSettings");
async function adminSaveSeoSettings(env, request) {
  const body = await request.json();
  await ensureSeoTables(env);
  const baseUrl = (body.base_url || "").trim();
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
    Math.min(Math.max(parseInt(body.sitemap_max_urls || DEFAULT_SETTINGS.sitemap_max_urls, 10), 1e3), 5e4),
    templ,
    body.force_noindex_on_workers_dev ? 1 : 0,
    body.robots_enabled ? 1 : 0,
    body.robots_extra || ""
  ).run();
  cachedSettings = null;
  settingsCacheTime = 0;
  return json({ success: true });
}
__name(adminSaveSeoSettings, "adminSaveSeoSettings");
async function adminListPageRules(env) {
  await ensureSeoTables(env);
  const rows = await env.DB.prepare("SELECT * FROM seo_page_rules ORDER BY path ASC").all();
  return json(rows.results || []);
}
__name(adminListPageRules, "adminListPageRules");
async function adminUpsertPageRules(env, request) {
  await ensureSeoTables(env);
  const body = await request.json();
  const pages = Array.isArray(body.pages) ? body.pages : [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const batch = [];
  for (const p of pages.slice(0, 800)) {
    const path = normalizePath(p.path);
    if (!path || !path.startsWith("/")) continue;
    const allowIndex = p.allow_index !== 0 ? 1 : 0;
    const allowFollow = p.allow_follow !== 0 ? 1 : 0;
    const inSitemap = p.include_in_sitemap !== 0 ? 1 : 0;
    const changefreq = (p.changefreq || "weekly").toLowerCase();
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
        p.canonical_override || null,
        changefreq,
        priority,
        now
      )
    );
  }
  if (batch.length) await env.DB.batch(batch);
  return json({ success: true });
}
__name(adminUpsertPageRules, "adminUpsertPageRules");
async function adminDeletePageRule(env, request) {
  await ensureSeoTables(env);
  const url = new URL(request.url);
  const path = normalizePath(url.searchParams.get("path") || "");
  if (!path) return json({ error: "Missing path" }, 400);
  await env.DB.prepare("DELETE FROM seo_page_rules WHERE path=?").bind(path).run();
  return json({ success: true });
}
__name(adminDeletePageRule, "adminDeletePageRule");
async function adminListProductsWithRules(env, request) {
  await ensureSeoTables(env);
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "60", 10), 1), 120);
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
    const inQ = ids.map(() => "?").join(",");
    const rr = await env.DB.prepare(`SELECT * FROM seo_product_rules WHERE product_id IN (${inQ})`).bind(...ids).all();
    (rr.results || []).forEach((r) => {
      rulesMap[String(r.product_id)] = r;
    });
  }
  const out = prodRows.map((p) => {
    const r = rulesMap[String(p.id)] || {};
    return {
      id: String(p.id),
      title: p.title || "",
      slug: p.slug || "",
      status: p.status || "active",
      rule_allow_index: r.allow_index ?? 1,
      rule_allow_follow: r.allow_follow ?? 1,
      rule_include_in_sitemap: r.include_in_sitemap ?? 1,
      rule_canonical_override: r.canonical_override ?? ""
    };
  });
  return json(out);
}
__name(adminListProductsWithRules, "adminListProductsWithRules");
async function adminPatchProductRule(env, request) {
  await ensureSeoTables(env);
  const body = await request.json();
  const productId = body.product_id ? String(body.product_id) : "";
  const patch = body.patch || {};
  if (!productId) return json({ error: "Missing product_id" }, 400);
  const existing = await env.DB.prepare("SELECT * FROM seo_product_rules WHERE product_id=?").bind(productId).first();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const allowIndex = (patch.allow_index ?? existing?.allow_index ?? 1) !== 0 ? 1 : 0;
  const allowFollow = (patch.allow_follow ?? existing?.allow_follow ?? 1) !== 0 ? 1 : 0;
  const inSitemap = (patch.include_in_sitemap ?? existing?.include_in_sitemap ?? 1) !== 0 ? 1 : 0;
  const canonical = patch.canonical_override ?? existing?.canonical_override ?? null;
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
    existing?.changefreq || "weekly",
    typeof existing?.priority === "number" ? existing.priority : 0.7,
    now
  ).run();
  return json({ success: true });
}
__name(adminPatchProductRule, "adminPatchProductRule");
async function getPageRule(env, path) {
  if (!seoTablesReady) await ensureSeoTables(env);
  const row = await env.DB.prepare("SELECT * FROM seo_page_rules WHERE path = ?").bind(normalizePath(path)).first();
  return row || null;
}
__name(getPageRule, "getPageRule");
async function getProductRule(env, productId) {
  if (!seoTablesReady) await ensureSeoTables(env);
  if (!productId) return null;
  const row = await env.DB.prepare("SELECT * FROM seo_product_rules WHERE product_id = ?").bind(String(productId)).first();
  return row || null;
}
__name(getProductRule, "getProductRule");
function stripHeadTag(html, regex) {
  try {
    return html.replace(regex, "");
  } catch (e) {
    return html;
  }
}
__name(stripHeadTag, "stripHeadTag");
function applySeoToHtml(html, robots, canonicalUrl) {
  if (!html || typeof html !== "string") return html;
  let out = html;
  out = stripHeadTag(out, /<meta\s+name=["']robots["'][^>]*>\s*/ig);
  out = stripHeadTag(out, /<link\s+rel=["']canonical["'][^>]*>\s*/ig);
  const inject = [
    `<meta name="robots" content="${escapeAttr(robots)}">`,
    canonicalUrl ? `<link rel="canonical" href="${escapeAttr(canonicalUrl)}">` : ""
  ].filter(Boolean).join("\n");
  if (out.includes("</head>")) {
    out = out.replace("</head>", inject + "\n</head>");
  }
  return out;
}
__name(applySeoToHtml, "applySeoToHtml");
function computeRobotsValue(allowIndex, allowFollow) {
  const idx = allowIndex ? "index" : "noindex";
  const fol = allowFollow ? "follow" : "nofollow";
  return `${idx},${fol}`;
}
__name(computeRobotsValue, "computeRobotsValue");
function canonicalFromTemplate(baseUrl, template, product) {
  const id = encodeURIComponent(String(product.id));
  const slug = encodeURIComponent(String(product.slug || ""));
  const path = (template || DEFAULT_SETTINGS.product_url_template).replaceAll("{id}", id).replaceAll("{slug}", slug).replaceAll("{ID}", id).replaceAll("{SLUG}", slug).replaceAll("{Id}", id).replaceAll("{Slug}", slug);
  return baseUrl + (path.startsWith("/") ? path : "/" + path);
}
__name(canonicalFromTemplate, "canonicalFromTemplate");
async function getSeoForRequest(env, request, context) {
  const settings = await getSeoSettings(env, request);
  const baseUrl = (settings.base_url || new URL(request.url).origin).replace(/\/+$/, "");
  if (settings.__force_noindex) {
    return {
      robots: "noindex,nofollow",
      canonical: baseUrl + normalizePath(new URL(request.url).pathname)
    };
  }
  if (!env?.DB) {
    return { robots: "index,follow", canonical: baseUrl + normalizePath(new URL(request.url).pathname) };
  }
  if (context?.product) {
    const product = context.product;
    const rule2 = await getProductRule(env, String(product.id));
    const allowIndex2 = rule2 ? rule2.allow_index !== 0 : true;
    const allowFollow2 = rule2 ? rule2.allow_follow !== 0 : true;
    const canonical2 = (rule2?.canonical_override || product.seo_canonical || "").trim() ? String(rule2?.canonical_override || product.seo_canonical).trim() : canonicalFromTemplate(baseUrl, settings.product_url_template, product);
    return {
      robots: computeRobotsValue(allowIndex2, allowFollow2),
      canonical: canonical2
    };
  }
  const path = normalizePath(context?.path || new URL(request.url).pathname);
  const rule = await getPageRule(env, path);
  const allowIndex = rule ? rule.allow_index !== 0 : true;
  const allowFollow = rule ? rule.allow_follow !== 0 : true;
  const canonical = (rule?.canonical_override || "").trim() ? String(rule.canonical_override).trim() : baseUrl + path;
  return {
    robots: computeRobotsValue(allowIndex, allowFollow),
    canonical
  };
}
__name(getSeoForRequest, "getSeoForRequest");
async function buildRobotsTxt(env, request) {
  const s = await getSeoSettings(env, request);
  const baseUrl = (s.base_url || new URL(request.url).origin).replace(/\/+$/, "");
  if (!s.robots_enabled) {
    return `User-agent: *
Disallow:

Sitemap: ${baseUrl}/sitemap.xml
`;
  }
  let txt = "";
  txt += "User-agent: *\n";
  if (s.__force_noindex) {
    txt += "Disallow: /\n";
  } else {
    const disallows = [
      "/admin/",
      "/api/",
      "/buyer-order",
      "/buyer-order.html",
      "/order-detail",
      "/order-detail.html",
      "/order-success.html",
      "/success.html"
    ];
    for (const d of disallows) txt += `Disallow: ${d}
`;
  }
  if (s.robots_extra && String(s.robots_extra).trim()) {
    txt += "\n" + String(s.robots_extra).trim() + "\n";
  }
  txt += `
Sitemap: ${baseUrl}/sitemap.xml
`;
  return txt;
}
__name(buildRobotsTxt, "buildRobotsTxt");
function escapeXml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
__name(escapeXml, "escapeXml");
function escapeAttr(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
__name(escapeAttr, "escapeAttr");
function urlsetXml(urls) {
  let out = `<?xml version="1.0" encoding="UTF-8"?>
`;
  out += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  for (const u of urls) {
    out += `  <url>
`;
    out += `    <loc>${escapeXml(u.loc)}</loc>
`;
    if (u.lastmod) out += `    <lastmod>${escapeXml(u.lastmod)}</lastmod>
`;
    if (u.changefreq) out += `    <changefreq>${escapeXml(u.changefreq)}</changefreq>
`;
    if (typeof u.priority === "number") out += `    <priority>${u.priority.toFixed(1)}</priority>
`;
    out += `  </url>
`;
  }
  out += `</urlset>`;
  return out;
}
__name(urlsetXml, "urlsetXml");
function sitemapIndexXml(baseUrl, count) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let out = `<?xml version="1.0" encoding="UTF-8"?>
`;
  out += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  for (let i = 1; i <= count; i++) {
    out += `  <sitemap>
`;
    out += `    <loc>${escapeXml(baseUrl + `/sitemap-${i}.xml`)}</loc>
`;
    out += `    <lastmod>${escapeXml(now)}</lastmod>
`;
    out += `  </sitemap>
`;
  }
  out += `</sitemapindex>`;
  return out;
}
__name(sitemapIndexXml, "sitemapIndexXml");
function toIsoDate(d) {
  try {
    return new Date(d).toISOString();
  } catch (e) {
    return null;
  }
}
__name(toIsoDate, "toIsoDate");
async function buildSitemapXml(env, request, partIndex = null) {
  const s = await getSeoSettings(env, request);
  const baseUrl = (s.base_url || new URL(request.url).origin).replace(/\/+$/, "");
  if (!s.sitemap_enabled) return { status: 404, body: "Sitemap disabled", contentType: "text/plain" };
  if (s.__force_noindex) {
    return { status: 200, body: urlsetXml([]), contentType: "application/xml" };
  }
  await ensureSeoTables(env);
  const pageRulesRes = await env.DB.prepare("SELECT * FROM seo_page_rules").all();
  const pageRuleMap = {};
  (pageRulesRes.results || []).forEach((r) => {
    pageRuleMap[normalizePath(r.path)] = r;
  });
  const getPR = /* @__PURE__ */ __name((p) => pageRuleMap[normalizePath(p)] || null, "getPR");
  const urls = [];
  if (s.sitemap_include_pages) {
    const defaultPaths = ["/", "/products", "/blog", "/forum"];
    for (const p of defaultPaths) {
      const rule = getPR(p) || getPR(p + "/");
      const allowIndex = rule ? rule.allow_index !== 0 : true;
      const inSitemap = rule ? rule.include_in_sitemap !== 0 : true;
      if (allowIndex && inSitemap) {
        const loc = rule?.canonical_override && String(rule.canonical_override).trim() ? String(rule.canonical_override).trim() : baseUrl + p;
        urls.push({ loc, lastmod: null, changefreq: rule?.changefreq || "daily", priority: typeof rule?.priority === "number" ? rule.priority : 0.7 });
      }
    }
    const pagesRes = await env.DB.prepare(
      `SELECT slug, updated_at, created_at, status FROM pages WHERE status = 'published'`
    ).all();
    const pageRows = pagesRes.results || [];
    for (const row of pageRows) {
      const slug = String(row.slug || "").trim();
      if (!slug) continue;
      if (slug === "index" || slug === "home") continue;
      const path = normalizePath(`/${slug}`);
      const rule = getPR(path) || getPR(`/${slug}.html`);
      const allowIndex = rule ? rule.allow_index !== 0 : true;
      const inSitemap = rule ? rule.include_in_sitemap !== 0 : true;
      if (!allowIndex || !inSitemap) continue;
      const loc = rule?.canonical_override && String(rule.canonical_override).trim() ? String(rule.canonical_override).trim() : baseUrl + path;
      const lastmod = row.updated_at ? toIsoDate(row.updated_at) : row.created_at ? toIsoDate(row.created_at) : null;
      urls.push({
        loc,
        lastmod,
        changefreq: rule?.changefreq || "weekly",
        priority: typeof rule?.priority === "number" ? rule.priority : 0.6
      });
    }
  }
  if (s.sitemap_include_products) {
    const prodRes = await env.DB.prepare(
      `SELECT id, title, slug, status, seo_canonical FROM products WHERE status = 'active' ORDER BY id DESC`
    ).all();
    const prodRows = prodRes.results || [];
    const rulesRes = await env.DB.prepare("SELECT * FROM seo_product_rules").all();
    const rulesMap = {};
    (rulesRes.results || []).forEach((r) => {
      rulesMap[String(r.product_id)] = r;
    });
    for (const p of prodRows) {
      const id = String(p.id);
      const rule = rulesMap[id];
      const allowIndex = rule ? rule.allow_index !== 0 : true;
      const inSitemap = rule ? rule.include_in_sitemap !== 0 : true;
      if (!allowIndex || !inSitemap) continue;
      const slug = String(p.slug || "").trim();
      const product = { id, slug, seo_canonical: p.seo_canonical || "" };
      const loc = rule?.canonical_override && String(rule.canonical_override).trim() ? String(rule.canonical_override).trim() : (product.seo_canonical || "").trim() ? String(product.seo_canonical).trim() : canonicalFromTemplate(baseUrl, s.product_url_template, product);
      urls.push({
        loc,
        lastmod: null,
        changefreq: rule?.changefreq || "weekly",
        priority: typeof rule?.priority === "number" ? rule.priority : 0.7
      });
    }
  }
  const maxUrls = Math.min(Math.max(parseInt(s.sitemap_max_urls || DEFAULT_SETTINGS.sitemap_max_urls, 10), 1e3), 5e4);
  if (partIndex && Number.isFinite(Number(partIndex))) {
    const idx = Math.max(1, parseInt(partIndex, 10));
    const start = (idx - 1) * maxUrls;
    const slice = urls.slice(start, start + maxUrls);
    return { status: 200, body: urlsetXml(slice), contentType: "application/xml" };
  }
  if (urls.length > maxUrls) {
    const parts = Math.ceil(urls.length / maxUrls);
    return { status: 200, body: sitemapIndexXml(baseUrl, parts), contentType: "application/xml" };
  }
  return { status: 200, body: urlsetXml(urls), contentType: "application/xml" };
}
__name(buildSitemapXml, "buildSitemapXml");

// src/controllers/coupons.js
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
  const isAdmin = await isAdminAuthed(req, env);
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
async function isAdminAuthed(req, env) {
  const ADMIN_COOKIE2 = "admin_session";
  const ADMIN_MAX_AGE_SECONDS2 = 60 * 60 * 24 * 7;
  const cookieHeader = req.headers.get("Cookie") || "";
  const value = getCookieValue(cookieHeader, ADMIN_COOKIE2);
  if (!value) return false;
  const [tsStr, sig] = value.split(".");
  if (!tsStr || !sig) return false;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.floor((Date.now() - ts) / 1e3);
  if (ageSec < 0 || ageSec > ADMIN_MAX_AGE_SECONDS2) return false;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const expected = await hmacSha256(secret, tsStr);
  return expected === sig;
}
__name(isAdminAuthed, "isAdminAuthed");
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
  const base64url2 = /* @__PURE__ */ __name((bytes) => {
    const b64 = btoa(String.fromCharCode(...bytes));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }, "base64url");
  return base64url2(new Uint8Array(sig));
}
__name(hmacSha256, "hmacSha256");

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

// src/router.js
async function routeApiRequest(req, env, url, path, method) {
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
  if (method === "GET" && path === "/api/admin/seo/settings") {
    return adminGetSeoSettings(env, req);
  }
  if (method === "POST" && path === "/api/admin/seo/settings") {
    return adminSaveSeoSettings(env, req);
  }
  if (method === "GET" && path === "/api/admin/seo/pages") {
    return adminListPageRules(env);
  }
  if (method === "POST" && path === "/api/admin/seo/pages") {
    return adminUpsertPageRules(env, req);
  }
  if (method === "DELETE" && path === "/api/admin/seo/pages") {
    return adminDeletePageRule(env, req);
  }
  if (method === "GET" && path === "/api/admin/seo/products") {
    return adminListProductsWithRules(env, req);
  }
  if (method === "POST" && path === "/api/admin/seo/products") {
    return adminPatchProductRule(env, req);
  }
  if (method === "GET" && path === "/api/admin/automation/settings") {
    return getAutomationSettings(env);
  }
  if (method === "POST" && path === "/api/admin/automation/settings") {
    const body = await req.json().catch(() => ({}));
    return saveAutomationSettings(env, body);
  }
  if (method === "GET" && path === "/api/admin/automation/logs") {
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    return getAutomationLogs(env, limit);
  }
  if (method === "DELETE" && path === "/api/admin/automation/logs" || method === "POST" && path === "/api/admin/automation/logs/clear") {
    return clearAutomationLogs(env);
  }
  if (method === "POST" && path === "/api/admin/automation/test") {
    const body = await req.json().catch(() => ({}));
    return testNotification(env, body);
  }
  if (method === "POST" && path === "/api/admin/automation/test/webhook") {
    const webhookId = url.searchParams.get("id");
    return testWebhook(env, webhookId);
  }
  if (method === "POST" && path === "/api/admin/automation/test/email") {
    const serviceId = url.searchParams.get("id");
    const testEmailAddr = url.searchParams.get("email");
    return testEmail(env, serviceId, testEmailAddr);
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
    const response = await getProduct(env, id);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=15, s-maxage=30");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
  if (method === "POST" && path === "/api/product/save") {
    const body = await req.json();
    return saveProduct(env, body);
  }
  if (method === "DELETE" && path === "/api/product/delete") {
    const id = url.searchParams.get("id");
    return deleteProduct(env, id);
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
    const body = await req.json();
    return handleWebhook(env, body);
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
    const body = await req.json();
    return handlePayPalWebhook(env, body, req.headers);
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
  if (method === "GET" && path === "/api/settings/custom-css") {
    try {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("custom_css").first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        return new Response(JSON.stringify({ success: true, settings }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60, s-maxage=300"
          }
        });
      }
      return new Response(JSON.stringify({ success: true, settings: {} }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60, s-maxage=300"
        }
      });
    } catch (err) {
      return json({ success: true, settings: {} });
    }
  }
  if (method === "POST" && path === "/api/settings/custom-css") {
    try {
      const body = await req.json();
      const value = JSON.stringify(body);
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("custom_css", value).run();
      return json({ success: true, cacheCleared: true });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/settings/code-snippets") {
    try {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("code_snippets").first();
      if (row && row.value) {
        const snippets = JSON.parse(row.value);
        return new Response(JSON.stringify({ success: true, snippets }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60, s-maxage=300"
          }
        });
      }
      return new Response(JSON.stringify({ success: true, snippets: [] }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60, s-maxage=300"
        }
      });
    } catch (err) {
      return json({ success: true, snippets: [] });
    }
  }
  if (method === "POST" && path === "/api/settings/code-snippets") {
    try {
      const body = await req.json();
      const value = JSON.stringify(body.snippets || []);
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("code_snippets", value).run();
      return json({ success: true });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
  if (method === "GET" && path === "/api/public/code-snippets") {
    try {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("code_snippets").first();
      if (row && row.value) {
        const snippets = JSON.parse(row.value);
        const pageType = url.searchParams.get("page") || "all";
        const position = url.searchParams.get("position") || "all";
        const filtered = snippets.filter((s) => {
          if (!s.enabled) return false;
          if (position !== "all" && s.position !== position) return false;
          if (s.pages.includes("all")) return true;
          if (pageType !== "all" && s.pages.includes(pageType)) return true;
          return false;
        });
        return new Response(JSON.stringify({ success: true, snippets: filtered }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300, s-maxage=600",
            "CDN-Cache-Control": "public, max-age=600"
          }
        });
      }
      return new Response(JSON.stringify({ success: true, snippets: [] }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=600"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: true, snippets: [] }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }
      });
    }
  }
  if (method === "GET" && path === "/api/public/custom-css") {
    try {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("custom_css").first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        const section = url.searchParams.get("section") || "all";
        let css = "";
        if (section === "all" || section === "global") {
          css += settings.global || "";
        }
        if (section === "all" || section === "product") {
          css += "\n" + (settings.product || "");
        }
        if (section === "all" || section === "blog") {
          css += "\n" + (settings.blog || "");
        }
        if (section === "all" || section === "forum") {
          css += "\n" + (settings.forum || "");
        }
        return new Response(css.trim(), {
          headers: {
            "Content-Type": "text/css",
            "Cache-Control": "public, max-age=300, s-maxage=600",
            "CDN-Cache-Control": "public, max-age=600"
          }
        });
      }
      return new Response("", {
        headers: {
          "Content-Type": "text/css",
          "Cache-Control": "public, max-age=300, s-maxage=600"
        }
      });
    } catch (err) {
      return new Response("", {
        headers: {
          "Content-Type": "text/css",
          "Cache-Control": "public, max-age=60"
        }
      });
    }
  }
  if (method === "POST" && path === "/api/settings/payment-methods") {
    const body = await req.json();
    return savePaymentMethodsEnabled(env, body);
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
  if (method === "GET" && path.startsWith("/api/reviews/")) {
    const productId = path.split("/").pop();
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
          slug TEXT,
          content TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL DEFAULT '',
          email TEXT DEFAULT '',
          status TEXT DEFAULT 'pending',
          reply_count INTEGER DEFAULT 0,
          created_at INTEGER,
          updated_at INTEGER
        )
      `).run();
      let restoredQuestions = 0;
      for (let i = 0; i < existingQuestions.length; i += batchSize) {
        const batch = existingQuestions.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(
          (q) => env.DB.prepare(`
            INSERT INTO forum_questions (title, slug, content, name, email, status, reply_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            q.title || "",
            q.slug || "",
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
function generateOfferObject(product, baseUrl) {
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
      "name": "WishVideo"
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
  const videoUrl = product.video_url || product.preview_video_url || product.sample_video_url;
  if (!videoUrl) return null;
  const uploadDate = product.created_at ? new Date(product.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
  const duration = product.video_duration || "PT1M";
  const videoSchema = {
    "@type": "VideoObject",
    "name": `${product.title} - Personalized Video`,
    "description": product.seo_description || product.description || `Watch ${product.title} personalized video greeting`,
    "thumbnailUrl": product.thumbnail_url || `${baseUrl}/favicon.ico`,
    "uploadDate": uploadDate,
    "duration": duration,
    "contentUrl": videoUrl,
    "embedUrl": videoUrl,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "WatchAction" },
      "userInteractionCount": parseInt(product.view_count) || 100
    },
    "publisher": {
      "@type": "Organization",
      "name": "WishVideo",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/favicon.ico`
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
    "image": images.length > 0 ? images : [`${baseUrl}/favicon.ico`],
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
  const videoObject = generateVideoObject(product, baseUrl);
  if (videoObject) {
    schema.video = videoObject;
    schema.subjectOf = {
      "@type": "VideoObject",
      "@id": `${productUrl}#video`,
      ...videoObject
    };
  }
  schema.aggregateRating = {
    "@type": "AggregateRating",
    "ratingValue": parseFloat(product.rating_average) || 5,
    "reviewCount": Math.max(1, parseInt(product.review_count) || 1),
    "bestRating": 5,
    "worstRating": 1
  };
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
    "name": "WishVideo Products",
    "numberOfItems": products.length,
    "itemListElement": itemListElement
  };
  return JSON.stringify(schema);
}
__name(generateCollectionSchema, "generateCollectionSchema");
function injectSchemaIntoHTML(html, schemaId, schemaJson) {
  const placeholder = `<script type="application/ld+json" id="${schemaId}">{}<\/script>`;
  const replacement = `<script type="application/ld+json" id="${schemaId}">${schemaJson}<\/script>`;
  return html.replace(placeholder, replacement);
}
__name(injectSchemaIntoHTML, "injectSchemaIntoHTML");

// src/index.js
var ADMIN_COOKIE = "admin_session";
var ADMIN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
function noStoreHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    ...extra
  };
}
__name(noStoreHeaders, "noStoreHeaders");
function base64url(bytes) {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64url, "base64url");
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
  return base64url(new Uint8Array(sig));
}
__name(hmacSha2562, "hmacSha256");
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
async function isAdminAuthed2(req, env) {
  const cookieHeader = req.headers.get("Cookie") || "";
  const value = getCookieValue2(cookieHeader, ADMIN_COOKIE);
  if (!value) return false;
  const [tsStr, sig] = value.split(".");
  if (!tsStr || !sig) return false;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.floor((Date.now() - ts) / 1e3);
  if (ageSec < 0 || ageSec > ADMIN_MAX_AGE_SECONDS) return false;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const expected = await hmacSha2562(secret, tsStr);
  return expected === sig;
}
__name(isAdminAuthed2, "isAdminAuthed");
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
  const safeTitle = (blog.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeDesc = (blog.seo_description || blog.description || "").substring(0, 160).replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blog.seo_title || blog.title} - WishesU</title>
  <meta name="description" content="${safeDesc}">
  <meta name="keywords" content="${blog.seo_keywords || ""}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${blog.thumbnail_url || ""}">
  <meta property="og:type" content="article">
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
      <a href="/blog/" class="back-link">\u2190 Back to Blog</a>
      <h1>${safeTitle}</h1>
      ${date ? `<div class="blog-meta"><span>\u{1F4C5} ${date}</span></div>` : ""}
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
              \u23F3 You have a comment awaiting approval. Please wait for it to be approved before posting another.
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
  const safeTitle = (question.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeContent = (question.content || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
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
  <title>${safeTitle} - Forum - WishesU</title>
  <meta name="description" content="${safeTitle}">
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
    setVersion(env.VERSION);
    const url = new URL(req.url);
    let path = url.pathname.replace(/\/+/g, "/");
    if (!path.startsWith("/")) {
      path = "/" + path;
    }
    const method = req.method;
    if (env.DB) {
      warmupDB(env, ctx2);
    }
    const isAdminUI = path === "/admin" || path === "/admin/" || path.startsWith("/admin/");
    const isAdminAPI = path.startsWith("/api/admin/");
    const isLoginRoute = path === "/admin/login" || path === "/admin/login/";
    const isLogoutRoute = path === "/admin/logout" || path === "/admin/logout/";
    const isAdminProtectedPage = path === "/order-detail" || path === "/order-detail/" || path === "/order-detail.html";
    async function requireAdmin() {
      const ok = await isAdminAuthed2(req, env);
      if (ok) return null;
      if (isAdminAPI) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...CORS, "Content-Type": "application/json" }
        });
      }
      return Response.redirect(new URL("/admin/login", req.url).toString(), 302);
    }
    __name(requireAdmin, "requireAdmin");
    if (isLoginRoute && method === "GET") {
      if (await isAdminAuthed2(req, env)) {
        return Response.redirect(new URL("/admin", req.url).toString(), 302);
      }
      if (env.ASSETS) {
        const r = await env.ASSETS.fetch(new Request(new URL("/admin/login.html", req.url)));
        const h = new Headers(r.headers);
        h.set("Alt-Svc", "clear");
        h.set("Cache-Control", "no-store, no-cache, must-revalidate");
        h.set("Pragma", "no-cache");
        return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
      }
      return new Response("Login page not found", { status: 404, headers: noStoreHeaders() });
    }
    if (isLoginRoute && method === "POST") {
      const form = await req.formData();
      const email = (form.get("email") || "").toString().trim();
      const password = (form.get("password") || "").toString();
      if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
        return new Response("Admin login is not configured (missing secrets).", { status: 500, headers: noStoreHeaders() });
      }
      if (email === (env.ADMIN_EMAIL || "") && password === (env.ADMIN_PASSWORD || "")) {
        const tsStr = String(Date.now());
        const sig = await hmacSha2562(env.ADMIN_SESSION_SECRET || "missing", tsStr);
        const cookieVal = `${tsStr}.${sig}`;
        return new Response(null, {
          status: 302,
          headers: noStoreHeaders({
            "Set-Cookie": `${ADMIN_COOKIE}=${cookieVal}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_MAX_AGE_SECONDS}`,
            "Location": new URL("/admin", req.url).toString()
          })
        });
      }
      return new Response("Invalid login", {
        status: 401,
        headers: noStoreHeaders({
          "Set-Cookie": `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
        })
      });
    }
    if (isLogoutRoute) {
      return new Response(null, {
        status: 302,
        headers: noStoreHeaders({
          "Set-Cookie": `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
          "Location": new URL("/admin/login", req.url).toString()
        })
      });
    }
    if ((isAdminUI || isAdminAPI || isAdminProtectedPage) && !isLoginRoute) {
      const gate = await requireAdmin();
      if (gate) return gate;
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
      const assetResp = await env.ASSETS.fetch(req);
      if (assetResp.status === 200) {
        const headers = new Headers(assetResp.headers);
        headers.set("Alt-Svc", "clear");
        const isAdminAsset = path.startsWith("/js/admin/") || path.startsWith("/css/admin/");
        if (isAdminAsset) {
          headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
        } else if (!headers.has("Cache-Control")) {
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
        }
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
      return new Response(JSON.stringify({
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
      });
    }
    if (method === "GET" || method === "HEAD") {
      if (path === "/robots.txt") {
        if (env.DB) await initDB(env);
        const txt = await buildRobotsTxt(env, req);
        return new Response(txt, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300"
          }
        });
      }
      if (path === "/sitemap.xml" || /^\/sitemap-(\d+)\.xml$/.test(path)) {
        if (env.DB) await initDB(env);
        const m = path.match(/^\/sitemap-(\d+)\.xml$/);
        const part = m ? m[1] : null;
        const sm = await buildSitemapXml(env, req, part);
        return new Response(sm.body, {
          status: sm.status || 200,
          headers: {
            "Content-Type": (sm.contentType || "application/xml") + "; charset=utf-8",
            "Cache-Control": "public, max-age=300"
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
        if (slug && env.DB) {
          try {
            await initDB(env);
            const blog = await env.DB.prepare(`
              SELECT * FROM blogs WHERE slug = ? AND status = 'published'
            `).bind(slug).first();
            if (blog) {
              const [prevResult, commentsResult, seo] = await Promise.all([
                // Get previous 2 blog posts (before current one)
                env.DB.prepare(`
                  SELECT id, title, slug, description, thumbnail_url, created_at
                  FROM blogs 
                  WHERE status = 'published' AND id < ?
                  ORDER BY id DESC
                  LIMIT 2
                `).bind(blog.id).all(),
                // Get approved comments
                env.DB.prepare(`
                  SELECT id, name, comment, created_at
                  FROM blog_comments 
                  WHERE blog_id = ? AND status = 'approved'
                  ORDER BY created_at DESC
                `).bind(blog.id).all(),
                // Get SEO settings
                getSeoForRequest(env, req, { path })
              ]);
              const previousBlogs = prevResult.results || [];
              const comments = commentsResult.results || [];
              const htmlRaw = generateBlogPostHTML(blog, previousBlogs, comments);
              const html = applySeoToHtml(htmlRaw, seo.robots, seo.canonical);
              return new Response(html, {
                status: 200,
                headers: {
                  "Content-Type": "text/html; charset=utf-8",
                  "X-Worker-Version": VERSION,
                  "X-Robots-Tag": seo.robots
                }
              });
            }
          } catch (e) {
            console.error("Blog fetch error:", e);
          }
        }
      }
      if ((method === "GET" || method === "HEAD") && path.startsWith("/forum/") && path !== "/forum/" && !path.includes(".")) {
        const slug = path.replace("/forum/", "").replace(/\/$/, "");
        if (slug && env.DB) {
          try {
            await initDB(env);
            const question = await env.DB.prepare(`
              SELECT * FROM forum_questions WHERE slug = ? AND status = 'approved'
            `).bind(slug).first();
            if (question) {
              const [repliesResult, productsResult, blogsResult, seo] = await Promise.all([
                // Get approved replies
                env.DB.prepare(`
                  SELECT id, name, content, created_at
                  FROM forum_replies 
                  WHERE question_id = ? AND status = 'approved'
                  ORDER BY created_at ASC
                `).bind(question.id).all(),
                // Get sidebar products
                env.DB.prepare(`
                  SELECT id, title, slug, thumbnail_url, sale_price, normal_price
                  FROM products 
                  WHERE status = 'active'
                  ORDER BY id DESC
                  LIMIT 2 OFFSET ?
                `).bind(Math.max(0, question.id - 1)).all(),
                // Get sidebar blogs
                env.DB.prepare(`
                  SELECT id, title, slug, thumbnail_url, description
                  FROM blogs 
                  WHERE status = 'published'
                  ORDER BY id DESC
                  LIMIT 2 OFFSET ?
                `).bind(Math.max(0, question.id - 1)).all(),
                // Get SEO settings
                getSeoForRequest(env, req, { path })
              ]);
              const replies = repliesResult.results || [];
              const sidebar = {
                products: productsResult.results || [],
                blogs: blogsResult.results || []
              };
              const htmlRaw = generateForumQuestionHTML(question, replies, sidebar);
              const html = applySeoToHtml(htmlRaw, seo.robots, seo.canonical);
              return new Response(html, {
                status: 200,
                headers: {
                  "Content-Type": "text/html; charset=utf-8",
                  "X-Worker-Version": VERSION,
                  "X-Robots-Tag": seo.robots
                }
              });
            }
          } catch (e) {
            console.error("Forum question fetch error:", e);
          }
        }
      }
      if (path.startsWith("/api/") || path === "/submit-order") {
        const apiResponse = await routeApiRequest(req, env, url, path, method);
        if (apiResponse) return apiResponse;
      }
      if (path.startsWith("/download/")) {
        const orderId = path.split("/").pop();
        return handleSecureDownload(env, orderId, url.origin);
      }
      if ((path === "/admin" || path.startsWith("/admin/")) && !path.startsWith("/api/")) {
        const standaloneAdminPages = [
          "/admin/product-form.html",
          "/admin/blog-form.html",
          "/admin/page-builder.html",
          "/admin/landing-builder.html",
          "/admin/migrate-reviews.html"
        ];
        if (standaloneAdminPages.includes(path)) {
          if (env.ASSETS) {
            const assetResp = await env.ASSETS.fetch(new Request(new URL(path, req.url)));
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
      const coreStaticPages = ["index", "products-grid", "product", "buyer-order", "order-detail", "order-success", "success", "page-builder"];
      if (path.endsWith(".html") && !path.includes("/admin/") && !path.startsWith("/admin") && !path.startsWith("/blog/") && !path.startsWith("/forum/")) {
        const slug = path.slice(1).replace(/\.html$/, "");
        if (!coreStaticPages.includes(slug)) {
          try {
            if (env.DB) {
              await initDB(env);
              const row = await env.DB.prepare("SELECT slug FROM pages WHERE slug = ? AND status = ?").bind(slug, "published").first();
              if (row) {
                return Response.redirect(`${url.origin}/${slug}`, 301);
              }
            }
          } catch (e) {
          }
        }
      }
      if (!path.includes(".") && !path.includes("/admin") && !path.startsWith("/api/") && path !== "/" && !path.startsWith("/blog/") && !path.startsWith("/forum/") && !path.startsWith("/product-") && !path.startsWith("/download/")) {
        const slug = path.slice(1).replace(/\/$/, "");
        if (slug && !coreStaticPages.includes(slug)) {
          try {
            if (env.DB) {
              await initDB(env);
              const row = await env.DB.prepare("SELECT content FROM pages WHERE slug = ? AND status = ?").bind(slug, "published").first();
              if (row && row.content) {
                let html = row.content;
                if (html.includes("<body") && !html.includes("global-components.js")) {
                  html = html.replace(/<body([^>]*)>/i, '<body$1>\n<script src="/js/global-components.js"><\/script>');
                }
                try {
                  const seo = await getSeoForRequest(env, req, { path: "/" + slug });
                  html = applySeoToHtml(html, seo.robots, seo.canonical);
                } catch (e) {
                }
                return new Response(html, {
                  status: 200,
                  headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "X-Worker-Version": VERSION
                  }
                });
              }
            }
          } catch (e) {
          }
        }
      }
      if (method === "GET") {
        const htmlRedirects = {
          "/forum.html": "/forum",
          "/blog.html": "/blog",
          "/products.html": "/products",
          "/products-grid.html": "/products"
        };
        if (htmlRedirects[path]) {
          return Response.redirect(`${url.origin}${htmlRedirects[path]}`, 301);
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
        } else if (path === "/products/" || path === "/products/index.html" || path === "/products" || path === "/products-grid.html" || path === "/products.html") {
          defaultPageType = "product_grid";
        }
        if (defaultPageType) {
          try {
            await initDB(env);
            const defaultPage = await env.DB.prepare(
              "SELECT content FROM pages WHERE page_type = ? AND is_default = 1 AND status = ?"
            ).bind(defaultPageType, "published").first();
            if (defaultPage && defaultPage.content) {
              let html = defaultPage.content;
              if (html.includes("<body") && !html.includes("global-components.js")) {
                html = html.replace(/<body([^>]*)>/i, '<body$1>\n<script src="/js/global-components.js"><\/script>');
              }
              return new Response(html, {
                status: 200,
                headers: {
                  "Content-Type": "text/html; charset=utf-8",
                  "X-Worker-Version": VERSION,
                  "X-Default-Page": defaultPageType
                }
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
        }
        const assetResp = await env.ASSETS.fetch(assetReq);
        const contentType = assetResp.headers.get("content-type") || "";
        const isHTML = contentType.includes("text/html") || assetPath === "/_product_template.tpl";
        const isSuccess = assetResp.status === 200;
        const shouldCache = isHTML && isSuccess && !path.startsWith("/admin") && !path.includes("/admin/");
        const cacheKey = new Request(req.url, {
          method: "GET",
          headers: { "Accept": "text/html" }
        });
        if (shouldCache) {
          try {
            const cachedResponse = await caches.default.match(cacheKey);
            if (cachedResponse) {
              const headers2 = new Headers(cachedResponse.headers);
              headers2.set("X-Cache", "HIT");
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
            if (assetPath === "/_product_template.tpl" || assetPath === "/product.html" || assetPath === "/product") {
              const productId = schemaProductId ? String(schemaProductId) : url.searchParams.get("id");
              if (productId && env.DB) {
                await initDB(env);
                const [productResult, reviewsResult] = await Promise.all([
                  env.DB.prepare(`
                    SELECT p.*, 
                      COUNT(r.id) as review_count, 
                      AVG(r.rating) as rating_average
                    FROM products p
                    LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                    WHERE p.id = ?
                    GROUP BY p.id
                  `).bind(Number(productId)).first(),
                  env.DB.prepare(
                    "SELECT * FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC LIMIT 5"
                  ).bind(Number(productId), "approved").all()
                ]);
                const product = productResult;
                if (product) {
                  schemaProduct = product;
                  const reviews = reviewsResult.results || [];
                  const schemaJson = generateProductSchema(product, baseUrl, reviews);
                  html = injectSchemaIntoHTML(html, "product-schema", schemaJson);
                  const videoSchemaJson = generateVideoSchema(product, baseUrl);
                  if (videoSchemaJson && videoSchemaJson !== "{}") {
                    const videoSchemaTag = `<script type="application/ld+json" id="video-schema">${videoSchemaJson}<\/script>`;
                    html = html.replace("</head>", `${videoSchemaTag}
</head>`);
                  }
                  if (product.video_url || product.preview_video_url) {
                    const videoUrl = product.video_url || product.preview_video_url;
                    const videoMetaTags = `
    <meta property="og:type" content="video.other">
    <meta property="og:video" content="${videoUrl}">
    <meta property="og:video:url" content="${videoUrl}">
    <meta property="og:video:secure_url" content="${videoUrl}">
    <meta property="og:video:type" content="video/mp4">
    <meta property="og:video:width" content="1280">
    <meta property="og:video:height" content="720">
    <meta name="twitter:card" content="player">
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
                  const safeTitle = (product.title || "").replace(/"/g, "&quot;");
                  const safeDesc = (product.description || "").substring(0, 160).replace(/"/g, "&quot;").replace(/\n/g, " ");
                  html = html.replace("<title>Loading Product... | WishVideo</title>", `<title>${safeTitle} | WishVideo</title>`);
                  html = html.replace('<meta property="og:title" content="Loading...">', `<meta property="og:title" content="${safeTitle}">`);
                  html = html.replace('<meta property="og:description" content="">', `<meta property="og:description" content="${safeDesc}">`);
                  html = html.replace('<meta property="og:image" content="">', `<meta property="og:image" content="${product.thumbnail_url || ""}">`);
                  html = html.replace('<meta name="description" content="Custom personalized video greetings from Africa.">', `<meta name="description" content="${safeDesc}">`);
                }
              }
            }
            if (assetPath === "/index.html" || assetPath === "/" || assetPath === "/products.html" || assetPath === "/products-grid.html") {
              if (env.DB) {
                await initDB(env);
                const productsResult = await env.DB.prepare(`
                  SELECT p.*,
                    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') as review_count,
                    (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'approved') as rating_average
                  FROM products p
                  WHERE p.status = 'active'
                  ORDER BY p.sort_order ASC, p.id DESC
                `).all();
                const products = productsResult.results || [];
                if (products.length > 0) {
                  const schemaJson = generateCollectionSchema(products, baseUrl);
                  html = injectSchemaIntoHTML(html, "collection-schema", schemaJson);
                }
              }
            }
            const headers2 = new Headers();
            headers2.set("Alt-Svc", "clear");
            headers2.set("Content-Type", "text/html; charset=utf-8");
            headers2.set("X-Worker-Version", VERSION);
            headers2.set("Alt-Svc", "clear");
            headers2.set("X-Cache", "MISS");
            if (!isAdminUI && !isAdminAPI) {
              try {
                const seo = await getSeoForRequest(env, req, schemaProduct ? { product: schemaProduct } : { path });
                html = applySeoToHtml(html, seo.robots, seo.canonical);
                headers2.set("X-Robots-Tag", seo.robots);
              } catch (e) {
              }
            }
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
        await initDB(env);
        await env.DB.prepare("SELECT 1 as warm").first();
        console.log("DB connection warmed successfully");
        if (event.cron === "0 2 * * *") {
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
  index_default as default
};
//# sourceMappingURL=index.js.map
