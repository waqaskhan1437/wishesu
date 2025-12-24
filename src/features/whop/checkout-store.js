/**
 * Whop checkout storage helpers.
 */

export async function trackCheckoutSession(env, checkoutId, productId, expiryTime) {
  try {
    await env.DB.prepare(`
      INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, expires_at, status, created_at)
      VALUES (?, ?, NULL, ?, 'pending', datetime('now'))
    `).bind(checkoutId, productId, expiryTime).run();
  } catch (e) {
  }
}

export async function trackPlanSession(env, planId, productId, metadata, expiryTime) {
  try {
    await env.DB.prepare(`
      INSERT INTO checkout_sessions (checkout_id, product_id, plan_id, metadata, expires_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(`plan_${planId}`, productId, planId, JSON.stringify(metadata), expiryTime).run();
  } catch (e) {
  }
}

export async function updateCheckoutSessionId(env, checkoutId, tempId) {
  try {
    await env.DB.prepare(`
      UPDATE checkout_sessions
      SET checkout_id = ?
      WHERE checkout_id = ?
    `).bind(checkoutId, tempId).run();
  } catch (e) {
  }
}
