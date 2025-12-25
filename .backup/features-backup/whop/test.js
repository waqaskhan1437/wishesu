/**
 * Whop test handlers.
 */

import { json } from '../../utils/response.js';
import { getWhopApiKey } from '../../config/secrets.js';

export async function testApi(env) {
  const apiKey = await getWhopApiKey(env);
  if (!apiKey) {
    return json({ success: false, error: 'Whop API key not configured. Please add it in Settings.' }, 500);
  }
  try {
    const resp = await fetch('https://api.whop.com/api/v2/plans?page=1&per=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!resp.ok) {
      const text = await resp.text();
      let errMsg = 'Whop API call failed';
      let errorDetails = null;
      try {
        errorDetails = JSON.parse(text);
        errMsg = errorDetails.message || errorDetails.error || errMsg;
      } catch (_) {
        errMsg = text || errMsg;
      }
      return json({
        success: false,
        error: errMsg,
        status: resp.status,
        details: errorDetails,
        debug: {
          apiKeyLength: apiKey?.length || 0,
          apiKeyPrefix: apiKey?.substring(0, 10) + '...'
        }
      }, resp.status);
    }

    const data = await resp.json();
    return json({
      success: true,
      message: 'API connection successful!',
      plansCount: data.data?.length || 0,
      apiKeyValid: true
    });
  } catch (e) {
    return json({ success: false, error: e.message || 'API test error' }, 500);
  }
}

export function testWebhook() {
  return json({ success: true, message: 'Webhook endpoint reachable' });
}
