import { list, get, save, remove } from './controller.js';

export async function productRouter(req, env, url, path, method) {
  if (method === 'GET' && path === '/api/products') {
    return list(req, env);
  }

  if (method === 'GET' && path.startsWith('/api/product/')) {
    const id = path.split('/').pop();
    return get(req, env, id);
  }

  if (method === 'POST' && path === '/api/product/save') {
    return save(req, env);
  }

  if (method === 'DELETE' && path === '/api/product/delete') {
    const id = url.searchParams.get('id');
    return remove(req, env, id);
  }

  return null;
}
