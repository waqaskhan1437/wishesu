/**
 * Whop checkout API helper.
 */

export async function createPlanCheckout(payload) {
  const response = await fetch('/api/whop/create-plan-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  return { response, data };
}
