/**
 * Whop webhook notifier.
 */

import { getGoogleScriptUrl } from '../../config/secrets.js';

export async function notifyOrderCreated(env, order) {
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (!googleScriptUrl) return;
    await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order.created',
        order
      })
    }).catch(err => console.error('Failed to send order.created webhook:', err));
  } catch (err) {
    console.error('Error triggering order.created webhook:', err);
  }
}
