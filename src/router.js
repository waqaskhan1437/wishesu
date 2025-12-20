/**
 * Router - Route matching logic with Zero-CPU Upload Support
 * Optimized: DB initialization performed once at top level for all /api/ routes
 */

import { json } from './utils/response.js';
import { initDB } from './config/db.js';

// Products
import { 
  getProducts, 
  getProductsList, 
  getProduct, 
  saveProduct, 
  deleteProduct, 
  updateProductStatus, 
  duplicateProduct
} from './controllers/products.js';

// Orders
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
} from './controllers/orders.js';

// Reviews
import { 
  getReviews, 
  getProductReviews, 
  addReview, 
  updateReview, 
  deleteReview 
} from './controllers/reviews.js';

// Chat
import { 
  startChat, 
  syncChat, 
  sendMessage, 
  blockSession, 
  deleteSession, 
  getSessions 
} from './controllers/chat.js';

// Whop
import { 
  createCheckout, 
  createPlanCheckout, 
  handleWebhook, 
  testApi as testWhopApi, 
  testWebhook as testWhopWebhook, 
  cleanupExpired 
} from './controllers/whop.js';

// Pages
import { 
  getPages, 
  getPagesList, 
  getPage, 
  savePage, 
  savePageBuilder, 
  deletePage, 
  deletePageBySlug, 
  updatePageStatus, 
  duplicatePage, 
  loadPageBuilder 
} from './controllers/pages.js';

// Admin
import {
  getDebugInfo,
  purgeCache,
  getWhopSettings,
  saveWhopSettings,
  getR2File,
  uploadEncryptedFile
} from './controllers/admin.js';

/**
 * Route API requests to appropriate handlers
 * @param {Request} req - Request object
 * @param {Object} env - Environment bindings
 * @param {URL} url - Parsed URL
 * @param {string} path - URL path
 * @param {string} method - HTTP method
 * @returns {Promise<Response|null>}
 */
export async function routeApiRequest(req, env, url, path, method) {
  // ----- NON-DB ROUTES (health checks, debug) -----
  if (path === '/api/health') {
    return json({ ok: true, time: Date.now() });
  }

  if (path === '/api/time') {
    return json({ serverTime: Date.now() });
  }

  if (path === '/api/debug') {
    return getDebugInfo(env);
  }

  if (method === 'GET' && path === '/api/whop/test-webhook') {
    return testWhopWebhook();
  }

  // ----- ALL OTHER API ROUTES REQUIRE DB -----
  // Consolidated DB check - performed once for all routes below
  if (!path.startsWith('/api/')) {
    return null;
  }

  if (!env.DB) {
    return json({ error: 'Database not configured' }, 500);
  }
  
  // Initialize DB once for all subsequent routes (optimization)
  await initDB(env);

  // ----- CHAT APIs -----
  if (path === '/api/chat/start' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    return startChat(env, body);
  }

  if (path === '/api/chat/sync' && method === 'GET') {
    return syncChat(env, url);
  }

  if (path === '/api/chat/send' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    return sendMessage(env, body, req.url);
  }

  // ----- ADMIN CHAT APIs -----
  if (path === '/api/admin/chats/block' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    return blockSession(env, body);
  }

  if (path === '/api/admin/chats/delete' && method === 'DELETE') {
    let sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      const body = await req.json().catch(() => ({}));
      sessionId = String(body.sessionId || '').trim();
    }
    return deleteSession(env, sessionId);
  }

  if (path === '/api/admin/chats/sessions' && method === 'GET') {
    return getSessions(env);
  }

  // ----- CACHE PURGE -----
  if (method === 'POST' && path === '/api/purge-cache') {
    return purgeCache(env);
  }

  // ----- PRODUCTS -----
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

  // ----- WHOP CHECKOUT -----
  if (method === 'POST' && path === '/api/whop/create-checkout') {
    const body = await req.json();
    return createCheckout(env, body, url.origin);
  }

  if (method === 'POST' && path === '/api/whop/create-plan-checkout') {
    const body = await req.json();
    return createPlanCheckout(env, body, url.origin);
  }

  if (method === 'POST' && path === '/api/whop/webhook') {
    const body = await req.json();
    return handleWebhook(env, body);
  }

  if (method === 'GET' && path === '/api/whop/test-api') {
    return testWhopApi(env);
  }

  if (method === 'POST' && path === '/api/whop/cleanup') {
    return cleanupExpired(env);
  }

  // ----- ORDERS -----
  if (method === 'GET' && path === '/api/orders') {
    return getOrders(env);
  }

  if (method === 'POST' && (path === '/api/order/create' || path === '/submit-order')) {
    const body = await req.json();
    // Check if this is a manual order (has email) or regular order
    if (body.email && body.productId) {
      return createManualOrder(env, body);
    }
    return createOrder(env, body);
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

  // ----- REVIEWS -----
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

  // ----- SETTINGS -----
  if (method === 'GET' && path === '/api/settings/whop') {
    return getWhopSettings(env);
  }

  if (method === 'POST' && path === '/api/settings/whop') {
    const body = await req.json();
    return saveWhopSettings(env, body);
  }

  // ----- PAGES -----
  if (method === 'GET' && path === '/api/pages') {
    return getPages(env);
  }

  if (method === 'GET' && path === '/api/pages/list') {
    return getPagesList(env);
  }

  if (method === 'GET' && path.startsWith('/api/page/')) {
    const slug = path.split('/').pop();
    return getPage(env, slug);
  }

  if (method === 'POST' && path === '/api/page/save') {
    const body = await req.json();
    return savePage(env, body);
  }

  if (method === 'DELETE' && path === '/api/page/delete') {
    const id = url.searchParams.get('id');
    return deletePage(env, id);
  }

  if (method === 'POST' && path === '/api/pages/save') {
    const body = await req.json();
    return savePageBuilder(env, body);
  }

  if (method === 'POST' && path === '/api/pages/delete') {
    const body = await req.json().catch(() => ({}));
    return deletePageBySlug(env, body);
  }

  if (method === 'POST' && path === '/api/pages/status') {
    const body = await req.json().catch(() => ({}));
    return updatePageStatus(env, body);
  }

  if (method === 'POST' && path === '/api/pages/duplicate') {
    const body = await req.json().catch(() => ({}));
    return duplicatePage(env, body);
  }

  if (method === 'GET' && path === '/api/pages/load') {
    const name = url.searchParams.get('name');
    return loadPageBuilder(env, name);
  }

  // ----- R2 FILE ACCESS -----
  if (method === 'GET' && path === '/api/r2/file') {
    const key = url.searchParams.get('key');
    return getR2File(env, key);
  }

  // API endpoint not found
  return json({ error: 'API endpoint not found', path, method }, 404);
}
