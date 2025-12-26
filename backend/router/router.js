import { json } from '../core/utils/response/response.js';
import { initDB } from '../core/config/db/db.js';
import { CORS } from '../core/config/cors/cors.js';
import { productRouter } from '../modules/products/router/router.js';
import { orderRouter } from '../modules/orders/router/router.js';
import { mediaRouter } from '../modules/media/router/router.js';
import { whopRouter } from '../modules/whop/router/router.js';
import { chatRouter } from '../modules/chat/router/router.js';

export async function routeApiRequest(req, env, url, path, method) {
  if (path === '/api/health') {
    return json({ ok: true, time: Date.now() }, 200, CORS);
  }

  if (path === '/api/time') {
    return json({ serverTime: Date.now() }, 200, CORS);
  }

  const mediaResponse = await mediaRouter(req, env, url, path, method);
  if (mediaResponse) return mediaResponse;

  if (!env.DB) {
    return json({ error: 'Database not configured' }, 500, CORS);
  }

  await initDB(env);

  if (path === '/api/db-test') {
    const row = await env.DB.prepare('SELECT 1 as ok').first();
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

  return json({ error: 'API endpoint not found', path, method }, 404, CORS);
}
