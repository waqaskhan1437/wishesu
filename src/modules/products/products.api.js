/**
 * Product API routes.
 */

import {
  getProducts,
  getProductsList,
  getProduct,
  saveProduct,
  deleteProduct,
  updateProductStatus,
  duplicateProduct
} from './products.controller.js';

export async function routeProducts(req, env, url, path, method) {
  if (method === 'GET' && path === '/api/products') {
    return getProducts(env);
  }
  if (method === 'GET' && path === '/api/products/list') {
    return getProductsList(env);
  }
  if (method === 'POST' && path === '/api/products/status') {
    const body = await req.json().catch(() => ({}));
    return updateProductStatus(env, body);
  }
  if (method === 'POST' && path === '/api/products/duplicate') {
    const body = await req.json().catch(() => ({}));
    return duplicateProduct(env, body);
  }
  if (method === 'GET' && path.startsWith('/api/product/')) {
    const id = path.split('/').pop();
    return getProduct(env, id);
  }
  if (method === 'POST' && path === '/api/product/save') {
    const body = await req.json();
    return saveProduct(env, body);
  }
  if (method === 'DELETE' && path === '/api/product/delete') {
    const id = url.searchParams.get('id');
    return deleteProduct(env, id);
  }
  return null;
}
