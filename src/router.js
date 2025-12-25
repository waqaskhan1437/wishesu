/**
 * Router - Central API Router
 * Routes requests to appropriate module controllers
 */

import { json } from './core/utils/response.js';
import { initDB } from './core/config/db.js';

// ==========================================
// MODULE IMPORTS
// ==========================================

// Products Module
import {
  getProducts,
  getProductsList,
  getProduct,
  saveProduct,
  deleteProduct,
  updateProductStatus,
  duplicateProduct
} from './modules/products/backend/controllers/products.controller.js';

// Orders Module
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
} from './modules/orders/backend/controllers/orders.controller.js';

// Reviews Module
import {
  getReviews,
  getProductReviews,
  addReview,
  updateReview,
  deleteReview
} from './modules/reviews/backend/controllers/reviews.controller.js';

// Chat Module
import {
  startChat,
  syncChat,
  sendMessage,
  blockSession,
  deleteSession,
  getSessions
} from './modules/chat/backend/controllers/chat.js';

// Whop Module
import {
  createCheckout,
  createPlanCheckout,
  handleWebhook,
  testApi as testWhopApi,
  testWebhook as testWhopWebhook,
  cleanupExpired
} from './modules/whop/backend/controllers/index.js';

// Page Builder Module
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
} from './modules/admin/backend/controllers/index.js';

// Admin Module
import {
  purgeCache,
  getWhopSettings,
  saveWhopSettings,
  getAnalyticsSettings,
  saveAnalyticsSettings,
  getControlWebhookSettings,
  saveControlWebhookSettings,
  getDefaultPages,
  saveDefaultPages,
  getR2File,
  uploadEncryptedFile,
  uploadTempFile,
  getArchiveCredentials,
  listUsers,
  updateUserBlocks,
  resetData,
  exportFull,
  exportProducts,
  exportPages,
  exportForGoogleSheets,
  importProducts,
  importPages,
  testGoogleSync,
  clearTempFiles,
  clearPendingCheckouts
} from './modules/admin/backend/controllers/index.js';

// Blog Module
import {
  listBlogPosts,
  getBlogPost,
  saveBlogPost,
  deleteBlogPost,
  setBlogStatus,
  submitBlogPost
} from './modules/blog/backend/controllers/index.js';

// Forum Module
import {
  submitForumTopic,
  submitForumReply,
  listForumTopics,
  listForumReplies,
  setForumTopicStatus,
  setForumReplyStatus,
  updateForumTopic,
  updateForumReply,
  deleteForumTopic,
  deleteForumReply
} from './modules/forum/backend/controllers/index.js';

// Control Webhook
import { handleControlWebhook } from './modules/admin/backend/controllers/index.js';

/**
 * Route API requests to appropriate handlers
 */
export async function routeApiRequest(req, env, url, path, method) {
  // ----- NON-DB ROUTES -----
  if (path === '/api/health') {
    return json({ ok: true, time: Date.now() });
  }

  if (path === '/api/time') {
    return json({ serverTime: Date.now() });
  }

  if (method === 'GET' && path === '/api/whop/test-webhook') {
    return testWhopWebhook();
  }

  // ----- FILE UPLOAD ROUTES (no DB required) -----
  if (method === 'POST' && path === '/api/upload/temp-file') {
    return uploadTempFile(env, req, url);
  }

  if (method === 'POST' && path === '/api/upload/archive-credentials') {
    return getArchiveCredentials(env);
  }

  // ----- ALL OTHER API ROUTES REQUIRE DB -----
  if (!path.startsWith('/api/')) {
    return null;
  }

  if (!env.DB) {
    return json({ error: 'Database not configured' }, 500);
  }

  await initDB(env);

  // ==========================================
  // CHAT MODULE ROUTES
  // ==========================================
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

  // Admin Chat Routes
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

  // ==========================================
  // ADMIN MODULE ROUTES
  // ==========================================
  if (method === 'POST' && path === '/api/purge-cache') {
    return purgeCache(env);
  }

  // Settings Routes
  if (method === 'GET' && path === '/api/settings/default-pages') {
    return getDefaultPages(env);
  }
  if (method === 'POST' && path === '/api/settings/default-pages') {
    const body = await req.json().catch(() => ({}));
    return saveDefaultPages(env, body);
  }

  if (method === 'GET' && path === '/api/settings/analytics') {
    return getAnalyticsSettings(env);
  }
  if (method === 'POST' && path === '/api/settings/analytics') {
    const body = await req.json().catch(() => ({}));
    return saveAnalyticsSettings(env, body);
  }

  if (method === 'GET' && path === '/api/settings/control-webhook') {
    return getControlWebhookSettings(env);
  }
  if (method === 'POST' && path === '/api/settings/control-webhook') {
    const body = await req.json().catch(() => ({}));
    return saveControlWebhookSettings(env, body);
  }

  // Users Routes
  if (method === 'GET' && path === '/api/admin/users/list') {
    return listUsers(env);
  }
  if (method === 'POST' && path === '/api/admin/users/block') {
    const body = await req.json().catch(() => ({}));
    return updateUserBlocks(env, body);
  }

  // ==========================================
  // BLOG MODULE ROUTES
  // ==========================================
  if (method === 'GET' && path === '/api/blog/list') {
    return listBlogPosts(env);
  }
  if (method === 'GET' && path === '/api/blog/get') {
    const slug = url.searchParams.get('slug');
    return getBlogPost(env, slug);
  }
  if (method === 'POST' && path === '/api/blog/save') {
    const body = await req.json().catch(() => ({}));
    return saveBlogPost(env, body);
  }
  if (method === 'POST' && path === '/api/blog/status') {
    const body = await req.json().catch(() => ({}));
    return setBlogStatus(env, body);
  }
  if (method === 'DELETE' && path === '/api/blog/delete') {
    const slug = url.searchParams.get('slug');
    return deleteBlogPost(env, slug);
  }
  if (method === 'POST' && path === '/api/blog/submit') {
    let body = {};
    try { body = await req.json(); } catch (_) {}
    if (!body || Object.keys(body).length === 0) {
      try {
        const fd = await req.formData();
        body = Object.fromEntries(fd.entries());
      } catch (_) {}
    }
    return submitBlogPost(env, body);
  }

  // ==========================================
  // FORUM MODULE ROUTES
  // ==========================================
  if (method === 'POST' && path === '/api/forum/topic/submit') {
    let body = {};
    try { body = await req.json(); } catch (_) {}
    if (!body || Object.keys(body).length === 0) {
      try {
        const fd = await req.formData();
        body = Object.fromEntries(fd.entries());
      } catch (_) {}
    }
    return submitForumTopic(env, body);
  }
  if (method === 'POST' && path === '/api/forum/reply/submit') {
    let body = {};
    try { body = await req.json(); } catch (_) {}
    if (!body || Object.keys(body).length === 0) {
      try {
        const fd = await req.formData();
        body = Object.fromEntries(fd.entries());
      } catch (_) {}
    }
    return submitForumReply(env, body);
  }

  // Admin Forum Routes
  if (method === 'GET' && path === '/api/admin/forum/topics') {
    const status = url.searchParams.get('status');
    return listForumTopics(env, status);
  }
  if (method === 'GET' && path === '/api/admin/forum/replies') {
    const status = url.searchParams.get('status');
    return listForumReplies(env, status);
  }
  if (method === 'POST' && path === '/api/admin/forum/topic/status') {
    const body = await req.json().catch(() => ({}));
    return setForumTopicStatus(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/reply/status') {
    const body = await req.json().catch(() => ({}));
    return setForumReplyStatus(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/topic/update') {
    const body = await req.json().catch(() => ({}));
    return updateForumTopic(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/reply/update') {
    const body = await req.json().catch(() => ({}));
    return updateForumReply(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/topic/delete') {
    const body = await req.json().catch(() => ({}));
    return deleteForumTopic(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/reply/delete') {
    const body = await req.json().catch(() => ({}));
    return deleteForumReply(env, body);
  }

  // ==========================================
  // PRODUCTS MODULE ROUTES
  // ==========================================
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

  // ==========================================
  // WHOP MODULE ROUTES
  // ==========================================
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
    return handleWebhook(env, body, url.origin);
  }

  if (method === 'GET' && path === '/api/whop/test-api') {
    return testWhopApi(env);
  }

  if (method === 'POST' && path === '/api/whop/cleanup') {
    return cleanupExpired(env);
  }

  // ==========================================
  // ORDERS MODULE ROUTES
  // ==========================================
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

  // ==========================================
  // REVIEWS MODULE ROUTES
  // ==========================================
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

  // ==========================================
  // SETTINGS MODULE ROUTES
  // ==========================================
  if (method === 'GET' && path === '/api/settings/whop') {
    return getWhopSettings(env);
  }

  if (method === 'POST' && path === '/api/settings/whop') {
    const body = await req.json();
    return saveWhopSettings(env, body);
  }

  // ==========================================
  // PAGES MODULE ROUTES
  // ==========================================
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

  // ==========================================
  // R2 FILE ACCESS
  // ==========================================
  if (method === 'GET' && path === '/api/r2/file') {
    const key = url.searchParams.get('key');
    return getR2File(env, key);
  }

  // ==========================================
  // ADMIN EXPORT/IMPORT ROUTES
  // ==========================================
  if (method === 'GET' && path === '/api/admin/export/full') {
    return exportFull(env);
  }

  if (method === 'GET' && path === '/api/admin/export/products') {
    return exportProducts(env);
  }

  if (method === 'GET' && path === '/api/admin/export/pages') {
    return exportPages(env);
  }

  if (method === 'POST' && path === '/api/admin/import/products') {
    return importProducts(env, req);
  }

  if (method === 'POST' && path === '/api/admin/import/pages') {
    return importPages(env, req);
  }

  // ==========================================
  // ADMIN MAINTENANCE ROUTES
  // ==========================================
  if (method === 'POST' && path === '/api/admin/test-google-sync') {
    const body = await req.json().catch(() => ({}));
    return testGoogleSync(env, body);
  }

  if (method === 'POST' && path === '/api/admin/clear-temp-files') {
    return clearTempFiles(env);
  }

  if (method === 'POST' && path === '/api/admin/clear-pending-checkouts') {
    return clearPendingCheckouts(env);
  }

  if (method === 'POST' && path === '/api/admin/reset-data') {
    return resetData(env);
  }

  if (method === 'POST' && path === '/api/admin/control-webhook') {
    return handleControlWebhook(env, req);
  }

  if (method === 'GET' && path === '/api/admin/export-data') {
    return exportForGoogleSheets(env);
  }

  // API endpoint not found
  return json({ error: 'API endpoint not found', path, method }, 404);
}
