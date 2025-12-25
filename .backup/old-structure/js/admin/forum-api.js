/**
 * Forum admin API helpers.
 */

export async function fetchForumTopics(apiClient, status) {
  const data = await apiClient.get('/api/admin/forum/topics', { status });
  return data.topics || [];
}

export async function fetchForumReplies(apiClient, status) {
  const data = await apiClient.get('/api/admin/forum/replies', { status });
  return data.replies || [];
}

export async function setForumTopicStatus(apiClient, id, status) {
  return apiClient.post('/api/admin/forum/topic/status', { id, status });
}

export async function setForumReplyStatus(apiClient, id, status) {
  return apiClient.post('/api/admin/forum/reply/status', { id, status });
}

export async function updateForumTopic(apiClient, payload) {
  return apiClient.post('/api/admin/forum/topic/update', payload);
}

export async function updateForumReply(apiClient, payload) {
  return apiClient.post('/api/admin/forum/reply/update', payload);
}

export async function deleteForumTopic(apiClient, id) {
  return apiClient.post('/api/admin/forum/topic/delete', { id });
}

export async function deleteForumReply(apiClient, id) {
  return apiClient.post('/api/admin/forum/reply/delete', { id });
}
