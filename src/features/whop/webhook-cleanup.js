/**
 * Whop webhook cleanup helpers.
 */

export async function deleteCheckoutSession(apiKey, checkoutSessionId) {
  if (!apiKey || !checkoutSessionId) return;
  try {
    await fetch(`https://api.whop.com/api/v2/checkout_sessions/${checkoutSessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
  } catch (e) {
    console.error('Failed to delete checkout session:', e);
  }
}

export async function deletePlanForCheckout(env, apiKey, checkoutSessionId) {
  if (!apiKey || !checkoutSessionId) return;

  try {
    const row = await env.DB.prepare('SELECT plan_id FROM checkout_sessions WHERE checkout_id = ?')
      .bind(checkoutSessionId)
      .first();
    const planId = row && row.plan_id;
    if (!planId) return;

    await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
  } catch (e) {
    console.error('Failed to delete plan:', e);
  }
}
