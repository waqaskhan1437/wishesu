import { list, get, create, updateStatus, deliver } from './controller.js';

export async function orderRouter(req, env, url, path, method) {
  if (method === 'GET' && path === '/api/orders') {
    return list(req, env);
  }

  if (method === 'GET' && path.startsWith('/api/order/')) {
    const id = path.split('/').pop();
    return get(req, env, id);
  }

  if (method === 'POST' && path === '/api/order/create') {
    return create(req, env);
  }

  if (method === 'POST' && path === '/api/order/update-status') {
    return updateStatus(req, env);
  }

  if (method === 'POST' && path === '/api/order/deliver') {
    return deliver(req, env);
  }

  return null;
}
