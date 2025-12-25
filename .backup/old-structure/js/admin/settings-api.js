/**
 * Settings API helpers.
 */

export async function fetchWhopSettings(apiClient) {
  const response = await apiClient.get('/api/admin/whop-settings');
  return response.settings || {};
}

export async function saveWhopSettings(apiClient, settings) {
  const response = await apiClient.post('/api/admin/whop-settings', settings);
  if (!response.success) {
    throw new Error(response.error || 'Failed to save settings');
  }
  return response;
}
