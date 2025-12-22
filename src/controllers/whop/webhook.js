/**
 * Whop Webhook Controller
 * Handles webhook events from Whop
 */

import { json } from '../../utils/response.js';
import { getWhopApiKey, getGoogleScriptUrl } from '../../config/secrets.js';

/**
 * Notify external services about order creation
 */
async function notifyOrderCreated(env, order) {
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

/**
 * Handle Whop webhook events
 */
export async function handleWebhook(env, webhookData, origin) {
  try {
    const eventType = webhookData.type;

    console.log('Whop webhook received:', eventType);

    // Handle payment success
    if (eventType === 'payment.succeeded') {
      const checkoutSessionId = webhookData.data?.checkout_session_id;
      const membershipId = webhookData.data?.id;
      let metadata = webhookData.data?.metadata || {};

      console.log('Payment succeeded:', { checkoutSessionId, membershipId, metadata });

      // Fallback: If metadata from Whop is empty/incomplete, try to get from our database
      if (checkoutSessionId && (!metadata.addons || !metadata.addons.length)) {
        try {
          const sessionRow = await env.DB.prepare(
            'SELECT metadata FROM checkout_sessions WHERE checkout_id = ?'
          ).bind(checkoutSessionId).first();

          if (sessionRow?.metadata) {
            const storedMetadata = JSON.parse(sessionRow.metadata);
            console.log('Retrieved stored metadata from DB:', storedMetadata);
            // Merge stored metadata with webhook metadata (prefer stored for addons)
            metadata = {
              ...metadata,
              ...storedMetadata,
              // Ensure addons come from stored metadata if available
              addons: storedMetadata.addons || metadata.addons || []
            };
          }
        } catch (e) {
          console.log('Failed to retrieve stored metadata:', e.message);
        }
      }

      // Mark checkout as completed in database
      if (checkoutSessionId) {
        try {
          await env.DB.prepare(`
            UPDATE checkout_sessions
            SET status = 'completed', completed_at = datetime('now')
            WHERE checkout_id = ?
          `).bind(checkoutSessionId).run();
        } catch (e) {
          console.log('Checkout tracking update skipped:', e.message);
        }
      }

      // Delete the temporary checkout session from Whop
      const apiKey = await getWhopApiKey(env);
      if (checkoutSessionId && apiKey) {
        try {
          await fetch(`https://api.whop.com/api/v2/checkout_sessions/${checkoutSessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          console.log('✅ Checkout session deleted immediately after payment:', checkoutSessionId);
        } catch (e) {
          console.error('Failed to delete checkout session:', e);
        }

        // Delete dynamic plan if exists
        try {
          const row = await env.DB.prepare('SELECT plan_id FROM checkout_sessions WHERE checkout_id = ?').bind(checkoutSessionId).first();
          const planId = row && row.plan_id;
          if (planId) {
            await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            console.log('🗑️ Plan deleted immediately after payment:', planId);
          }
        } catch (e) {
          console.error('Failed to delete plan:', e);
        }
      }

      // Create order in database
      if (metadata.product_id) {
        try {
          const orderId = `WHOP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Build encrypted_data with addons and other details
          const encryptedData = JSON.stringify({
            email: metadata.email || webhookData.data?.email || webhookData.data?.user?.email || '',
            amount: metadata.amount || webhookData.data?.final_amount || 0,
            productId: metadata.product_id,
            addons: metadata.addons || []
          });

          await env.DB.prepare(
            'INSERT INTO orders (order_id, product_id, encrypted_data, status, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
          ).bind(orderId, Number(metadata.product_id), encryptedData, 'completed').run();

          console.log('Order created with addons:', orderId, 'Addons count:', (metadata.addons || []).length);

          const base = String(origin || '').trim();
          const orderUrl = base ? `${base}/buyer-order.html?id=${encodeURIComponent(orderId)}` : null;
          await notifyOrderCreated(env, {
            order_id: orderId,
            product_id: Number(metadata.product_id),
            email: metadata.email || webhookData.data?.email || webhookData.data?.user?.email || '',
            name: null,
            amount: metadata.amount || webhookData.data?.final_amount || 0,
            status: 'completed',
            origin: base || null,
            order_url: orderUrl
          });
        } catch (e) {
          console.error('Failed to create order:', e);
        }
      }
    }

    // Handle membership validation
    if (eventType === 'membership.went_valid') {
      console.log('Membership validated:', webhookData.data?.id);
    }

    return json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return json({ error: 'Webhook processing failed' }, 500);
  }
}
