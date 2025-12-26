/**
 * API Router
 * Defines all API routes using itty-router
 */

import { Router } from 'itty-router';

// Product Actions
import { listProducts } from '../../modules/products/actions/list.js';
import { getProduct } from '../../modules/products/actions/get.js';
import { saveProduct } from '../../modules/products/actions/save.js';
import { deleteProduct } from '../../modules/products/actions/delete.js';
import { duplicateProductAction } from '../../modules/products/actions/duplicate.js';

// Order Actions
import { listOrdersAction } from '../../modules/orders/actions/list.js';
import { getOrder } from '../../modules/orders/actions/get.js';
import { createOrder } from '../../modules/orders/actions/create.js';
import { updateOrderStatus } from '../../modules/orders/actions/update-status.js';
import { deliverOrder } from '../../modules/orders/actions/deliver.js';

// Media Actions
import { archiveCredentials } from '../../modules/media/actions/archive-credentials.js';
import { r2Presign } from '../../modules/media/actions/r2-presign.js';
import { tempFile } from '../../modules/media/actions/temp-file.js';
import { r2File } from '../../modules/media/actions/r2-file.js';

// Chat Actions
import { startChat } from '../../modules/chat/actions/start.js';
import { sendMessage } from '../../modules/chat/actions/send.js';
import { pollMessages } from '../../modules/chat/actions/poll.js';

// Whop Actions
import { createCheckout } from '../../modules/whop/actions/create-checkout.js';
import { createPlanCheckout } from '../../modules/whop/actions/create-plan-checkout.js';
import { webhook } from '../../modules/whop/actions/webhook.js';

// Utils
import { json } from '../utils/response.js';

const api = Router({ base: '/api' });

// Health & Utility
api.get('/health', () => json({ ok: true, time: Date.now() }));
api.get('/time', () => json({ serverTime: Date.now() }));

api.get('/db-test', async (req, env) => {
  if (!env.DB) return json({ error: 'DB not configured' }, 500);
  const row = await env.DB.prepare('SELECT 1 as ok').first();
  return json({ ok: !!row?.ok });
});

// Products
api.get('/products', listProducts);
api.get('/product/:id', getProduct);
api.post('/product/save', saveProduct);
api.delete('/product/delete', deleteProduct);
api.post('/product/duplicate', duplicateProductAction);

// Orders
api.get('/orders', listOrdersAction);
api.get('/order/:id', getOrder);
api.post('/order/create', createOrder);
api.post('/order/update-status', updateOrderStatus);
api.post('/order/deliver', deliverOrder);

// Media - R2
api.post('/upload/r2-presign', r2Presign);
api.post('/upload/temp-file', tempFile);
api.get('/r2/file', r2File);

// Media - Archive
api.post('/upload/archive-credentials', archiveCredentials);

// Chat
api.post('/chat/start', startChat);
api.post('/chat/send', sendMessage);
api.get('/chat/poll', pollMessages);

// Whop
api.post('/whop/checkout', (req, env) => {
  const origin = new URL(req.url).origin;
  return createCheckout(req, env, origin);
});

api.post('/whop/plan-checkout', (req, env) => {
  const origin = new URL(req.url).origin;
  return createPlanCheckout(req, env, origin);
});

api.post('/whop/webhook', webhook);

// 404 for unmatched API routes
api.all('*', (req) => {
  const url = new URL(req.url);
  return json(
    { error: 'API endpoint not found', path: url.pathname, method: req.method },
    404
  );
});

export { api };
