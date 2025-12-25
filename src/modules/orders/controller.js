import { json } from '../../core/utils/response.js';
import { CORS } from '../../core/config/cors.js';
import { calcDueAt, normalizeDeliveryDays } from '../../core/utils/delivery.js';
import {
  listOrders,
  getOrderById,
  getProductSnapshot,
  insertOrder,
  setOrderStatus,
  setOrderDelivered
} from './service.js';

const uid = () => `OD-${Date.now().toString(36).slice(-6)}`;

const parseJson = (value) => {
  if (!value) return [];
  try { return JSON.parse(value); } catch (_) { return []; }
};

const decorate = (row) => ({
  ...row,
  addons: parseJson(row.addons_json)
});

export async function list(req, env) {
  const rows = await listOrders(env.DB);
  return json({ results: rows.map(decorate) }, 200, CORS);
}

export async function get(req, env, id) {
  const row = await getOrderById(env.DB, id);
  if (!row) return json({ error: 'Not found' }, 404, CORS);
  return json({ order: decorate(row) }, 200, CORS);
}

export async function create(req, env) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  const productId = Number(body.product_id || body.productId || 0);
  if (!email || !productId) {
    return json({ error: 'Missing email or product_id' }, 400, CORS);
  }

  const product = await getProductSnapshot(env.DB, productId);
  if (!product) {
    return json({ error: 'Invalid product_id' }, 400, CORS);
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
    status: 'pending',
    deliveryDays: days,
    instant,
    addonsJson,
    dueAt
  });

  const id = res?.meta?.last_row_id ?? res?.lastRowId;
  return get(req, env, id);
}

export async function updateStatus(req, env) {
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || '').trim();
  const status = String(body.status || '').trim();
  if (!orderId || !status) {
    return json({ error: 'Missing order_id or status' }, 400, CORS);
  }
  await setOrderStatus(env.DB, { orderId, status });
  return get(req, env, orderId);
}

export async function deliver(req, env) {
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.order_id || body.orderId || '').trim();
  const archiveUrl = String(body.archive_url || body.archiveUrl || '').trim();
  if (!orderId || !archiveUrl) {
    return json({ error: 'Missing order_id or archive_url' }, 400, CORS);
  }
  await setOrderDelivered(env.DB, { orderId, archiveUrl });
  return get(req, env, orderId);
}
