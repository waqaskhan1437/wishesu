/**
 * Create Whop checkout session using an existing plan.
 */

import { json } from '../../../../utils/response.js';
import { getWhopApiKey } from '../../../../config/secrets.js';
import { getProductById } from './product.js';
import { getWhopSettings, resolvePlanId, normalizePlanId } from './settings.js';
import { createCheckoutSession } from './whop-api.js';
import { trackCheckoutSession } from './store.js';
import { parseWhopError } from './helpers.js';

export async function createCheckout(env, body, origin) {
  const { product_id } = body || {};
  if (!product_id) {
    return json({ error: 'Product ID required' }, 400);
  }

  const product = await getProductById(env, product_id);
  if (!product) {
    return json({ error: 'Product not found' }, 404);
  }

  const settings = await getWhopSettings(env);
  const planValue = resolvePlanId(product, settings);

  if (!planValue) {
    return json({
      error: 'Whop not configured. Set a plan for this product or configure a default plan in Settings.'
    }, 400);
  }

  const normalized = normalizePlanId(planValue);
  if (!normalized.ok) {
    return json({ error: normalized.error }, 400);
  }

  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: 'Whop API key not configured. Please add it in admin Settings.' }, 500);
  }

  const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const payload = {
    plan_id: normalized.planId,
    redirect_url: `${origin}/success.html?product=${product.id}`,
    metadata: {
      product_id: product.id.toString(),
      product_title: product.title,
      created_at: new Date().toISOString(),
      expires_at: expiryTime
    }
  };

  const resp = await createCheckoutSession(apiKey, payload);
  if (!resp.ok) {
    const parsed = parseWhopError(resp.errorText, 'Failed to create checkout session');
    return json({ error: parsed.message }, resp.status);
  }

  await trackCheckoutSession(env, resp.data.id, product.id, expiryTime);

  return json({
    success: true,
    checkout_id: resp.data.id,
    checkout_url: resp.data.purchase_url,
    expires_in: '15 minutes'
  });
}
