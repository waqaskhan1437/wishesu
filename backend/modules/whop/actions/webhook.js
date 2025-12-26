/**
 * Whop Webhook Handler Action
 * POST /api/whop/webhook
 */

import { json } from '../../../core/utils/response.js';
import { insertEvent } from '../service/service.js';

export const webhook = async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const eventId = String(body.id || body.event_id || '');

  await insertEvent(env.DB, eventId || 'unknown', JSON.stringify(body));

  return json({ ok: true });
};
