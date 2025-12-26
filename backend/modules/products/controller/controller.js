import { json } from '../../../core/utils/response/response.js';
import { CORS } from '../../../core/config/cors/cors.js';
import {
  getAllProducts,
  getProductByIdOrSlug,
  getProductById,
  createProduct,
  updateProduct,
  removeProduct,
  duplicateProduct
} from '../service/service.js';

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch (_) { return []; }
};

const toPayload = (body) => {
  const media = parseJsonArray(body.media || body.gallery_images || body.galleryImages);
  const normalPrice = Number(body.price ?? body.normal_price ?? body.normalPrice ?? 0);
  const rawSale = body.sale_price ?? body.salePrice ?? null;
  const salePrice = rawSale === null || rawSale === undefined || rawSale === '' ? null : Number(rawSale || 0);
  const instant = body.instant === 1 || body.instant === true || body.instant === '1' ? 1 : 0;
  const instantDelivery = body.instant_delivery === 1 || body.instant_delivery === true || body.instant_delivery === '1' ? 1 : instant;

  return {
    id: body.id ? Number(body.id) : null,
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    slug: slugify(body.slug || body.title),
    normalPrice,
    salePrice,
    status: String(body.status || 'active'),
    instant,
    deliveryDays: Math.max(0, Math.floor(Number(body.delivery_days || body.deliveryDays || 2))),
    instantDelivery,
    normalDeliveryText: String(body.normal_delivery_text || body.normalDeliveryText || ''),
    thumbnailUrl: String(body.thumbnail_url || body.thumbnailUrl || media[0] || ''),
    videoUrl: String(body.video_url || ''),
    addonsJson: JSON.stringify(parseJsonArray(body.addons || body.addons_json)),
    galleryImages: JSON.stringify(media)
  };
};

const decorate = (row) => ({
  ...row,
  slug: row.slug || slugify(row.title),
  price: row.normal_price ?? row.price ?? 0,
  instant: row.instant ?? row.instant_delivery ?? 0,
  delivery_days: row.delivery_days ?? 0,
  media: parseJsonArray(row.gallery_images || row.media_json),
  addons: parseJsonArray(row.addons_json)
});

export async function list(req, env) {
  const rows = await getAllProducts(env.DB);
  return json({ results: rows.map(decorate) }, 200, CORS);
}

export async function get(req, env, id) {
  const row = await getProductByIdOrSlug(env.DB, id);
  if (!row) return json({ error: 'Not found' }, 404, CORS);
  return json({ product: decorate(row) }, 200, CORS);
}

export async function save(req, env) {
  try {
    const raw = await req.text();
    let body = {};
    if (raw) {
      try { body = JSON.parse(raw); } catch (_) {
        return json({ error: 'Invalid JSON body' }, 400, CORS);
      }
    }
    const payload = toPayload(body);
    if (!payload.title) {
      return json({ error: 'Title required' }, 400, CORS);
    }

    if (payload.id) {
      await updateProduct(env.DB, payload);
      return get(req, env, payload.id);
    }

    const res = await createProduct(env.DB, payload);
    const id = res?.meta?.last_row_id ?? res?.lastRowId;
    return get(req, env, id);
  } catch (err) {
    return json({ error: err.message || 'Save failed' }, 500, CORS);
  }
}

export async function remove(req, env, id) {
  await removeProduct(env.DB, id);
  return json({ ok: true }, 200, CORS);
}

export async function duplicate(req, env) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id || 0);
  if (!id) return json({ error: 'id required' }, 400, CORS);
  const source = await getProductById(env.DB, id);
  if (!source) return json({ error: 'Not found' }, 404, CORS);
  const res = await duplicateProduct(env.DB, source);
  const newId = res?.meta?.last_row_id ?? res?.lastRowId;
  return get(req, env, newId);
}
