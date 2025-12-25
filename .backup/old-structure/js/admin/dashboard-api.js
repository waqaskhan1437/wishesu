/**
 * Dashboard API helpers.
 */

export async function fetchDashboardOrders(apiClient) {
  const response = await apiClient.get('/api/orders');
  return response.orders || [];
}

export async function fetchDashboardProducts(apiClient) {
  const response = await apiClient.get('/api/products');
  return response.products || [];
}
