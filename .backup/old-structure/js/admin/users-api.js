/**
 * Users admin API helpers.
 */

export async function fetchUsers(apiClient) {
  const data = await apiClient.get('/api/admin/users/list');
  return data.users || [];
}

export async function setUserBlocked(apiClient, email, blocked) {
  return apiClient.post('/api/admin/users/block', { email, blocked: !!blocked });
}
