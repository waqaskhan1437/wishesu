/**
 * Dashboard Settings - Whop settings, export/import, maintenance
 */

(function(AD) {
  // Helper to download JSON
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Hard refresh page
  function hardRefresh() {
    window.location.reload(true);
  }

  AD.loadSettings = function(panel) {
    const webhookUrl = window.location.origin + '/api/whop/webhook';
    panel.innerHTML = `
    <!-- Payment Methods Control -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; color: white; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: white;">💳 Payment Methods</h3>
      <p style="color: rgba(255,255,255,0.85); margin-bottom: 20px;">Enable or disable payment methods for checkout.</p>
      
      <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <!-- PayPal Toggle -->
        <div style="flex: 1; min-width: 200px; background: rgba(255,255,255,0.15); padding: 20px; border-radius: 10px;">
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" id="payment-paypal-enabled" style="width: 22px; height: 22px; cursor: pointer; accent-color: #fbbf24;">
            <div>
              <div style="font-weight: 600; font-size: 1.1em;">🅿️ PayPal</div>
              <div style="font-size: 0.85em; color: rgba(255,255,255,0.75);">PayPal, Cards via PayPal</div>
            </div>
          </label>
        </div>
        
        <!-- Whop Toggle -->
        <div style="flex: 1; min-width: 200px; background: rgba(255,255,255,0.15); padding: 20px; border-radius: 10px;">
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" id="payment-whop-enabled" style="width: 22px; height: 22px; cursor: pointer; accent-color: #fbbf24;">
            <div>
              <div style="font-weight: 600; font-size: 1.1em;">🌐 Whop</div>
              <div style="font-size: 0.85em; color: rgba(255,255,255,0.75);">GPay, Apple Pay, Cards, Bank & more</div>
            </div>
          </label>
        </div>
      </div>
      
      <div style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 0.85em;">
        <strong>💡 Tip:</strong> If only one method is enabled, checkout will open directly without showing selection modal.
      </div>
      
      <button class="btn" id="save-payment-methods-btn" style="margin-top: 15px; background: white; color: #667eea; font-weight: 600; padding: 12px 24px;">
        Save Payment Methods
      </button>
    </div>

    <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
      <h3>🔎 SEO Settings</h3>
      <p style="color: #6b7280; margin-bottom: 15px;">Control indexing, robots.txt, sitemap.xml, and per-page / per-product noindex rules.</p>
      <div style="display:flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn btn-primary" id="open-seo-settings">Open SEO Panel</button>
        <a class="btn" href="/robots.txt" target="_blank" style="background:#6b7280;color:white;text-decoration:none;">View robots.txt</a>
        <a class="btn" href="/sitemap.xml" target="_blank" style="background:#6b7280;color:white;text-decoration:none;">View sitemap.xml</a>
      </div>
      <div style="margin-top: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <small style="color: #6b7280;">
          Tip: If you set a page or product to <strong>noindex</strong>, it stays hidden from search until you enable it again.
        </small>
      </div>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 12px;"><h3>Whop Settings</h3>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">API Key:</label>
        <input type="text" id="whop-api-key" placeholder="whop_sk_..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
        <small style="color: #6b7280;">Used for server-side API requests and membership lookups.</small>
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Webhook Secret:</label>
        <input type="text" id="whop-webhook-secret" placeholder="whop_webhook_..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
        <small style="color: #6b7280;">Secret to verify Whop webhooks.</small>
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Webhook URL:</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="whop-webhook-url" value="${webhookUrl}" readonly style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;">
          <button class="btn" id="copy-webhook-url" style="background: #6b7280; color: white;">Copy</button>
        </div>
        <small style="color: #6b7280;">Provide this URL to Whop as your webhook endpoint.</small>
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Default Plan ID:</label>
        <input type="text" id="default-plan" placeholder="plan_xxx" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Default Product ID:</label>
        <input type="text" id="default-product" placeholder="prod_xxx" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Price Map:</label>
        <textarea id="price-map" rows="5" placeholder="60|plan_60" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"></textarea>
      </div>
      <div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" id="enable-minimal-checkout" style="width: 18px; height: 18px; cursor: pointer;">
          <span style="font-weight: 600;">Enable Minimal Checkout (Apple Pay / Custom Buttons)</span>
        </label>
        <small style="color: #6b7280; display: block; margin-top: 8px; margin-left: 28px;">When enabled, shows Apple Pay and Card payment buttons instead of the standard checkout button.</small>
      </div>
      <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
        <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn" id="whop-test-api" style="background: #3b82f6; color: white;">Test API</button>
          <button class="btn" id="whop-test-webhook" style="background: #3b82f6; color: white;">Test Webhook</button>
          <span id="whop-test-status" style="font-size: 0.9rem; color: #6b7280;"></span>
        </div>
      </div>
      <div style="display:flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
        <button class="btn" style="background:#ef4444;color:white;" id="purge-cache-btn">Purge Cache</button>
      </div>
    </div>

    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>🅿️ PayPal Settings</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Enable PayPal as a payment option for your customers.</p>
      
      <div style="margin: 20px 0;">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" id="paypal-enabled" style="width: 18px; height: 18px; cursor: pointer;">
          <span style="font-weight: 600;">Enable PayPal Payments</span>
        </label>
      </div>
      
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Client ID:</label>
        <input type="text" id="paypal-client-id" placeholder="AYxxxxxxxx..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
        <small style="color: #6b7280;">From PayPal Developer Dashboard → Apps → Your App → Client ID</small>
      </div>
      
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Secret:</label>
        <input type="password" id="paypal-secret" placeholder="EKxxxxxxxx..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
        <small style="color: #6b7280;">From PayPal Developer Dashboard → Apps → Your App → Secret (leave empty to keep existing)</small>
      </div>
      
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Mode:</label>
        <select id="paypal-mode" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
          <option value="sandbox">Sandbox (Testing)</option>
          <option value="live">Live (Production)</option>
        </select>
        <small style="color: #6b7280;">Use Sandbox for testing, switch to Live when ready for real payments.</small>
      </div>
      
      <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
        <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn" id="paypal-test-btn" style="background: #0070ba; color: white;">Test PayPal Connection</button>
          <button class="btn" id="paypal-save-btn" style="background: #16a34a; color: white;">Save PayPal Settings</button>
          <span id="paypal-status" style="font-size: 0.9rem; color: #6b7280;"></span>
        </div>
      </div>
      
      <div style="margin-top: 15px; padding: 15px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; font-size: 0.9em; color: #1e40af;"><strong>Setup Guide:</strong></p>
        <ol style="margin: 10px 0 0; padding-left: 20px; font-size: 0.85em; color: #1e40af;">
          <li>Go to <a href="https://developer.paypal.com" target="_blank" style="color: #2563eb;">developer.paypal.com</a></li>
          <li>Create an App in Dashboard → Apps & Credentials</li>
          <li>Copy Client ID and Secret</li>
          <li>Add Webhook URL: <code style="background: #dbeafe; padding: 2px 6px; border-radius: 4px;">${window.location.origin}/api/paypal/webhook</code></li>
        </ol>
      </div>
    </div>

    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>Google Sheets Integration</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Connect your Google Apps Script to fetch all orders, emails, and customer data for email marketing.</p>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Google Web App URL:</label>
        <input type="text" id="google-webapp-url" placeholder="https://script.google.com/macros/s/..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
        <small style="color: #6b7280;">Your Google Apps Script deployment URL (optional, for syncing data to Google Sheets)</small>
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">API Endpoint for Google Sheets:</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" value="${window.location.origin}/api/admin/export-data" readonly style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;">
          <button class="btn" id="copy-export-url" style="background: #6b7280; color: white;">Copy</button>
        </div>
        <small style="color: #6b7280;">Use this endpoint in your Google Apps Script to fetch all D1 data</small>
      </div>
      <div style="margin: 20px 0;">
        <button class="btn" id="test-google-sync" style="background: #10b981; color: white;">Test Google Sync</button>
        <span id="google-sync-status" style="margin-left: 10px; font-size: 0.9rem; color: #6b7280;"></span>
      </div>
    </div>

    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>System Maintenance</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Manage temporary files and pending checkouts.</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
        <button class="btn" style="background: #f59e0b; color: white;" id="clear-temp-files-btn">Clear Temp Files</button>
        <button class="btn" style="background: #f59e0b; color: white;" id="clear-pending-checkouts-btn">Clear Pending Checkouts</button>
        <span id="maintenance-status" style="margin-left: 10px; font-size: 0.9rem; color: #6b7280;"></span>
      </div>
      <div style="margin-top: 15px; padding: 10px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <small style="color: #92400e;"><strong>Note:</strong> Clearing temp files removes uploaded files that haven't been attached to orders. Clearing pending checkouts removes incomplete checkout sessions.</small>
      </div>
    </div>
    
    <!-- Export/Import Section -->
    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>📦 Export / Import Data</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Backup your data or migrate to another instance.</p>
      
      <div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #667eea15, #764ba215); border-radius: 10px; border: 1px solid #667eea30;">
        <h4 style="margin: 0 0 10px; color: #667eea;">🌐 Full Website Export</h4>
        <p style="color: #6b7280; font-size: 0.9em; margin-bottom: 15px;">Export all products, pages, reviews, orders, and settings.</p>
        <button class="btn" id="export-full-btn" style="background: #667eea; color: white;">📥 Export Full Website</button>
      </div>
      
      <div style="margin-bottom: 25px; padding: 20px; background: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0;">
        <h4 style="margin: 0 0 10px; color: #16a34a;">🎥 Products</h4>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn" id="export-products-btn" style="background: #16a34a; color: white;">📥 Export Products</button>
          <label class="btn" style="background: #22c55e; color: white; cursor: pointer;">
            📤 Import Products
            <input type="file" id="import-products-file" accept=".json" style="display: none;">
          </label>
          <span id="products-import-status" style="font-size: 0.85em; color: #6b7280;"></span>
        </div>
      </div>
      
      <div style="margin-bottom: 25px; padding: 20px; background: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe;">
        <h4 style="margin: 0 0 10px; color: #2563eb;">📄 Pages</h4>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn" id="export-pages-btn" style="background: #2563eb; color: white;">📥 Export Pages</button>
          <label class="btn" style="background: #3b82f6; color: white; cursor: pointer;">
            📤 Import Pages
            <input type="file" id="import-pages-file" accept=".json" style="display: none;">
          </label>
          <span id="pages-import-status" style="font-size: 0.85em; color: #6b7280;"></span>
        </div>
      </div>
      
      <div style="margin-bottom: 25px; padding: 20px; background: #fefce8; border-radius: 10px; border: 1px solid #fef08a;">
        <h4 style="margin: 0 0 10px; color: #ca8a04;">⭐ Reviews</h4>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn" id="export-reviews-btn" style="background: #ca8a04; color: white;">📥 Export Reviews</button>
          <label class="btn" style="background: #eab308; color: white; cursor: pointer;">
            📤 Import Reviews
            <input type="file" id="import-reviews-file" accept=".json" style="display: none;">
          </label>
          <span id="reviews-import-status" style="font-size: 0.85em; color: #6b7280;"></span>
        </div>
      </div>
      
      <div style="padding: 20px; background: #fdf4ff; border-radius: 10px; border: 1px solid #f5d0fe;">
        <h4 style="margin: 0 0 10px; color: #a855f7;">📦 Orders</h4>
        <p style="color: #6b7280; font-size: 0.9em; margin-bottom: 10px;">Export only (orders contain customer data and are not importable).</p>
        <button class="btn" id="export-orders-btn" style="background: #a855f7; color: white;">📥 Export Orders</button>
      </div>
      
      <div style="margin-top: 25px; padding: 20px; background: #fef2f2; border-radius: 10px; border: 1px solid #fecaca;">
        <h4 style="margin: 0 0 10px; color: #dc2626;">⚠️ Full Website Import</h4>
        <p style="color: #6b7280; font-size: 0.9em; margin-bottom: 15px;">Import full website backup. This will add new items (won't overwrite existing).</p>
        <label class="btn" style="background: #dc2626; color: white; cursor: pointer;">
          📤 Import Full Backup
          <input type="file" id="import-full-file" accept=".json" style="display: none;">
        </label>
        <span id="full-import-status" style="margin-left: 10px; font-size: 0.85em; color: #6b7280;"></span>
      </div>
    </div>
    
    <!-- Universal Custom CSS Section -->
    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>🎨 Universal Custom CSS</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Add custom CSS to style your Product, Blog, and Forum pages. Changes apply site-wide.</p>
      
      <!-- CSS Tabs -->
      <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb;">
        <button type="button" class="css-tab active" data-tab="global" style="padding: 10px 20px; border: none; background: transparent; cursor: pointer; font-weight: 600; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px;">
          🌐 Global
        </button>
        <button type="button" class="css-tab" data-tab="product" style="padding: 10px 20px; border: none; background: transparent; cursor: pointer; font-weight: 600; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px;">
          🛍️ Product
        </button>
        <button type="button" class="css-tab" data-tab="blog" style="padding: 10px 20px; border: none; background: transparent; cursor: pointer; font-weight: 600; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px;">
          📝 Blog
        </button>
        <button type="button" class="css-tab" data-tab="forum" style="padding: 10px 20px; border: none; background: transparent; cursor: pointer; font-weight: 600; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px;">
          💬 Forum
        </button>
      </div>
      
      <!-- CSS Editors -->
      <div id="css-editor-global" class="css-editor-panel">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Global CSS <span style="font-weight: normal; color: #6b7280;">(applies to all pages)</span></label>
        <textarea id="css-global" rows="12" placeholder="/* Global CSS - applies everywhere */
:root {
  --primary-color: #4f46e5;
  --text-color: #1f2937;
}

.site-header {
  background: var(--primary-color);
}" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-family: 'Fira Code', 'Monaco', monospace; font-size: 13px; line-height: 1.5; resize: vertical;"></textarea>
      </div>
      
      <div id="css-editor-product" class="css-editor-panel" style="display: none;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Product Page CSS</label>
        <div style="margin-bottom: 10px; padding: 10px; background: #f0fdf4; border-radius: 6px; font-size: 0.85em; color: #166534;">
          <strong>Available selectors:</strong> .video-wrapper, .product-info, .price-display, .addon-item, .reviews-section, .product-description, .buy-button
        </div>
        <textarea id="css-product" rows="12" placeholder="/* Product page specific CSS */
.video-wrapper {
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}

.price-display {
  font-size: 2rem;
  color: #16a34a;
}

.addon-item {
  border: 2px solid #e5e7eb;
  padding: 15px;
}

.reviews-section {
  background: #fafafa;
  padding: 20px;
  border-radius: 12px;
}" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-family: 'Fira Code', 'Monaco', monospace; font-size: 13px; line-height: 1.5; resize: vertical;"></textarea>
      </div>
      
      <div id="css-editor-blog" class="css-editor-panel" style="display: none;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Blog Page CSS</label>
        <div style="margin-bottom: 10px; padding: 10px; background: #eff6ff; border-radius: 6px; font-size: 0.85em; color: #1e40af;">
          <strong>Available selectors:</strong> .blog-container, .blog-header, .blog-content, .blog-sidebar, .blog-card, .blog-comments, .comment-item
        </div>
        <textarea id="css-blog" rows="12" placeholder="/* Blog page specific CSS */
.blog-container {
  max-width: 900px;
  margin: 0 auto;
}

.blog-header h1 {
  font-size: 2.5rem;
  line-height: 1.3;
}

.blog-content {
  font-size: 1.1rem;
  line-height: 1.8;
}

.blog-card {
  transition: transform 0.2s;
}

.blog-card:hover {
  transform: translateY(-5px);
}" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-family: 'Fira Code', 'Monaco', monospace; font-size: 13px; line-height: 1.5; resize: vertical;"></textarea>
      </div>
      
      <div id="css-editor-forum" class="css-editor-panel" style="display: none;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Forum Page CSS</label>
        <div style="margin-bottom: 10px; padding: 10px; background: #fef3c7; border-radius: 6px; font-size: 0.85em; color: #92400e;">
          <strong>Available selectors:</strong> .forum-container, .question-card, .question-content, .reply-item, .forum-sidebar, .ask-form
        </div>
        <textarea id="css-forum" rows="12" placeholder="/* Forum page specific CSS */
.forum-container {
  background: #fafafa;
  padding: 20px;
}

.question-card {
  background: white;
  border-left: 4px solid #4f46e5;
  padding: 20px;
  margin-bottom: 15px;
}

.reply-item {
  border-bottom: 1px solid #e5e7eb;
  padding: 15px 0;
}

.ask-form textarea {
  border: 2px solid #d1d5db;
  border-radius: 8px;
}" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-family: 'Fira Code', 'Monaco', monospace; font-size: 13px; line-height: 1.5; resize: vertical;"></textarea>
      </div>
      
      <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
        <button class="btn btn-primary" id="save-custom-css-btn">💾 Save Custom CSS</button>
        <button class="btn" id="preview-css-btn" style="background: #6b7280; color: white;">👁️ Preview</button>
        <button class="btn" id="reset-css-btn" style="background: #ef4444; color: white;">🗑️ Reset All CSS</button>
        <span id="custom-css-status" style="font-size: 0.9rem; color: #6b7280;"></span>
      </div>
      
      <div style="margin-top: 15px; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <small style="color: #6b7280;">
          <strong>💡 Tips:</strong> Use CSS variables in Global for consistent theming. Product/Blog/Forum CSS only loads on those specific pages for better performance.
        </small>
      </div>
    </div>
    
    <!-- Universal Code Editor Section -->
    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>📝 Universal Code Editor</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Add custom JavaScript, HTML, or tracking codes (Google Analytics, Ads, etc.). Manage multiple snippets and control where they load.</p>
      
      <!-- Quick Add Presets -->
      <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea15, #764ba215); border-radius: 10px; border: 1px solid #667eea30;">
        <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #667eea;">⚡ Quick Add Presets</label>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn preset-btn" data-preset="gtag" style="background: #4285f4; color: white; font-size: 0.85rem; padding: 8px 12px;">
            📊 Google Analytics
          </button>
          <button type="button" class="btn preset-btn" data-preset="gads" style="background: #fbbc04; color: #1a1a1a; font-size: 0.85rem; padding: 8px 12px;">
            📢 Google Ads
          </button>
          <button type="button" class="btn preset-btn" data-preset="gtm" style="background: #246fdb; color: white; font-size: 0.85rem; padding: 8px 12px;">
            🏷️ Tag Manager
          </button>
          <button type="button" class="btn preset-btn" data-preset="fbpixel" style="background: #1877f2; color: white; font-size: 0.85rem; padding: 8px 12px;">
            📘 Facebook Pixel
          </button>
          <button type="button" class="btn preset-btn" data-preset="custom" style="background: #6b7280; color: white; font-size: 0.85rem; padding: 8px 12px;">
            ✏️ Custom Code
          </button>
        </div>
      </div>
      
      <!-- Add New Snippet Form (Hidden by default) -->
      <div id="snippet-form-container" style="display: none; margin-bottom: 25px; padding: 20px; background: #f9fafb; border-radius: 10px; border: 2px dashed #d1d5db;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h4 style="margin: 0; color: #374151;">➕ Add New Code Snippet</h4>
          <button type="button" id="close-snippet-form" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">×</button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9rem;">Snippet Name *</label>
            <input type="text" id="snippet-name" placeholder="e.g., Google Analytics" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9rem;">Code Type</label>
            <select id="snippet-type" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
              <option value="js">JavaScript</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9rem;">Load Position</label>
            <select id="snippet-position" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
              <option value="head">Head (Before </head>)</option>
              <option value="body-start">Body Start (After <body>)</option>
              <option value="body-end">Body End (Before </body>)</option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9rem;">Load On Pages</label>
            <select id="snippet-pages" multiple style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; min-height: 80px;">
              <option value="all" selected>All Pages</option>
              <option value="home">Home Page</option>
              <option value="product">Product Pages</option>
              <option value="blog">Blog Pages</option>
              <option value="forum">Forum Pages</option>
              <option value="checkout">Checkout/Order Pages</option>
            </select>
            <small style="color: #6b7280;">Hold Ctrl/Cmd to select multiple</small>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9rem;">Code *</label>
          <textarea id="snippet-code" rows="10" placeholder="Paste your code here..." style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-family: 'Fira Code', 'Monaco', monospace; font-size: 13px; line-height: 1.5; resize: vertical;"></textarea>
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button type="button" id="save-snippet-btn" class="btn btn-primary">💾 Save Snippet</button>
          <button type="button" id="cancel-snippet-btn" class="btn" style="background: #6b7280; color: white;">Cancel</button>
        </div>
        <input type="hidden" id="editing-snippet-id" value="">
      </div>
      
      <!-- Snippets List -->
      <div id="snippets-list" style="margin-bottom: 20px;">
        <div style="text-align: center; padding: 40px; color: #9ca3af;">
          <div style="font-size: 3rem; margin-bottom: 10px;">📭</div>
          <p>No code snippets yet. Click a preset above to add one.</p>
        </div>
      </div>
      
      <!-- Info Box -->
      <div style="padding: 15px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0 0 10px; font-weight: 600; color: #1e40af;">💡 Common Use Cases:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem; color: #1e40af;">
          <li><strong>Google Analytics:</strong> Track visitors, page views, conversions</li>
          <li><strong>Google Ads:</strong> Conversion tracking, remarketing tags</li>
          <li><strong>Custom JS:</strong> Page redesign, animations, custom features</li>
          <li><strong>Custom HTML:</strong> Badges, banners, widgets</li>
          <li><strong>Facebook Pixel:</strong> Track social conversions</li>
        </ul>
      </div>
    </div>`;

    loadWhopSettings();
    loadPayPalSettings();
    loadPaymentMethodsSettings();
    loadCustomCssSettings();
    loadCodeSnippets();
    document.getElementById('save-settings-btn').addEventListener('click', saveWhopSettings);
    document.getElementById('purge-cache-btn').addEventListener('click', purgeCache);
    document.getElementById('save-payment-methods-btn').addEventListener('click', savePaymentMethodsSettings);
    setupCustomCssHandlers();
    setupCodeSnippetsHandlers();

    const openSeoBtn = document.getElementById('open-seo-settings');
    if (openSeoBtn) {
      openSeoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const item = document.querySelector('.menu-item[data-view="seo"]');
        if (item) {
          item.click();
        } else if (AD.loadView) {
          AD.loadView('seo');
        }
      });
    }
    
    setupExportImportHandlers();
    setupGoogleSheetsHandlers();
    setupPayPalHandlers();
    setupMaintenanceHandlers();
    setupWhopTestHandlers();
  };

  // Load payment methods enabled status
  async function loadPaymentMethodsSettings() {
    try {
      const res = await fetch('/api/settings/payment-methods');
      const data = await res.json();
      
      const paypalCheckbox = document.getElementById('payment-paypal-enabled');
      const whopCheckbox = document.getElementById('payment-whop-enabled');
      
      if (paypalCheckbox) paypalCheckbox.checked = data.paypal_enabled !== false;
      if (whopCheckbox) whopCheckbox.checked = data.whop_enabled !== false;
      
      // Show configuration status
      updatePaymentMethodStatus('paypal', data.paypal_configured, data.paypal_enabled);
      updatePaymentMethodStatus('whop', data.whop_configured, data.whop_enabled);
      
    } catch (err) {
      console.error('Failed to load payment methods:', err);
      // Default to both enabled
      const paypalCheckbox = document.getElementById('payment-paypal-enabled');
      const whopCheckbox = document.getElementById('payment-whop-enabled');
      if (paypalCheckbox) paypalCheckbox.checked = true;
      if (whopCheckbox) whopCheckbox.checked = true;
    }
  }
  
  // Update payment method status indicator
  function updatePaymentMethodStatus(method, configured, enabled) {
    // This could show visual indicators for configured/not configured status
    // For now, just log it
    console.log(`${method}: configured=${configured}, enabled=${enabled}`);
  }

  // Save payment methods enabled status
  async function savePaymentMethodsSettings() {
    const paypalEnabled = document.getElementById('payment-paypal-enabled')?.checked || false;
    const whopEnabled = document.getElementById('payment-whop-enabled')?.checked || false;
    
    if (!paypalEnabled && !whopEnabled) {
      alert('⚠️ At least one payment method must be enabled!');
      return;
    }
    
    try {
      const res = await fetch('/api/settings/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paypal_enabled: paypalEnabled,
          whop_enabled: whopEnabled
        })
      });
      
      if (res.ok) {
        alert('✅ Payment methods saved!');
      } else {
        const err = await res.json();
        alert('❌ Failed to save: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Save payment methods error:', err);
      alert('❌ Failed to save payment methods');
    }
  }

  async function loadWhopSettings() {
    try {
      const data = await AD.apiFetch('/api/settings/whop');
      if (data.settings) {
        const apiKeyEl = document.getElementById('whop-api-key');
        const webhookSecretEl = document.getElementById('whop-webhook-secret');
        const defaultPlanEl = document.getElementById('default-plan');
        const defaultProductEl = document.getElementById('default-product');
        const priceMapEl = document.getElementById('price-map');
        const googleUrlEl = document.getElementById('google-webapp-url');

        if (apiKeyEl) apiKeyEl.value = data.settings.api_key || '';
        if (webhookSecretEl) webhookSecretEl.value = data.settings.webhook_secret || '';
        if (defaultPlanEl) defaultPlanEl.value = data.settings.default_plan || data.settings.default_plan_id || '';
        if (defaultProductEl) defaultProductEl.value = data.settings.default_product_id || '';
        if (priceMapEl) priceMapEl.value = data.settings.price_map || '';
        if (googleUrlEl) googleUrlEl.value = data.settings.google_webapp_url || '';

        const minimalCheckoutEl = document.getElementById('enable-minimal-checkout');
        if (minimalCheckoutEl) minimalCheckoutEl.checked = !!data.settings.enable_minimal_checkout;
      }
    } catch (err) { console.error('Settings error:', err); }
  }

  async function saveWhopSettings() {
    const apiKey = document.getElementById('whop-api-key') ? document.getElementById('whop-api-key').value.trim() : '';
    const webhookSecret = document.getElementById('whop-webhook-secret') ? document.getElementById('whop-webhook-secret').value.trim() : '';
    const defaultPlan = document.getElementById('default-plan').value.trim();
    const defaultProduct = document.getElementById('default-product') ? document.getElementById('default-product').value.trim() : '';
    const priceMap = document.getElementById('price-map').value.trim();
    const googleUrl = document.getElementById('google-webapp-url') ? document.getElementById('google-webapp-url').value.trim() : '';
    const enableMinimalCheckout = document.getElementById('enable-minimal-checkout') ? document.getElementById('enable-minimal-checkout').checked : false;

    try {
      const payload = {
        api_key: apiKey,
        webhook_secret: webhookSecret,
        default_plan: defaultPlan,
        price_map: priceMap,
        google_webapp_url: googleUrl,
        enable_minimal_checkout: enableMinimalCheckout
      };
      if (defaultProduct) payload.default_product_id = defaultProduct;
      const res = await fetch('/api/settings/whop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) alert('✅ Settings saved!');
      else alert('❌ Failed to save');
    } catch (err) { alert('Error: ' + err.message); }
  }

  async function purgeCache() {
    if (!confirm('This will purge the Cloudflare cache for all assets. Continue?')) return;
    try {
      const res = await fetch('/api/purge-cache', { method: 'POST' });
      const data = await res.json();
      if (data && data.success) {
        alert('✅ Cache purged successfully!');
        hardRefresh();
      } else {
        const msg = (data && data.errors && data.errors[0] && data.errors[0].message) || 'Unknown error';
        alert('❌ Failed to purge cache: ' + msg);
      }
    } catch (err) {
      alert('Error purging cache: ' + err.message);
    }
  }

  function setupWhopTestHandlers() {
    document.getElementById('copy-webhook-url').addEventListener('click', () => {
      const webhookUrlEl = document.getElementById('whop-webhook-url');
      if (webhookUrlEl && webhookUrlEl.value) {
        navigator.clipboard.writeText(webhookUrlEl.value)
          .then(() => alert('✅ Webhook URL copied to clipboard!'))
          .catch(() => alert('❌ Failed to copy URL'));
      }
    });

    document.getElementById('whop-test-api').addEventListener('click', async () => {
      const statusSpan = document.getElementById('whop-test-status');
      statusSpan.textContent = 'Testing API...';
      statusSpan.style.color = '#6b7280';
      try {
        const res = await AD.apiFetch('/api/whop/test-api');
        if (res && res.success) {
          statusSpan.textContent = '✅ API OK';
          statusSpan.style.color = '#10b981';
        } else {
          let errorMsg = 'Unknown error';
          if (res.error) {
            errorMsg = typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
          }
          statusSpan.textContent = '❌ API Error: ' + errorMsg;
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ API test failed: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });

    document.getElementById('whop-test-webhook').addEventListener('click', async () => {
      const statusSpan = document.getElementById('whop-test-status');
      statusSpan.textContent = 'Testing webhook...';
      statusSpan.style.color = '#6b7280';
      try {
        const res = await AD.apiFetch('/api/whop/test-webhook');
        if (res && res.success) {
          statusSpan.textContent = '✅ Webhook OK';
          statusSpan.style.color = '#10b981';
        } else {
          let errorMsg = 'Unknown error';
          if (res.error) {
            errorMsg = typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
          }
          statusSpan.textContent = '❌ Webhook Error: ' + errorMsg;
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ Webhook test failed: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });
  }

  function setupGoogleSheetsHandlers() {
    document.getElementById('copy-export-url').addEventListener('click', () => {
      const exportUrlEl = document.getElementById('copy-export-url').previousElementSibling;
      if (exportUrlEl && exportUrlEl.value) {
        navigator.clipboard.writeText(exportUrlEl.value)
          .then(() => alert('✅ Export URL copied to clipboard!'))
          .catch(() => alert('❌ Failed to copy URL'));
      }
    });

    document.getElementById('test-google-sync').addEventListener('click', async () => {
      const statusSpan = document.getElementById('google-sync-status');
      const googleUrl = document.getElementById('google-webapp-url').value.trim();

      if (!googleUrl) {
        statusSpan.textContent = '⚠️ Please enter Google Web App URL first';
        statusSpan.style.color = '#f59e0b';
        return;
      }

      statusSpan.textContent = 'Testing sync...';
      statusSpan.style.color = '#6b7280';

      try {
        const res = await AD.apiFetch('/api/admin/test-google-sync', {
          method: 'POST',
          body: JSON.stringify({ googleUrl })
        });

        if (res && res.success) {
          statusSpan.textContent = '✅ Sync OK - Data sent to Google Sheets';
          statusSpan.style.color = '#10b981';
        } else {
          statusSpan.textContent = '❌ Sync failed: ' + (res.error || 'Unknown error');
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ Test failed: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });
  }

  // PayPal Settings Handlers
  async function loadPayPalSettings() {
    try {
      const res = await fetch('/api/settings/paypal');
      const data = await res.json();
      if (data.settings) {
        const enabledEl = document.getElementById('paypal-enabled');
        const clientIdEl = document.getElementById('paypal-client-id');
        const modeEl = document.getElementById('paypal-mode');
        const secretEl = document.getElementById('paypal-secret');
        
        if (enabledEl) enabledEl.checked = data.settings.enabled || false;
        if (clientIdEl) clientIdEl.value = data.settings.client_id || '';
        if (modeEl) modeEl.value = data.settings.mode || 'sandbox';
        
        // Show secret status
        if (secretEl && data.settings.has_secret) {
          secretEl.placeholder = '••••••••••• (Secret saved - leave empty to keep)';
        } else if (secretEl) {
          secretEl.placeholder = 'Enter PayPal Secret (required)';
        }
      }
    } catch (err) {
      console.error('PayPal settings load error:', err);
    }
  }

  function setupPayPalHandlers() {
    document.getElementById('paypal-save-btn').addEventListener('click', async () => {
      const statusSpan = document.getElementById('paypal-status');
      statusSpan.textContent = 'Saving...';
      statusSpan.style.color = '#6b7280';
      
      const payload = {
        enabled: document.getElementById('paypal-enabled').checked,
        client_id: document.getElementById('paypal-client-id').value.trim(),
        secret: document.getElementById('paypal-secret').value.trim(),
        mode: document.getElementById('paypal-mode').value
      };
      
      console.log('Saving PayPal settings:', {
        enabled: payload.enabled,
        client_id: payload.client_id ? 'yes' : 'empty',
        secret: payload.secret ? 'yes' : 'empty',
        mode: payload.mode
      });
      
      try {
        const res = await fetch('/api/settings/paypal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.success) {
          statusSpan.textContent = '✅ PayPal settings saved!';
          statusSpan.style.color = '#16a34a';
          // Clear secret field after save (it's stored securely)
          document.getElementById('paypal-secret').value = '';
          // Reload settings to confirm
          await loadPayPalSettings();
        } else {
          statusSpan.textContent = '❌ ' + (data.error || 'Save failed');
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });

    document.getElementById('paypal-test-btn').addEventListener('click', async () => {
      const statusSpan = document.getElementById('paypal-status');
      statusSpan.textContent = 'Testing connection...';
      statusSpan.style.color = '#6b7280';
      
      try {
        const res = await fetch('/api/paypal/test');
        const data = await res.json();
        
        if (data.success) {
          statusSpan.textContent = `✅ Connected! Mode: ${data.mode}`;
          statusSpan.style.color = '#16a34a';
        } else {
          statusSpan.textContent = '❌ ' + (data.error || 'Connection failed');
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });
  }

  function setupMaintenanceHandlers() {
    document.getElementById('clear-temp-files-btn').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all temporary files? This cannot be undone.')) return;

      const statusSpan = document.getElementById('maintenance-status');
      statusSpan.textContent = 'Clearing temp files...';
      statusSpan.style.color = '#6b7280';

      try {
        const res = await AD.apiFetch('/api/admin/clear-temp-files', { method: 'POST' });

        if (res && res.success) {
          statusSpan.textContent = `✅ Cleared ${res.count || 0} temp files`;
          statusSpan.style.color = '#10b981';
        } else {
          statusSpan.textContent = '❌ Failed: ' + (res.error || 'Unknown error');
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ Error: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });

    document.getElementById('clear-pending-checkouts-btn').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all pending checkout sessions? This cannot be undone.')) return;

      const statusSpan = document.getElementById('maintenance-status');
      statusSpan.textContent = 'Clearing pending checkouts...';
      statusSpan.style.color = '#6b7280';

      try {
        const res = await AD.apiFetch('/api/admin/clear-pending-checkouts', { method: 'POST' });

        if (res && res.success) {
          statusSpan.textContent = `✅ Cleared ${res.count || 0} pending checkouts`;
          statusSpan.style.color = '#10b981';
        } else {
          statusSpan.textContent = '❌ Failed: ' + (res.error || 'Unknown error');
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ Error: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });
  }

  function setupExportImportHandlers() {
    // Export Full Website
    document.getElementById('export-full-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/full');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `website-backup-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Full website exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Export Products
    document.getElementById('export-products-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/products');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `products-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Products exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Export Pages
    document.getElementById('export-pages-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/pages');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `pages-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Pages exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Export Reviews
    document.getElementById('export-reviews-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/reviews');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `reviews-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Reviews exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Export Orders
    document.getElementById('export-orders-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/orders');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `orders-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Orders exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Import Products
    document.getElementById('import-products-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('products-import-status');
      statusEl.textContent = 'Importing...';
      statusEl.style.color = '#6b7280';
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        const res = await fetch('/api/admin/import/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: data.products || data })
        });
        const result = await res.json();
        
        if (result.success) {
          statusEl.textContent = `✅ Imported ${result.count || 0} products`;
          statusEl.style.color = '#16a34a';
        } else {
          statusEl.textContent = '❌ ' + (result.error || 'Import failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
      e.target.value = '';
    });

    // Import Pages
    document.getElementById('import-pages-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('pages-import-status');
      statusEl.textContent = 'Importing...';
      statusEl.style.color = '#6b7280';
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        const res = await fetch('/api/admin/import/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages: data.pages || data })
        });
        const result = await res.json();
        
        if (result.success) {
          statusEl.textContent = `✅ Imported ${result.count || 0} pages`;
          statusEl.style.color = '#2563eb';
        } else {
          statusEl.textContent = '❌ ' + (result.error || 'Import failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
      e.target.value = '';
    });

    // Import Reviews
    document.getElementById('import-reviews-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('reviews-import-status');
      statusEl.textContent = 'Importing...';
      statusEl.style.color = '#6b7280';
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        const res = await fetch('/api/admin/import/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviews: data.reviews || data })
        });
        const result = await res.json();
        
        if (result.success) {
          statusEl.textContent = `✅ Imported ${result.count || 0} reviews`;
          statusEl.style.color = '#ca8a04';
        } else {
          statusEl.textContent = '❌ ' + (result.error || 'Import failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
      e.target.value = '';
    });

    // Import Full Backup
    document.getElementById('import-full-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (!confirm('This will import all data from the backup. Existing items with same IDs will be skipped. Continue?')) {
        e.target.value = '';
        return;
      }
      
      const statusEl = document.getElementById('full-import-status');
      statusEl.textContent = 'Importing...';
      statusEl.style.color = '#6b7280';
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        const res = await fetch('/api/admin/import/full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success) {
          statusEl.textContent = `✅ Imported: ${result.products || 0} products, ${result.pages || 0} pages, ${result.reviews || 0} reviews`;
          statusEl.style.color = '#16a34a';
        } else {
          statusEl.textContent = '❌ ' + (result.error || 'Import failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
      e.target.value = '';
    });
  }

  // Load Custom CSS Settings
  async function loadCustomCssSettings() {
    try {
      const res = await fetch('/api/settings/custom-css');
      const data = await res.json();
      
      if (data.success && data.settings) {
        document.getElementById('css-global').value = data.settings.global || '';
        document.getElementById('css-product').value = data.settings.product || '';
        document.getElementById('css-blog').value = data.settings.blog || '';
        document.getElementById('css-forum').value = data.settings.forum || '';
      }
    } catch (err) {
      console.error('Failed to load custom CSS settings:', err);
    }
  }

  // Setup Custom CSS Handlers
  function setupCustomCssHandlers() {
    // Tab switching
    document.querySelectorAll('.css-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active from all tabs
        document.querySelectorAll('.css-tab').forEach(t => {
          t.classList.remove('active');
          t.style.color = '#6b7280';
          t.style.borderBottomColor = 'transparent';
        });
        
        // Hide all panels
        document.querySelectorAll('.css-editor-panel').forEach(p => {
          p.style.display = 'none';
        });
        
        // Activate clicked tab
        tab.classList.add('active');
        tab.style.color = '#4f46e5';
        tab.style.borderBottomColor = '#4f46e5';
        
        // Show corresponding panel
        const tabName = tab.dataset.tab;
        document.getElementById('css-editor-' + tabName).style.display = 'block';
      });
    });
    
    // Initialize first tab as active
    const firstTab = document.querySelector('.css-tab');
    if (firstTab) {
      firstTab.style.color = '#4f46e5';
      firstTab.style.borderBottomColor = '#4f46e5';
    }
    
    // Save Custom CSS
    document.getElementById('save-custom-css-btn').addEventListener('click', async () => {
      const statusEl = document.getElementById('custom-css-status');
      statusEl.textContent = 'Saving...';
      statusEl.style.color = '#6b7280';
      
      const cssData = {
        global: document.getElementById('css-global').value,
        product: document.getElementById('css-product').value,
        blog: document.getElementById('css-blog').value,
        forum: document.getElementById('css-forum').value
      };
      
      try {
        const res = await fetch('/api/settings/custom-css', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cssData)
        });
        const data = await res.json();
        
        if (data.success) {
          // Clear frontend cache so changes take effect immediately
          try {
            localStorage.removeItem('wishesu_custom_css');
          } catch(e) {}
          
          statusEl.textContent = '✅ CSS saved successfully!';
          statusEl.style.color = '#16a34a';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        } else {
          statusEl.textContent = '❌ ' + (data.error || 'Save failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
    });
    
    // Preview CSS
    document.getElementById('preview-css-btn').addEventListener('click', () => {
      const globalCss = document.getElementById('css-global').value;
      const productCss = document.getElementById('css-product').value;
      const blogCss = document.getElementById('css-blog').value;
      const forumCss = document.getElementById('css-forum').value;
      
      const allCss = [globalCss, productCss, blogCss, forumCss].filter(c => c.trim()).join('\n\n');
      
      // Create preview window
      const previewWindow = window.open('', 'CSS Preview', 'width=800,height=600');
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>CSS Preview</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; background: #f9fafb; }
            pre { 
              background: #1f2937; 
              color: #f0f0f0; 
              padding: 20px; 
              border-radius: 8px; 
              overflow-x: auto; 
              font-size: 13px;
              line-height: 1.5;
            }
            h2 { color: #374151; margin-top: 30px; }
            .section { margin-bottom: 30px; }
            .label { 
              display: inline-block; 
              padding: 4px 12px; 
              border-radius: 4px; 
              font-size: 12px; 
              font-weight: 600; 
              margin-bottom: 10px;
            }
            .global { background: #dbeafe; color: #1e40af; }
            .product { background: #dcfce7; color: #166534; }
            .blog { background: #e0e7ff; color: #3730a3; }
            .forum { background: #fef3c7; color: #92400e; }
          </style>
        </head>
        <body>
          <h1>🎨 Custom CSS Preview</h1>
          
          ${globalCss ? `
          <div class="section">
            <span class="label global">🌐 Global CSS</span>
            <pre>${escapeHtml(globalCss)}</pre>
          </div>
          ` : ''}
          
          ${productCss ? `
          <div class="section">
            <span class="label product">🛍️ Product CSS</span>
            <pre>${escapeHtml(productCss)}</pre>
          </div>
          ` : ''}
          
          ${blogCss ? `
          <div class="section">
            <span class="label blog">📝 Blog CSS</span>
            <pre>${escapeHtml(blogCss)}</pre>
          </div>
          ` : ''}
          
          ${forumCss ? `
          <div class="section">
            <span class="label forum">💬 Forum CSS</span>
            <pre>${escapeHtml(forumCss)}</pre>
          </div>
          ` : ''}
          
          ${!allCss.trim() ? '<p style="color: #6b7280;">No custom CSS defined yet.</p>' : ''}
        </body>
        </html>
      `);
      previewWindow.document.close();
    });
    
    // Reset CSS
    document.getElementById('reset-css-btn').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to reset all custom CSS? This cannot be undone.')) {
        return;
      }
      
      const statusEl = document.getElementById('custom-css-status');
      
      document.getElementById('css-global').value = '';
      document.getElementById('css-product').value = '';
      document.getElementById('css-blog').value = '';
      document.getElementById('css-forum').value = '';
      
      try {
        const res = await fetch('/api/settings/custom-css', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ global: '', product: '', blog: '', forum: '' })
        });
        const data = await res.json();
        
        if (data.success) {
          // Clear frontend cache
          try {
            localStorage.removeItem('wishesu_custom_css');
          } catch(e) {}
          
          statusEl.textContent = '🗑️ CSS reset successfully!';
          statusEl.style.color = '#6b7280';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
    });
  }
  
  // Helper to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== UNIVERSAL CODE EDITOR ====================
  
  let codeSnippets = [];
  
  // Presets for common tracking codes
  const CODE_PRESETS = {
    gtag: {
      name: 'Google Analytics (GA4)',
      type: 'js',
      position: 'head',
      pages: ['all'],
      code: `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>`
    },
    gads: {
      name: 'Google Ads Conversion',
      type: 'js',
      position: 'head',
      pages: ['all'],
      code: `<!-- Google Ads Conversion Tracking -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-XXXXXXXXXX');
</script>

<!-- Event snippet for conversion - Add to checkout/thank you page -->
<!-- 
<script>
  gtag('event', 'conversion', {
    'send_to': 'AW-XXXXXXXXXX/XXXXXXXXXXXX',
    'value': 1.0,
    'currency': 'USD'
  });
</script>
-->`
    },
    gtm: {
      name: 'Google Tag Manager',
      type: 'html',
      position: 'head',
      pages: ['all'],
      code: `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->

<!-- Also add this right after opening <body> tag (use Body Start position) -->
<!-- 
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
-->`
    },
    fbpixel: {
      name: 'Facebook Pixel',
      type: 'js',
      position: 'head',
      pages: ['all'],
      code: `<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'XXXXXXXXXXXXXXXXX');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=XXXXXXXXXXXXXXXXX&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->`
    },
    custom: {
      name: 'Custom Code',
      type: 'js',
      position: 'body-end',
      pages: ['all'],
      code: `// Your custom JavaScript code here
// This will run on all pages

document.addEventListener('DOMContentLoaded', function() {
  // Your code here
  console.log('Custom code loaded!');
});`
    }
  };

  // Load code snippets
  async function loadCodeSnippets() {
    try {
      const res = await fetch('/api/settings/code-snippets');
      const data = await res.json();
      
      if (data.success && data.snippets) {
        codeSnippets = data.snippets;
        renderSnippetsList();
      }
    } catch (err) {
      console.error('Failed to load code snippets:', err);
    }
  }

  // Save all snippets
  async function saveAllSnippets() {
    try {
      const res = await fetch('/api/settings/code-snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snippets: codeSnippets })
      });
      const result = await res.json();
      
      // Clear frontend cache so changes take effect immediately
      if (result.success) {
        try {
          localStorage.removeItem('wishesu_code_snippets');
        } catch(e) {}
      }
      
      return result;
    } catch (err) {
      console.error('Failed to save snippets:', err);
      return { error: err.message };
    }
  }

  // Render snippets list
  function renderSnippetsList() {
    const container = document.getElementById('snippets-list');
    
    if (!codeSnippets || codeSnippets.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #9ca3af;">
          <div style="font-size: 3rem; margin-bottom: 10px;">📭</div>
          <p>No code snippets yet. Click a preset above to add one.</p>
        </div>
      `;
      return;
    }
    
    const typeColors = {
      js: { bg: '#fef3c7', color: '#92400e', icon: '⚡' },
      html: { bg: '#fee2e2', color: '#991b1b', icon: '🏷️' },
      css: { bg: '#dbeafe', color: '#1e40af', icon: '🎨' }
    };
    
    const positionLabels = {
      'head': '📍 Head',
      'body-start': '📍 Body Start',
      'body-end': '📍 Body End'
    };
    
    container.innerHTML = codeSnippets.map((snippet, index) => {
      const typeStyle = typeColors[snippet.type] || typeColors.js;
      const pages = snippet.pages.join(', ');
      
      return `
        <div class="snippet-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 12px; overflow: hidden; ${!snippet.enabled ? 'opacity: 0.6;' : ''}">
          <div style="padding: 15px; display: flex; align-items: center; gap: 15px;">
            <!-- Enable/Disable Toggle -->
            <label style="cursor: pointer; display: flex; align-items: center;">
              <input type="checkbox" class="snippet-toggle" data-index="${index}" ${snippet.enabled ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
            </label>
            
            <!-- Type Badge -->
            <span style="background: ${typeStyle.bg}; color: ${typeStyle.color}; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">
              ${typeStyle.icon} ${snippet.type.toUpperCase()}
            </span>
            
            <!-- Name -->
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 600; color: #1f2937; margin-bottom: 2px;">${escapeHtml(snippet.name)}</div>
              <div style="font-size: 0.8rem; color: #6b7280;">
                ${positionLabels[snippet.position] || snippet.position} • Pages: ${escapeHtml(pages)}
              </div>
            </div>
            
            <!-- Actions -->
            <div style="display: flex; gap: 8px;">
              <button type="button" class="snippet-edit-btn" data-index="${index}" style="background: #eff6ff; color: #2563eb; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                ✏️ Edit
              </button>
              <button type="button" class="snippet-delete-btn" data-index="${index}" style="background: #fef2f2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                🗑️
              </button>
            </div>
          </div>
          
          <!-- Code Preview (Collapsed) -->
          <div style="background: #1f2937; padding: 10px 15px; max-height: 60px; overflow: hidden; position: relative;">
            <pre style="margin: 0; color: #9ca3af; font-size: 11px; font-family: 'Fira Code', monospace; white-space: pre-wrap; word-break: break-all;">${escapeHtml(snippet.code.substring(0, 200))}${snippet.code.length > 200 ? '...' : ''}</pre>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 30px; background: linear-gradient(transparent, #1f2937);"></div>
          </div>
        </div>
      `;
    }).join('');
    
    // Attach event listeners
    attachSnippetEventListeners();
  }

  // Attach event listeners to snippet cards
  function attachSnippetEventListeners() {
    // Toggle enable/disable
    document.querySelectorAll('.snippet-toggle').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const index = parseInt(e.target.dataset.index);
        codeSnippets[index].enabled = e.target.checked;
        const result = await saveAllSnippets();
        if (result.success) {
          renderSnippetsList();
        }
      });
    });
    
    // Edit button
    document.querySelectorAll('.snippet-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        editSnippet(index);
      });
    });
    
    // Delete button
    document.querySelectorAll('.snippet-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        if (confirm('Delete this code snippet?')) {
          codeSnippets.splice(index, 1);
          const result = await saveAllSnippets();
          if (result.success) {
            renderSnippetsList();
          }
        }
      });
    });
  }

  // Show form with preset or empty
  function showSnippetForm(preset = null) {
    const form = document.getElementById('snippet-form-container');
    form.style.display = 'block';
    
    if (preset && CODE_PRESETS[preset]) {
      const p = CODE_PRESETS[preset];
      document.getElementById('snippet-name').value = p.name;
      document.getElementById('snippet-type').value = p.type;
      document.getElementById('snippet-position').value = p.position;
      document.getElementById('snippet-code').value = p.code;
      
      // Set pages selection
      const pagesSelect = document.getElementById('snippet-pages');
      Array.from(pagesSelect.options).forEach(opt => {
        opt.selected = p.pages.includes(opt.value);
      });
    } else {
      // Clear form
      document.getElementById('snippet-name').value = '';
      document.getElementById('snippet-type').value = 'js';
      document.getElementById('snippet-position').value = 'head';
      document.getElementById('snippet-code').value = '';
      
      const pagesSelect = document.getElementById('snippet-pages');
      Array.from(pagesSelect.options).forEach(opt => {
        opt.selected = opt.value === 'all';
      });
    }
    
    document.getElementById('editing-snippet-id').value = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Edit existing snippet
  function editSnippet(index) {
    const snippet = codeSnippets[index];
    const form = document.getElementById('snippet-form-container');
    form.style.display = 'block';
    
    document.getElementById('snippet-name').value = snippet.name;
    document.getElementById('snippet-type').value = snippet.type;
    document.getElementById('snippet-position').value = snippet.position;
    document.getElementById('snippet-code').value = snippet.code;
    document.getElementById('editing-snippet-id').value = index;
    
    // Set pages selection
    const pagesSelect = document.getElementById('snippet-pages');
    Array.from(pagesSelect.options).forEach(opt => {
      opt.selected = snippet.pages.includes(opt.value);
    });
    
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Hide form
  function hideSnippetForm() {
    document.getElementById('snippet-form-container').style.display = 'none';
    document.getElementById('editing-snippet-id').value = '';
  }

  // Setup code snippets handlers
  function setupCodeSnippetsHandlers() {
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        showSnippetForm(preset);
      });
    });
    
    // Close form button
    document.getElementById('close-snippet-form').addEventListener('click', hideSnippetForm);
    document.getElementById('cancel-snippet-btn').addEventListener('click', hideSnippetForm);
    
    // Save snippet
    document.getElementById('save-snippet-btn').addEventListener('click', async () => {
      const name = document.getElementById('snippet-name').value.trim();
      const type = document.getElementById('snippet-type').value;
      const position = document.getElementById('snippet-position').value;
      const code = document.getElementById('snippet-code').value.trim();
      const editingId = document.getElementById('editing-snippet-id').value;
      
      // Get selected pages
      const pagesSelect = document.getElementById('snippet-pages');
      const pages = Array.from(pagesSelect.selectedOptions).map(opt => opt.value);
      
      if (!name || !code) {
        alert('Please fill in snippet name and code');
        return;
      }
      
      const snippet = {
        id: editingId ? parseInt(editingId) : Date.now(),
        name,
        type,
        position,
        pages,
        code,
        enabled: true,
        createdAt: editingId ? codeSnippets[parseInt(editingId)]?.createdAt : Date.now(),
        updatedAt: Date.now()
      };
      
      if (editingId !== '') {
        // Update existing
        codeSnippets[parseInt(editingId)] = snippet;
      } else {
        // Add new
        codeSnippets.push(snippet);
      }
      
      const result = await saveAllSnippets();
      
      if (result.success) {
        hideSnippetForm();
        renderSnippetsList();
        alert('✅ Code snippet saved!');
      } else {
        alert('❌ Failed to save: ' + (result.error || 'Unknown error'));
      }
    });
  }

  console.log('✅ Dashboard Settings loaded');
})(window.AdminDashboard);
