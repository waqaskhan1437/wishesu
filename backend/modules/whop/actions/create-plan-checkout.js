/**
 * Create Whop Plan & Checkout Action
 * POST /api/whop/plan-checkout
 */

import { json, error, notFound, serverError } from '../../../core/utils/response.js';
import {
  createPlan,
  createCheckoutSession,
  insertCheckout,
  updateCheckoutId,
  getProductSnapshot
} from '../service/service.js';
import { parseError } from '../utils/helpers.js';

export const createPlanCheckout = async (request, env, origin) => {
  const body = await request.json().catch(() => ({}));
  const productId = Number(body.product_id || body.productId || 0);
  const whopProductId = String(body.whop_product_id || '').trim();

  if (!productId) return error('product_id required');
  if (!whopProductId) return error('whop_product_id required');
  if (!env.WHOP_COMPANY_ID) return serverError('WHOP_COMPANY_ID not set');

  const product = await getProductSnapshot(env.DB, productId);
  if (!product) return notFound('Product not found');

  const priceValue = Number(body.amount || product.price || 0);
  if (!Number.isFinite(priceValue) || priceValue <= 0) {
    return error('Invalid amount');
  }

  const currency = env.WHOP_CURRENCY || 'usd';
  const planBody = {
    company_id: env.WHOP_COMPANY_ID,
    product_id: whopProductId,
    plan_type: 'one_time',
    release_method: 'buy_now',
    currency,
    initial_price: priceValue,
    renewal_price: 0,
    title: `${product.title || 'One-time'} - ${priceValue}`,
    stock: 999999,
    one_per_user: false,
    allow_multiple_quantity: true
  };

  const planRes = await createPlan(env, planBody);
  if (planRes.error) {
    return error(parseError(planRes.error), planRes.status || 500);
  }

  const planId = planRes.data?.id;
  if (!planId) return serverError('Plan ID missing');

  const metadata = {
    product_id: String(product.id),
    product_title: product.title,
    addons: body.addons || [],
    amount: priceValue
  };

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await insertCheckout(env.DB, {
    checkoutId: `plan_${planId}`,
    productId: product.id,
    planId,
    metadata: JSON.stringify(metadata),
    expiresAt
  });

  const checkoutRes = await createCheckoutSession(env, {
    plan_id: planId,
    redirect_url: `${origin}/success.html`,
    metadata,
    prefill: body.email ? { email: String(body.email) } : undefined
  });

  if (checkoutRes.error) {
    return json({
      success: true,
      plan_id: planId,
      product_id: product.id,
      metadata,
      warning: parseError(checkoutRes.error)
    });
  }

  const checkoutId = checkoutRes.data?.id;
  if (checkoutId) {
    await updateCheckoutId(env.DB, `plan_${planId}`, checkoutId);
  }

  return json({
    success: true,
    plan_id: planId,
    checkout_id: checkoutId,
    checkout_url: checkoutRes.data?.purchase_url,
    product_id: product.id,
    metadata
  });
};
