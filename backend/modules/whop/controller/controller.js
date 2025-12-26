import { json } from '../../../core/utils/response/response.js';
import { CORS } from '../../../core/config/cors/cors.js';
import {
  createPlan,
  createCheckoutSession,
  insertCheckout,
  updateCheckoutId,
  getProductSnapshot
} from '../service/service.js';
import { webhook } from '../actions/webhook.js';

const parseError = (text) => {
  try {
    const data = JSON.parse(text);
    return data.message || data.error || text;
  } catch (_) { return text || 'Whop error'; }
};

export async function createCheckout(req, env, origin) {
  const body = await req.json().catch(() => ({}));
  const planId = String(body.plan_id || '').trim();
  const productId = Number(body.product_id || body.productId || 0);
  if (!planId) return json({ error: 'plan_id required' }, 400, CORS);

  const metadata = {
    product_id: productId ? String(productId) : '',
    product_title: body.product_title || '',
    email: body.email || '',
    addons: body.addons || []
  };

  const res = await createCheckoutSession(env, {
    plan_id: planId,
    redirect_url: `${origin}/success.html`,
    metadata,
    prefill: body.email ? { email: String(body.email) } : undefined
  });
  if (res.error) return json({ error: parseError(res.error) }, res.status || 500, CORS);

  const checkoutId = res.data?.id || '';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await insertCheckout(env.DB, { checkoutId, productId, planId, metadata: JSON.stringify(metadata), expiresAt });

  return json({ success: true, checkout_id: checkoutId, checkout_url: res.data?.purchase_url, expires_in: '15 minutes' }, 200, CORS);
}

export async function createPlanCheckout(req, env, origin) {
  const body = await req.json().catch(() => ({}));
  const productId = Number(body.product_id || body.productId || 0);
  const whopProductId = String(body.whop_product_id || '').trim();
  if (!productId) return json({ error: 'product_id required' }, 400, CORS);
  if (!whopProductId) return json({ error: 'whop_product_id required' }, 400, CORS);
  if (!env.WHOP_COMPANY_ID) return json({ error: 'WHOP_COMPANY_ID not set' }, 500, CORS);

  const product = await getProductSnapshot(env.DB, productId);
  if (!product) return json({ error: 'Product not found' }, 404, CORS);

  const priceValue = Number(body.amount || product.price || 0);
  if (!Number.isFinite(priceValue) || priceValue <= 0) return json({ error: 'Invalid amount' }, 400, CORS);

  const currency = env.WHOP_CURRENCY || 'usd';
  const planRes = await createPlan(env, {
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
  });
  if (planRes.error) return json({ error: parseError(planRes.error) }, planRes.status || 500, CORS);

  const planId = planRes.data?.id;
  if (!planId) return json({ error: 'Plan ID missing' }, 500, CORS);

  const metadata = {
    product_id: String(product.id),
    product_title: product.title,
    email: body.email || '',
    addons: body.addons || [],
    amount: priceValue,
    instant: product.instant || 0,
    delivery_days: product.delivery_days || 2
  };

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await insertCheckout(env.DB, { checkoutId: `plan_${planId}`, productId: product.id, planId, metadata: JSON.stringify(metadata), expiresAt });

  const checkoutRes = await createCheckoutSession(env, {
    plan_id: planId,
    redirect_url: `${origin}/success.html`,
    metadata,
    prefill: body.email ? { email: String(body.email) } : undefined
  });

  if (checkoutRes.error) {
    return json({ success: true, plan_id: planId, product_id: product.id, metadata, warning: parseError(checkoutRes.error) }, 200, CORS);
  }

  const checkoutId = checkoutRes.data?.id;
  if (checkoutId) await updateCheckoutId(env.DB, `plan_${planId}`, checkoutId);

  return json({
    success: true,
    plan_id: planId,
    checkout_id: checkoutId,
    checkout_url: checkoutRes.data?.purchase_url,
    product_id: product.id,
    metadata
  }, 200, CORS);
}

export { webhook };
