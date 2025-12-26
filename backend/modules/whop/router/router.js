/**
 * Whop Integration Router
 */
import { Router } from 'itty-router';
import { createCheckout, createPlanCheckout, webhook } from '../controller/controller.js';

const whopRouter = Router({ base: '/api' });

whopRouter.post('/whop/create-checkout', (req, env) => {
  const origin = new URL(req.url).origin;
  return createCheckout(req, env, origin);
});

whopRouter.post('/whop/create-plan-checkout', (req, env) => {
  const origin = new URL(req.url).origin;
  return createPlanCheckout(req, env, origin);
});

whopRouter.post('/whop/webhook', webhook);

export { whopRouter };
