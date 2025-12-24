/**
 * Whop API helpers.
 */

function buildHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
}

export async function setProductAllowMultiple(apiKey, productId) {
  try {
    await fetch(`https://api.whop.com/api/v2/products/${productId}`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({ one_per_user: false })
    });
  } catch (e) {
  }
}

export async function createPlan(apiKey, payload) {
  const resp = await fetch('https://api.whop.com/api/v2/plans', {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(payload)
  });

  const text = await resp.text();
  if (!resp.ok) {
    return { ok: false, status: resp.status, errorText: text };
  }

  return { ok: true, data: JSON.parse(text) };
}

export async function createCheckoutSession(apiKey, payload) {
  const resp = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(payload)
  });

  const text = await resp.text();
  if (!resp.ok) {
    return { ok: false, status: resp.status, errorText: text };
  }

  return { ok: true, data: JSON.parse(text) };
}
