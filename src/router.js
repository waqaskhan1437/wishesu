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
  getAdjacentProducts,
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
  updateArchiveLink,
  markTipPaid
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

// PayPal
import {
  createPayPalOrder,
  capturePayPalOrder,
  handlePayPalWebhook,
  getPayPalSettings,
  savePayPalSettings,
  testPayPalConnection,
  getPayPalClientId
} from './controllers/paypal.js';

// Payment Gateway
import {
  getPaymentMethods,
  getAllPaymentSettings,
  savePaymentMethodSettings,
  savePaymentMethodsEnabled,
  getPaymentMethodsStatus
} from './controllers/payment-gateway.js';

// Pages
import { 
  getPages, 
  getPagesList, 
  getPage, 
  getDefaultPage,
  setDefaultPage,
  clearDefaultPage,
  savePage, 
  savePageBuilder, 
  deletePage, 
  deletePageBySlug, 
  updatePageStatus,
  updatePageType,
  duplicatePage, 
  loadPageBuilder 
} from './controllers/pages.js';

// Blog
import {
  getBlogs,
  getBlogsList,
  getPublishedBlogs,
  getBlog,
  getPublishedBlog,
  getPreviousBlogs,
  saveBlog,
  deleteBlog,
  updateBlogStatus,
  duplicateBlog
} from './controllers/blog.js';

// Blog Comments
import {
  getBlogComments,
  checkPendingComment,
  addBlogComment,
  getAdminComments,
  updateCommentStatus,
  deleteComment,
  bulkUpdateComments
} from './controllers/blog-comments.js';

// Forum
import {
  getPublishedQuestions,
  getQuestion,
  getQuestionById,
  getQuestionReplies,
  checkPendingForum,
  submitQuestion,
  submitReply,
  getAdminQuestions,
  getAdminReplies,
  updateQuestionStatus,
  updateReplyStatus,
  deleteQuestion,
  deleteReply,
  getForumSidebar
} from './controllers/forum.js';

// Admin
import {
  getDebugInfo,
  purgeCache,
  getWhopSettings,
  saveWhopSettings,
  getR2File,
  uploadEncryptedFile,
  uploadTempFile,
  getArchiveCredentials
} from './controllers/admin.js';

// SEO (admin controls + robots/sitemap)
import {
  adminGetSeoSettings,
  adminSaveSeoSettings,
  adminListPageRules,
  adminUpsertPageRules,
  adminDeletePageRule,
  adminListProductsWithRules,
  adminPatchProductRule
} from './controllers/seo.js';

// Automation
import {
  getAutomationSettings,
  saveAutomationSettings,
  getAutomationLogs,
  clearAutomationLogs,
  testNotification,
  testWebhook,
  testEmail
} from './controllers/automation.js';

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

  // ----- FILE UPLOAD ROUTES (no DB required) -----
  if (method === 'POST' && path === '/api/upload/temp-file') {
    return uploadTempFile(env, req, url);
  }

  // Archive.org credentials for direct browser upload (Zero CPU)
  if (method === 'POST' && path === '/api/upload/archive-credentials') {
    return getArchiveCredentials(env);
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

  // ----- ADMIN SEO APIs -----
  if (method === 'GET' && path === '/api/admin/seo/settings') {
    return adminGetSeoSettings(env, req);
  }

  if (method === 'POST' && path === '/api/admin/seo/settings') {
    return adminSaveSeoSettings(env, req);
  }

  if (method === 'GET' && path === '/api/admin/seo/pages') {
    return adminListPageRules(env);
  }

  if (method === 'POST' && path === '/api/admin/seo/pages') {
    return adminUpsertPageRules(env, req);
  }

  if (method === 'DELETE' && path === '/api/admin/seo/pages') {
    return adminDeletePageRule(env, req);
  }

  if (method === 'GET' && path === '/api/admin/seo/products') {
    return adminListProductsWithRules(env, req);
  }

  if (method === 'POST' && path === '/api/admin/seo/products') {
    return adminPatchProductRule(env, req);
  }

  // ----- AUTOMATION -----
  if (method === 'GET' && path === '/api/admin/automation/settings') {
    return getAutomationSettings(env);
  }

  if (method === 'POST' && path === '/api/admin/automation/settings') {
    const body = await req.json().catch(() => ({}));
    return saveAutomationSettings(env, body);
  }

  if (method === 'GET' && path === '/api/admin/automation/logs') {
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    return getAutomationLogs(env, limit);
  }

  if (method === 'DELETE' && path === '/api/admin/automation/logs' || 
      method === 'POST' && path === '/api/admin/automation/logs/clear') {
    return clearAutomationLogs(env);
  }

  if (method === 'POST' && path === '/api/admin/automation/test') {
    const body = await req.json().catch(() => ({}));
    return testNotification(env, body);
  }

  if (method === 'POST' && path === '/api/admin/automation/test/webhook') {
    const webhookId = url.searchParams.get('id');
    return testWebhook(env, webhookId);
  }

  if (method === 'POST' && path === '/api/admin/automation/test/email') {
    const serviceId = url.searchParams.get('id');
    const testEmailAddr = url.searchParams.get('email');
    return testEmail(env, serviceId, testEmailAddr);
  }

  // ----- CACHE PURGE -----
  if (method === 'POST' && path === '/api/purge-cache') {
    return purgeCache(env);
  }

  // ----- PRODUCTS -----
  // Public products listing - cache for 60s at CDN, 30s at browser
  if (method === 'GET' && path === '/api/products') {
    const response = await getProducts(env);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=30, s-maxage=60');
    return new Response(response.body, { status: response.status, headers: newHeaders });
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
    // Check for adjacent products endpoint - cache for 60s
    if (path.match(/^\/api\/product\/(\d+)\/adjacent$/)) {
      const id = path.split('/')[3];
      const response = await getAdjacentProducts(env, id);
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Cache-Control', 'public, max-age=30, s-maxage=60');
      return new Response(response.body, { status: response.status, headers: newHeaders });
    }
    // Single product - cache for 30s
    const id = path.split('/').pop();
    const response = await getProduct(env, id);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=15, s-maxage=30');
    return new Response(response.body, { status: response.status, headers: newHeaders });
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

  // ----- PAYPAL CHECKOUT -----
  if (method === 'POST' && path === '/api/paypal/create-order') {
    const body = await req.json();
    return createPayPalOrder(env, body, url.origin);
  }

  if (method === 'POST' && path === '/api/paypal/capture-order') {
    const body = await req.json();
    return capturePayPalOrder(env, body);
  }

  if (method === 'POST' && path === '/api/paypal/webhook') {
    const body = await req.json();
    return handlePayPalWebhook(env, body, req.headers);
  }

  if (method === 'GET' && path === '/api/paypal/client-id') {
    return getPayPalClientId(env);
  }

  if (method === 'GET' && path === '/api/paypal/test') {
    return testPayPalConnection(env);
  }

  // ----- PAYMENT GATEWAY -----
  if (method === 'GET' && path === '/api/payment/methods') {
    return getPaymentMethods(env);
  }

  if (method === 'GET' && path === '/api/settings/payments') {
    return getAllPaymentSettings(env);
  }

  if (method === 'POST' && path === '/api/settings/payments') {
    const body = await req.json();
    return savePaymentMethodSettings(env, body);
  }

  if (method === 'GET' && path === '/api/settings/paypal') {
    return getPayPalSettings(env);
  }

  if (method === 'POST' && path === '/api/settings/paypal') {
    const body = await req.json();
    return savePayPalSettings(env, body);
  }

  // Payment Methods Enable/Disable
  if (method === 'GET' && path === '/api/settings/payment-methods') {
    return getPaymentMethodsStatus(env);
  }

  // ----- UNIVERSAL CUSTOM CSS -----
  if (method === 'GET' && path === '/api/settings/custom-css') {
    try {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('custom_css').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        return new Response(JSON.stringify({ success: true, settings }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60, s-maxage=300'
          }
        });
      }
      return new Response(JSON.stringify({ success: true, settings: {} }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=300'
        }
      });
    } catch (err) {
      return json({ success: true, settings: {} });
    }
  }

  if (method === 'POST' && path === '/api/settings/custom-css') {
    try {
      const body = await req.json();
      const value = JSON.stringify(body);
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind('custom_css', value).run();
      return json({ success: true, cacheCleared: true });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  // ----- UNIVERSAL CODE EDITOR -----
  if (method === 'GET' && path === '/api/settings/code-snippets') {
    try {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('code_snippets').first();
      if (row && row.value) {
        const snippets = JSON.parse(row.value);
        return json({ success: true, snippets });
      }
      return json({ success: true, snippets: [] });
    } catch (err) {
      return json({ success: true, snippets: [] });
    }
  }

  if (method === 'POST' && path === '/api/settings/code-snippets') {
    try {
      const body = await req.json();
      const value = JSON.stringify(body.snippets || []);
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind('code_snippets', value).run();
      return json({ success: true });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  // Public endpoint to get active code snippets - CACHED for performance
  if (method === 'GET' && path === '/api/public/code-snippets') {
    try {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('code_snippets').first();
      if (row && row.value) {
        const snippets = JSON.parse(row.value);
        const pageType = url.searchParams.get('page') || 'all';
        const position = url.searchParams.get('position') || 'all';
        
        // Filter active snippets for the requested page and position
        const filtered = snippets.filter(s => {
          if (!s.enabled) return false;
          if (position !== 'all' && s.position !== position) return false;
          if (s.pages.includes('all')) return true;
          if (pageType !== 'all' && s.pages.includes(pageType)) return true;
          return false;
        });
        
        return new Response(JSON.stringify({ success: true, snippets: filtered }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300, s-maxage=600',
            'CDN-Cache-Control': 'public, max-age=600'
          }
        });
      }
      return new Response(JSON.stringify({ success: true, snippets: [] }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=600'
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: true, snippets: [] }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
      });
    }
  }

  // Public endpoint to get CSS for frontend injection - CACHED for performance
  if (method === 'GET' && path === '/api/public/custom-css') {
    try {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('custom_css').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        const section = url.searchParams.get('section') || 'all';
        
        let css = '';
        if (section === 'all' || section === 'global') {
          css += settings.global || '';
        }
        if (section === 'all' || section === 'product') {
          css += '\n' + (settings.product || '');
        }
        if (section === 'all' || section === 'blog') {
          css += '\n' + (settings.blog || '');
        }
        if (section === 'all' || section === 'forum') {
          css += '\n' + (settings.forum || '');
        }
        
        return new Response(css.trim(), {
          headers: {
            'Content-Type': 'text/css',
            'Cache-Control': 'public, max-age=300, s-maxage=600',
            'CDN-Cache-Control': 'public, max-age=600'
          }
        });
      }
      return new Response('', { 
        headers: { 
          'Content-Type': 'text/css',
          'Cache-Control': 'public, max-age=300, s-maxage=600'
        } 
      });
    } catch (err) {
      return new Response('', { 
        headers: { 
          'Content-Type': 'text/css',
          'Cache-Control': 'public, max-age=60'
        } 
      });
    }
  }
  
  if (method === 'POST' && path === '/api/settings/payment-methods') {
    const body = await req.json();
    return savePaymentMethodsEnabled(env, body);
  }

  // ----- ORDERS -----
  if (method === 'GET' && path === '/api/orders') {
    return getOrders(env);
  }

  if (method === 'POST' && (path === '/api/order/create' || path === '/submit-order')) {
    const body = await req.json();
    // Only use createManualOrder if explicitly marked as manual order from admin
    // Regular checkout orders have email+productId but should use createOrder
    if (body.manualOrder === true) {
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

  if (method === 'POST' && path === '/api/order/tip-paid') {
    const body = await req.json();
    return markTipPaid(env, body);
  }

  if (method === 'POST' && path === '/api/order/upload-encrypted-file') {
    return uploadEncryptedFile(env, req, url);
  }

  // ----- REVIEWS -----
  // Public reviews - cache for 60s
  if (method === 'GET' && path === '/api/reviews') {
    const response = await getReviews(env, url);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=30, s-maxage=60');
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  if (method === 'POST' && path === '/api/reviews/add') {
    const body = await req.json();
    return addReview(env, body);
  }

  // Product reviews - cache for 60s
  if (method === 'GET' && path.startsWith('/api/reviews/')) {
    const productId = path.split('/').pop();
    const response = await getProductReviews(env, productId);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=30, s-maxage=60');
    return new Response(response.body, { status: response.status, headers: newHeaders });
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

  // Get default page by type
  if (method === 'GET' && path === '/api/pages/default') {
    const pageType = url.searchParams.get('type');
    return getDefaultPage(env, pageType);
  }

  // Set page as default
  if (method === 'POST' && path === '/api/pages/set-default') {
    const body = await req.json().catch(() => ({}));
    return setDefaultPage(env, body);
  }

  // Clear default page for type
  if (method === 'POST' && path === '/api/pages/clear-default') {
    const body = await req.json().catch(() => ({}));
    return clearDefaultPage(env, body);
  }

  // Update page type
  if (method === 'POST' && path === '/api/pages/type') {
    const body = await req.json().catch(() => ({}));
    return updatePageType(env, body);
  }

  // ----- BLOGS -----
  if (method === 'GET' && path === '/api/blogs') {
    return getBlogs(env);
  }

  if (method === 'GET' && path === '/api/blogs/list') {
    return getBlogsList(env);
  }

  if (method === 'GET' && path === '/api/blogs/published') {
    return getPublishedBlogs(env, url);
  }

  if (method === 'GET' && path.startsWith('/api/blog/previous/')) {
    const id = parseInt(path.split('/').pop());
    const limit = parseInt(url.searchParams.get('limit') || '2');
    return getPreviousBlogs(env, id, limit);
  }

  if (method === 'GET' && path.startsWith('/api/blog/public/')) {
    const slug = path.split('/').pop();
    return getPublishedBlog(env, slug);
  }

  if (method === 'GET' && path.startsWith('/api/blog/')) {
    const idOrSlug = path.split('/').pop();
    return getBlog(env, idOrSlug);
  }

  if (method === 'POST' && path === '/api/blog/save') {
    const body = await req.json();
    return saveBlog(env, body);
  }

  if (method === 'DELETE' && path === '/api/blog/delete') {
    const id = url.searchParams.get('id');
    return deleteBlog(env, id);
  }

  if (method === 'POST' && path === '/api/blogs/status') {
    const body = await req.json().catch(() => ({}));
    return updateBlogStatus(env, body);
  }

  if (method === 'POST' && path === '/api/blogs/duplicate') {
    const body = await req.json().catch(() => ({}));
    return duplicateBlog(env, body);
  }

  // ----- BLOG COMMENTS -----
  // Public: Get approved comments for a blog
  if (method === 'GET' && path.startsWith('/api/blog/comments/')) {
    const blogId = parseInt(path.split('/').pop());
    return getBlogComments(env, blogId);
  }

  // Public: Check if user has pending comment
  if (method === 'POST' && path === '/api/blog/comments/check-pending') {
    const body = await req.json().catch(() => ({}));
    return checkPendingComment(env, body.blog_id, body.email);
  }

  // Public: Add new comment
  if (method === 'POST' && path === '/api/blog/comments/add') {
    const body = await req.json();
    return addBlogComment(env, body);
  }

  // Admin: Get all comments
  if (method === 'GET' && path === '/api/admin/blog-comments') {
    return getAdminComments(env, url);
  }

  // Admin: Update comment status
  if (method === 'POST' && path === '/api/admin/blog-comments/status') {
    const body = await req.json().catch(() => ({}));
    return updateCommentStatus(env, body);
  }

  // Admin: Delete comment
  if (method === 'DELETE' && path === '/api/admin/blog-comments/delete') {
    const id = url.searchParams.get('id');
    return deleteComment(env, id);
  }

  // Admin: Bulk update comments
  if (method === 'POST' && path === '/api/admin/blog-comments/bulk') {
    const body = await req.json().catch(() => ({}));
    return bulkUpdateComments(env, body);
  }

  // ----- ADMIN USERS -----
  if (method === 'GET' && path === '/api/admin/users') {
    try {
      // Run all queries in parallel for better performance
      const [commentUsers, forumQUsers, forumRUsers, orders] = await Promise.all([
        // Get emails from blog_comments with counts
        env.DB.prepare(`
          SELECT 
            LOWER(email) as email,
            MAX(name) as name,
            COUNT(*) as comment_count,
            MAX(created_at) as last_activity
          FROM blog_comments
          GROUP BY LOWER(email)
        `).all().catch(() => ({ results: [] })),
        
        // Get emails from forum_questions
        env.DB.prepare(`
          SELECT 
            LOWER(email) as email,
            MAX(name) as name,
            COUNT(*) as question_count,
            MAX(created_at) as last_activity
          FROM forum_questions
          WHERE email IS NOT NULL AND email != ''
          GROUP BY LOWER(email)
        `).all().catch(() => ({ results: [] })),
        
        // Get emails from forum_replies
        env.DB.prepare(`
          SELECT 
            LOWER(email) as email,
            MAX(name) as name,
            COUNT(*) as reply_count,
            MAX(created_at) as last_activity
          FROM forum_replies
          WHERE email IS NOT NULL AND email != ''
          GROUP BY LOWER(email)
        `).all().catch(() => ({ results: [] })),
        
        // Get orders for email extraction
        env.DB.prepare(`
          SELECT id, order_id, encrypted_data, created_at FROM orders
        `).all().catch(() => ({ results: [] }))
      ]);
      
      // Build user map
      const userMap = new Map();
      
      // Add comment users
      for (const u of (commentUsers.results || [])) {
        if (!u.email) continue;
        const email = u.email.toLowerCase().trim();
        if (!userMap.has(email)) {
          userMap.set(email, {
            email: email,
            name: u.name || '',
            order_count: 0,
            comment_count: 0,
            forum_count: 0,
            last_activity: 0
          });
        }
        const user = userMap.get(email);
        user.comment_count = u.comment_count || 0;
        user.name = user.name || u.name || '';
        if (u.last_activity > user.last_activity) user.last_activity = u.last_activity;
      }
      
      // Add forum question users
      for (const u of (forumQUsers.results || [])) {
        if (!u.email) continue;
        const email = u.email.toLowerCase().trim();
        if (!userMap.has(email)) {
          userMap.set(email, {
            email: email,
            name: u.name || '',
            order_count: 0,
            comment_count: 0,
            forum_count: 0,
            last_activity: 0
          });
        }
        const user = userMap.get(email);
        user.forum_count = (user.forum_count || 0) + (u.question_count || 0);
        user.name = user.name || u.name || '';
        if (u.last_activity > user.last_activity) user.last_activity = u.last_activity;
      }
      
      // Add forum reply users
      for (const u of (forumRUsers.results || [])) {
        if (!u.email) continue;
        const email = u.email.toLowerCase().trim();
        if (!userMap.has(email)) {
          userMap.set(email, {
            email: email,
            name: u.name || '',
            order_count: 0,
            comment_count: 0,
            forum_count: 0,
            last_activity: 0
          });
        }
        const user = userMap.get(email);
        user.forum_count = (user.forum_count || 0) + (u.reply_count || 0);
        user.name = user.name || u.name || '';
        if (u.last_activity > user.last_activity) user.last_activity = u.last_activity;
      }
      
      // Extract emails from orders archive_data
      for (const o of (orders.results || [])) {
        try {
          if (o.archive_data) {
            const data = JSON.parse(o.archive_data);
            const email = (data.email || data.buyerEmail || '').toLowerCase().trim();
            const name = data.name || data.buyerName || '';
            if (email) {
              if (!userMap.has(email)) {
                userMap.set(email, {
                  email: email,
                  name: name,
                  order_count: 0,
                  comment_count: 0,
                  forum_count: 0,
                  last_activity: 0
                });
              }
              const user = userMap.get(email);
              user.order_count = (user.order_count || 0) + 1;
              user.name = user.name || name;
              const orderTime = new Date(o.created_at).getTime() || 0;
              if (orderTime > user.last_activity) user.last_activity = orderTime;
            }
          }
        } catch (e) {}
      }
      
      // Convert to array and sort
      const users = Array.from(userMap.values())
        .filter(u => u.email)
        .sort((a, b) => (b.last_activity || 0) - (a.last_activity || 0));
      
      return json({
        success: true,
        users: users,
        total: users.length
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  // Get user details (orders, comments, forum activity for specific email)
  if (method === 'GET' && path === '/api/admin/user-details') {
    try {
      const email = (url.searchParams.get('email') || '').toLowerCase().trim();
      if (!email) {
        return json({ error: 'Email required' }, 400);
      }
      
      // Run all queries in parallel for better CPU efficiency
      const [comments, forumQuestions, forumReplies, allOrders] = await Promise.all([
        // Get blog comments
        env.DB.prepare(`
          SELECT c.*, b.title as blog_title, b.slug as blog_slug
          FROM blog_comments c
          LEFT JOIN blogs b ON c.blog_id = b.id
          WHERE LOWER(c.email) = ?
          ORDER BY c.created_at DESC
        `).bind(email).all().catch(() => ({ results: [] })),
        
        // Get forum questions
        env.DB.prepare(`
          SELECT * FROM forum_questions
          WHERE LOWER(email) = ?
          ORDER BY created_at DESC
        `).bind(email).all().catch(() => ({ results: [] })),
        
        // Get forum replies
        env.DB.prepare(`
          SELECT r.*, q.title as question_title, q.slug as question_slug
          FROM forum_replies r
          LEFT JOIN forum_questions q ON r.question_id = q.id
          WHERE LOWER(r.email) = ?
          ORDER BY r.created_at DESC
        `).bind(email).all().catch(() => ({ results: [] })),
        
        // Get orders
        env.DB.prepare(`
          SELECT * FROM orders ORDER BY created_at DESC
        `).all().catch(() => ({ results: [] }))
      ]);
      
      // Filter orders by email
      const userOrders = [];
      for (const o of (allOrders.results || [])) {
        try {
          if (o.archive_data) {
            const data = JSON.parse(o.archive_data);
            const orderEmail = (data.email || data.buyerEmail || '').toLowerCase().trim();
            if (orderEmail === email) {
              userOrders.push({
                ...o,
                buyer_name: data.name || data.buyerName || '',
                buyer_email: orderEmail
              });
            }
          }
        } catch (e) {}
      }
      
      return json({
        success: true,
        email: email,
        orders: userOrders,
        comments: comments.results || [],
        forumQuestions: forumQuestions.results || [],
        forumReplies: forumReplies.results || []
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  // ----- FORUM -----
  // Public: Get published questions - cache for 60s
  if (method === 'GET' && path === '/api/forum/questions') {
    const response = await getPublishedQuestions(env, url);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=30, s-maxage=60');
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  // Public: Get single question with replies - cache for 30s
  if (method === 'GET' && path.startsWith('/api/forum/question/')) {
    const slug = path.split('/').pop();
    const response = await getQuestion(env, slug);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=15, s-maxage=30');
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  // Public: Get replies for a question by ID - cache for 30s
  if (method === 'GET' && path === '/api/forum/question-replies') {
    const questionId = parseInt(url.searchParams.get('question_id') || '0');
    const response = await getQuestionReplies(env, questionId);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=15, s-maxage=30');
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  // Public: Get question by ID - cache for 30s
  if (method === 'GET' && path === '/api/forum/question-by-id') {
    const id = url.searchParams.get('id');
    const response = await getQuestionById(env, id);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=15, s-maxage=30');
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  // Public: Check pending for user (no cache - user specific)
  if (method === 'POST' && path === '/api/forum/check-pending') {
    const body = await req.json().catch(() => ({}));
    return checkPendingForum(env, (body.email || '').toLowerCase());
  }

  // Public: Submit question
  if (method === 'POST' && path === '/api/forum/submit-question') {
    const body = await req.json();
    return submitQuestion(env, body);
  }

  // Public: Submit reply
  if (method === 'POST' && path === '/api/forum/submit-reply') {
    const body = await req.json();
    return submitReply(env, body);
  }

  // Public: Get sidebar content - cache for 5 minutes
  if (method === 'GET' && path === '/api/forum/sidebar') {
    const questionId = parseInt(url.searchParams.get('question_id') || '1');
    const response = await getForumSidebar(env, questionId);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  // Admin: Get all questions
  if (method === 'GET' && path === '/api/admin/forum/questions') {
    return getAdminQuestions(env, url);
  }

  // Admin: Migrate/fix forum tables
  if (method === 'POST' && path === '/api/admin/forum/migrate') {
    try {
      // Force recreate forum_replies table with proper schema
      let existingReplies = [];
      try {
        const result = await env.DB.prepare(`SELECT * FROM forum_replies`).all();
        existingReplies = result.results || [];
      } catch (e) { /* table might not exist */ }

      await env.DB.prepare(`DROP TABLE IF EXISTS forum_replies`).run();
      await env.DB.prepare(`
        CREATE TABLE forum_replies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id INTEGER NOT NULL DEFAULT 0,
          name TEXT NOT NULL DEFAULT '',
          email TEXT DEFAULT '',
          content TEXT NOT NULL DEFAULT '',
          status TEXT DEFAULT 'pending',
          created_at INTEGER
        )
      `).run();

      // Batch restore replies in parallel batches of 10
      let restoredReplies = 0;
      const batchSize = 10;
      for (let i = 0; i < existingReplies.length; i += batchSize) {
        const batch = existingReplies.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(r =>
          env.DB.prepare(`
            INSERT INTO forum_replies (question_id, name, email, content, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            r.question_id || 0,
            r.name || '',
            r.email || '',
            r.content || '',
            r.status || 'pending',
            r.created_at || Date.now()
          ).run()
        ));
        restoredReplies += results.filter(r => r.status === 'fulfilled').length;
      }

      // Force recreate forum_questions table
      let existingQuestions = [];
      try {
        const result = await env.DB.prepare(`SELECT * FROM forum_questions`).all();
        existingQuestions = result.results || [];
      } catch (e) { /* table might not exist */ }

      await env.DB.prepare(`DROP TABLE IF EXISTS forum_questions`).run();
      await env.DB.prepare(`
        CREATE TABLE forum_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL DEFAULT '',
          slug TEXT,
          content TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL DEFAULT '',
          email TEXT DEFAULT '',
          status TEXT DEFAULT 'pending',
          reply_count INTEGER DEFAULT 0,
          created_at INTEGER,
          updated_at INTEGER
        )
      `).run();

      // Batch restore questions in parallel batches of 10
      let restoredQuestions = 0;
      for (let i = 0; i < existingQuestions.length; i += batchSize) {
        const batch = existingQuestions.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(q =>
          env.DB.prepare(`
            INSERT INTO forum_questions (title, slug, content, name, email, status, reply_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            q.title || '',
            q.slug || '',
            q.content || '',
            q.name || '',
            q.email || '',
            q.status || 'pending',
            q.reply_count || 0,
            q.created_at || Date.now(),
            q.updated_at || Date.now()
          ).run()
        ));
        restoredQuestions += results.filter(r => r.status === 'fulfilled').length;
      }

      return json({
        success: true,
        message: 'Forum tables migrated successfully',
        restored: {
          questions: restoredQuestions,
          replies: restoredReplies
        }
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  // Admin: Get all replies
  if (method === 'GET' && path === '/api/admin/forum/replies') {
    return getAdminReplies(env, url);
  }

  // Admin: Update question status
  if (method === 'POST' && path === '/api/admin/forum/question-status') {
    const body = await req.json().catch(() => ({}));
    return updateQuestionStatus(env, body);
  }

  // Admin: Update reply status
  if (method === 'POST' && path === '/api/admin/forum/reply-status') {
    const body = await req.json().catch(() => ({}));
    return updateReplyStatus(env, body);
  }

  // Admin: Delete question
  if (method === 'DELETE' && path === '/api/admin/forum/question') {
    const id = url.searchParams.get('id');
    return deleteQuestion(env, id);
  }

  // Admin: Delete reply
  if (method === 'DELETE' && path === '/api/admin/forum/reply') {
    const id = url.searchParams.get('id');
    return deleteReply(env, id);
  }

  // ----- R2 FILE ACCESS -----
  if (method === 'GET' && path === '/api/r2/file') {
    const key = url.searchParams.get('key');
    return getR2File(env, key);
  }

  // ----- ADMIN EXPORT/IMPORT ENDPOINTS -----
  if (method === 'GET' && path === '/api/admin/export/full') {
    try {
      // Run all queries in parallel
      const [products, pages, reviews, orders, settings, blogs] = await Promise.all([
        env.DB.prepare('SELECT * FROM products').all(),
        env.DB.prepare('SELECT * FROM pages').all(),
        env.DB.prepare('SELECT * FROM reviews').all(),
        env.DB.prepare('SELECT * FROM orders').all(),
        env.DB.prepare('SELECT * FROM settings').all(),
        env.DB.prepare('SELECT * FROM blogs').all()
      ]);
      return json({
        success: true,
        data: {
          products: products.results || [],
          pages: pages.results || [],
          reviews: reviews.results || [],
          orders: orders.results || [],
          settings: settings.results || [],
          blogs: blogs.results || [],
          exportedAt: new Date().toISOString()
        }
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  if (method === 'GET' && path === '/api/admin/export/products') {
    try {
      const products = await env.DB.prepare('SELECT * FROM products').all();
      return json({ success: true, data: products.results || [] });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  if (method === 'GET' && path === '/api/admin/export/pages') {
    try {
      const pages = await env.DB.prepare('SELECT * FROM pages').all();
      return json({ success: true, data: pages.results || [] });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  if (method === 'GET' && path === '/api/admin/export/blogs') {
    try {
      const blogs = await env.DB.prepare('SELECT * FROM blogs').all();
      return json({ success: true, data: blogs.results || [] });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  if (method === 'POST' && path === '/api/admin/import/blogs') {
    try {
      const body = await req.json();
      const blogs = body.blogs || body;
      if (!Array.isArray(blogs)) {
        return json({ error: 'Invalid data format' }, 400);
      }
      
      const now = Date.now();
      const validBlogs = blogs.filter(b => b.title);
      
      // Process in batches of 10 for better performance
      const batchSize = 10;
      let imported = 0;
      
      for (let i = 0; i < validBlogs.length; i += batchSize) {
        const batch = validBlogs.slice(i, i + batchSize);
        await Promise.all(batch.map(b =>
          env.DB.prepare(`
            INSERT OR REPLACE INTO blogs (id, title, slug, description, content, thumbnail_url, custom_css, custom_js, seo_title, seo_description, seo_keywords, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            b.id || null, b.title, b.slug || '', b.description || '', b.content || '',
            b.thumbnail_url || '', b.custom_css || '', b.custom_js || '',
            b.seo_title || '', b.seo_description || '', b.seo_keywords || '',
            b.status || 'draft', b.created_at || now, b.updated_at || now
          ).run().catch(() => null)
        ));
        imported += batch.length;
      }
      
      return json({ success: true, imported });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  if (method === 'POST' && path === '/api/admin/import/products') {
    try {
      const body = await req.json();
      const products = body.products || body;
      if (!Array.isArray(products)) {
        return json({ error: 'Invalid data format' }, 400);
      }
      
      const validProducts = products.filter(p => p.title);
      
      // Process in batches of 10 for better performance
      const batchSize = 10;
      let imported = 0;
      
      for (let i = 0; i < validProducts.length; i += batchSize) {
        const batch = validProducts.slice(i, i + batchSize);
        await Promise.all(batch.map(p => {
          const addonsData = p.addons_json || p.addons || '[]';
          return env.DB.prepare(`
            INSERT OR REPLACE INTO products (id, title, slug, description, normal_price, sale_price, thumbnail_url, video_url, gallery_images, addons_json, status, sort_order, whop_plan, whop_price_map, whop_product_id, normal_delivery_text, instant_delivery, seo_title, seo_description, seo_keywords, seo_canonical)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            p.id || null, p.title, p.slug || '', p.description || '', p.normal_price || 0, p.sale_price || null,
            p.thumbnail_url || '', p.video_url || '', p.gallery_images || '[]', addonsData,
            p.status || 'active', p.sort_order || 0, p.whop_plan || '', p.whop_price_map || '', p.whop_product_id || '',
            p.normal_delivery_text || '', p.instant_delivery || 0,
            p.seo_title || '', p.seo_description || '', p.seo_keywords || '', p.seo_canonical || ''
          ).run().catch(() => null);
        }));
        imported += batch.length;
      }
      
      return json({ success: true, imported });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  if (method === 'POST' && path === '/api/admin/import/pages') {
    try {
      const body = await req.json();
      const pages = body.pages || body;
      if (!Array.isArray(pages)) {
        return json({ error: 'Invalid data format' }, 400);
      }
      
      const validPages = pages.filter(p => p.slug || p.name);
      
      // Process in batches of 10 for better performance
      const batchSize = 10;
      let imported = 0;
      
      for (let i = 0; i < validPages.length; i += batchSize) {
        const batch = validPages.slice(i, i + batchSize);
        await Promise.all(batch.map(p =>
          env.DB.prepare(`
            INSERT OR REPLACE INTO pages (id, name, slug, content, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            p.id || null, p.name || p.slug, p.slug || p.name, p.content || '', p.status || 'active', p.created_at || Date.now()
          ).run().catch(() => null)
        ));
        imported += batch.length;
      }
      
      return json({ success: true, imported });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  // ----- ADMIN MAINTENANCE ENDPOINTS -----
  if (method === 'POST' && path === '/api/admin/test-google-sync') {
    const body = await req.json().catch(() => ({}));
    const googleUrl = body.googleUrl;
    if (!googleUrl) {
      return json({ error: 'Google Web App URL required' }, 400);
    }
    try {
      // Test by sending a simple ping to the Google Apps Script
      const testRes = await fetch(googleUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping', timestamp: Date.now() })
      });
      if (testRes.ok) {
        return json({ success: true, message: 'Google Sync test successful' });
      } else {
        return json({ error: 'Google Apps Script returned error: ' + testRes.status });
      }
    } catch (err) {
      return json({ error: 'Failed to connect: ' + err.message });
    }
  }

  if (method === 'POST' && path === '/api/admin/clear-temp-files') {
    try {
      if (!env.R2_BUCKET) {
        return json({ success: true, count: 0, message: 'R2 not configured' });
      }
      // List and delete temp files (files starting with 'temp/')
      const listed = await env.R2_BUCKET.list({ prefix: 'temp/', limit: 100 });
      let count = 0;
      for (const obj of listed.objects || []) {
        await env.R2_BUCKET.delete(obj.key);
        count++;
      }
      return json({ success: true, count });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  if (method === 'POST' && path === '/api/admin/clear-pending-checkouts') {
    try {
      // Delete pending checkouts older than 24 hours
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      const result = await env.DB.prepare(
        'DELETE FROM pending_checkouts WHERE created_at < ?'
      ).bind(cutoff).run();
      return json({ success: true, count: result.changes || 0 });
    } catch (err) {
      // Table might not exist, that's okay
      return json({ success: true, count: 0, message: 'No pending checkouts table or already empty' });
    }
  }

  if (method === 'GET' && path === '/api/admin/export-data') {
    try {
      // Export all data for Google Sheets integration - run in parallel
      const [products, orders, reviews] = await Promise.all([
        env.DB.prepare('SELECT * FROM products').all(),
        env.DB.prepare('SELECT * FROM orders').all(),
        env.DB.prepare('SELECT * FROM reviews').all()
      ]);
      return json({
        success: true,
        data: {
          products: products.results || [],
          orders: orders.results || [],
          reviews: reviews.results || []
        }
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  // API endpoint not found
  return json({ error: 'API endpoint not found', path, method }, 404);
}
