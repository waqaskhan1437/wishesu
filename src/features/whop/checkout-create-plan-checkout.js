/**
 * Create dynamic plan + checkout session.
 */

import { json } from '../../../../utils/response.js';
import { getWhopApiKey } from '../../../../config/secrets.js';
import { getProductById, getBasePrice } from './product.js';
import { getWhopSettings, resolveProductId } from './settings.js';
import { createCheckoutSession, createPlan, setProductAllowMultiple } from './whop-api.js';
import { trackPlanSession, updateCheckoutSessionId } from './store.js';
import {
  resolvePrice,
  buildPlanPayload,
  buildCheckoutMetadata,
  buildCheckoutPayload,
  parseWhopError
} from './helpers.js';

export async function createPlanCheckout(env, body, origin) {
  const { product_id, amount, email, metadata } = body || {};
  if (!product_id) {
    return json({ error: 'Product ID required' }, 400);
  }

  const product = await getProductById(env, product_id);
  if (!product) {
    return json({ error: 'Product not found' }, 404);
  }

  const basePrice = getBasePrice(product);
  const priceResult = resolvePrice(amount, basePrice);
  if (priceResult.error) {
    return json({ error: priceResult.error }, 400);
  }

  const settings = await getWhopSettings(env);
  const finalProdId = resolveProductId(product, settings);
  if (!finalProdId) {
    return json({
      error: 'whop_product_id not configured for this product and no default_product_id set'
    }, 400);
  }

  const companyId = env.WHOP_COMPANY_ID;
  if (!companyId) {
    return json({ error: 'WHOP_COMPANY_ID environment variable not set' }, 500);
  }

  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: 'Whop API key not configured. Please add it in admin Settings.' }, 500);
  }

  const currency = env.WHOP_CURRENCY || 'usd';
  await setProductAllowMultiple(apiKey, finalProdId);

  const planPayload = buildPlanPayload(product, finalProdId, companyId, priceResult.priceValue, currency);
  const planResp = await createPlan(apiKey, planPayload);

  if (!planResp.ok) {
    const parsed = parseWhopError(planResp.errorText, 'Failed to create plan');
    return json({ error: parsed.message }, planResp.status);
  }

  const planId = planResp.data?.id;
  if (!planId) {
    return json({ error: 'Plan ID missing from Whop response' }, 500);
  }

  const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const checkoutMetadata = buildCheckoutMetadata(
    product,
    metadata,
    email,
    amount,
    priceResult.priceValue
  );

  await trackPlanSession(env, planId, product.id, checkoutMetadata, expiryTime);

  const checkoutPayload = buildCheckoutPayload(planId, origin, product, checkoutMetadata, email);
  const checkoutResp = await createCheckoutSession(apiKey, checkoutPayload);

  if (!checkoutResp.ok) {
    return json({
      success: true,
      plan_id: planId,
      product_id: product.id,
      email: email,
      metadata: {
        product_id: product.id.toString(),
        product_title: product.title,
        addons: checkoutMetadata.addons || [],
        amount: amount || priceResult.priceValue
      },
      expires_in: '15 minutes',
      warning: 'Email prefill not available'
    });
  }

  const checkoutData = checkoutResp.data;
  await updateCheckoutSessionId(env, checkoutData.id, `plan_${planId}`);

  return json({
    success: true,
    plan_id: planId,
    checkout_id: checkoutData.id,
    checkout_url: checkoutData.purchase_url,
    product_id: product.id,
    email: email,
    metadata: {
      product_id: product.id.toString(),
      product_title: product.title,
      addons: checkoutMetadata.addons || [],
      amount: amount || priceResult.priceValue
    },
    expires_in: '15 minutes',
    email_prefilled: !!(email && email.includes('@'))
  });
}
