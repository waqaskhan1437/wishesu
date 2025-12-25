import { json } from '../../core/utils/response.js';
import { CORS } from '../../core/config/cors.js';
import { createSession, addMessage, getMessages } from './service.js';

const uid = () => `cs_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function start(req, env) {
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.session_id || uid());
  await createSession(env.DB, sessionId);
  return json({ session_id: sessionId }, 200, CORS);
}

export async function send(req, env) {
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.session_id || '').trim();
  const message = String(body.message || '').trim();
  if (!sessionId || !message) {
    return json({ error: 'Missing session_id or message' }, 400, CORS);
  }
  await addMessage(env.DB, { sessionId, sender: 'user', message });
  return json({ ok: true }, 200, CORS);
}

export async function poll(req, env, url) {
  const sessionId = String(url.searchParams.get('session_id') || '').trim();
  const sinceId = url.searchParams.get('since_id') || 0;
  if (!sessionId) {
    return json({ error: 'Missing session_id' }, 400, CORS);
  }
  const messages = await getMessages(env.DB, sessionId, sinceId);
  return json({ messages }, 200, CORS);
}
