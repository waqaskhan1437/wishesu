/**
 * Order API routes.
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
import { uploadEncryptedFile } from '../controllers/admin/index.js';

export async function routeOrders(req, env, url, path, method) {
  if (method === 'GET' && path === '/api/orders') {
    return getOrders(env);
  }

  if (method === 'POST' && (path === '/api/order/create' || path === '/submit-order')) {
    const body = await req.json();
    if (body.manualOrder === true) {
      return createManualOrder(env, body, url.origin);
    }
    return createOrder(env, body, url.origin);
  }

  if (method === 'GET' && path.startsWith('/api/order/buyer/')) {
    const orderId = path.split('/').pop();
    return getBuyerOrder(env, orderId);
  }

  if (method === 'DELETE' && path === '/api/order/delete') {
    const id = url.searchParams.get('id');
    return deleteOrder(env, id);
  }

  if (method === 'POST' && path === '/api/order/update') {
    const body = await req.json();
    return updateOrder(env, body);
  }

  if (method === 'POST' && path === '/api/order/deliver') {
    const body = await req.json();
    return deliverOrder(env, body);
  }

  if (method === 'POST' && path === '/api/order/revision') {
    const body = await req.json();
    return requestRevision(env, body);
  }

  if (method === 'POST' && path === '/api/order/portfolio') {
    const body = await req.json();
    return updatePortfolio(env, body);
  }

  if (method === 'POST' && path === '/api/order/archive-link') {
    const body = await req.json();
    return updateArchiveLink(env, body);
  }

  if (method === 'POST' && path === '/api/order/upload-encrypted-file') {
    return uploadEncryptedFile(env, req, url);
  }

  return null;
}
