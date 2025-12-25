/**
 * Whop Cleanup Controller
 * Handles cleanup of expired checkout sessions
 */

import { json } from '../../../core/utils/response.js';
import { getWhopApiKey } from '../../../core/config/secrets.js';

/**
 * Cleanup expired checkout sessions
 * Archive plans so users cannot repurchase (handles "already purchased" error)
 */
export async function cleanupExpired(env) {
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ error: 'Whop API key not configured' }, 500);
  }

  try {
    const expiredCheckouts = await env.DB.prepare(`
      SELECT checkout_id, product_id, plan_id, expires_at
      FROM checkout_sessions
      WHERE status = 'pending'
      AND datetime(expires_at) < datetime('now')
      ORDER BY created_at ASC
      LIMIT 50
    `).all();

    const checkouts = expiredCheckouts.results || [];
    if (checkouts.length === 0) {
      return json({ success: true, archived: 0, failed: 0, message: 'No expired checkouts' });
    }

    // Process in parallel batches of 5 to avoid rate limiting
    const batchSize = 5;
    let archived = 0;
    let failed = 0;

    for (let i = 0; i < checkouts.length; i += batchSize) {
      const batch = checkouts.slice(i, i + batchSize);

      const results = await Promise.allSettled(batch.map(async (checkout) => {
        const headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };

        let success = false;

        // Archive plan (hide it so users cannot buy again)
        if (checkout.plan_id) {
          try {
            // Try to archive by setting visibility to hidden
            const archiveResp = await fetch(`https://api.whop.com/api/v2/plans/${checkout.plan_id}`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ visibility: 'hidden' })
            });

            if (archiveResp.ok) {
              success = true;
              console.log('✅ Plan archived (hidden):', checkout.plan_id);
            } else {
              // Fallback: try DELETE
              const deleteResp = await fetch(`https://api.whop.com/api/v2/plans/${checkout.plan_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${apiKey}` }
              });
              success = deleteResp.ok || deleteResp.status === 404;
              if (success) console.log('✅ Plan deleted:', checkout.plan_id);
            }
          } catch (e) {
            console.error('Plan archive failed:', checkout.plan_id, e.message);
          }
        } else {
          success = true;
        }

        // Update database
        if (success) {
          await env.DB.prepare(`
            UPDATE checkout_sessions
            SET status = 'archived', completed_at = datetime('now')
            WHERE checkout_id = ?
          `).bind(checkout.checkout_id).run();
          return { success: true, id: checkout.checkout_id };
        }
        return { success: false, id: checkout.checkout_id };
      }));

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.success) archived++;
        else failed++;
      });
    }

    return json({
      success: true,
      archived,
      failed,
      message: `Archived ${archived} plans - users cannot repurchase these`
    });
  } catch (e) {
    console.error('Cleanup error:', e);
    return json({ error: e.message }, 500);
  }
}
