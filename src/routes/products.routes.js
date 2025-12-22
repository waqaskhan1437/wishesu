/**
 * Products Routes
 * All product-related API endpoints
 */

import {
  getProducts,
  getProductsList,
  getProduct,
  saveProduct,
  deleteProduct,
  updateProductStatus,
  duplicateProduct
} from '../controllers/products.js';

/**
 * Register product routes
 * @param {Function} router - Route registration function
 */
export function registerProductRoutes(router) {
  // Get all products (admin)
  router.get('/api/products', async (req, env, url) => {
    return getProducts(env);
  });

  // Get products list (simplified, for dropdowns)
  router.get('/api/products/list', async (req, env, url) => {
    return getProductsList(env);
  });

  // Get single product
  router.get('/api/product', async (req, env, url) => {
    const id = url.searchParams.get('id');
    const slug = url.searchParams.get('slug');
    return getProduct(env, id, slug);
  });

  // Save product (create or update)
  router.post('/api/product/save', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return saveProduct(env, body);
  });

  // Delete product
  router.post('/api/product/delete', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return deleteProduct(env, body);
  });

  // Update product status (enable/disable)
  router.post('/api/products/status', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return updateProductStatus(env, body);
  });

  // Duplicate product
  router.post('/api/products/duplicate', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return duplicateProduct(env, body);
  });
}

export default registerProductRoutes;
