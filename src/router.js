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
      // Get all unique emails from orders, blog_comments, and forum
      
      // Get emails from blog_comments with counts
      const commentUsers = await env.DB.prepare(`
        SELECT 
          LOWER(email) as email,
          MAX(name) as name,
          COUNT(*) as comment_count,
          MAX(created_at) as last_activity
        FROM blog_comments
        GROUP BY LOWER(email)
      `).all();
      
      // Get emails from forum_questions
      const forumQUsers = await env.DB.prepare(`
        SELECT 
          LOWER(email) as email,
          MAX(name) as name,
          COUNT(*) as question_count,
          MAX(created_at) as last_activity
        FROM forum_questions
        GROUP BY LOWER(email)
      `).all();
      
      // Get emails from forum_replies
      const forumRUsers = await env.DB.prepare(`
        SELECT 
          LOWER(email) as email,
          MAX(name) as name,
          COUNT(*) as reply_count,
          MAX(created_at) as last_activity
        FROM forum_replies
        GROUP BY LOWER(email)
      `).all();
      
      // Get orders for email extraction
      const orders = await env.DB.prepare(`
        SELECT id, order_id, archive_data, created_at FROM orders
      `).all();
      
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
      
      // Get blog comments
      const comments = await env.DB.prepare(`
        SELECT c.*, b.title as blog_title, b.slug as blog_slug
        FROM blog_comments c
        LEFT JOIN blogs b ON c.blog_id = b.id
        WHERE LOWER(c.email) = ?
        ORDER BY c.created_at DESC
      `).bind(email).all();
      
      // Get forum questions
      const forumQuestions = await env.DB.prepare(`
        SELECT * FROM forum_questions
        WHERE LOWER(email) = ?
        ORDER BY created_at DESC
      `).bind(email).all();
      
      // Get forum replies
      const forumReplies = await env.DB.prepare(`
        SELECT r.*, q.title as question_title, q.slug as question_slug
        FROM forum_replies r
        LEFT JOIN forum_questions q ON r.question_id = q.id
        WHERE LOWER(r.email) = ?
        ORDER BY r.created_at DESC
      `).bind(email).all();
      
      // Get orders
      const allOrders = await env.DB.prepare(`
        SELECT * FROM orders ORDER BY created_at DESC
      `).all();
      
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
  // Public: Get published questions
  if (method === 'GET' && path === '/api/forum/questions') {
    return getPublishedQuestions(env, url);
  }

  // Public: Get single question with replies
  if (method === 'GET' && path.startsWith('/api/forum/question/')) {
    const slug = path.split('/').pop();
    return getQuestion(env, slug);
  }

  // Public: Check pending for user
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

  // Public: Get sidebar content
  if (method === 'GET' && path === '/api/forum/sidebar') {
    const questionId = parseInt(url.searchParams.get('question_id') || '1');
    return getForumSidebar(env, questionId);
  }

  // Admin: Get all questions
  if (method === 'GET' && path === '/api/admin/forum/questions') {
    return getAdminQuestions(env, url);
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
      const products = await env.DB.prepare('SELECT * FROM products').all();
      const pages = await env.DB.prepare('SELECT * FROM pages').all();
      const reviews = await env.DB.prepare('SELECT * FROM reviews').all();
      const orders = await env.DB.prepare('SELECT * FROM orders').all();
      const settings = await env.DB.prepare('SELECT * FROM settings').all();
      const blogs = await env.DB.prepare('SELECT * FROM blogs').all();
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
      let imported = 0;
      const now = Date.now();
      for (const b of blogs) {
        if (!b.title) continue;
        await env.DB.prepare(`
          INSERT OR REPLACE INTO blogs (id, title, slug, description, content, thumbnail_url, custom_css, custom_js, seo_title, seo_description, seo_keywords, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          b.id || null, b.title, b.slug || '', b.description || '', b.content || '',
          b.thumbnail_url || '', b.custom_css || '', b.custom_js || '',
          b.seo_title || '', b.seo_description || '', b.seo_keywords || '',
          b.status || 'draft', b.created_at || now, b.updated_at || now
        ).run();
        imported++;
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
      let imported = 0;
      for (const p of products) {
        if (!p.title) continue;
        // Handle both addons_json and addons field names for compatibility
        const addonsData = p.addons_json || p.addons || '[]';
        await env.DB.prepare(`
          INSERT OR REPLACE INTO products (id, title, slug, description, normal_price, sale_price, thumbnail_url, video_url, gallery_images, addons_json, status, sort_order, whop_plan, whop_price_map, whop_product_id, normal_delivery_text, instant_delivery, seo_title, seo_description, seo_keywords, seo_canonical)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          p.id || null, p.title, p.slug || '', p.description || '', p.normal_price || 0, p.sale_price || null,
          p.thumbnail_url || '', p.video_url || '', p.gallery_images || '[]', addonsData,
          p.status || 'active', p.sort_order || 0, p.whop_plan || '', p.whop_price_map || '', p.whop_product_id || '',
          p.normal_delivery_text || '', p.instant_delivery || 0,
          p.seo_title || '', p.seo_description || '', p.seo_keywords || '', p.seo_canonical || ''
        ).run();
        imported++;
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
      let imported = 0;
      for (const p of pages) {
        if (!p.slug && !p.name) continue;
        await env.DB.prepare(`
          INSERT OR REPLACE INTO pages (id, name, slug, content, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          p.id || null, p.name || p.slug, p.slug || p.name, p.content || '', p.status || 'active', p.created_at || Date.now()
        ).run();
        imported++;
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
      // Export all data for Google Sheets integration
      const products = await env.DB.prepare('SELECT * FROM products').all();
      const orders = await env.DB.prepare('SELECT * FROM orders').all();
      const reviews = await env.DB.prepare('SELECT * FROM reviews').all();
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
