/**
 * Whop API routes.
 */

import {
  createCheckout,
  createPlanCheckout,
  handleWebhook,
  testApi as testWhopApi,
  testWebhook as testWhopWebhook,
  cleanupExpired
} from '../controllers/whop/index.js';

export function routeWhopNoDb(path, method) {
  if (method === 'GET' && path === '/api/whop/test-webhook') {
    return testWhopWebhook();
  }
  return null;
}

export async function routeWhop(req, env, url, path, method) {
  if (method === 'POST' && path === '/api/whop/create-checkout') {
    const body = await req.json();
    return createCheckout(env, body, url.origin);
  }

  if (method === 'POST' && path === '/api/whop/create-plan-checkout') {
    const body = await req.json();
    return createPlanCheckout(env, body, url.origin);
  }

  if (method === 'POST' && path === '/api/whop/webhook') {
    const body = await req.json();
    return handleWebhook(env, body, url.origin);
  }

  if (method === 'GET' && path === '/api/whop/test-api') {
    return testWhopApi(env);
  }

  if (method === 'POST' && path === '/api/whop/cleanup') {
    return cleanupExpired(env);
  }

  return null;
}
