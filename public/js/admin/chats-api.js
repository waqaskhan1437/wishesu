/**
 * Chat admin API helpers.
 */

export async function fetchChatSessions(apiClient) {
  const data = await apiClient.get('/api/admin/chats/sessions');
  return data.sessions || [];
}

export async function blockChatSession(apiClient, sessionId, blocked) {
  return apiClient.post('/api/admin/chats/block', {
    sessionId,
    blocked: !!blocked
  });
}

export async function deleteChatSession(apiClient, sessionId) {
  return apiClient.delete('/api/admin/chats/delete', {
    params: { sessionId }
  });
}
