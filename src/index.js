// Main Cloudflare Worker entry point
import { initDB } from './db/init.js';
import { json } from './utils/response.js';
import { escapeHtml, slugifyStr, canonicalProductPath, generateProductSchema, injectSchemaIntoHTML } from './utils/helpers.js';

// Import controllers
import * as productsController from './controllers/products.js';
import * as ordersController from './controllers/orders.js';
import * as reviewsController from './controllers/reviews.js';
import * as chatController from './controllers/chat.js';
import * as uploadController from './controllers/upload.js';
import * as whopController from './controllers/whop.js';
import * as adminController from './controllers/admin.js';
import * as pagesController from './controllers/pages.js';

// A build/version identifier that can be set at publish time via environment
// variables.  If none is provided Wrangler will default to the current
// timestamp.  This value is returned via the `/api/debug` endpoint and
// embedded in a custom header on all static asset responses.  Use this
// identifier to verify that new versions of your worker and static assets
// are being served.  You can set VERSION in wrangler.toml under [vars].
const VERSION = globalThis.VERSION || "15";

/**
 * Main fetch handler
 * @param {Request} request - Request object
 * @param {Object} env - Environment bindings
 * @param {Object} ctx - Context object
 * @returns {Promise<Response>}
 */
export default {
  async fetch(request, env, ctx) {
    // Initialize database
    await initDB(env);

    const url = new URL(request.url);
    const method = request.method;

    // Static assets handling
    try {
      const staticAsset = await env.ASSETS.fetch(request);
      if (!staticAsset.ok) {
        // Not a static asset, continue to API routes
        throw new Error('Not a static asset');
      }

      // Clone the response so we can modify headers
      let response = new Response(staticAsset.body, staticAsset);

      // Set cache headers for static assets
      const path = url.pathname;
      if (path.startsWith('/css/') || path.startsWith('/js/')) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (path.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        response.headers.set('Cache-Control', 'public, max-age=86400');
      }

      // Add version header
      response.headers.set('X-Worker-Version', VERSION);

      // SEO Schema injection for product pages
      if (path.startsWith('/product-')) {
        try {
          // Extract product ID from path
          const match = path.match(/\/product-(\d+)\//);
          if (match) {
            const productId = parseInt(match[1], 10);
            const contentType = response.headers.get('content-type') || '';

            // Only process HTML responses
            if (contentType.includes('text/html')) {
              const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
              
              if (product) {
                const html = await response.text();
                const schema = generateProductSchema(product);
                const modifiedHtml = injectSchemaIntoHTML(html, schema);
                
                return new Response(modifiedHtml, {
                  status: response.status,
                  headers: response.headers
                });
              }
            }
          }
        } catch (e) {
          console.error('Schema injection error:', e);
          // Return original response if injection fails
          return response;
        }
      }

      return response;
    } catch (staticError) {
      // Not a static asset, continue to API routes
    }

    // Enable CORS for all API routes
    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }});
    }

    const path = url.pathname;

    // API ROUTES

    // ----- PRODUCTS -----
    if (path === '/api/products' && method === 'GET') {
      return productsController.getProducts(env);
    }

    if (path.startsWith('/api/product/') && method === 'GET') {
      const id = path.split('/').pop();
      return productsController.getProduct(env, id);
    }

    if (path === '/api/product/save' && method === 'POST') {
      const body = await request.json();
      return productsController.saveProduct(env, body);
    }

    if (path.startsWith('/api/product/delete/') && method === 'DELETE') {
      const id = path.split('/').pop();
      return productsController.deleteProduct(env, id);
    }

    if (path.startsWith('/api/product/duplicate/') && method === 'POST') {
      const id = path.split('/').pop();
      return productsController.duplicateProduct(env, id);
    }

    if (path.startsWith('/api/product/') && method === 'PUT') {
      const id = path.split('/').pop();
      const body = await request.json();
      return productsController.updateProductStatus(env, id, body);
    }

    // ----- ORDERS -----
    if (path === '/api/orders' && method === 'GET') {
      return ordersController.getOrders(env);
    }

    if (path === '/api/order/create' && method === 'POST') {
      const body = await request.json();
      return ordersController.createOrder(env, body);
    }

    if (path.startsWith('/api/buyer-order/') && method === 'GET') {
      const orderId = path.split('/').pop();
      return ordersController.getBuyerOrder(env, orderId);
    }

    if (path.startsWith('/api/order/delete/') && method === 'DELETE') {
      const id = path.split('/').pop();
      return ordersController.deleteOrder(env, id);
    }

    if (path === '/api/order/update' && method === 'POST') {
      const body = await request.json();
      return ordersController.updateOrder(env, body);
    }

    if (path.startsWith('/api/order/delivery/') && method === 'POST') {
      const orderId = path.split('/').pop();
      const body = await request.json();
      return ordersController.updateDeliveryInfo(env, orderId, body);
    }

    // ----- REVIEWS -----
    if (path === '/api/reviews' && method === 'GET') {
      return reviewsController.getReviews(env, url);
    }

    if (path.startsWith('/api/reviews/') && method === 'GET') {
      const productId = path.split('/').pop();
      return reviewsController.getProductReviews(env, productId);
    }

    if (path === '/api/reviews/add' && method === 'POST') {
      const body = await request.json();
      return reviewsController.addReview(env, body);
    }

    if (path === '/api/reviews/update' && method === 'PUT') {
      const body = await request.json();
      return reviewsController.updateReview(env, body);
    }

    if (path === '/api/reviews/approve' && method === 'POST') {
      const body = await request.json();
      return reviewsController.approveReviews(env, body);
    }

    if (path === '/api/reviews/delete' && method === 'DELETE') {
      const body = await request.json();
      return reviewsController.deleteReviews(env, body);
    }

    // ----- CHAT -----
    if (path === '/api/chat/start' && method === 'POST') {
      const body = await request.json();
      return chatController.startChat(env, body);
    }

    if (path === '/api/chat/sync' && method === 'GET') {
      return chatController.syncChat(env, url);
    }

    if (path === '/api/chat/send' && method === 'POST') {
      const body = await request.json();
      return chatController.sendChat(env, request, body);
    }

    if (path.startsWith('/api/chat/messages/') && method === 'GET') {
      const sessionId = path.split('/').pop();
      return chatController.getChatMessages(env, sessionId);
    }

    if (path === '/api/chat/active' && method === 'GET') {
      return chatController.getActiveChats(env, url);
    }

    if (path === '/api/chat/admin/message' && method === 'POST') {
      const body = await request.json();
      return chatController.sendAdminMessage(env, body);
    }

    if (path.startsWith('/api/chat/delete/') && method === 'DELETE') {
      const sessionId = path.split('/').pop();
      return chatController.deleteChat(env, sessionId);
    }

    // ----- UPLOAD -----
    if (path === '/api/upload/temp' && method === 'POST') {
      return uploadController.uploadTempFile(env, request, url);
    }

    if (path === '/api/r2' && method === 'GET') {
      return uploadController.getR2File(env, url);
    }

    if (path === '/api/upload/customer-file' && method === 'POST') {
      return uploadController.uploadCustomerFile(env, request, url);
    }

    // ----- WHOP -----
    if (path === '/api/whop/checkout' && method === 'POST') {
      const body = await request.json();
      return whopController.createWhopCheckout(env, body, url);
    }

    if (path.startsWith('/api/whop/webhook/') && method === 'POST') {
      const secret = path.split('/').pop();
      return whopController.handleWhopWebhook(env, request, secret);
    }

    if (path === '/api/whop/test-webhook' && method === 'GET') {
      return whopController.testWebhook(env);
    }

    if (path === '/api/whop/cleanup' && method === 'POST') {
      return whopController.cleanupExpiredCheckouts(env);
    }

    if (path === '/api/whop/settings' && method === 'GET') {
      return whopController.getWhopSettings(env);
    }

    if (path === '/api/whop/settings' && method === 'POST') {
      const body = await request.json();
      return whopController.saveWhopSettings(env, body);
    }

    // ----- ADMIN -----
    if (path === '/api/admin/cache-purge' && method === 'POST') {
      return adminController.purgeCache(env);
    }

    if (path.startsWith('/api/admin/export/') && method === 'GET') {
      const type = path.split('/').pop();
      return adminController.exportData(env, type);
    }

    if (path === '/api/admin/import' && method === 'POST') {
      const body = await request.json();
      return adminController.importData(env, body);
    }

    // ----- PAGES -----
    if (path === '/api/pages' && method === 'GET') {
      return pagesController.getPages(env);
    }

    if (path.startsWith('/api/pages/') && method === 'GET') {
      const slug = path.split('/').pop();
      return pagesController.getPage(env, slug);
    }

    if (path === '/api/pages/save' && method === 'POST') {
      const body = await request.json();
      return pagesController.savePage(env, body);
    }

    if (path.startsWith('/api/pages/delete/') && method === 'DELETE') {
      const id = path.split('/').pop();
      return pagesController.deletePage(env, id);
    }

    // Page Builder APIs
    if (path === '/api/pages/save-builder' && method === 'POST') {
      const body = await request.json();
      return pagesController.savePageBuilder(env, body);
    }

    if (path === '/api/pages/list' && method === 'GET') {
      return pagesController.getPagesList(env);
    }

    if (path === '/api/pages/delete-by-name' && method === 'DELETE') {
      const body = await request.json();
      return pagesController.deletePageByName(env, body);
    }

    if (path === '/api/pages/update-status' && method === 'POST') {
      const body = await request.json();
      return pagesController.updatePageStatus(env, body);
    }

    if (path === '/api/pages/duplicate' && method === 'POST') {
      const body = await request.json();
      return pagesController.duplicatePage(env, body);
    }

    if (path.startsWith('/api/pages/load-builder/') && method === 'GET') {
      return pagesController.loadPageForBuilder(env, url);
    }

    // ----- MISC -----
    if (path === '/api/debug' && method === 'GET') {
      return json({ 
        status: 'ok', 
        version: VERSION,
        timestamp: new Date().toISOString(),
        env: {
          DB: !!env.DB,
          R2_BUCKET: !!env.R2_BUCKET,
          ASSETS: !!env.ASSETS,
          PRODUCT_MEDIA: !!env.PRODUCT_MEDIA
        }
      });
    }

    if (path === '/api/product-url' && method === 'POST') {
      const body = await request.json();
      if (!body.id) return json({ error: 'Product ID required' }, 400);
      const row = await env.DB.prepare('SELECT slug FROM products WHERE id = ?').bind(body.id).first();
      if (!row) return json({ error: 'Product not found' }, 404);
      const slug = (row.slug && row.slug.trim()) ? row.slug : slugifyStr(body.title || 'product');
      const url = canonicalProductPath({ id: body.id, slug });
      return json({ url, success: true });
    }

    // My Orders endpoint
    if (path === '/api/my-orders' && method === 'POST') {
      const body = await request.json();
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) return json({ error: 'Email required' }, 400);
      
      const candidates = await env.DB.prepare(
        'SELECT order_id, status, created_at FROM orders ORDER BY id DESC LIMIT 80'
      ).all();
      
      const orders = [];
      const target = email;
      for (const o of (candidates?.results || [])) {
        try {
          if (!o.encrypted_data) continue;
          const data = JSON.parse(o.encrypted_data);
          const e = String(data.email || '').trim().toLowerCase();
          if (e && e === target) {
            orders.push({
              order_id: o.order_id,
              status: o.status,
              created_at: o.created_at,
              trackLink: `/buyer-order.html?id=${encodeURIComponent(o.order_id)}`
            });
          }
        } catch {}
      }
      
      return json({ orders });
    }

    // 404 for unknown routes
    return json({ error: 'Not found' }, 404);
  },

  /**
   * Scheduled event handler (cron job)
   * @param {Object} env - Environment bindings
   * @param {Object} ctx - Context object
   * @param {number} schedule - Cron schedule
   * @param {string} cron - Cron expression
   */
  async scheduled(env, ctx, schedule, cron) {
    console.log('Scheduled event triggered:', cron);

    try {
      // Auto-expire pending orders older than 72 hours
      const expirationResult = await env.DB.prepare(`
        UPDATE orders 
        SET status = 'expired'
        WHERE status = 'PAID' 
        AND datetime(created_at) < datetime('now', '-72 hours')
      `).run();

      if (expirationResult.changes > 0) {
        console.log(`Auto-expired ${expirationResult.changes} pending orders older than 72 hours`);
      }

      // Clean up expired Whop checkout sessions (optional)
      if (env.WHOP_API_KEY) {
        try {
          const expiredCheckouts = await env.DB.prepare(`
            SELECT checkout_id
            FROM checkout_sessions
            WHERE status = 'pending' 
            AND datetime(expires_at) < datetime('now')
            ORDER BY created_at ASC
            LIMIT 10
          `).all();

          for (const checkout of (expiredCheckouts.results || [])) {
            try {
              const deleteResponse = await fetch(`https://api.whop.com/api/v2/checkout_sessions/${checkout.checkout_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${env.WHOP_API_KEY}` }
              });

              if (deleteResponse.ok || deleteResponse.status === 404) {
                await env.DB.prepare(`
                  UPDATE checkout_sessions 
                  SET status = 'expired', completed_at = datetime('now')
                  WHERE checkout_id = ?
                `).bind(checkout.checkout_id).run();
              }
            } catch (e) {
              console.error('Failed to cleanup checkout:', checkout.checkout_id, e);
            }
          }
        } catch (e) {
          console.error('Checkout cleanup error:', e);
        }
      }

      console.log('Scheduled cleanup completed successfully');
    } catch (e) {
      console.error('Scheduled cleanup error:', e);
    }
  }
};