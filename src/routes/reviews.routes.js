/**
 * Reviews Routes
 * All review-related API endpoints
 */

import {
  getReviews,
  getProductReviews,
  addReview,
  updateReview,
  deleteReview
} from '../controllers/reviews.js';

/**
 * Register review routes
 * @param {Function} router - Route registration function
 */
export function registerReviewRoutes(router) {
  // Get all reviews (admin)
  router.get('/api/reviews', async (req, env, url) => {
    return getReviews(env);
  });

  // Get product reviews (public)
  router.get('/api/reviews/product', async (req, env, url) => {
    const productId = url.searchParams.get('productId');
    return getProductReviews(env, productId);
  });

  // Add review (public)
  router.post('/api/reviews/add', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return addReview(env, body);
  });

  // Update review (admin - approve/reject)
  router.post('/api/reviews/update', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return updateReview(env, body);
  });

  // Delete review (admin)
  router.post('/api/reviews/delete', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return deleteReview(env, body);
  });
}

export default registerReviewRoutes;
