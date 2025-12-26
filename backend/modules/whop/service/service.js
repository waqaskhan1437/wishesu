const apiBase = 'https://api.whop.com/api/v2';

export const getWhopApiKey = (env) => env.WHOP_API_KEY || '';

export async function createPlan(env, body) {
  const apiKey = getWhopApiKey(env);
  if (!apiKey) return { error: 'Whop API key not configured' };

  const res = await fetch(`${apiBase}/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  if (!res.ok) return { error: text, status: res.status };
  return { data: JSON.parse(text) };
}

export async function createCheckoutSession(env, body) {
  const apiKey = getWhopApiKey(env);
  if (!apiKey) return { error: 'Whop API key not configured' };

  const res = await fetch(`${apiBase}/checkout_sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  if (!res.ok) return { error: text, status: res.status };
  return { data: JSON.parse(text) };
}

export async function insertCheckout(db, data) {
  return db.prepare(
    `INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, metadata, expires_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    data.checkoutId,
    data.productId,
    data.planId,
    data.metadata,
    data.expiresAt,
    data.status || 'pending'
  ).run();
}

export async function updateCheckoutId(db, tempId, checkoutId) {
  return db.prepare(
    `UPDATE checkout_sessions SET checkout_id = ? WHERE checkout_id = ?`
  ).bind(checkoutId, tempId).run();
}

export async function insertEvent(db, eventId, payload) {
  return db.prepare(
    `INSERT INTO whop_events (event_id, payload, created_at) VALUES (?, ?, datetime('now'))`
  ).bind(eventId, payload).run();
}

export async function getProductSnapshot(db, productId) {
  return db.prepare(
    'SELECT id, title, price FROM products WHERE id = ?'
  ).bind(productId).first();
}
