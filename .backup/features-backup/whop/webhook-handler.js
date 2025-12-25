/**
 * Whop webhook handler.
 */

import { json } from '../../utils/response.js';
import { getWhopApiKey } from '../../config/secrets.js';
import { hydrateMetadataFromDb } from './webhook-metadata.js';
import { deleteCheckoutSession, deletePlanForCheckout } from './webhook-cleanup.js';
import { createOrderFromWebhook } from './webhook-orders.js';

export async function handleWebhook(env, webhookData, origin) {
  try {
    const eventType = webhookData.type;

    if (eventType === 'payment.succeeded') {
      const checkoutSessionId = webhookData.data?.checkout_session_id;
      const membershipId = webhookData.data?.id;
      let metadata = webhookData.data?.metadata || {};


      if (checkoutSessionId && (!metadata.addons || !metadata.addons.length)) {
        metadata = await hydrateMetadataFromDb(env, checkoutSessionId, metadata);
      }

      if (checkoutSessionId) {
        try {
          await env.DB.prepare(`
            UPDATE checkout_sessions
            SET status = 'completed', completed_at = datetime('now')
            WHERE checkout_id = ?
          `).bind(checkoutSessionId).run();
        } catch (e) {
        }
      }

      const apiKey = await getWhopApiKey(env);
      if (checkoutSessionId && apiKey) {
        await deleteCheckoutSession(apiKey, checkoutSessionId);
        await deletePlanForCheckout(env, apiKey, checkoutSessionId);
      }

      await createOrderFromWebhook(env, webhookData, metadata, origin);
    }

    if (eventType === 'membership.went_valid') {
    }

    return json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return json({ error: 'Webhook processing failed' }, 500);
  }
}
