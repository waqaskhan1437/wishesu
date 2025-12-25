/**
 * Whop checkout settings helpers.
 */

export async function getWhopSettings(env) {
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('whop')
      .first();

    if (row && row.value) {
      try {
        return JSON.parse(row.value);
      } catch (_) {
        return {};
      }
    }
  } catch (_) {}

  return {};
}

export function resolvePlanId(product, settings) {
  return product.whop_plan || settings.default_plan_id || settings.default_plan || '';
}

export function resolveProductId(product, settings) {
  const directProdId = (product.whop_product_id || '').trim();
  if (directProdId) return directProdId;
  return (settings.default_product_id || '').trim();
}

export function normalizePlanId(planId) {
  if (!planId) return { ok: false, error: 'Whop plan is not configured' };

  let normalized = String(planId).trim();

  if (normalized.startsWith('http')) {
    const match = normalized.match(/plan_[a-zA-Z0-9]+/);
    if (!match) {
      return {
        ok: false,
        error: 'Could not extract Plan ID from link. Use https://whop.com/checkout/plan_XXXXX or plan_XXXXX'
      };
    }
    normalized = match[0];
  }

  if (!normalized.startsWith('plan_')) {
    return { ok: false, error: 'Invalid Whop Plan ID format. Should start with plan_' };
  }

  return { ok: true, planId: normalized };
}
