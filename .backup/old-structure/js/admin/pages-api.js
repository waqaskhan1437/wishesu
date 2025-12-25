/**
 * Pages admin API helpers.
 */

export async function fetchPages(apiClient) {
  const data = await apiClient.get('/api/pages/list');
  return data.pages || [];
}

export async function getPage(apiClient, slug) {
  const data = await apiClient.get(`/api/page/${slug}`);
  return data.page || null;
}

export async function savePage(apiClient, payload) {
  return apiClient.post('/api/page/save', payload);
}

export async function deletePage(apiClient, name) {
  return apiClient.post('/api/pages/delete', { name });
}

export async function duplicatePage(apiClient, id) {
  return apiClient.post('/api/pages/duplicate', { id });
}

export async function setPageStatus(apiClient, id, status) {
  return apiClient.post('/api/pages/status', { id, status });
}
