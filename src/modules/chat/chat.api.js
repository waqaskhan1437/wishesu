/**
 * Chat API routes.
 */

import {
  startChat,
  syncChat,
  sendMessage,
  blockSession,
  deleteSession,
  getSessions
} from './chat.controller.js';

export async function routeChat(req, env, url, path, method) {
  if (path === '/api/chat/start' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    return startChat(env, body);
  }

  if (path === '/api/chat/sync' && method === 'GET') {
    return syncChat(env, url);
  }

  if (path === '/api/chat/send' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    return sendMessage(env, body, req.url);
  }

  if (path === '/api/admin/chats/block' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    return blockSession(env, body);
  }

  if (path === '/api/admin/chats/delete' && method === 'DELETE') {
    let sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      const body = await req.json().catch(() => ({}));
      sessionId = String(body.sessionId || '').trim();
    }
    return deleteSession(env, sessionId);
  }

  if (path === '/api/admin/chats/sessions' && method === 'GET') {
    return getSessions(env);
  }

  return null;
}
