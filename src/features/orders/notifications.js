/**
 * Order notification helpers.
 */

import { getGoogleScriptUrl } from '../../../config/secrets.js';

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

export async function notifyOrderDelivered(env, payload) {
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (!googleScriptUrl) return;
    await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order.delivered',
        order: payload
      })
    }).catch(err => console.error('Failed to send delivery webhook:', err));
  } catch (err) {
    console.error('Error triggering delivery webhook:', err);
  }
}

export async function notifyRevisionRequested(env, payload) {
  try {
    const googleScriptUrl = await getGoogleScriptUrl(env);
    if (!googleScriptUrl) return;
    await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order.revision_requested',
        order: payload
      })
    }).catch(err => console.error('Failed to send revision webhook:', err));
  } catch (err) {
    console.error('Error triggering revision webhook:', err);
  }
}
