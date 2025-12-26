var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-0bcX9e/checked-fetch.js
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

// node_modules/itty-router/index.mjs
var t = /* @__PURE__ */ __name(({ base: e = "", routes: t2 = [], ...r2 } = {}) => ({ __proto__: new Proxy({}, { get: /* @__PURE__ */ __name((r3, o2, a2, s2) => (r4, ...c2) => t2.push([o2.toUpperCase?.(), RegExp(`^${(s2 = (e + r4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), c2, s2]) && a2, "get") }), routes: t2, ...r2, async fetch(e2, ...o2) {
  let a2, s2, c2 = new URL(e2.url), n2 = e2.query = { __proto__: null };
  for (let [e3, t3] of c2.searchParams) n2[e3] = n2[e3] ? [].concat(n2[e3], t3) : t3;
  e: try {
    for (let t3 of r2.before || []) if (null != (a2 = await t3(e2.proxy ?? e2, ...o2))) break e;
    t: for (let [r3, n3, l, i] of t2) if ((r3 == e2.method || "ALL" == r3) && (s2 = c2.pathname.match(n3))) {
      e2.params = s2.groups || {}, e2.route = i;
      for (let t3 of l) if (null != (a2 = await t3(e2.proxy ?? e2, ...o2))) break t;
    }
  } catch (t3) {
    if (!r2.catch) throw t3;
    a2 = await r2.catch(t3, e2.proxy ?? e2, ...o2);
  }
  try {
    for (let t3 of r2.finally || []) a2 = await t3(a2, e2.proxy ?? e2, ...o2) ?? a2;
  } catch (t3) {
    if (!r2.catch) throw t3;
    a2 = await r2.catch(t3, e2.proxy ?? e2, ...o2);
  }
  return a2;
} }), "t");
var r = /* @__PURE__ */ __name((e = "text/plain; charset=utf-8", t2) => (r2, o2 = {}) => {
  if (void 0 === r2 || r2 instanceof Response) return r2;
  const a2 = new Response(t2?.(r2) ?? r2, o2.url ? void 0 : o2);
  return a2.headers.set("content-type", e), a2;
}, "r");
var o = r("application/json; charset=utf-8", JSON.stringify);
var a = /* @__PURE__ */ __name((e) => ({ 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 500: "Internal Server Error" })[e] || "Unknown Error", "a");
var s = /* @__PURE__ */ __name((e = 500, t2) => {
  if (e instanceof Error) {
    const { message: r2, ...o2 } = e;
    e = e.status || 500, t2 = { error: r2 || a(e), ...o2 };
  }
  return t2 = { status: e, ..."object" == typeof t2 ? t2 : { error: t2 || a(e) } }, o(t2, { status: e });
}, "s");
var c = /* @__PURE__ */ __name((e) => {
  e.proxy = new Proxy(e.proxy ?? e, { get: /* @__PURE__ */ __name((t2, r2) => t2[r2]?.bind?.(e) ?? t2[r2] ?? t2?.params?.[r2], "get") });
}, "c");
var n = /* @__PURE__ */ __name(({ format: e = o, missing: r2 = /* @__PURE__ */ __name((() => s(404)), "r"), finally: a2 = [], before: n2 = [], ...l } = {}) => t({ before: [c, ...n2], catch: s, finally: [(e2, ...t2) => e2 ?? r2(...t2), e, ...a2], ...l }), "n");
var p = r("text/plain; charset=utf-8", String);
var f = r("text/html");
var u = r("image/jpeg");
var h = r("image/png");
var g = r("image/webp");

// backend/core/middleware/cors.js
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var corsify = /* @__PURE__ */ __name((response) => {
  if (!response) return response;
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}, "corsify");
var preflight = /* @__PURE__ */ __name((request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
}, "preflight");

// backend/core/utils/response.js
var json = /* @__PURE__ */ __name((data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}, "json");
var error = /* @__PURE__ */ __name((message, status = 400) => json({ error: message }, status), "error");
var notFound = /* @__PURE__ */ __name((message = "Not found") => error(message, 404), "notFound");
var serverError = /* @__PURE__ */ __name((message = "Server error") => error(message, 500), "serverError");

// backend/modules/products/service/service.js
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
     SET title = ?, description = ?, slug = ?, normal_price = ?, sale_price = ?, status = ?,
         instant = ?, delivery_days = ?, instant_delivery = ?, normal_delivery_text = ?,
         thumbnail_url = ?, video_url = ?, addons_json = ?, gallery_images = ?
     WHERE id = ?`
  ).bind(
    data.title,
    data.description,
    data.slug,
    data.normalPrice,
    data.salePrice,
    data.status,
    data.instant,
    data.deliveryDays,
    data.instantDelivery,
    data.normalDeliveryText,
    data.thumbnailUrl,
    data.videoUrl,
    data.addonsJson,
    data.galleryImages,
    data.id
  ).run();
}
__name(updateProduct, "updateProduct");
async function createProduct(db, data) {
  return db.prepare(
    `INSERT INTO products (
      title, description, slug, normal_price, sale_price, status,
      instant, delivery_days, instant_delivery, normal_delivery_text,
      thumbnail_url, video_url, addons_json, gallery_images
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.title,
    data.description,
    data.slug,
    data.normalPrice,
    data.salePrice,
    data.status,
    data.instant,
    data.deliveryDays,
    data.instantDelivery,
    data.normalDeliveryText,
    data.thumbnailUrl,
    data.videoUrl,
    data.addonsJson,
    data.galleryImages
  ).run();
}
__name(createProduct, "createProduct");
async function removeProduct(db, id) {
  return db.prepare("DELETE FROM products WHERE id = ?").bind(Number(id)).run();
}
__name(removeProduct, "removeProduct");
async function getProductById(db, id) {
  return db.prepare(
    "SELECT * FROM products WHERE id = ? LIMIT 1"
  ).bind(Number(id)).first();
}
__name(getProductById, "getProductById");
async function slugExists(db, slug) {
  const row = await db.prepare("SELECT id FROM products WHERE slug = ? LIMIT 1").bind(slug).first();
  return !!row;
}
__name(slugExists, "slugExists");
async function duplicateProduct(db, source) {
  const baseSlug = source.slug || "product";
  let newSlug = `${baseSlug}-copy`;
  let idx = 1;
  while (await slugExists(db, newSlug)) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx += 1;
  }
  return db.prepare(
    `INSERT INTO products (
      title, description, slug, normal_price, sale_price, status,
      instant, delivery_days, instant_delivery, normal_delivery_text,
      thumbnail_url, video_url, addons_json, gallery_images
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    `${source.title || "Product"} Copy`,
    source.description || "",
    newSlug,
    source.normal_price || 0,
    source.sale_price || null,
    "draft",
    source.instant || 0,
    source.delivery_days || 2,
    source.instant_delivery || 0,
    source.normal_delivery_text || "",
    source.thumbnail_url || "",
    source.video_url || "",
    source.addons_json || "[]",
    source.gallery_images || "[]"
  ).run();
}
__name(duplicateProduct, "duplicateProduct");

// backend/modules/products/utils/helpers.js
var slugify = /* @__PURE__ */ __name((value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), "slugify");
var parseJsonArray = /* @__PURE__ */ __name((value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}, "parseJsonArray");
var decorate = /* @__PURE__ */ __name((row) => ({
  ...row,
  slug: row.slug || slugify(row.title),
  price: row.normal_price ?? row.price ?? 0,
  instant: row.instant ?? row.instant_delivery ?? 0,
  delivery_days: row.delivery_days ?? 0,
  media: parseJsonArray(row.gallery_images || row.media_json),
  addons: parseJsonArray(row.addons_json)
}), "decorate");

// backend/modules/products/actions/list.js
var listProducts = /* @__PURE__ */ __name(async (request, env) => {
  const rows = await getAllProducts(env.DB);
  return json({ results: rows.map(decorate) });
}, "listProducts");

// backend/modules/products/actions/get.js
var getProduct = /* @__PURE__ */ __name(async (request, env) => {
  const id = request.params?.id;
  if (!id) return notFound("Product ID required");
  const row = await getProductByIdOrSlug(env.DB, id);
  if (!row) return notFound("Product not found");
  return json({ product: decorate(row) });
}, "getProduct");

// backend/modules/products/utils/payload.js
var toPayload = /* @__PURE__ */ __name((body) => {
  const media = parseJsonArray(
    body.media || body.gallery_images || body.galleryImages
  );
  const normalPrice = Number(
    body.price ?? body.normal_price ?? body.normalPrice ?? 0
  );
  const rawSale = body.sale_price ?? body.salePrice ?? null;
  const salePrice = rawSale === null || rawSale === void 0 || rawSale === "" ? null : Number(rawSale || 0);
  const instant = body.instant === 1 || body.instant === true || body.instant === "1" ? 1 : 0;
  const instantDelivery = body.instant_delivery === 1 || body.instant_delivery === true || body.instant_delivery === "1" ? 1 : instant;
  return {
    id: body.id ? Number(body.id) : null,
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    slug: slugify(body.slug || body.title),
    normalPrice,
    salePrice,
    status: String(body.status || "active"),
    instant,
    deliveryDays: Math.max(
      0,
      Math.floor(Number(body.delivery_days || body.deliveryDays || 2))
    ),
    instantDelivery,
    normalDeliveryText: String(
      body.normal_delivery_text || body.normalDeliveryText || ""
    ),
    thumbnailUrl: String(
      body.thumbnail_url || body.thumbnailUrl || media[0] || ""
    ),
    videoUrl: String(body.video_url || ""),
    addonsJson: JSON.stringify(parseJsonArray(body.addons || body.addons_json)),
    galleryImages: JSON.stringify(media)
  };
}, "toPayload");

// backend/modules/products/actions/save.js
var saveProduct = /* @__PURE__ */ __name(async (request, env) => {
  try {
    const raw = await request.text();
    let body = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        return error("Invalid JSON body");
      }
    }
    const payload = toPayload(body);
    if (!payload.title) {
      return error("Title required");
    }
    let productId;
    if (payload.id) {
      await updateProduct(env.DB, payload);
      productId = payload.id;
    } else {
      const res = await createProduct(env.DB, payload);
      productId = res?.meta?.last_row_id ?? res?.lastRowId;
    }
    const row = await getProductByIdOrSlug(env.DB, productId);
    return json({ product: decorate(row) });
  } catch (err) {
    return serverError(err.message || "Save failed");
  }
}, "saveProduct");

// backend/modules/products/actions/delete.js
var deleteProduct = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return error("Product ID required");
  }
  await removeProduct(env.DB, id);
  return json({ ok: true });
}, "deleteProduct");

// backend/modules/products/actions/duplicate.js
var duplicateProductAction = /* @__PURE__ */ __name(async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id || 0);
  if (!id) {
    return error("id required");
  }
  const source = await getProductById(env.DB, id);
  if (!source) {
    return notFound("Product not found");
  }
  const res = await duplicateProduct(env.DB, source);
  const newId = res?.meta?.last_row_id ?? res?.lastRowId;
  const row = await getProductByIdOrSlug(env.DB, newId);
  return json({ product: decorate(row) });
}, "duplicateProductAction");

// backend/modules/orders/service/service.js
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

// backend/modules/orders/utils/helpers.js
var uid = /* @__PURE__ */ __name(() => `OD-${Date.now().toString(36).slice(-6)}`, "uid");
var parseJson = /* @__PURE__ */ __name((value) => {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}, "parseJson");
var decorate2 = /* @__PURE__ */ __name((row) => ({
  ...row,
  addons: parseJson(row.addons_json)
}), "decorate");
var extractR2Key = /* @__PURE__ */ __name((value) => {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("r2://")) return value.replace("r2://", "");
  try {
    const url = new URL(value, "http://local");
    if (url.pathname === "/api/r2/file") {
      return url.searchParams.get("key");
    }
  } catch {
  }
  return null;
}, "extractR2Key");

// backend/modules/orders/actions/list.js
var listOrdersAction = /* @__PURE__ */ __name(async (request, env) => {
  const rows = await listOrders(env.DB);
  return json({ results: rows.map(decorate2) });
}, "listOrdersAction");

// backend/modules/orders/actions/get.js
var getOrder = /* @__PURE__ */ __name(async (request, env) => {
  const id = request.params?.id;
  if (!id) return notFound("Order ID required");
  const row = await getOrderById(env.DB, id);
  if (!row) return notFound("Order not found");
  return json({ order: decorate2(row) });
}, "getOrder");

// backend/core/utils/delivery/delivery.js
var toInt = /* @__PURE__ */ __name((value, fallback = 0) => {
  const n2 = Number(value);
  return Number.isFinite(n2) ? Math.max(0, Math.floor(n2)) : fallback;
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

// backend/modules/orders/utils/upload.js
var copyToPermanent = /* @__PURE__ */ __name(async (env, key, orderId, index) => {
  if (!env.R2_BUCKET || !env.PRODUCT_MEDIA) return null;
  if (key.startsWith("PRODUCT_MEDIA/")) return key;
  const cleaned = key.replace(/^R2_BUCKET\//, "");
  if (!cleaned) return null;
  const obj = await env.R2_BUCKET.get(cleaned);
  if (!obj) return null;
  const name = cleaned.split("/").pop() || `file-${index}`;
  const destKey = `orders/${orderId}/${Date.now()}-${index}-${name}`;
  await env.PRODUCT_MEDIA.put(destKey, obj.body, {
    httpMetadata: obj.httpMetadata
  });
  return `PRODUCT_MEDIA/${destKey}`;
}, "copyToPermanent");
var moveAddonUploads = /* @__PURE__ */ __name(async (env, orderId, addons) => {
  let idx = 0;
  const mapValue = /* @__PURE__ */ __name(async (value) => {
    if (Array.isArray(value)) {
      const out = [];
      for (const item of value) {
        out.push(await mapValue(item));
      }
      return out;
    }
    if (value && typeof value === "object") {
      const out = {};
      for (const [key2, val] of Object.entries(value)) {
        out[key2] = await mapValue(val);
      }
      return out;
    }
    const key = extractR2Key(value);
    if (!key) return value;
    idx += 1;
    const newKey = await copyToPermanent(env, key, orderId, idx);
    if (!newKey) return value;
    return `/api/r2/file?key=${encodeURIComponent(newKey)}`;
  }, "mapValue");
  return mapValue(addons);
}, "moveAddonUploads");

// backend/modules/orders/actions/create.js
var createOrder = /* @__PURE__ */ __name(async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const productId = Number(body.product_id || body.productId || 0);
  if (!email || !productId) {
    return error("Missing email or product_id");
  }
  const product = await getProductSnapshot(env.DB, productId);
  if (!product) {
    return error("Invalid product_id");
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
  const rawAddons = Array.isArray(body.addons) && body.addons.length ? body.addons : fallbackAddons;
  const finalAddons = await moveAddonUploads(env, orderId, rawAddons);
  const addonsJson = JSON.stringify(finalAddons);
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
  const row = await getOrderById(env.DB, id);
  return json({ order: decorate2(row) });
}, "createOrder");

// backend/modules/orders/actions/update-status.js
var updateOrderStatus = /* @__PURE__ */ __name(async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || "").trim();
  const status = String(body.status || "").trim();
  if (!orderId || !status) {
    return error("Missing order_id or status");
  }
  await setOrderStatus(env.DB, { orderId, status });
  const row = await getOrderById(env.DB, orderId);
  if (!row) return notFound("Order not found");
  return json({ order: decorate2(row) });
}, "updateOrderStatus");

// backend/modules/orders/actions/deliver.js
var deliverOrder = /* @__PURE__ */ __name(async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || "").trim();
  const archiveUrl = String(body.archive_url || body.archiveUrl || "").trim();
  if (!orderId || !archiveUrl) {
    return error("Missing order_id or archive_url");
  }
  await setOrderDelivered(env.DB, { orderId, archiveUrl });
  const row = await getOrderById(env.DB, orderId);
  if (!row) return notFound("Order not found");
  return json({ order: decorate2(row) });
}, "deliverOrder");

// backend/modules/media/services/archive.service.js
var getArchiveKeys = /* @__PURE__ */ __name((env) => {
  const accessKey = env.ARCHIVE_ACCESS_KEY;
  const secretKey = env.ARCHIVE_SECRET_KEY;
  return accessKey && secretKey ? { accessKey, secretKey } : null;
}, "getArchiveKeys");

// backend/modules/media/actions/archive-credentials.js
var archiveCredentials = /* @__PURE__ */ __name(async (request, env) => {
  const creds = getArchiveKeys(env);
  if (!creds) {
    return serverError("Archive credentials not configured");
  }
  return json(creds);
}, "archiveCredentials");

// backend/core/utils/s3-sign/s3-sign.js
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

// backend/core/config/constants/constants.js
var BUCKETS = {
  PRODUCT_MEDIA: "product-media-bucket",
  R2_BUCKET: "temp-uploads-bucket"
};

// backend/modules/media/services/r2.service.js
var sanitizeKey = /* @__PURE__ */ __name((value) => String(value || "").replace(/\\/g, "/").replace(/\.+/g, ".").replace(/^\/+/, "").replace(/\.\.\//g, "").trim(), "sanitizeKey");
var resolveBucket = /* @__PURE__ */ __name((env, rawKey) => {
  const safeKey = sanitizeKey(rawKey);
  if (safeKey.startsWith("PRODUCT_MEDIA/")) {
    return {
      bucket: env.PRODUCT_MEDIA,
      key: safeKey.replace(/^PRODUCT_MEDIA\//, ""),
      bucketKey: "PRODUCT_MEDIA"
    };
  }
  if (safeKey.startsWith("R2_BUCKET/")) {
    return {
      bucket: env.R2_BUCKET,
      key: safeKey.replace(/^R2_BUCKET\//, ""),
      bucketKey: "R2_BUCKET"
    };
  }
  return {
    bucket: env.R2_BUCKET,
    key: safeKey,
    bucketKey: "R2_BUCKET"
  };
}, "resolveBucket");
var buildPresign = /* @__PURE__ */ __name(async (env, body) => {
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const accountId = env.R2_ACCOUNT_ID;
  if (!accessKeyId || !secretAccessKey || !accountId) {
    return { error: "R2 signing credentials not configured" };
  }
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
var buildTempKey = /* @__PURE__ */ __name((sessionId, filename) => {
  const safeSession = sanitizeKey(sessionId).replace(/\//g, "-");
  const safeName = sanitizeKey(filename).replace(/\//g, "-");
  return `uploads/${safeSession}/${safeName || "file"}`;
}, "buildTempKey");
var putTempFile = /* @__PURE__ */ __name(async (env, key, body, contentType) => {
  if (!env.R2_BUCKET) {
    return { error: "R2 bucket not configured" };
  }
  await env.R2_BUCKET.put(key, body, {
    httpMetadata: { contentType: contentType || "application/octet-stream" }
  });
  return { key, bucketKey: "R2_BUCKET" };
}, "putTempFile");
var getR2Object = /* @__PURE__ */ __name(async (env, rawKey) => {
  const { bucket, key, bucketKey } = resolveBucket(env, rawKey);
  if (!bucket) {
    return { error: "R2 bucket not configured" };
  }
  const object = await bucket.get(key);
  if (!object) {
    return { error: "Not found", status: 404 };
  }
  return { object, key, bucketKey };
}, "getR2Object");

// backend/modules/media/actions/r2-presign.js
var r2Presign = /* @__PURE__ */ __name(async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const result = await buildPresign(env, body);
  if (result.error) {
    const status = result.error === "Missing key" || result.error === "Invalid bucket" ? 400 : 500;
    return error(result.error, status);
  }
  return json(result);
}, "r2Presign");

// backend/modules/media/actions/temp-file.js
var tempFile = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const filename = url.searchParams.get("filename");
  if (!sessionId || !filename) {
    return error("Missing sessionId or filename");
  }
  let body = request.body;
  let contentType = request.headers.get("content-type") || "application/octet-stream";
  if (!body) {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!file) {
      return error("No file provided");
    }
    body = await file.arrayBuffer();
    contentType = file.type || contentType;
  }
  const key = buildTempKey(sessionId, filename);
  const result = await putTempFile(env, key, body, contentType);
  if (result.error) {
    return serverError(result.error);
  }
  const publicUrl = `${url.protocol}//${url.host}/api/r2/file?key=${encodeURIComponent(`R2_BUCKET/${key}`)}`;
  return json({
    success: true,
    tempUrl: `r2://R2_BUCKET/${key}`,
    url: publicUrl
  });
}, "tempFile");

// backend/modules/media/actions/r2-file.js
var r2File = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return error("Missing key");
  }
  const result = await getR2Object(env, key);
  if (result.error) {
    if (result.status === 404) {
      return error(result.error, 404);
    }
    return serverError(result.error);
  }
  const headers = new Headers(CORS_HEADERS);
  const contentType = result.object.httpMetadata?.contentType || "application/octet-stream";
  headers.set("content-type", contentType);
  return new Response(result.object.body, { status: 200, headers });
}, "r2File");

// backend/modules/chat/actions/start.js
var startChat = /* @__PURE__ */ __name(async (request, env) => {
  if (!env.DB) {
    return serverError("DB missing");
  }
  const sessionId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO chat_sessions (id, name, email, blocked)
     VALUES (?, '', '', 0)`
  ).bind(sessionId).run();
  return json({ session_id: sessionId });
}, "startChat");

// backend/modules/chat/actions/send.js
var sendMessage = /* @__PURE__ */ __name(async (request, env) => {
  if (!env.DB) {
    return serverError("DB missing");
  }
  const body = await request.json().catch(() => ({}));
  const sessionId = String(body.session_id || "").trim();
  const message = String(body.message || "").trim();
  if (!sessionId || !message) {
    return error("Missing session_id or message");
  }
  await env.DB.prepare(
    `INSERT INTO chat_messages (session_id, role, content, payload_json)
     VALUES (?, 'user', ?, '')`
  ).bind(sessionId, message).run();
  await env.DB.prepare(
    `UPDATE chat_sessions
     SET last_message_content = ?, last_message_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(message, sessionId).run();
  return json({ ok: true });
}, "sendMessage");

// backend/modules/chat/actions/poll.js
var pollMessages = /* @__PURE__ */ __name(async (request, env) => {
  if (!env.DB) {
    return serverError("DB missing");
  }
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return error("Missing session_id");
  }
  const sinceId = Number(url.searchParams.get("since_id") || 0);
  const result = await env.DB.prepare(
    `SELECT id, role, content as message, created_at
     FROM chat_messages
     WHERE session_id = ? AND id > ?
     ORDER BY id ASC`
  ).bind(sessionId, sinceId).all();
  return json({ messages: result.results || [] });
}, "pollMessages");

// backend/modules/whop/service/service.js
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

// backend/modules/whop/utils/helpers.js
var parseError = /* @__PURE__ */ __name((text) => {
  try {
    const data = JSON.parse(text);
    return data.message || data.error || text;
  } catch {
    return text || "Whop error";
  }
}, "parseError");

// backend/modules/whop/actions/create-checkout.js
var createCheckout = /* @__PURE__ */ __name(async (request, env, origin) => {
  const body = await request.json().catch(() => ({}));
  const planId = String(body.plan_id || "").trim();
  const productId = Number(body.product_id || body.productId || 0);
  if (!planId) {
    return error("plan_id required");
  }
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
  if (res.error) {
    return error(parseError(res.error), res.status || 500);
  }
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
  });
}, "createCheckout");

// backend/modules/whop/actions/create-plan-checkout.js
var createPlanCheckout = /* @__PURE__ */ __name(async (request, env, origin) => {
  const body = await request.json().catch(() => ({}));
  const productId = Number(body.product_id || body.productId || 0);
  const whopProductId = String(body.whop_product_id || "").trim();
  if (!productId) return error("product_id required");
  if (!whopProductId) return error("whop_product_id required");
  if (!env.WHOP_COMPANY_ID) return serverError("WHOP_COMPANY_ID not set");
  const product = await getProductSnapshot2(env.DB, productId);
  if (!product) return notFound("Product not found");
  const priceValue = Number(body.amount || product.price || 0);
  if (!Number.isFinite(priceValue) || priceValue <= 0) {
    return error("Invalid amount");
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
  if (planRes.error) {
    return error(parseError(planRes.error), planRes.status || 500);
  }
  const planId = planRes.data?.id;
  if (!planId) return serverError("Plan ID missing");
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
    });
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
  });
}, "createPlanCheckout");

// backend/modules/whop/actions/webhook.js
var webhook = /* @__PURE__ */ __name(async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const eventId = String(body.id || body.event_id || "");
  await insertEvent(env.DB, eventId || "unknown", JSON.stringify(body));
  return json({ ok: true });
}, "webhook");

// backend/core/router/api.js
var api = t({ base: "/api" });
api.get("/health", () => json({ ok: true, time: Date.now() }));
api.get("/time", () => json({ serverTime: Date.now() }));
api.get("/db-test", async (req, env) => {
  if (!env.DB) return json({ error: "DB not configured" }, 500);
  const row = await env.DB.prepare("SELECT 1 as ok").first();
  return json({ ok: !!row?.ok });
});
api.get("/products", listProducts);
api.get("/product/:id", getProduct);
api.post("/product/save", saveProduct);
api.delete("/product/delete", deleteProduct);
api.post("/product/duplicate", duplicateProductAction);
api.get("/orders", listOrdersAction);
api.get("/order/:id", getOrder);
api.post("/order/create", createOrder);
api.post("/order/update-status", updateOrderStatus);
api.post("/order/deliver", deliverOrder);
api.post("/upload/r2-presign", r2Presign);
api.post("/upload/temp-file", tempFile);
api.get("/r2/file", r2File);
api.post("/upload/archive-credentials", archiveCredentials);
api.post("/chat/start", startChat);
api.post("/chat/send", sendMessage);
api.get("/chat/poll", pollMessages);
api.post("/whop/checkout", (req, env) => {
  const origin = new URL(req.url).origin;
  return createCheckout(req, env, origin);
});
api.post("/whop/plan-checkout", (req, env) => {
  const origin = new URL(req.url).origin;
  return createPlanCheckout(req, env, origin);
});
api.post("/whop/webhook", webhook);
api.all("*", (req) => {
  const url = new URL(req.url);
  return json(
    { error: "API endpoint not found", path: url.pathname, method: req.method },
    404
  );
});

// backend/core/utils/batch.js
var handleBatch = /* @__PURE__ */ __name(async (request, env, ctx, router2) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }
  if (!Array.isArray(body.requests)) {
    return error("requests array required", 400);
  }
  if (body.requests.length > 10) {
    return error("Maximum 10 requests per batch", 400);
  }
  const origin = new URL(request.url).origin;
  const promises = body.requests.map(async (item, index) => {
    const method = String(item.method || "GET").toUpperCase();
    const path = String(item.path || "");
    if (!path.startsWith("/api/") || path === "/api/batch") {
      return { index, error: "Invalid path", status: 400 };
    }
    const subRequest = new Request(`${origin}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: item.body ? JSON.stringify(item.body) : void 0
    });
    try {
      const response = await router2.fetch(subRequest, env, ctx);
      const data = await response.json().catch(() => ({}));
      return { index, status: response.status, data };
    } catch (err) {
      return { index, error: err.message, status: 500 };
    }
  });
  const results = await Promise.allSettled(promises);
  const responses = results.map((result, idx) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return { index: idx, error: "Request failed", status: 500 };
  });
  return json({ results: responses });
}, "handleBatch");

// backend/core/middleware/error.js
var errorHandler = /* @__PURE__ */ __name((error2) => {
  console.error("[Worker Error]", error2?.message || error2);
  return new Response(
    JSON.stringify({
      error: error2?.message || "Internal Server Error",
      status: 500
    }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS
      }
    }
  );
}, "errorHandler");

// backend/modules/products/schema/schema.js
async function setupProductTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
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
  await db.prepare("ALTER TABLE products ADD COLUMN description TEXT").run().catch(() => {
  });
}
__name(setupProductTable, "setupProductTable");

// backend/modules/orders/schema/schema.js
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

// backend/modules/whop/schema/schema.js
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

// backend/modules/chat/schema/schema.js
async function setupChatTables(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS chat_sessions (
      session_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )`
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
}
__name(setupChatTables, "setupChatTables");

// backend/core/middleware/db.js
var initialized = false;
var initDatabase = /* @__PURE__ */ __name(async (request, env) => {
  if (!env.DB) return;
  if (initialized) return;
  await env.DB.prepare("SELECT 1").first();
  await setupProductTable(env.DB);
  await setupOrderTable(env.DB);
  await setupWhopTables(env.DB);
  await setupChatTables(env.DB);
  initialized = true;
}, "initDatabase");

// backend/core/constants/routes.js
var PRODUCT_PAGE_REGEX = /^\/p\/(\d+)\/([a-z0-9-]+)$/;
var LEGACY_PRODUCT_PATTERN = /^\/product-?(\d+)\/(.+)$/;
var ADMIN_ROUTES = ["/admin", "/admin/"];
var SPA_FILES = {
  admin: "/admin/admin.html",
  product: "/product/page.html"
};

// backend/index/index.js
var router = n({
  before: [preflight],
  catch: errorHandler,
  finally: [corsify]
});
router.post("/api/batch", async (request, env, ctx) => {
  await initDatabase(request, env);
  return handleBatch(request, env, ctx, api);
});
router.all("/api/*", async (request, env, ctx) => {
  await initDatabase(request, env);
  return api.fetch(request, env, ctx);
});
router.all("*", async (request, env) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/g, "") || "/";
  if (!env.ASSETS) {
    return json({ error: "Assets binding missing" }, 500);
  }
  try {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  } catch {
  }
  if (ADMIN_ROUTES.includes(path) || path === "" || path === "/") {
    const rewritten = new URL(request.url);
    rewritten.pathname = SPA_FILES.admin;
    return env.ASSETS.fetch(new Request(rewritten.toString(), request));
  }
  const productMatch = path.match(PRODUCT_PAGE_REGEX);
  if (productMatch) {
    const rewritten = new URL(request.url);
    rewritten.pathname = SPA_FILES.product;
    rewritten.searchParams.set("id", productMatch[1]);
    return env.ASSETS.fetch(new Request(rewritten.toString(), request));
  }
  const legacyMatch = path.match(LEGACY_PRODUCT_PATTERN);
  if (legacyMatch) {
    const rewritten = new URL(request.url);
    rewritten.pathname = SPA_FILES.product;
    rewritten.searchParams.set("id", legacyMatch[1]);
    return env.ASSETS.fetch(new Request(rewritten.toString(), request));
  }
  if (path === "/product" || path === "/product/") {
    const rewritten = new URL(request.url);
    rewritten.pathname = SPA_FILES.product;
    return env.ASSETS.fetch(new Request(rewritten.toString(), request));
  }
  return new Response(
    JSON.stringify({ error: "Not Found", path }),
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS
      }
    }
  );
});
var index_default = router;

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
    const error2 = reduceError(e);
    return Response.json(error2, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-0bcX9e/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

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

// .wrangler/tmp/bundle-0bcX9e/middleware-loader.entry.ts
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
