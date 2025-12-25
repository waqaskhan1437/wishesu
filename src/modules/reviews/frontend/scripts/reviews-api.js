/**
 * Reviews API helpers.
 */

export async function fetchReviews(apiClient) {
  const response = await apiClient.get('/api/reviews');
  return response.reviews || [];
}

export async function approveReview(apiClient, reviewId) {
  const response = await apiClient.post('/api/reviews/update', {
    id: reviewId,
    approved: true
  });
  if (!response.success) {
    throw new Error(response.error || 'Failed to approve review');
  }
  return response;
}

export async function deleteReview(apiClient, reviewId) {
  const response = await apiClient.post('/api/reviews/delete', { id: reviewId });
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete review');
  }
  return response;
}
