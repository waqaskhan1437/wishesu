/**
 * Orders API helpers.
 */

export async function fetchOrders(apiClient) {
  const response = await apiClient.get('/api/orders');
  return response.orders || [];
}

export async function fetchOrderProducts(apiClient) {
  const response = await apiClient.get('/api/products/list');
  return response.products || [];
}

export async function createOrder(apiClient, formData) {
  const response = await apiClient.post('/api/order/manual', formData);
  if (!response.success) {
    throw new Error(response.error || 'Failed to create order');
  }
  return response;
}

export async function deleteOrder(apiClient, orderId) {
  const response = await apiClient.post('/api/order/delete', { orderId });
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete order');
  }
  return response;
}
