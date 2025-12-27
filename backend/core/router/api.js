/**
 * Main API Router
 * Aggregates all module routers
 */
import { Router } from 'itty-router';
import { json } from '../utils/response/response.js';
import { CORS } from '../config/cors/cors.js';

// Import Module Routers
import { productRouter } from '../../modules/products/router/router.js';
import { orderRouter } from '../../modules/orders/router/router.js';
import { mediaRouter } from '../../modules/media/router/router.js';
import { chatRouter } from '../../modules/chat/router/router.js';
import { whopRouter } from '../../modules/whop/router/router.js';
import { settingsRouter } from '../../modules/settings/router/router.js';

// Import Actions that are not in a module router yet
import { listProducts } from '../../modules/products/actions/list.js';

const api = Router({ base: '/api' });

// Health Check
api.get('/health', () => json({ ok: true, time: Date.now() }, 200, CORS));
api.get('/time', () => json({ serverTime: Date.now() }, 200, CORS));

// DB Test
api.get('/db-test', async (req, env) => {
  if (!env.DB) return json({ error: 'DB not configured' }, 500, CORS);
  const row = await env.DB.prepare('SELECT 1 as ok').first();
  return json({ ok: !!row?.ok }, 200, CORS);
});

// Mount Module Routers
api.all('/products/*', productRouter.fetch);
api.all('/product/*', productRouter.fetch);
api.all('/orders/*', orderRouter.fetch);
api.all('/order/*', orderRouter.fetch);
api.all('/media/*', mediaRouter.fetch);
api.all('/upload/*', mediaRouter.fetch);
api.all('/chat/*', chatRouter.fetch);
api.all('/whop/*', whopRouter.fetch);
api.all('/settings/*', settingsRouter.fetch);

// Legacy direct route fallback
api.get('/products', listProducts);

// 404 Handler
api.all('*', () => json({ error: 'API Endpoint Not Found' }, 404, CORS));

export { api };
