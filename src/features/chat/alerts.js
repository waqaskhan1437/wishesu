/**
 * Chat alert helpers.
 */

import { getGoogleScriptUrl } from '../../config/secrets.js';

export async function notifyFirstCustomerMessage(env, sessionId, message, reqUrl) {
  try {
    const scriptUrl = await getGoogleScriptUrl(env);
    if (!scriptUrl) return;

    const session = await env.DB.prepare(
      `SELECT id, name, email, created_at FROM chat_sessions WHERE id = ?`
    ).bind(sessionId).first();

    const origin = reqUrl ? new URL(reqUrl).origin : null;
    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'first_customer_message',
        sessionId,
        name: session?.name || null,
        email: session?.email || null,
        created_at: session?.created_at || null,
        message,
        origin
      })
    });
  } catch (e) {
    console.error('Chat webhook trigger failed:', e);
  }
}
