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
      return json({
        success: true,
        data: {
          products: products.results || [],
          pages: pages.results || [],
          reviews: reviews.results || [],
          orders: orders.results || [],
          settings: settings.results || [],
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
