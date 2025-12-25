/**
 * Products API helpers.
 */

export async function fetchProducts(apiClient) {
  const response = await apiClient.get('/api/products');
  return response.products || [];
}

export async function toggleProductStatus(apiClient, productId, enabled) {
  const response = await apiClient.post('/api/products/status', {
    id: productId,
    enabled: enabled
  });
  if (!response.success) {
    throw new Error(response.error || 'Failed to update product');
  }
  return response;
}

export async function duplicateProduct(apiClient, productId) {
  const response = await apiClient.post('/api/products/duplicate', { id: productId });
  if (!response.success) {
    throw new Error(response.error || 'Failed to duplicate product');
  }
  return response;
}

export async function deleteProduct(apiClient, productId) {
  const response = await apiClient.post('/api/product/delete', { id: productId });
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete product');
  }
  return response;
}
