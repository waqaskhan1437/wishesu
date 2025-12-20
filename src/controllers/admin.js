// Admin dashboard API controller
import { json } from '../utils/response.js';

/**
 * Purge Cloudflare cache
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
 */
export async function purgeCache(env) {
  const zoneId = env.CF_ZONE_ID;
  const token = env.CF_API_TOKEN;
  if (!zoneId || !token) {
    return json({ error: 'CF_ZONE_ID or CF_API_TOKEN not configured' }, 500);
  }
  try {
    const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
    const cfResp = await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ purge_everything: true })
    });
    const result = await cfResp.json();
    return json(result, cfResp.ok ? 200 : 500);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * Get Whop settings from database
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
 */
export async function getWhopSettings(env) {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
  let settings = {};
  try { if (row?.value) settings = JSON.parse(row.value); } catch(e) {}
  return json({ settings });
}

/**
 * Save Whop settings to database
 * @param {Object} env - Environment bindings
 * @param {Object} body - Settings data
 * @returns {Promise<Response>}
 */
export async function saveWhopSettings(env, body) {
  await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind('whop', JSON.stringify(body)).run();
  return json({ success: true });
}

/**
 * Export data (products, orders, reviews)
 * @param {Object} env - Environment bindings
 * @param {string} type - Export type ('products', 'orders', 'reviews', 'all')
 * @returns {Promise<Response>}
 */
export async function exportData(env, type) {
  try {
    let data = {};
    
    switch (type) {
      case 'products':
        const products = await env.DB.prepare('SELECT * FROM products ORDER BY id DESC').all();
        data.products = products.results || [];
        break;
        
      case 'orders':
        const orders = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
        data.orders = orders.results || [];
        break;
        
      case 'reviews':
        const reviews = await env.DB.prepare('SELECT * FROM reviews ORDER BY id DESC').all();
        data.reviews = reviews.results || [];
        break;
        
      case 'all':
      default:
        const allProducts = await env.DB.prepare('SELECT * FROM products ORDER BY id DESC').all();
        const allOrders = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
        const allReviews = await env.DB.prepare('SELECT * FROM reviews ORDER BY id DESC').all();
        const allPages = await env.DB.prepare('SELECT * FROM pages ORDER BY id DESC').all();
        const allSettings = await env.DB.prepare('SELECT * FROM settings ORDER BY key').all();
        
        data = {
          products: allProducts.results || [],
          orders: allOrders.results || [],
          reviews: allReviews.results || [],
          pages: allPages.results || [],
          settings: allSettings.results || [],
          exported_at: new Date().toISOString(),
          version: '1.0'
        };
        break;
    }
    
    // Add metadata
    data.exported_at = new Date().toISOString();
    data.export_type = type;
    data.total_records = Object.keys(data).reduce((sum, key) => {
      if (key !== 'exported_at' && key !== 'export_type' && key !== 'total_records' && key !== 'version') {
        return sum + (Array.isArray(data[key]) ? data[key].length : 0);
      }
      return sum;
    }, 0);
    
    return json(data);
  } catch (e) {
    console.error('Export error:', e);
    return json({ error: 'Export failed: ' + e.message }, 500);
  }
}

/**
 * Import data (products, orders, reviews)
 * @param {Object} env - Environment bindings
 * @param {Object} importData - Import data
 * @returns {Promise<Response>}
 */
export async function importData(env, importData) {
  try {
    const results = {
      products: { imported: 0, errors: [] },
      orders: { imported: 0, errors: [] },
      reviews: { imported: 0, errors: [] },
      pages: { imported: 0, errors: [] },
      settings: { imported: 0, errors: [] }
    };
    
    // Import products
    if (importData.products && Array.isArray(importData.products)) {
      for (const product of importData.products) {
        try {
          // Remove ID for new insertion, or update if ID exists
          if (product.id) {
            const existing = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(product.id).first();
            if (existing) {
              // Update existing product
              await env.DB.prepare(`
                UPDATE products SET title=?, slug=?, description=?, normal_price=?, sale_price=?,
                instant_delivery=?, normal_delivery_text=?, thumbnail_url=?, video_url=?,
                gallery_images=?, addons_json=?, seo_title=?, seo_description=?, seo_keywords=?, seo_canonical=?,
                whop_plan=?, whop_price_map=?, whop_product_id=?, status=?, sort_order=? WHERE id=?
              `).bind(
                product.title || '', product.slug || '', product.description || '',
                product.normal_price || 0, product.sale_price || null,
                product.instant_delivery || 0, product.normal_delivery_text || '',
                product.thumbnail_url || '', product.video_url || '',
                product.gallery_images || '[]', product.addons_json || '[]',
                product.seo_title || '', product.seo_description || '', product.seo_keywords || '', product.seo_canonical || '',
                product.whop_plan || '', product.whop_price_map || '', product.whop_product_id || '',
                product.status || 'active', product.sort_order || 0, product.id
              ).run();
              results.products.imported++;
              continue;
            }
          }
          
          // Insert new product (without ID to avoid conflicts)
          await env.DB.prepare(`
            INSERT INTO products (title, slug, description, normal_price, sale_price,
            instant_delivery, normal_delivery_text, thumbnail_url, video_url,
            gallery_images, addons_json, seo_title, seo_description, seo_keywords, seo_canonical,
            whop_plan, whop_price_map, whop_product_id, status, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            product.title || '', product.slug || '', product.description || '',
            product.normal_price || 0, product.sale_price || null,
            product.instant_delivery || 0, product.normal_delivery_text || '',
            product.thumbnail_url || '', product.video_url || '',
            product.gallery_images || '[]', product.addons_json || '[]',
            product.seo_title || '', product.seo_description || '', product.seo_keywords || '', product.seo_canonical || '',
            product.whop_plan || '', product.whop_price_map || '', product.whop_product_id || '',
            product.status || 'active', product.sort_order || 0
          ).run();
          results.products.imported++;
        } catch (e) {
          results.products.errors.push(`Product "${product.title || 'Unknown'}": ${e.message}`);
        }
      }
    }
    
    // Import orders
    if (importData.orders && Array.isArray(importData.orders)) {
      for (const order of importData.orders) {
        try {
          // Check if order already exists by order_id
          const existing = await env.DB.prepare('SELECT id FROM orders WHERE order_id = ?').bind(order.order_id).first();
          if (existing) continue; // Skip existing orders
          
          await env.DB.prepare(`
            INSERT INTO orders (order_id, product_id, encrypted_data, iv, archive_url, archive_data,
            status, created_at, delivered_video_url, delivered_thumbnail_url, delivered_video_metadata,
            portfolio_enabled, delivered_at, delivery_time_minutes, revision_count, revision_requested)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            order.order_id, order.product_id || null, order.encrypted_data || '{}', order.iv || null,
            order.archive_url || null, order.archive_data || null, order.status || 'pending',
            order.created_at || new Date().toISOString(), order.delivered_video_url || null,
            order.delivered_thumbnail_url || null, order.delivered_video_metadata || null,
            order.portfolio_enabled || 1, order.delivered_at || null, order.delivery_time_minutes || 60,
            order.revision_count || 0, order.revision_requested || 0
          ).run();
          results.orders.imported++;
        } catch (e) {
          results.orders.errors.push(`Order "${order.order_id || 'Unknown'}": ${e.message}`);
        }
      }
    }
    
    // Import reviews
    if (importData.reviews && Array.isArray(importData.reviews)) {
      for (const review of importData.reviews) {
        try {
          await env.DB.prepare(`
            INSERT INTO reviews (product_id, author_name, rating, comment, status, created_at,
            order_id, show_on_product, delivered_video_url, delivered_thumbnail_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            review.product_id, review.author_name || 'Customer', review.rating || 5,
            review.comment || '', review.status || 'approved', review.created_at || new Date().toISOString(),
            review.order_id || null, review.show_on_product !== undefined ? review.show_on_product : 1,
            review.delivered_video_url || null, review.delivered_thumbnail_url || null
          ).run();
          results.reviews.imported++;
        } catch (e) {
          results.reviews.errors.push(`Review for product ${review.product_id || 'Unknown'}: ${e.message}`);
        }
      }
    }
    
    // Import pages
    if (importData.pages && Array.isArray(importData.pages)) {
      for (const page of importData.pages) {
        try {
          // Check if page already exists by slug
          const existing = await env.DB.prepare('SELECT id FROM pages WHERE slug = ?').bind(page.slug).first();
          if (existing) {
            // Update existing page
            await env.DB.prepare(`
              UPDATE pages SET title=?, content=?, meta_description=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
            `).bind(
              page.title || '', page.content || '', page.meta_description || '',
              page.status || 'published', existing.id
            ).run();
          } else {
            // Insert new page
            await env.DB.prepare(`
              INSERT INTO pages (slug, title, content, meta_description, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
              page.slug || '', page.title || '', page.content || '',
              page.meta_description || '', page.status || 'published',
              page.created_at || new Date().toISOString(), page.updated_at || new Date().toISOString()
            ).run();
          }
          results.pages.imported++;
        } catch (e) {
          results.pages.errors.push(`Page "${page.title || page.slug || 'Unknown'}": ${e.message}`);
        }
      }
    }
    
    // Import settings
    if (importData.settings && Array.isArray(importData.settings)) {
      for (const setting of importData.settings) {
        try {
          await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
            .bind(setting.key, setting.value || '').run();
          results.settings.imported++;
        } catch (e) {
          results.settings.errors.push(`Setting "${setting.key || 'Unknown'}": ${e.message}`);
        }
      }
    }
    
    // Calculate totals
    const totalImported = Object.values(results).reduce((sum, result) => sum + result.imported, 0);
    const totalErrors = Object.values(results).reduce((sum, result) => sum + result.errors.length, 0);
    
    return json({
      success: true,
      results,
      summary: {
        total_imported: totalImported,
        total_errors: totalErrors,
        import_time: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error('Import error:', e);
    return json({ error: 'Import failed: ' + e.message }, 500);
  }
}

/**
 * Get system statistics
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
 */
export async function getSystemStats(env) {
  try {
    const stats = {};
    
    // Product stats
    const productCount = await env.DB.prepare('SELECT COUNT(*) as count FROM products').first();
    const activeProducts = await env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE status = ?', 'active').first();
    stats.products = {
      total: productCount?.count || 0,
      active: activeProducts?.count || 0,
      draft: (productCount?.count || 0) - (activeProducts?.count || 0)
    };
    
    // Order stats
    const orderCount = await env.DB.prepare('SELECT COUNT(*) as count FROM orders').first();
    const deliveredOrders = await env.DB.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?', 'delivered').first();
    const pendingOrders = await env.DB.prepare('SELECT COUNT(*) as count FROM orders WHERE status IN (?, ?, ?)', 'pending', 'PAID', 'revision').first();
    stats.orders = {
      total: orderCount?.count || 0,
      delivered: deliveredOrders?.count || 0,
      pending: pendingOrders?.count || 0
    };
    
    // Review stats
    const reviewCount = await env.DB.prepare('SELECT COUNT(*) as count FROM reviews').first();
    const approvedReviews = await env.DB.prepare('SELECT COUNT(*) as count FROM reviews WHERE status = ?', 'approved').first();
    stats.reviews = {
      total: reviewCount?.count || 0,
      approved: approvedReviews?.count || 0,
      pending: (reviewCount?.count || 0) - (approvedReviews?.count || 0)
    };
    
    // Page stats
    const pageCount = await env.DB.prepare('SELECT COUNT(*) as count FROM pages').first();
    const publishedPages = await env.DB.prepare('SELECT COUNT(*) as count FROM pages WHERE status = ?', 'published').first();
    stats.pages = {
      total: pageCount?.count || 0,
      published: publishedPages?.count || 0,
      draft: (pageCount?.count || 0) - (publishedPages?.count || 0)
    };
    
    // Chat stats
    const sessionCount = await env.DB.prepare('SELECT COUNT(*) as count FROM chat_sessions').first();
    const messageCount = await env.DB.prepare('SELECT COUNT(*) as count FROM chat_messages').first();
    stats.chat = {
      sessions: sessionCount?.count || 0,
      messages: messageCount?.count || 0
    };
    
    // Revenue stats (basic)
    const revenueResult = await env.DB.prepare(`
      SELECT COUNT(*) as count, 
             AVG(CASE 
               WHEN json_extract(encrypted_data, '$.amount') IS NOT NULL 
               THEN json_extract(encrypted_data, '$.amount') 
               ELSE 0 
             END) as avg_amount
      FROM orders 
      WHERE status != 'pending'
    `).first();
    stats.revenue = {
      orders_processed: revenueResult?.count || 0,
      average_order_value: revenueResult?.avg_amount || 0
    };
    
    return json({ success: true, stats, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error('Stats error:', e);
    return json({ error: 'Failed to generate stats: ' + e.message }, 500);
  }
}