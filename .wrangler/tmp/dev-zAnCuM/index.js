var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-F23rsA/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
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
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/core/config/cors.js
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var handleOptions = /* @__PURE__ */ __name(() => new Response(null, { status: 204, headers: CORS }), "handleOptions");

// src/core/utils/response.js
var json = /* @__PURE__ */ __name((data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json", ...headers }
}), "json");

// src/modules/products/schema.js
async function setupProductTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      price INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      instant INTEGER DEFAULT 0,
      delivery_days INTEGER DEFAULT 2,
      media_json TEXT,
      addons_json TEXT,
      video_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )`
  ).run();
  await db.prepare("ALTER TABLE products ADD COLUMN addons_json TEXT").run().catch(() => {
  });
  await db.prepare("ALTER TABLE products ADD COLUMN instant INTEGER DEFAULT 0").run().catch(() => {
  });
  await db.prepare("ALTER TABLE products ADD COLUMN delivery_days INTEGER DEFAULT 2").run().catch(() => {
  });
}
__name(setupProductTable, "setupProductTable");

// src/modules/orders/schema.js
async function setupOrderTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      email TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_title TEXT,
      status TEXT DEFAULT 'pending',
      delivery_days INTEGER DEFAULT 2,
      instant INTEGER DEFAULT 0,
      addons_json TEXT,
      due_at TEXT,
      archive_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )`
  ).run();
  await db.prepare("ALTER TABLE orders ADD COLUMN product_title TEXT").run().catch(() => {
  });
  await db.prepare("ALTER TABLE orders ADD COLUMN addons_json TEXT").run().catch(() => {
  });
}
__name(setupOrderTable, "setupOrderTable");

// src/modules/whop/schema.js
async function setupWhopTables(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS checkout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkout_id TEXT,
      product_id INTEGER,
      plan_id TEXT,
      metadata TEXT,
      expires_at TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS whop_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
}
__name(setupWhopTables, "setupWhopTables");

// src/modules/chat/schema.js
async function setupChatTables(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )`
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
}
__name(setupChatTables, "setupChatTables");

// src/core/config/db.js
var initialized = false;
async function initDB(env) {
  if (!env.DB) throw new Error("DB binding missing");
  if (initialized) return;
  await env.DB.prepare("SELECT 1").first();
  await setupProductTable(env.DB);
  await setupOrderTable(env.DB);
  await setupWhopTables(env.DB);
  await setupChatTables(env.DB);
  initialized = true;
}
__name(initDB, "initDB");

// src/modules/products/service.js
async function getAllProducts(db) {
  const result = await db.prepare(
    "SELECT * FROM products ORDER BY id DESC"
  ).all();
  return result.results || [];
}
__name(getAllProducts, "getAllProducts");
async function getProductByIdOrSlug(db, id) {
  return db.prepare(
    "SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1"
  ).bind(Number(id) || 0, String(id || "")).first();
}
__name(getProductByIdOrSlug, "getProductByIdOrSlug");
async function updateProduct(db, data) {
  return db.prepare(
    `UPDATE products
     SET title = ?, slug = ?, price = ?, status = ?, instant = ?, delivery_days = ?,
         media_json = ?, addons_json = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.title,
    data.slug,
    data.price,
    data.status,
    data.instant,
    data.deliveryDays,
    data.mediaJson,
    data.addonsJson,
    data.videoUrl,
    data.id
  ).run();
}
__name(updateProduct, "updateProduct");
async function createProduct(db, data) {
  return db.prepare(
    `INSERT INTO products (title, slug, price, status, instant, delivery_days, media_json, addons_json, video_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.title,
    data.slug,
    data.price,
    data.status,
    data.instant,
    data.deliveryDays,
    data.mediaJson,
    data.addonsJson,
    data.videoUrl
  ).run();
}
__name(createProduct, "createProduct");
async function removeProduct(db, id) {
  return db.prepare("DELETE FROM products WHERE id = ?").bind(Number(id)).run();
}
__name(removeProduct, "removeProduct");

// src/modules/products/controller.js
var slugify = /* @__PURE__ */ __name((value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), "slugify");
var parseJsonArray = /* @__PURE__ */ __name((value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return [];
  }
}, "parseJsonArray");
var toPayload = /* @__PURE__ */ __name((body) => ({
  id: body.id ? Number(body.id) : null,
  title: String(body.title || "").trim(),
  slug: slugify(body.slug || body.title),
  price: Number(body.price || 0),
  status: String(body.status || "active"),
  instant: body.instant === 1 || body.instant === true || body.instant === "1" ? 1 : 0,
  deliveryDays: Math.max(0, Math.floor(Number(body.delivery_days || body.deliveryDays || 2))),
  mediaJson: JSON.stringify(parseJsonArray(body.media)),
  addonsJson: JSON.stringify(parseJsonArray(body.addons)),
  videoUrl: String(body.video_url || "")
}), "toPayload");
var decorate = /* @__PURE__ */ __name((row) => ({
  ...row,
  media: parseJsonArray(row.media_json),
  addons: parseJsonArray(row.addons_json)
}), "decorate");
async function list(req, env) {
  const rows = await getAllProducts(env.DB);
  return json({ results: rows.map(decorate) }, 200, CORS);
}
__name(list, "list");
async function get(req, env, id) {
  const row = await getProductByIdOrSlug(env.DB, id);
  if (!row) return json({ error: "Not found" }, 404, CORS);
  return json({ product: decorate(row) }, 200, CORS);
}
__name(get, "get");
async function save(req, env) {
  const body = await req.json().catch(() => ({}));
  const payload = toPayload(body);
  if (!payload.title) {
    return json({ error: "Title required" }, 400, CORS);
  }
  if (payload.id) {
    await updateProduct(env.DB, payload);
    return get(req, env, payload.id);
  }
  const res = await createProduct(env.DB, payload);
  const id = res?.meta?.last_row_id ?? res?.lastRowId;
  return get(req, env, id);
}
__name(save, "save");
async function remove(req, env, id) {
  await removeProduct(env.DB, id);
  return json({ ok: true }, 200, CORS);
}
__name(remove, "remove");

// src/modules/products/router.js
async function productRouter(req, env, url, path, method) {
  if (method === "GET" && path === "/api/products") {
    return list(req, env);
  }
  if (method === "GET" && path.startsWith("/api/product/")) {
    const id = path.split("/").pop();
    return get(req, env, id);
  }
  if (method === "POST" && path === "/api/product/save") {
    return save(req, env);
  }
  if (method === "DELETE" && path === "/api/product/delete") {
    const id = url.searchParams.get("id");
    return remove(req, env, id);
  }
  return null;
}
__name(productRouter, "productRouter");

// src/core/utils/delivery.js
var toInt = /* @__PURE__ */ __name((value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}, "toInt");
function normalizeDeliveryDays(instant, deliveryDays) {
  if (instant === 1 || instant === true || instant === "1") {
    return { instant: 1, days: 0 };
  }
  const days = toInt(deliveryDays, 2) || 2;
  return { instant: 0, days };
}
__name(normalizeDeliveryDays, "normalizeDeliveryDays");
function calcDueAt(nowMs, instant, deliveryDays) {
  const { instant: isInstant, days } = normalizeDeliveryDays(instant, deliveryDays);
  const offsetMs = isInstant ? 60 * 60 * 1e3 : days * 24 * 60 * 60 * 1e3;
  return new Date(nowMs + offsetMs).toISOString();
}
__name(calcDueAt, "calcDueAt");

// src/modules/orders/service.js
async function listOrders(db) {
  const result = await db.prepare(
    "SELECT * FROM orders ORDER BY id DESC"
  ).all();
  return result.results || [];
}
__name(listOrders, "listOrders");
async function getOrderById(db, id) {
  return db.prepare(
    "SELECT * FROM orders WHERE id = ? OR order_id = ? LIMIT 1"
  ).bind(Number(id) || 0, String(id || "")).first();
}
__name(getOrderById, "getOrderById");
async function getProductSnapshot(db, productId) {
  return db.prepare(
    "SELECT id, title, instant, delivery_days, addons_json FROM products WHERE id = ? LIMIT 1"
  ).bind(productId).first();
}
__name(getProductSnapshot, "getProductSnapshot");
async function insertOrder(db, data) {
  return db.prepare(
    `INSERT INTO orders (order_id, email, product_id, product_title, status, delivery_days, instant, addons_json, due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.orderId,
    data.email,
    data.productId,
    data.productTitle,
    data.status,
    data.deliveryDays,
    data.instant,
    data.addonsJson,
    data.dueAt
  ).run();
}
__name(insertOrder, "insertOrder");
async function setOrderStatus(db, data) {
  return db.prepare(
    `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`
  ).bind(data.status, data.orderId).run();
}
__name(setOrderStatus, "setOrderStatus");
async function setOrderDelivered(db, data) {
  return db.prepare(
    `UPDATE orders
     SET status = 'delivered', archive_url = ?, updated_at = CURRENT_TIMESTAMP
     WHERE order_id = ?`
  ).bind(data.archiveUrl, data.orderId).run();
}
__name(setOrderDelivered, "setOrderDelivered");

// src/modules/orders/controller.js
var uid = /* @__PURE__ */ __name(() => `OD-${Date.now().toString(36).slice(-6)}`, "uid");
var parseJson = /* @__PURE__ */ __name((value) => {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch (_) {
    return [];
  }
}, "parseJson");
var decorate2 = /* @__PURE__ */ __name((row) => ({
  ...row,
  addons: parseJson(row.addons_json)
}), "decorate");
async function list2(req, env) {
  const rows = await listOrders(env.DB);
  return json({ results: rows.map(decorate2) }, 200, CORS);
}
__name(list2, "list");
async function get2(req, env, id) {
  const row = await getOrderById(env.DB, id);
  if (!row) return json({ error: "Not found" }, 404, CORS);
  return json({ order: decorate2(row) }, 200, CORS);
}
__name(get2, "get");
async function create(req, env) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const productId = Number(body.product_id || body.productId || 0);
  if (!email || !productId) {
    return json({ error: "Missing email or product_id" }, 400, CORS);
  }
  const product = await getProductSnapshot(env.DB, productId);
  if (!product) {
    return json({ error: "Invalid product_id" }, 400, CORS);
  }
  const baseInstant = body.instant ?? product.instant ?? 0;
  const baseDays = body.delivery_days ?? product.delivery_days ?? 2;
  const { instant, days } = normalizeDeliveryDays(baseInstant, baseDays);
  const dueAt = calcDueAt(Date.now(), instant, days);
  const orderId = String(body.order_id || uid());
  let fallbackAddons = [];
  if (product.addons_json) {
    fallbackAddons = parseJson(product.addons_json);
  }
  const addonsJson = JSON.stringify(
    Array.isArray(body.addons) && body.addons.length ? body.addons : fallbackAddons
  );
  const res = await insertOrder(env.DB, {
    orderId,
    email,
    productId,
    productTitle: product.title,
    status: "pending",
    deliveryDays: days,
    instant,
    addonsJson,
    dueAt
  });
  const id = res?.meta?.last_row_id ?? res?.lastRowId;
  return get2(req, env, id);
}
__name(create, "create");
async function updateStatus(req, env) {
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || "").trim();
  const status = String(body.status || "").trim();
  if (!orderId || !status) {
    return json({ error: "Missing order_id or status" }, 400, CORS);
  }
  await setOrderStatus(env.DB, { orderId, status });
  return get2(req, env, orderId);
}
__name(updateStatus, "updateStatus");
async function deliver(req, env) {
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || "").trim();
  const archiveUrl = String(body.archive_url || body.archiveUrl || "").trim();
  if (!orderId || !archiveUrl) {
    return json({ error: "Missing order_id or archive_url" }, 400, CORS);
  }
  await setOrderDelivered(env.DB, { orderId, archiveUrl });
  return get2(req, env, orderId);
}
__name(deliver, "deliver");

// src/modules/orders/router.js
async function orderRouter(req, env, url, path, method) {
  if (method === "GET" && path === "/api/orders") {
    return list2(req, env);
  }
  if (method === "GET" && path.startsWith("/api/order/")) {
    const id = path.split("/").pop();
    return get2(req, env, id);
  }
  if (method === "POST" && path === "/api/order/create") {
    return create(req, env);
  }
  if (method === "POST" && path === "/api/order/update-status") {
    return updateStatus(req, env);
  }
  if (method === "POST" && path === "/api/order/deliver") {
    return deliver(req, env);
  }
  return null;
}
__name(orderRouter, "orderRouter");

// src/core/utils/s3-sign.js
var encoder = new TextEncoder();
var toHex = /* @__PURE__ */ __name((buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join(""), "toHex");
var hmac = /* @__PURE__ */ __name(async (key, data) => {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}, "hmac");
var sha256Hex = /* @__PURE__ */ __name(async (data) => {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return toHex(hash);
}, "sha256Hex");
var amzDate = /* @__PURE__ */ __name((date) => date.toISOString().replace(/[:-]|\.\d{3}/g, ""), "amzDate");
var encodePath = /* @__PURE__ */ __name((key) => key.split("/").map((part) => encodeURIComponent(part)).join("/"), "encodePath");
async function createPresignedPutUrl({
  accessKeyId,
  secretAccessKey,
  accountId,
  bucket,
  key,
  expires = 900
}) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";
  const now = /* @__PURE__ */ new Date();
  const dateTime = amzDate(now);
  const dateStamp = dateTime.slice(0, 8);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalUri = `/${bucket}/${encodePath(key)}`;
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${scope}`,
    "X-Amz-Date": dateTime,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host"
  });
  const canonicalHeaders = `host:${host}
`;
  const canonicalRequest = `PUT
${canonicalUri}
${query.toString()}
${canonicalHeaders}
host
UNSIGNED-PAYLOAD`;
  const stringToSign = `AWS4-HMAC-SHA256
${dateTime}
${scope}
${await sha256Hex(canonicalRequest)}`;
  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex(await hmac(kSigning, stringToSign));
  query.set("X-Amz-Signature", signature);
  return `https://${host}${canonicalUri}?${query.toString()}`;
}
__name(createPresignedPutUrl, "createPresignedPutUrl");

// src/core/config/constants.js
var BUCKETS = {
  PRODUCT_MEDIA: "product-media-bucket",
  R2_BUCKET: "temp-uploads-bucket"
};

// src/modules/media/service.js
var sanitizeKey = /* @__PURE__ */ __name((value) => String(value || "").replace(/\\/g, "/").replace(/\.+/g, ".").replace(/^\/+/, "").replace(/\.\.\//g, "").trim(), "sanitizeKey");
var getArchiveKeys = /* @__PURE__ */ __name((env) => {
  const accessKey = env.ARCHIVE_ACCESS_KEY;
  const secretKey = env.ARCHIVE_SECRET_KEY;
  return accessKey && secretKey ? { accessKey, secretKey } : null;
}, "getArchiveKeys");
var buildPresign = /* @__PURE__ */ __name(async (env, body) => {
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const accountId = env.R2_ACCOUNT_ID;
  if (!accessKeyId || !secretAccessKey || !accountId) return { error: "R2 signing credentials not configured" };
  const key = sanitizeKey(body.key);
  if (!key) return { error: "Missing key" };
  const bucketKey = body.bucket === "PRODUCT_MEDIA" ? "PRODUCT_MEDIA" : "R2_BUCKET";
  const bucketName = BUCKETS[bucketKey];
  if (!bucketName) return { error: "Invalid bucket" };
  const expires = Math.min(3600, Math.max(60, Number(body.expires || 900)));
  const uploadUrl = await createPresignedPutUrl({
    accessKeyId,
    secretAccessKey,
    accountId,
    bucket: bucketName,
    key,
    expires
  });
  return { uploadUrl, key, bucket: bucketKey, expires };
}, "buildPresign");

// src/modules/media/controller.js
async function archiveCredentials(env) {
  const creds = getArchiveKeys(env);
  if (!creds) return json({ error: "Archive credentials not configured" }, 500, CORS);
  return json(creds, 200, CORS);
}
__name(archiveCredentials, "archiveCredentials");
async function r2Presign(req, env) {
  const body = await req.json().catch(() => ({}));
  const result = await buildPresign(env, body);
  if (result.error) {
    const status = result.error === "Missing key" || result.error === "Invalid bucket" ? 400 : 500;
    return json({ error: result.error }, status, CORS);
  }
  return json(result, 200, CORS);
}
__name(r2Presign, "r2Presign");

// src/modules/media/router.js
async function mediaRouter(req, env, url, path, method) {
  if (method === "POST" && path === "/api/upload/archive-credentials") {
    return archiveCredentials(env);
  }
  if (method === "POST" && path === "/api/upload/r2-presign") {
    return r2Presign(req, env);
  }
  return null;
}
__name(mediaRouter, "mediaRouter");

// src/modules/whop/service.js
var apiBase = "https://api.whop.com/api/v2";
var getWhopApiKey = /* @__PURE__ */ __name((env) => env.WHOP_API_KEY || "", "getWhopApiKey");
async function createPlan(env, body) {
  const apiKey = getWhopApiKey(env);
  if (!apiKey) return { error: "Whop API key not configured" };
  const res = await fetch(`${apiBase}/plans`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) return { error: text, status: res.status };
  return { data: JSON.parse(text) };
}
__name(createPlan, "createPlan");
async function createCheckoutSession(env, body) {
  const apiKey = getWhopApiKey(env);
  if (!apiKey) return { error: "Whop API key not configured" };
  const res = await fetch(`${apiBase}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) return { error: text, status: res.status };
  return { data: JSON.parse(text) };
}
__name(createCheckoutSession, "createCheckoutSession");
async function insertCheckout(db, data) {
  return db.prepare(
    `INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, metadata, expires_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    data.checkoutId,
    data.productId,
    data.planId,
    data.metadata,
    data.expiresAt,
    data.status || "pending"
  ).run();
}
__name(insertCheckout, "insertCheckout");
async function updateCheckoutId(db, tempId, checkoutId) {
  return db.prepare(
    `UPDATE checkout_sessions SET checkout_id = ? WHERE checkout_id = ?`
  ).bind(checkoutId, tempId).run();
}
__name(updateCheckoutId, "updateCheckoutId");
async function insertEvent(db, eventId, payload) {
  return db.prepare(
    `INSERT INTO whop_events (event_id, payload, created_at) VALUES (?, ?, datetime('now'))`
  ).bind(eventId, payload).run();
}
__name(insertEvent, "insertEvent");
async function getProductSnapshot2(db, productId) {
  return db.prepare(
    "SELECT id, title, price FROM products WHERE id = ?"
  ).bind(productId).first();
}
__name(getProductSnapshot2, "getProductSnapshot");

// src/modules/whop/controller.js
var parseError = /* @__PURE__ */ __name((text) => {
  try {
    const data = JSON.parse(text);
    return data.message || data.error || text;
  } catch (_) {
    return text || "Whop error";
  }
}, "parseError");
async function createCheckout(req, env, origin) {
  const body = await req.json().catch(() => ({}));
  const planId = String(body.plan_id || "").trim();
  const productId = Number(body.product_id || body.productId || 0);
  if (!planId) return json({ error: "plan_id required" }, 400, CORS);
  const metadata = {
    product_id: productId ? String(productId) : "",
    product_title: body.product_title || "",
    addons: body.addons || []
  };
  const checkoutBody = {
    plan_id: planId,
    redirect_url: `${origin}/success.html`,
    metadata
  };
  const res = await createCheckoutSession(env, checkoutBody);
  if (res.error) return json({ error: parseError(res.error) }, res.status || 500, CORS);
  const checkoutId = res.data?.id || "";
  const expiresAt = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
  await insertCheckout(env.DB, {
    checkoutId,
    productId,
    planId,
    metadata: JSON.stringify(metadata),
    expiresAt
  });
  return json({
    success: true,
    checkout_id: checkoutId,
    checkout_url: res.data?.purchase_url,
    expires_in: "15 minutes"
  }, 200, CORS);
}
__name(createCheckout, "createCheckout");
async function createPlanCheckout(req, env, origin) {
  const body = await req.json().catch(() => ({}));
  const productId = Number(body.product_id || body.productId || 0);
  const whopProductId = String(body.whop_product_id || "").trim();
  if (!productId) return json({ error: "product_id required" }, 400, CORS);
  if (!whopProductId) return json({ error: "whop_product_id required" }, 400, CORS);
  if (!env.WHOP_COMPANY_ID) return json({ error: "WHOP_COMPANY_ID not set" }, 500, CORS);
  const product = await getProductSnapshot2(env.DB, productId);
  if (!product) return json({ error: "Product not found" }, 404, CORS);
  const priceValue = Number(body.amount || product.price || 0);
  if (!Number.isFinite(priceValue) || priceValue <= 0) {
    return json({ error: "Invalid amount" }, 400, CORS);
  }
  const currency = env.WHOP_CURRENCY || "usd";
  const planBody = {
    company_id: env.WHOP_COMPANY_ID,
    product_id: whopProductId,
    plan_type: "one_time",
    release_method: "buy_now",
    currency,
    initial_price: priceValue,
    renewal_price: 0,
    title: `${product.title || "One-time"} - ${priceValue}`,
    stock: 999999,
    one_per_user: false,
    allow_multiple_quantity: true
  };
  const planRes = await createPlan(env, planBody);
  if (planRes.error) return json({ error: parseError(planRes.error) }, planRes.status || 500, CORS);
  const planId = planRes.data?.id;
  if (!planId) return json({ error: "Plan ID missing" }, 500, CORS);
  const metadata = {
    product_id: String(product.id),
    product_title: product.title,
    addons: body.addons || [],
    amount: priceValue
  };
  const expiresAt = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
  await insertCheckout(env.DB, {
    checkoutId: `plan_${planId}`,
    productId: product.id,
    planId,
    metadata: JSON.stringify(metadata),
    expiresAt
  });
  const checkoutRes = await createCheckoutSession(env, {
    plan_id: planId,
    redirect_url: `${origin}/success.html`,
    metadata,
    prefill: body.email ? { email: String(body.email) } : void 0
  });
  if (checkoutRes.error) {
    return json({
      success: true,
      plan_id: planId,
      product_id: product.id,
      metadata,
      warning: parseError(checkoutRes.error)
    }, 200, CORS);
  }
  const checkoutId = checkoutRes.data?.id;
  if (checkoutId) {
    await updateCheckoutId(env.DB, `plan_${planId}`, checkoutId);
  }
  return json({
    success: true,
    plan_id: planId,
    checkout_id: checkoutId,
    checkout_url: checkoutRes.data?.purchase_url,
    product_id: product.id,
    metadata
  }, 200, CORS);
}
__name(createPlanCheckout, "createPlanCheckout");
async function webhook(req, env) {
  const body = await req.json().catch(() => ({}));
  const eventId = String(body.id || body.event_id || "");
  await insertEvent(env.DB, eventId || "unknown", JSON.stringify(body));
  return json({ ok: true }, 200, CORS);
}
__name(webhook, "webhook");

// src/modules/whop/router.js
async function whopRouter(req, env, url, path, method) {
  if (method === "POST" && path === "/api/whop/create-checkout") {
    return createCheckout(req, env, url.origin);
  }
  if (method === "POST" && path === "/api/whop/create-plan-checkout") {
    return createPlanCheckout(req, env, url.origin);
  }
  if (method === "POST" && path === "/api/whop/webhook") {
    return webhook(req, env);
  }
  return null;
}
__name(whopRouter, "whopRouter");

// src/modules/chat/service.js
async function createSession(db, sessionId) {
  await db.prepare(
    `INSERT OR IGNORE INTO chat_sessions (id, status) VALUES (?, 'open')`
  ).bind(sessionId).run();
  return sessionId;
}
__name(createSession, "createSession");
async function addMessage(db, data) {
  return db.prepare(
    `INSERT INTO chat_messages (session_id, sender, message)
     VALUES (?, ?, ?)`
  ).bind(data.sessionId, data.sender, data.message).run();
}
__name(addMessage, "addMessage");
async function getMessages(db, sessionId, sinceId) {
  const stmt = db.prepare(
    `SELECT * FROM chat_messages
     WHERE session_id = ? AND id > ?
     ORDER BY id ASC`
  ).bind(sessionId, Number(sinceId || 0));
  const result = await stmt.all();
  return result.results || [];
}
__name(getMessages, "getMessages");

// src/modules/chat/controller.js
var uid2 = /* @__PURE__ */ __name(() => `cs_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, "uid");
async function start(req, env) {
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.session_id || uid2());
  await createSession(env.DB, sessionId);
  return json({ session_id: sessionId }, 200, CORS);
}
__name(start, "start");
async function send(req, env) {
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.session_id || "").trim();
  const message = String(body.message || "").trim();
  if (!sessionId || !message) {
    return json({ error: "Missing session_id or message" }, 400, CORS);
  }
  await addMessage(env.DB, { sessionId, sender: "user", message });
  return json({ ok: true }, 200, CORS);
}
__name(send, "send");
async function poll(req, env, url) {
  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  const sinceId = url.searchParams.get("since_id") || 0;
  if (!sessionId) {
    return json({ error: "Missing session_id" }, 400, CORS);
  }
  const messages = await getMessages(env.DB, sessionId, sinceId);
  return json({ messages }, 200, CORS);
}
__name(poll, "poll");

// src/modules/chat/router.js
async function chatRouter(req, env, url, path, method) {
  if (method === "POST" && path === "/api/chat/start") {
    return start(req, env);
  }
  if (method === "POST" && path === "/api/chat/send") {
    return send(req, env);
  }
  if (method === "GET" && path === "/api/chat/poll") {
    return poll(req, env, url);
  }
  return null;
}
__name(chatRouter, "chatRouter");

// src/router.js
async function routeApiRequest(req, env, url, path, method) {
  if (path === "/api/health") {
    return json({ ok: true, time: Date.now() }, 200, CORS);
  }
  if (path === "/api/time") {
    return json({ serverTime: Date.now() }, 200, CORS);
  }
  const mediaResponse = await mediaRouter(req, env, url, path, method);
  if (mediaResponse) return mediaResponse;
  if (!env.DB) {
    return json({ error: "Database not configured" }, 500, CORS);
  }
  await initDB(env);
  if (path === "/api/db-test") {
    const row = await env.DB.prepare("SELECT 1 as ok").first();
    return json({ ok: !!row?.ok }, 200, CORS);
  }
  const productResponse = await productRouter(req, env, url, path, method);
  if (productResponse) return productResponse;
  const orderResponse = await orderRouter(req, env, url, path, method);
  if (orderResponse) return orderResponse;
  const whopResponse = await whopRouter(req, env, url, path, method);
  if (whopResponse) return whopResponse;
  const chatResponse = await chatRouter(req, env, url, path, method);
  if (chatResponse) return chatResponse;
  return json({ error: "API endpoint not found", path, method }, 404, CORS);
}
__name(routeApiRequest, "routeApiRequest");

// src/index.js
var src_default = {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+?/g, "/");
    const method = req.method;
    if (method === "OPTIONS") {
      return handleOptions(req);
    }
    if (path.startsWith("/api/")) {
      return routeApiRequest(req, env, url, path, method);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(req);
    }
    return new Response("Assets binding missing", { status: 500 });
  }
};

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
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

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
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

// .wrangler/tmp/bundle-F23rsA/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-F23rsA/middleware-loader.entry.ts
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
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
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
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
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
