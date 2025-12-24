/**
 * Whop checkout helpers.
 */

export function resolvePrice(amount, basePrice) {
  const numAmount = Number(amount);
  const hasAmount = amount !== null && amount !== undefined && !Number.isNaN(numAmount) && numAmount > 0;
  const priceValue = hasAmount ? numAmount : Number(basePrice);

  if (Number.isNaN(priceValue) || priceValue < 0) {
    return { error: 'Invalid price' };
  }

  return { priceValue };
}

export function buildPlanPayload(product, productId, companyId, priceValue, currency) {
  return {
    company_id: companyId,
    product_id: productId,
    plan_type: 'one_time',
    release_method: 'buy_now',
    currency: currency,
    initial_price: priceValue,
    renewal_price: 0,
    title: `${product.title || 'One-time purchase'} - $${priceValue}`,
    stock: 999999,
    one_per_user: false,
    allow_multiple_quantity: true,
    internal_notes: `Auto-generated for product ${product.id} - ${new Date().toISOString()}`
  };
}

export function buildCheckoutMetadata(product, metadata, email, amount, priceValue) {
  return {
    product_id: product.id.toString(),
    product_title: product.title,
    addons: metadata?.addons || [],
    email: email || '',
    amount: amount || priceValue,
    created_at: new Date().toISOString()
  };
}

export function buildCheckoutPayload(planId, origin, product, metadata, email) {
  const payload = {
    plan_id: planId,
    redirect_url: `${origin}/success.html?product=${product.id}`,
    metadata
  };

  if (email && email.includes('@')) {
    payload.prefill = { email: email.trim() };
  }

  return payload;
}

export function parseWhopError(errorText, fallbackMessage) {
  if (!errorText) {
    return { message: fallbackMessage };
  }

  try {
    const errorData = JSON.parse(errorText);
    return {
      message: errorData.message || errorData.error || fallbackMessage,
      details: errorData
    };
  } catch (_) {
    return { message: errorText || fallbackMessage };
  }
}
