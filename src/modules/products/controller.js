import { json } from '../../core/utils/response.js';
import { CORS } from '../../core/config/cors.js';
import {
  getAllProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  removeProduct
} from './service.js';

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

const toPayload = (body) => ({
  id: body.id ? Number(body.id) : null,
  title: String(body.title || '').trim(),
  slug: slugify(body.slug || body.title),
  price: Number(body.price || 0),
  status: String(body.status || 'active'),
  instant: body.instant === 1 || body.instant === true || body.instant === '1' ? 1 : 0,
  deliveryDays: Math.max(0, Math.floor(Number(body.delivery_days || body.deliveryDays || 2))),
  mediaJson: JSON.stringify(parseJsonArray(body.media)),
  addonsJson: JSON.stringify(parseJsonArray(body.addons)),
  videoUrl: String(body.video_url || '')
});

const decorate = (row) => ({
  ...row,
  media: parseJsonArray(row.media_json),
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
  const body = await req.json().catch(() => ({}));
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
}

export async function remove(req, env, id) {
  await removeProduct(env.DB, id);
  return json({ ok: true }, 200, CORS);
}
