import { json } from '../../../core/utils/response/response.js';
import { CORS } from '../../../core/config/cors/cors.js';
import { calcDueAt, normalizeDeliveryDays } from '../../../core/utils/delivery/delivery.js';
import {
  listOrders,
  getOrderById,
  getOrderByIdWithProduct,
  getProductSnapshot,
  insertOrder,
  setOrderStatus,
  setOrderDelivered
} from '../service/service.js';

const uid = () => `OD-${Date.now().toString(36).slice(-6)}`;
const parseJson = (value) => {
  if (!value) return [];
  try { return JSON.parse(value); } catch (_) { return []; }
};

const toISO = (dt) => {
  if (!dt) return null;
  if (dt.includes('T')) return dt;
  return dt.replace(' ', 'T') + 'Z';
};

const decorate = (row) => ({ ...row, addons: parseJson(row.addons_json) });

const extractR2Key = (value) => {
  if (typeof value !== 'string' || !value) return null;
  if (value.startsWith('r2://')) return value.replace('r2://', '');
  try {
    const url = new URL(value, 'http://local');
    if (url.pathname === '/api/r2/file') return url.searchParams.get('key');
  } catch (_) {}
  return null;
};

const copyToPermanent = async (env, key, orderId, index) => {
  if (!env.R2_BUCKET || !env.PRODUCT_MEDIA) return null;
  if (key.startsWith('PRODUCT_MEDIA/')) return key;
  const cleaned = key.replace(/^R2_BUCKET\//, '');
  if (!cleaned) return null;
  const obj = await env.R2_BUCKET.get(cleaned);
  if (!obj) return null;
  const name = cleaned.split('/').pop() || `file-${index}`;
  const destKey = `orders/${orderId}/${Date.now()}-${index}-${name}`;
  await env.PRODUCT_MEDIA.put(destKey, obj.body, { httpMetadata: obj.httpMetadata });
  return `PRODUCT_MEDIA/${destKey}`;
};

const moveAddonUploads = async (env, orderId, addons) => {
  let idx = 0;
  const mapValue = async (value) => {
    if (Array.isArray(value)) {
      const out = [];
      for (const item of value) out.push(await mapValue(item));
      return out;
    }
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, val] of Object.entries(value)) out[key] = await mapValue(val);
      return out;
    }
    const key = extractR2Key(value);
    if (!key) return value;
    idx += 1;
    const newKey = await copyToPermanent(env, key, orderId, idx);
    if (!newKey) return value;
    return `/api/r2/file?key=${encodeURIComponent(newKey)}`;
  };
  return mapValue(addons);
};

export async function list(req, env) {
  const rows = await listOrders(env.DB);
  return json({ results: rows.map(decorate) }, 200, CORS);
}

export async function get(req, env) {
  const id = req.params?.id || req.query?.id;
  if (!id) return json({ error: 'Order ID required' }, 400, CORS);
  const row = await getOrderById(env.DB, id);
  if (!row) return json({ error: 'Not found' }, 404, CORS);
  return json({ order: decorate(row) }, 200, CORS);
}

export async function getBuyer(req, env) {
  const id = req.params?.id || req.query?.id;
  if (!id) return json({ error: 'Order ID required' }, 400, CORS);
  const row = await getOrderByIdWithProduct(env.DB, id);
  if (!row) return json({ error: 'Order not found' }, 404, CORS);
  const order = decorate(row);
  order.created_at = toISO(order.created_at);
  order.due_at = toISO(order.due_at);
  return json({ order }, 200, CORS);
}

async function getOrderResponse(env, id) {
  const row = await getOrderById(env.DB, id);
  if (!row) return json({ error: 'Not found' }, 404, CORS);
  return json({ order: decorate(row) }, 200, CORS);
}

export async function create(req, env) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  const productId = Number(body.product_id || body.productId || 0);
  if (!email || !productId) return json({ error: 'Missing email or product_id' }, 400, CORS);

  const product = await getProductSnapshot(env.DB, productId);
  if (!product) return json({ error: 'Invalid product_id' }, 400, CORS);

  const baseInstant = body.instant ?? product.instant ?? 0;
  const baseDays = body.delivery_days ?? product.delivery_days ?? 2;
  const { instant, days } = normalizeDeliveryDays(baseInstant, baseDays);
  const dueAt = calcDueAt(Date.now(), instant, days);
  const orderId = String(body.order_id || uid());

  let fallbackAddons = product.addons_json ? parseJson(product.addons_json) : [];
  const rawAddons = Array.isArray(body.addons) && body.addons.length ? body.addons : fallbackAddons;
  const finalAddons = await moveAddonUploads(env, orderId, rawAddons);
  const addonsJson = JSON.stringify(finalAddons);

  const res = await insertOrder(env.DB, { orderId, email, productId, productTitle: product.title, status: 'paid', deliveryDays: days, instant, addonsJson, dueAt });
  const id = res?.meta?.last_row_id ?? res?.lastRowId;
  return getOrderResponse(env, id);
}

export async function updateStatus(req, env) {
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || '').trim();
  const status = String(body.status || '').trim();
  if (!orderId || !status) return json({ error: 'Missing order_id or status' }, 400, CORS);
  await setOrderStatus(env.DB, { orderId, status });
  return getOrderResponse(env, orderId);
}

export async function deliver(req, env) {
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || '').trim();
  const archiveUrl = String(body.archive_url || body.archiveUrl || '').trim();
  if (!orderId || !archiveUrl) return json({ error: 'Missing order_id or archive_url' }, 400, CORS);
  await setOrderDelivered(env.DB, { orderId, archiveUrl });
  return getOrderResponse(env, orderId);
}
