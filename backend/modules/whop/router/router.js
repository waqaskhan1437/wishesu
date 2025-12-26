import { createCheckout, createPlanCheckout, webhook } from '../controller/controller.js';

export async function whopRouter(req, env, url, path, method) {
  if (method === 'POST' && path === '/api/whop/create-checkout') {
    return createCheckout(req, env, url.origin);
  }
  if (method === 'POST' && path === '/api/whop/create-plan-checkout') {
    return createPlanCheckout(req, env, url.origin);
  }
  if (method === 'POST' && path === '/api/whop/webhook') {
    return webhook(req, env);
  }
  return null;
}
