/**
 * Admin maintenance handlers.
 */

import { json } from '../../../utils/response.js';

export async function testGoogleSync(env, body) {
  const googleUrl = body.googleUrl;
  if (!googleUrl) {
    return json({ error: 'Google Web App URL required' }, 400);
  }
  try {
    const testRes = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping', timestamp: Date.now() })
    });
    if (testRes.ok) {
      return json({ success: true, message: 'Google Sync test successful' });
    }
    return json({ error: 'Google Apps Script returned error: ' + testRes.status });
  } catch (err) {
    return json({ error: 'Failed to connect: ' + err.message });
  }
}

export async function clearTempFiles(env) {
  try {
    if (!env.R2_BUCKET) {
      return json({ success: true, count: 0, message: 'R2 not configured' });
    }
    const listed = await env.R2_BUCKET.list({ prefix: 'temp/', limit: 100 });
    let count = 0;
    for (const obj of listed.objects || []) {
      await env.R2_BUCKET.delete(obj.key);
      count++;
    }
    return json({ success: true, count });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function clearPendingCheckouts(env) {
  try {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const result = await env.DB.prepare(
      'DELETE FROM pending_checkouts WHERE created_at < ?'
    ).bind(cutoff).run();
    return json({ success: true, count: result.changes || 0 });
  } catch (err) {
    return json({ success: true, count: 0, message: 'No pending checkouts table or already empty' });
  }
}
