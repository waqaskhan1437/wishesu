/**
 * Orders Routes
 * All order-related API endpoints
 */

import {
  getOrders,
  createOrder,
  createManualOrder,
  getBuyerOrder,
  deleteOrder,
  updateOrder,
  deliverOrder,
  requestRevision,
  updatePortfolio,
  updateArchiveLink
} from '../controllers/orders.js';

/**
 * Register order routes
 * @param {Function} router - Route registration function
 */
export function registerOrderRoutes(router) {
  // Get all orders (admin)
  router.get('/api/orders', async (req, env, url) => {
    return getOrders(env);
  });

  // Create order (from checkout)
  router.post('/api/order/create', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return createOrder(env, body, url.href);
  });

  // Create manual order (admin)
  router.post('/api/order/manual', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return createManualOrder(env, body);
  });

  // Get buyer order (for tracking)
  router.get('/api/order/buyer', async (req, env, url) => {
    const orderId = url.searchParams.get('orderId');
    const email = url.searchParams.get('email');
    return getBuyerOrder(env, orderId, email);
  });

  // Delete order
  router.post('/api/order/delete', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return deleteOrder(env, body);
  });

  // Update order
  router.post('/api/order/update', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return updateOrder(env, body);
  });

  // Deliver order
  router.post('/api/order/deliver', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return deliverOrder(env, body);
  });

  // Request revision
  router.post('/api/order/revision', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return requestRevision(env, body);
  });

  // Update portfolio link
  router.post('/api/order/portfolio', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return updatePortfolio(env, body);
  });

  // Update archive link
  router.post('/api/order/archive-link', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return updateArchiveLink(env, body);
  });
}

export default registerOrderRoutes;
