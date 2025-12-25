/**
 * Blog admin API helpers.
 */

export async function fetchBlogPosts(apiClient) {
  const data = await apiClient.get('/api/blog/list');
  return data.posts || [];
}

export async function getBlogPost(apiClient, slug) {
  const data = await apiClient.get('/api/blog/get', { slug });
  return data.post || null;
}

export async function saveBlogPost(apiClient, payload) {
  return apiClient.post('/api/blog/save', payload);
}

export async function setBlogStatus(apiClient, slug, status) {
  return apiClient.post('/api/blog/status', { slug, status });
}

export async function deleteBlogPost(apiClient, slug) {
  return apiClient.delete('/api/blog/delete', { params: { slug } });
}
