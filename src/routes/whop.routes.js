/**
 * Whop Routes
 * Whop payment integration endpoints
 */

import {
  createCheckout,
  createPlanCheckout,
  handleWebhook,
  testApi as testWhopApi,
  testWebhook as testWhopWebhook,
  cleanupExpired
} from '../controllers/whop.js';

/**
 * Register Whop routes
 * @param {Function} router - Route registration function
 */
export function registerWhopRoutes(router) {
  // Create checkout session
  router.post('/api/whop/checkout', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return createCheckout(env, body, url.origin);
  });

  // Create plan checkout
  router.post('/api/whop/checkout/plan', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return createPlanCheckout(env, body, url.origin);
  });

  // Webhook handler
  router.post('/api/whop/webhook', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return handleWebhook(env, body, url.origin);
  });

  // Test Whop API (admin)
  router.get('/api/admin/whop/test', async (req, env, url) => {
    return testWhopApi(env);
  });

  // Test webhook (admin)
  router.get('/api/whop/test-webhook', async (req, env, url) => {
    return testWhopWebhook();
  });

  // Cleanup expired checkouts
  router.post('/api/whop/cleanup', async (req, env, url) => {
    return cleanupExpired(env);
  });
}

export default registerWhopRoutes;
