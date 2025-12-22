/**
 * Chat Routes
 * All chat-related API endpoints
 */

import {
  startChat,
  syncChat,
  sendMessage,
  blockSession,
  deleteSession,
  getSessions
} from '../controllers/chat.js';

/**
 * Register chat routes
 * @param {Function} router - Route registration function
 */
export function registerChatRoutes(router) {
  // Start chat session
  router.post('/api/chat/start', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return startChat(env, body);
  });

  // Sync chat messages
  router.get('/api/chat/sync', async (req, env, url) => {
    return syncChat(env, url);
  });

  // Send message
  router.post('/api/chat/send', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return sendMessage(env, body, req.url);
  });

  // Block chat session (admin)
  router.post('/api/admin/chats/block', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return blockSession(env, body);
  });

  // Delete chat session (admin)
  router.delete('/api/admin/chats/delete', async (req, env, url) => {
    let sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      const body = await req.json().catch(() => ({}));
      sessionId = String(body.sessionId || '').trim();
    }
    return deleteSession(env, sessionId);
  });

  // Get all chat sessions (admin)
  router.get('/api/admin/chats/sessions', async (req, env, url) => {
    return getSessions(env);
  });
}

export default registerChatRoutes;
