/**
 * Review API routes.
 */

import {
  getReviews,
  getProductReviews,
  addReview,
  updateReview,
  deleteReview
} from '../controllers/reviews.js';

export async function routeReviews(req, env, url, path, method) {
  if (method === 'GET' && path === '/api/reviews') {
    return getReviews(env, url);
  }
  if (method === 'POST' && path === '/api/reviews/add') {
    const body = await req.json();
    return addReview(env, body);
  }
  if (method === 'GET' && path.startsWith('/api/reviews/')) {
    const productId = path.split('/').pop();
    return getProductReviews(env, productId);
  }
  if (method === 'POST' && path === '/api/reviews/update') {
    const body = await req.json();
    return updateReview(env, body);
  }
  if (method === 'DELETE' && path === '/api/reviews/delete') {
    const id = url.searchParams.get('id');
    return deleteReview(env, id);
  }
  return null;
}
