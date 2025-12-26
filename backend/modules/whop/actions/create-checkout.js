/**
 * Create Whop Checkout Action
 * POST /api/whop/checkout
 */

import { json, error, serverError } from '../../../core/utils/response.js';
import { createCheckoutSession, insertCheckout } from '../service/service.js';
import { parseError } from '../utils/helpers.js';

export const createCheckout = async (request, env, origin) => {
  const body = await request.json().catch(() => ({}));
  const planId = String(body.plan_id || '').trim();
  const productId = Number(body.product_id || body.productId || 0);

  if (!planId) {
    return error('plan_id required');
  }

  const metadata = {
    product_id: productId ? String(productId) : '',
    product_title: body.product_title || '',
    addons: body.addons || []
  };

  const checkoutBody = {
    plan_id: planId,
    redirect_url: `${origin}/success.html`,
    metadata
  };

  const res = await createCheckoutSession(env, checkoutBody);

  if (res.error) {
    return error(parseError(res.error), res.status || 500);
  }

  const checkoutId = res.data?.id || '';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await insertCheckout(env.DB, {
    checkoutId,
    productId,
    planId,
    metadata: JSON.stringify(metadata),
    expiresAt
  });

  return json({
    success: true,
    checkout_id: checkoutId,
    checkout_url: res.data?.purchase_url,
    expires_in: '15 minutes'
  });
};
