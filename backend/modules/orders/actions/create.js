/**
 * Create Order Action
 * POST /api/order/create
 */

import { json, error } from '../../../core/utils/response.js';
import { calcDueAt, normalizeDeliveryDays } from '../../../core/utils/delivery/delivery.js';
import { getProductSnapshot, insertOrder, getOrderById } from '../service/service.js';
import { uid, parseJson, decorate } from '../utils/helpers.js';
import { moveAddonUploads } from '../utils/upload.js';

export const createOrder = async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  const productId = Number(body.product_id || body.productId || 0);

  if (!email || !productId) {
    return error('Missing email or product_id');
  }

  const product = await getProductSnapshot(env.DB, productId);
  if (!product) {
    return error('Invalid product_id');
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

  const rawAddons =
    Array.isArray(body.addons) && body.addons.length
      ? body.addons
      : fallbackAddons;

  const finalAddons = await moveAddonUploads(env, orderId, rawAddons);
  const addonsJson = JSON.stringify(finalAddons);

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
  const row = await getOrderById(env.DB, id);

  return json({ order: decorate(row) });
};
