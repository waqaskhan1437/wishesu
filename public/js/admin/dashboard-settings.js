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
    <!-- Site Branding -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; color: white; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: white;">🎨 Site Branding</h3>
      <p style="color: rgba(255,255,255,0.85); margin-bottom: 20px;">Customize your website logo and favicon.</p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
        <!-- Logo Upload -->
        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 10px;">
          <label style="font-weight: 600; display: block; margin-bottom: 10px;">🖼️ Site Logo</label>
          <div id="logo-preview" style="width: 200px; height: 60px; background: rgba(255,255,255,0.9); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; overflow: hidden;">
            <span style="color: #6b7280; font-size: 0.85em;">No logo set</span>
          </div>
          <input type="url" id="site-logo-url" placeholder="https://... or upload below" style="width: 100%; padding: 10px; border: none; border-radius: 6px; margin-bottom: 8px; box-sizing: border-box;">
          <div style="display: flex; gap: 8px;">
            <label style="flex: 1; background: white; color: #059669; padding: 10px; border-radius: 6px; text-align: center; cursor: pointer; font-weight: 600;">
              📤 Upload Logo
              <input type="file" id="logo-upload" accept="image/*" style="display: none;">
            </label>
            <button id="remove-logo-btn" style="background: rgba(255,255,255,0.3); color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer;">🗑️</button>
          </div>
          <small style="display: block; margin-top: 8px; color: rgba(255,255,255,0.7);">Recommended: 200x60px, PNG/SVG with transparent background</small>
        </div>
        
        <!-- Favicon Upload -->
        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 10px;">
          <label style="font-weight: 600; display: block; margin-bottom: 10px;">⭐ Favicon</label>
          <div id="favicon-preview" style="width: 64px; height: 64px; background: rgba(255,255,255,0.9); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; overflow: hidden;">
            <span style="color: #6b7280; font-size: 0.7em;">No icon</span>
          </div>
          <input type="url" id="site-favicon-url" placeholder="https://... or upload below" style="width: 100%; padding: 10px; border: none; border-radius: 6px; margin-bottom: 8px; box-sizing: border-box;">
          <div style="display: flex; gap: 8px;">
            <label style="flex: 1; background: white; color: #059669; padding: 10px; border-radius: 6px; text-align: center; cursor: pointer; font-weight: 600;">
              📤 Upload Favicon
              <input type="file" id="favicon-upload" accept="image/*,.ico" style="display: none;">
            </label>
            <button id="remove-favicon-btn" style="background: rgba(255,255,255,0.3); color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer;">🗑️</button>
          </div>
          <small style="display: block; margin-top: 8px; color: rgba(255,255,255,0.7);">Recommended: 32x32 or 64x64px, ICO/PNG</small>
        </div>
      </div>
      
      <button class="btn" id="save-branding-btn" style="margin-top: 20px; background: white; color: #059669; font-weight: 600; padding: 12px 24px;">
        💾 Save Branding
      </button>
      <span id="branding-status" style="margin-left: 15px; font-size: 0.9em;"></span>
    </div>

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

    <!-- Cobalt API Settings -->
    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>🎬 Cobalt API Settings</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Configure the video download API URL for YouTube/Vimeo downloads.</p>

      <div style="margin-bottom: 20px;">
        <label style="display: block; font-weight: 600; margin-bottom: 8px;">Cobalt API URL</label>
        <input type="url" id="cobalt-api-url" placeholder="https://api.cobalt.tools"
               style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95em;">
        <p style="color: #6b7280; font-size: 0.85em; margin-top: 8px;">
          Default: <code>https://api.cobalt.tools</code><br>
          Alternative instances: <code>https://p.cobaltapi.com</code>, <code>https://cobalt.ackee.cz</code>
        </p>
      </div>

      <button class="btn" id="save-cobalt-btn" style="background: #059669; color: white; font-weight: 600; padding: 12px 24px;">
        💾 Save Cobalt Settings
      </button>
      <span id="cobalt-status" style="margin-left: 15px; font-size: 0.9em;"></span>
    </div>

    <!-- Automation & Alerts Section -->
    <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 30px; border-radius: 12px; color: white; margin-top: 20px;">
      <h3 style="margin: 0 0 10px 0; color: white;">🤖 Automation & Alerts</h3>
      <p style="color: rgba(255,255,255,0.85); margin-bottom: 20px;">Configure automatic notifications for admin and customers.</p>
      <button class="btn" id="open-automation-settings" style="background: white; color: #f97316; font-weight: 600; padding: 12px 24px;">
        ⚙️ Open Automation Settings
      </button>
    </div>

    <!-- Coupon Codes Section -->
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px; color: white; margin-top: 20px;">
      <h3 style="margin: 0 0 10px 0; color: white;">🎟️ Coupon Codes</h3>
      <p style="color: rgba(255,255,255,0.85); margin-bottom: 20px;">Create and manage discount coupons for your products.</p>
      
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" id="coupons-enabled" style="width: 20px; height: 20px; cursor: pointer;">
          <span style="font-weight: 600;">Enable Coupon System</span>
        </label>
        <span id="coupons-enabled-status" style="font-size: 0.85em;"></span>
      </div>
      
      <button class="btn" id="open-coupons-manager" style="background: white; color: #8b5cf6; font-weight: 600; padding: 12px 24px;">
        🎟️ Manage Coupons
      </button>
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
    loadBrandingSettings();
    document.getElementById('save-settings-btn').addEventListener('click', saveWhopSettings);
    document.getElementById('purge-cache-btn').addEventListener('click', purgeCache);
    document.getElementById('save-payment-methods-btn').addEventListener('click', savePaymentMethodsSettings);
    setupCustomCssHandlers();
    setupCodeSnippetsHandlers();
    setupBrandingHandlers();
    setupCouponsHandlers();
    loadCouponsEnabled();
    loadCobaltSettings();
    setupCobaltHandlers();

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
    setupAutomationHandlers();
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

  // ========== SITE BRANDING ==========
  
  // Load branding settings
  async function loadBrandingSettings() {
    try {
      const res = await fetch('/api/settings/branding');
      const data = await res.json();
      
      if (data.success && data.branding) {
        const logoUrl = data.branding.logo_url || '';
        const faviconUrl = data.branding.favicon_url || '';
        
        document.getElementById('site-logo-url').value = logoUrl;
        document.getElementById('site-favicon-url').value = faviconUrl;
        
        updateLogoPreview(logoUrl);
        updateFaviconPreview(faviconUrl);
      }
    } catch (err) {
      console.error('Failed to load branding settings:', err);
    }
  }
  
  // Update logo preview
  function updateLogoPreview(url) {
    const preview = document.getElementById('logo-preview');
    if (url) {
      preview.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.parentElement.innerHTML='<span style=\\'color: #dc2626; font-size: 0.85em;\\'>Failed to load</span>'">`;
    } else {
      preview.innerHTML = '<span style="color: #6b7280; font-size: 0.85em;">No logo set</span>';
    }
  }
  
  // Update favicon preview
  function updateFaviconPreview(url) {
    const preview = document.getElementById('favicon-preview');
    if (url) {
      preview.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.parentElement.innerHTML='<span style=\\'color: #dc2626; font-size: 0.7em;\\'>Failed</span>'">`;
    } else {
      preview.innerHTML = '<span style="color: #6b7280; font-size: 0.7em;">No icon</span>';
    }
  }
  
  // Setup branding event handlers
  function setupBrandingHandlers() {
    // Logo URL change
    document.getElementById('site-logo-url').addEventListener('input', (e) => {
      updateLogoPreview(e.target.value);
    });
    
    // Favicon URL change
    document.getElementById('site-favicon-url').addEventListener('input', (e) => {
      updateFaviconPreview(e.target.value);
    });
    
    // Logo upload
    document.getElementById('logo-upload').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const statusEl = document.getElementById('branding-status');
      statusEl.textContent = '⏳ Uploading logo...';
      
      try {
        const url = await uploadBrandingFile(file, 'logo');
        document.getElementById('site-logo-url').value = url;
        updateLogoPreview(url);
        statusEl.textContent = '✅ Logo uploaded!';
        setTimeout(() => statusEl.textContent = '', 3000);
      } catch (err) {
        statusEl.textContent = '❌ Upload failed: ' + err.message;
      }
      
      e.target.value = '';
    });
    
    // Favicon upload
    document.getElementById('favicon-upload').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const statusEl = document.getElementById('branding-status');
      statusEl.textContent = '⏳ Uploading favicon...';
      
      try {
        const url = await uploadBrandingFile(file, 'favicon');
        document.getElementById('site-favicon-url').value = url;
        updateFaviconPreview(url);
        statusEl.textContent = '✅ Favicon uploaded!';
        setTimeout(() => statusEl.textContent = '', 3000);
      } catch (err) {
        statusEl.textContent = '❌ Upload failed: ' + err.message;
      }
      
      e.target.value = '';
    });
    
    // Remove logo
    document.getElementById('remove-logo-btn').addEventListener('click', () => {
      document.getElementById('site-logo-url').value = '';
      updateLogoPreview('');
    });
    
    // Remove favicon
    document.getElementById('remove-favicon-btn').addEventListener('click', () => {
      document.getElementById('site-favicon-url').value = '';
      updateFaviconPreview('');
    });
    
    // Save branding
    document.getElementById('save-branding-btn').addEventListener('click', saveBrandingSettings);
  }
  
  // Upload branding file to R2
  async function uploadBrandingFile(file, type) {
    const sessionId = 'branding-' + Date.now();
    const filename = type + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    const res = await fetch(`/api/upload/temp-file?sessionId=${sessionId}&filename=${filename}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Upload failed');
    }
    
    // Convert r2:// URL to public URL
    const r2Key = data.tempUrl.replace('r2://', '');
    return `/api/r2/${r2Key}`;
  }
  
  // Save branding settings
  async function saveBrandingSettings() {
    const btn = document.getElementById('save-branding-btn');
    const statusEl = document.getElementById('branding-status');
    
    btn.disabled = true;
    btn.textContent = '⏳ Saving...';
    statusEl.textContent = '';
    
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: document.getElementById('site-logo-url').value.trim(),
          favicon_url: document.getElementById('site-favicon-url').value.trim()
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        statusEl.textContent = '✅ Branding saved!';
        statusEl.style.color = '#16a34a';
        setTimeout(() => statusEl.textContent = '', 3000);
      } else {
        statusEl.textContent = '❌ ' + (data.error || 'Save failed');
        statusEl.style.color = '#dc2626';
      }
    } catch (err) {
      statusEl.textContent = '❌ Error: ' + err.message;
      statusEl.style.color = '#dc2626';
    }
    
    btn.disabled = false;
    btn.textContent = '💾 Save Branding';
  }

  // ========== END SITE BRANDING ==========

  // ========== COBALT API SETTINGS ==========

  // Load cobalt settings
  async function loadCobaltSettings() {
    try {
      const res = await fetch('/api/settings/cobalt');
      const data = await res.json();

      if (data.success && data.settings) {
        const input = document.getElementById('cobalt-api-url');
        if (input && data.settings.cobalt_url) {
          input.value = data.settings.cobalt_url;
        }
      }
    } catch (err) {
      console.error('Failed to load cobalt settings:', err);
    }
  }

  // Setup cobalt handlers
  function setupCobaltHandlers() {
    const saveBtn = document.getElementById('save-cobalt-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveCobaltSettings);
    }
  }

  // Save cobalt settings
  async function saveCobaltSettings() {
    const btn = document.getElementById('save-cobalt-btn');
    const statusEl = document.getElementById('cobalt-status');
    const input = document.getElementById('cobalt-api-url');

    if (!btn || !statusEl || !input) return;

    btn.disabled = true;
    btn.textContent = '⏳ Saving...';
    statusEl.textContent = '';

    try {
      const res = await fetch('/api/settings/cobalt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cobalt_url: input.value.trim() || 'https://api.cobalt.tools'
        })
      });

      const data = await res.json();

      if (data.success) {
        statusEl.textContent = '✅ Cobalt settings saved!';
        statusEl.style.color = '#16a34a';
        setTimeout(() => statusEl.textContent = '', 3000);
      } else {
        statusEl.textContent = '❌ ' + (data.error || 'Save failed');
        statusEl.style.color = '#dc2626';
      }
    } catch (err) {
      statusEl.textContent = '❌ Error: ' + err.message;
      statusEl.style.color = '#dc2626';
    }

    btn.disabled = false;
    btn.textContent = '💾 Save Cobalt Settings';
  }

  // ========== END COBALT API SETTINGS ==========

  // ========== COUPONS MANAGEMENT ==========
  
  // Load coupons enabled status
  async function loadCouponsEnabled() {
    try {
      const res = await fetch('/api/coupons/enabled');
      if (!res.ok) {
        console.warn('Coupons API not available yet');
        return;
      }
      const data = await res.json();
      const checkbox = document.getElementById('coupons-enabled');
      if (checkbox) checkbox.checked = data.enabled || false;
    } catch (e) {
      console.warn('Load coupons enabled error (deploy new code?):', e);
      // Default to disabled if error
      const checkbox = document.getElementById('coupons-enabled');
      if (checkbox) checkbox.checked = false;
    }
  }
  
  // Setup coupon event handlers
  function setupCouponsHandlers() {
    const checkbox = document.getElementById('coupons-enabled');
    const managerBtn = document.getElementById('open-coupons-manager');
    
    // Toggle coupons enabled
    if (checkbox) {
      checkbox.addEventListener('change', async (e) => {
        const statusEl = document.getElementById('coupons-enabled-status');
        try {
          const res = await fetch('/api/coupons/enabled', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: e.target.checked })
          });
          if (!res.ok) throw new Error('API error');
          const data = await res.json();
          if (data.success) {
            statusEl.textContent = e.target.checked ? '✅ Enabled' : '⚪ Disabled';
            setTimeout(() => statusEl.textContent = '', 2000);
          }
        } catch (err) {
          statusEl.textContent = '❌ Deploy new code first';
          e.target.checked = !e.target.checked;
        }
      });
    }
    
    // Open coupons manager
    if (managerBtn) {
      managerBtn.addEventListener('click', openCouponsManager);
    }
  }
  
  // Open coupons manager modal
  async function openCouponsManager() {
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'coupons-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 16px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto;">
        <div style="padding: 25px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10;">
          <h2 style="margin: 0;">🎟️ Coupon Codes</h2>
          <button id="close-coupons-modal" style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: #6b7280;">✕</button>
        </div>
        
        <div style="padding: 25px;">
          <!-- Add New Coupon Form -->
          <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 15px 0;">➕ Create New Coupon</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              <div>
                <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9em;">Code *</label>
                <input type="text" id="coupon-code" placeholder="SAVE20" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; text-transform: uppercase;">
              </div>
              <div>
                <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9em;">Discount Type</label>
                <select id="coupon-discount-type" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9em;">Discount Value *</label>
                <input type="number" id="coupon-discount-value" placeholder="20" min="0" step="0.01" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
              </div>
              <div>
                <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9em;">Min Order ($)</label>
                <input type="number" id="coupon-min-order" placeholder="0" min="0" step="0.01" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
              </div>
              <div>
                <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9em;">Max Uses (0 = unlimited)</label>
                <input type="number" id="coupon-max-uses" placeholder="0" min="0" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
              </div>
              <div>
                <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9em;">Valid Until</label>
                <input type="datetime-local" id="coupon-valid-until" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
              </div>
            </div>
            <div style="margin-top: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9em;">Product IDs (comma-separated, empty = all products)</label>
              <input type="text" id="coupon-product-ids" placeholder="1,2,3 or leave empty for all" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
            </div>
            <button id="create-coupon-btn" class="btn btn-primary" style="margin-top: 15px;">➕ Create Coupon</button>
            <span id="coupon-create-status" style="margin-left: 10px; font-size: 0.9em;"></span>
          </div>
          
          <!-- Coupons List -->
          <h4 style="margin: 0 0 15px 0;">📋 Existing Coupons</h4>
          <div id="coupons-list" style="background: #f9fafb; border-radius: 12px; min-height: 100px;">
            <p style="text-align: center; padding: 40px; color: #6b7280;">Loading...</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('#close-coupons-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    // Load coupons
    loadCouponsList(modal);
    
    // Create coupon handler
    modal.querySelector('#create-coupon-btn').addEventListener('click', async () => {
      const code = modal.querySelector('#coupon-code').value.trim();
      const discountValue = parseFloat(modal.querySelector('#coupon-discount-value').value);
      const statusEl = modal.querySelector('#coupon-create-status');
      
      if (!code || !discountValue) {
        statusEl.textContent = '❌ Code and discount value are required';
        statusEl.style.color = '#dc2626';
        return;
      }
      
      const validUntilInput = modal.querySelector('#coupon-valid-until').value;
      
      try {
        const res = await fetch('/api/coupons/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            discount_type: modal.querySelector('#coupon-discount-type').value,
            discount_value: discountValue,
            min_order_amount: parseFloat(modal.querySelector('#coupon-min-order').value) || 0,
            max_uses: parseInt(modal.querySelector('#coupon-max-uses').value) || 0,
            valid_until: validUntilInput ? new Date(validUntilInput).getTime() : null,
            product_ids: modal.querySelector('#coupon-product-ids').value.trim() || null
          })
        });
        
        const data = await res.json();
        
        if (data.success) {
          statusEl.textContent = '✅ Coupon created!';
          statusEl.style.color = '#16a34a';
          // Clear form
          modal.querySelector('#coupon-code').value = '';
          modal.querySelector('#coupon-discount-value').value = '';
          modal.querySelector('#coupon-min-order').value = '';
          modal.querySelector('#coupon-max-uses').value = '';
          modal.querySelector('#coupon-valid-until').value = '';
          modal.querySelector('#coupon-product-ids').value = '';
          // Reload list
          loadCouponsList(modal);
        } else {
          statusEl.textContent = '❌ ' + (data.error || 'Failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ Error: ' + err.message;
        statusEl.style.color = '#dc2626';
      }
    });
  }
  
  // Load coupons list
  async function loadCouponsList(modal) {
    const container = modal.querySelector('#coupons-list');
    
    try {
      const res = await fetch('/api/coupons');
      if (!res.ok) throw new Error('API returned ' + res.status);
      const data = await res.json();
      
      if (!data.coupons || data.coupons.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #6b7280;">No coupons yet. Create your first one above!</p>';
        return;
      }
      
      container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="padding: 12px; text-align: left;">Code</th>
              <th style="padding: 12px; text-align: left;">Discount</th>
              <th style="padding: 12px; text-align: left;">Usage</th>
              <th style="padding: 12px; text-align: left;">Status</th>
              <th style="padding: 12px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.coupons.map(c => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">
                  <strong style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${c.code}</strong>
                  ${c.valid_until && c.valid_until < Date.now() ? '<span style="color: #dc2626; font-size: 0.8em; margin-left: 5px;">Expired</span>' : ''}
                </td>
                <td style="padding: 12px;">
                  ${c.discount_type === 'percentage' ? c.discount_value + '%' : '$' + (c.discount_value || 0).toFixed(2)}
                  ${c.min_order_amount > 0 ? '<br><small style="color: #6b7280;">Min: $' + (c.min_order_amount || 0).toFixed(2) + '</small>' : ''}
                </td>
                <td style="padding: 12px;">
                  ${c.used_count || 0}${c.max_uses > 0 ? ' / ' + c.max_uses : ' / ∞'}
                </td>
                <td style="padding: 12px;">
                  <span style="padding: 4px 10px; border-radius: 20px; font-size: 0.85em; font-weight: 600; ${c.status === 'active' ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}">
                    ${c.status || 'active'}
                  </span>
                </td>
                <td style="padding: 12px; text-align: right;">
                  <button onclick="toggleCouponStatus(${c.id}, '${c.status === 'active' ? 'inactive' : 'active'}')" style="background: ${c.status === 'active' ? '#f59e0b' : '#16a34a'}; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-right: 5px;">
                    ${c.status === 'active' ? '⏸️ Disable' : '▶️ Enable'}
                  </button>
                  <button onclick="deleteCoupon(${c.id})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                    🗑️
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      console.error('Load coupons error:', err);
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p style="color: #dc2626; margin-bottom: 10px;">⚠️ Could not load coupons</p>
          <p style="color: #6b7280; font-size: 0.9em;">Make sure you have deployed the latest code with: <code>npx wrangler deploy</code></p>
        </div>
      `;
    }
  }
  
  // Global functions for coupon actions
  window.toggleCouponStatus = async function(id, status) {
    try {
      const res = await fetch('/api/coupons/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        const modal = document.getElementById('coupons-modal');
        if (modal) loadCouponsList(modal);
      } else {
        alert('❌ ' + (data.error || 'Failed'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };
  
  window.deleteCoupon = async function(id) {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    
    try {
      const res = await fetch('/api/coupons/delete?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const modal = document.getElementById('coupons-modal');
        if (modal) loadCouponsList(modal);
      } else {
        alert('❌ ' + (data.error || 'Failed'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // ========== END COUPONS MANAGEMENT ==========

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

  // ==================== AUTOMATION SETTINGS ====================
  
  function setupAutomationHandlers() {
    const openBtn = document.getElementById('open-automation-settings');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        // Use new Advanced Automation UI
        if (window.AdvAutomation) {
          window.AdvAutomation.open();
        } else {
          alert('Advanced Automation module not loaded');
        }
      });
    }
  }
  
  async function openAutomationModal() {
    // Load current settings
    let settings = {};
    try {
      const res = await fetch('/api/admin/automation/settings');
      const data = await res.json();
      settings = data.settings || {};
    } catch (e) {
      console.error('Failed to load automation settings:', e);
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'automation-modal';
    modal.innerHTML = `
      <style>
        #automation-modal {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.7); z-index: 99999;
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.2s;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .auto-modal-content {
          background: white; border-radius: 16px; width: 95%; max-width: 900px;
          max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        }
        .auto-modal-header {
          background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
          padding: 25px 30px; border-radius: 16px 16px 0 0; color: white;
          display: flex; justify-content: space-between; align-items: center;
        }
        .auto-modal-header h2 { margin: 0; font-size: 1.5em; }
        .auto-modal-close {
          background: rgba(255,255,255,0.2); border: none; color: white;
          width: 40px; height: 40px; border-radius: 50%; font-size: 24px;
          cursor: pointer; transition: all 0.2s;
        }
        .auto-modal-close:hover { background: rgba(255,255,255,0.3); transform: scale(1.1); }
        .auto-modal-body { padding: 30px; }
        .auto-section {
          background: #f9fafb; border-radius: 12px; padding: 20px;
          margin-bottom: 20px; border: 1px solid #e5e7eb;
        }
        .auto-section h3 {
          margin: 0 0 15px 0; color: #374151; font-size: 1.1em;
          display: flex; align-items: center; gap: 8px;
        }
        .auto-toggle {
          display: flex; align-items: center; gap: 10px; margin: 10px 0;
          padding: 12px 15px; background: white; border-radius: 8px;
          border: 1px solid #e5e7eb; cursor: pointer; transition: all 0.2s;
        }
        .auto-toggle:hover { border-color: #f97316; }
        .auto-toggle input { width: 18px; height: 18px; cursor: pointer; accent-color: #f97316; }
        .auto-toggle label { cursor: pointer; flex: 1; }
        .auto-toggle .desc { font-size: 0.85em; color: #6b7280; margin-top: 3px; }
        .auto-input {
          margin: 15px 0; padding: 15px; background: white;
          border-radius: 8px; border: 1px solid #e5e7eb;
        }
        .auto-input label { display: block; font-weight: 600; margin-bottom: 8px; color: #374151; }
        .auto-input input, .auto-input select {
          width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
          border-radius: 6px; font-size: 14px;
        }
        .auto-input small { color: #6b7280; font-size: 0.85em; margin-top: 5px; display: block; }
        .auto-actions {
          display: flex; gap: 10px; margin-top: 25px; padding-top: 20px;
          border-top: 1px solid #e5e7eb; justify-content: space-between; flex-wrap: wrap;
        }
        .auto-btn {
          padding: 12px 24px; border: none; border-radius: 8px;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .auto-btn-primary { background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; }
        .auto-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(249,115,22,0.4); }
        .auto-btn-test { background: #3b82f6; color: white; }
        .auto-btn-test:hover { background: #2563eb; }
        .auto-btn-logs { background: #8b5cf6; color: white; }
        .auto-btn-logs:hover { background: #7c3aed; }
        .auto-tabs { display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
        .auto-tab {
          padding: 12px 20px; cursor: pointer; border: none; background: none;
          color: #6b7280; font-weight: 500; border-bottom: 2px solid transparent;
          margin-bottom: -2px; transition: all 0.2s;
        }
        .auto-tab:hover { color: #f97316; }
        .auto-tab.active { color: #f97316; border-bottom-color: #f97316; }
        .auto-tab-content { display: none; }
        .auto-tab-content.active { display: block; }
      </style>
      
      <div class="auto-modal-content">
        <div class="auto-modal-header">
          <h2>🤖 Automation & Alerts</h2>
          <button class="auto-modal-close" onclick="document.getElementById('automation-modal').remove()">&times;</button>
        </div>
        <div class="auto-modal-body">
          <!-- Tabs -->
          <div class="auto-tabs">
            <button class="auto-tab active" data-tab="admin">👨‍💼 Admin Alerts</button>
            <button class="auto-tab" data-tab="customer">👤 Customer Alerts</button>
            <button class="auto-tab" data-tab="webhook">🔗 Webhook Settings</button>
            <button class="auto-tab" data-tab="email">📧 Email Service</button>
            <button class="auto-tab" data-tab="logs">📋 Logs</button>
          </div>
          
          <!-- Admin Alerts Tab -->
          <div class="auto-tab-content active" id="tab-admin">
            <div class="auto-section">
              <h3>🔔 Admin Notifications</h3>
              <p style="color: #6b7280; margin-bottom: 15px;">Get instant alerts when important events happen on your site.</p>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-enabled" ${settings.automation_enabled === 'true' ? 'checked' : ''}>
                <label for="auto-enabled">
                  <strong>Enable Automation</strong>
                  <div class="desc">Master switch for all automation features</div>
                </label>
              </div>
              
              <div class="auto-input">
                <label>📧 Admin Email</label>
                <input type="email" id="auto-admin-email" value="${settings.admin_email || ''}" placeholder="admin@yourdomain.com">
                <small>Receive email alerts at this address</small>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-new-order" ${settings.admin_alert_new_order === 'true' ? 'checked' : ''}>
                <label for="auto-new-order">
                  <strong>💰 New Order</strong>
                  <div class="desc">Alert when a new order is placed</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-new-tip" ${settings.admin_alert_new_tip === 'true' ? 'checked' : ''}>
                <label for="auto-new-tip">
                  <strong>💝 New Tip</strong>
                  <div class="desc">Alert when customer sends a tip</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-new-review" ${settings.admin_alert_new_review === 'true' ? 'checked' : ''}>
                <label for="auto-new-review">
                  <strong>⭐ New Review</strong>
                  <div class="desc">Alert when customer submits a review</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-blog-comment" ${settings.admin_alert_blog_comment === 'true' ? 'checked' : ''}>
                <label for="auto-blog-comment">
                  <strong>📝 New Blog Comment</strong>
                  <div class="desc">Alert when someone comments on a blog post</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-forum-question" ${settings.admin_alert_forum_question === 'true' ? 'checked' : ''}>
                <label for="auto-forum-question">
                  <strong>❓ New Forum Question</strong>
                  <div class="desc">Alert when someone asks a new question</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-forum-reply" ${settings.admin_alert_forum_reply === 'true' ? 'checked' : ''}>
                <label for="auto-forum-reply">
                  <strong>💬 New Forum Reply</strong>
                  <div class="desc">Alert when someone replies to a question</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-chat-message" ${settings.admin_alert_chat_message === 'true' ? 'checked' : ''}>
                <label for="auto-chat-message">
                  <strong>💬 New Support Message</strong>
                  <div class="desc">Alert when customer sends a chat message</div>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Customer Alerts Tab -->
          <div class="auto-tab-content" id="tab-customer">
            <div class="auto-section">
              <h3>👤 Customer Email Notifications</h3>
              <p style="color: #6b7280; margin-bottom: 15px;">Keep customers informed about their orders and activity.</p>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-cust-enabled" ${settings.customer_email_enabled === 'true' ? 'checked' : ''}>
                <label for="auto-cust-enabled">
                  <strong>Enable Customer Emails</strong>
                  <div class="desc">Master switch for customer notifications</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-cust-order-confirmed" ${settings.customer_email_order_confirmed === 'true' ? 'checked' : ''}>
                <label for="auto-cust-order-confirmed">
                  <strong>🎉 Order Confirmation</strong>
                  <div class="desc">Email customer when order is placed</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-cust-order-delivered" ${settings.customer_email_order_delivered === 'true' ? 'checked' : ''}>
                <label for="auto-cust-order-delivered">
                  <strong>🎬 Video Delivered</strong>
                  <div class="desc">Email customer when video is ready</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-cust-chat-reply" ${settings.customer_email_chat_reply === 'true' ? 'checked' : ''}>
                <label for="auto-cust-chat-reply">
                  <strong>💬 Support Reply</strong>
                  <div class="desc">Email customer when admin replies to chat</div>
                </label>
              </div>
              
              <div class="auto-toggle">
                <input type="checkbox" id="auto-cust-forum-reply" ${settings.customer_email_forum_reply === 'true' ? 'checked' : ''}>
                <label for="auto-cust-forum-reply">
                  <strong>🗣️ Forum Reply</strong>
                  <div class="desc">Email when someone replies to customer's question</div>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Webhook Settings Tab -->
          <div class="auto-tab-content" id="tab-webhook">
            <div class="auto-section">
              <h3>🔗 Webhook Integration</h3>
              <p style="color: #6b7280; margin-bottom: 15px;">Send admin alerts to Slack, Discord, or custom webhook.</p>
              
              <div class="auto-input">
                <label>Webhook Type</label>
                <select id="auto-webhook-type">
                  <option value="" ${!settings.admin_webhook_type ? 'selected' : ''}>Select type...</option>
                  <option value="slack" ${settings.admin_webhook_type === 'slack' ? 'selected' : ''}>Slack</option>
                  <option value="discord" ${settings.admin_webhook_type === 'discord' ? 'selected' : ''}>Discord</option>
                  <option value="custom" ${settings.admin_webhook_type === 'custom' ? 'selected' : ''}>Custom Webhook</option>
                </select>
              </div>
              
              <div class="auto-input" id="slack-url-section" style="display: ${settings.admin_webhook_type === 'slack' ? 'block' : 'none'}">
                <label>🔷 Slack Webhook URL</label>
                <input type="text" id="auto-slack-url" value="${settings.slack_webhook_url || ''}" placeholder="https://hooks.slack.com/services/...">
                <small>Create incoming webhook in Slack App settings</small>
              </div>
              
              <div class="auto-input" id="discord-url-section" style="display: ${settings.admin_webhook_type === 'discord' ? 'block' : 'none'}">
                <label>🟣 Discord Webhook URL</label>
                <input type="text" id="auto-discord-url" value="${settings.discord_webhook_url || ''}" placeholder="https://discord.com/api/webhooks/...">
                <small>Server Settings → Integrations → Webhooks</small>
              </div>
              
              <div id="custom-webhook-section" style="display: ${settings.admin_webhook_type === 'custom' ? 'block' : 'none'}">
                <div class="auto-input">
                  <label>🌐 Custom Webhook URL</label>
                  <input type="text" id="auto-custom-url" value="${settings.custom_webhook_url || ''}" placeholder="https://your-server.com/webhook">
                  <small>Your custom endpoint to receive POST requests</small>
                </div>
                <div class="auto-input">
                  <label>🔐 Webhook Secret (Optional)</label>
                  <input type="text" id="auto-custom-secret" value="${settings.custom_webhook_secret || ''}" placeholder="your-secret-key">
                  <small>Added to payload for verification</small>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Email Service Tab -->
          <div class="auto-tab-content" id="tab-email">
            <div class="auto-section">
              <h3>📧 Email Service Configuration</h3>
              <p style="color: #6b7280; margin-bottom: 15px;">Configure email service for sending notifications.</p>
              
              <div class="auto-input">
                <label>Email Service Provider</label>
                <select id="auto-email-service">
                  <option value="" ${!settings.email_service ? 'selected' : ''}>Select provider...</option>
                  <option value="resend" ${settings.email_service === 'resend' ? 'selected' : ''}>Resend (Recommended)</option>
                  <option value="sendgrid" ${settings.email_service === 'sendgrid' ? 'selected' : ''}>SendGrid</option>
                  <option value="mailgun" ${settings.email_service === 'mailgun' ? 'selected' : ''}>Mailgun</option>
                  <option value="postmark" ${settings.email_service === 'postmark' ? 'selected' : ''}>Postmark</option>
                  <option value="custom" ${settings.email_service === 'custom' ? 'selected' : ''}>🔧 Custom API (Any Service)</option>
                </select>
              </div>
              
              <div class="auto-input">
                <label>API Key</label>
                <input type="password" id="auto-email-api-key" value="${settings.email_api_key || ''}" placeholder="Enter API key">
                <small>Your email service API key (leave empty to keep existing)</small>
              </div>
              
              <div class="auto-input">
                <label>From Name</label>
                <input type="text" id="auto-email-from-name" value="${settings.email_from_name || 'WishesU'}" placeholder="WishesU">
                <small>Sender name shown in emails</small>
              </div>
              
              <div class="auto-input">
                <label>From Email Address</label>
                <input type="email" id="auto-email-from-address" value="${settings.email_from_address || ''}" placeholder="noreply@yourdomain.com">
                <small>Must be verified with your email provider</small>
              </div>
              
              <!-- Custom API Fields (shown only when custom is selected) -->
              <div id="custom-api-fields" style="display: ${settings.email_service === 'custom' ? 'block' : 'none'}; margin-top: 20px; padding: 20px; background: #fef3c7; border-radius: 12px; border: 2px solid #f59e0b;">
                <h4 style="margin: 0 0 15px 0; color: #92400e;">🔧 Custom API Configuration</h4>
                
                <div class="auto-input">
                  <label>API Endpoint URL *</label>
                  <input type="url" id="auto-custom-email-url" value="${settings.custom_email_api_url || ''}" placeholder="https://api.youremailservice.com/v1/send">
                  <small>Full URL of your email API endpoint</small>
                </div>
                
                <div class="auto-input">
                  <label>HTTP Method</label>
                  <select id="auto-custom-email-method">
                    <option value="POST" ${(settings.custom_email_api_method || 'POST') === 'POST' ? 'selected' : ''}>POST</option>
                    <option value="PUT" ${settings.custom_email_api_method === 'PUT' ? 'selected' : ''}>PUT</option>
                  </select>
                </div>
                
                <div class="auto-input">
                  <label>Headers (JSON)</label>
                  <textarea id="auto-custom-email-headers" rows="4" placeholder='{"Authorization": "Bearer {{api_key}}", "Content-Type": "application/json"}'>${settings.custom_email_api_headers || '{"Authorization": "Bearer {{api_key}}", "Content-Type": "application/json"}'}</textarea>
                  <small>JSON object. Use <code>{{api_key}}</code> placeholder for your API key</small>
                </div>
                
                <div class="auto-input">
                  <label>Request Body Template (JSON)</label>
                  <textarea id="auto-custom-email-body" rows="8" placeholder='{"to": "{{to}}", "from": "{{from_name}} <{{from_email}}>", "subject": "{{subject}}", "html": "{{html}}", "text": "{{text}}"}'>${settings.custom_email_api_body || '{"to": "{{to}}", "from": "{{from_name}} <{{from_email}}>", "subject": "{{subject}}", "html": "{{html}}", "text": "{{text}}"}'}</textarea>
                  <small>Available placeholders: <code>{{to}}</code>, <code>{{subject}}</code>, <code>{{html}}</code>, <code>{{text}}</code>, <code>{{from_name}}</code>, <code>{{from_email}}</code>, <code>{{api_key}}</code></small>
                </div>
                
                <div style="margin-top: 15px; padding: 12px; background: #fef9c3; border-radius: 8px;">
                  <p style="margin: 0; font-size: 0.85em; color: #854d0e;">
                    <strong>💡 Examples:</strong><br>
                    <strong>Brevo:</strong> URL: https://api.brevo.com/v3/smtp/email<br>
                    <strong>Elastic Email:</strong> URL: https://api.elasticemail.com/v4/emails<br>
                    <strong>SparkPost:</strong> URL: https://api.sparkpost.com/api/v1/transmissions<br>
                    Check your email service documentation for exact API format.
                  </p>
                </div>
              </div>
              
              <div style="margin-top: 15px; padding: 15px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-size: 0.9em; color: #1e40af;">
                  <strong>💡 Setup Guide:</strong><br>
                  1. Sign up for an email service (Resend is free for 3000 emails/month)<br>
                  2. Add your domain and verify it<br>
                  3. Generate an API key<br>
                  4. Enter the details above
                </p>
              </div>
            </div>
          </div>
          
          <!-- Logs Tab -->
          <div class="auto-tab-content" id="tab-logs">
            <div class="auto-section">
              <h3>📋 Automation Logs</h3>
              <p style="color: #6b7280; margin-bottom: 15px;">View recent automation activity.</p>
              <div id="auto-logs-container" style="max-height: 400px; overflow-y: auto;">
                <p style="color: #6b7280; text-align: center; padding: 20px;">Click "Load Logs" to view recent activity</p>
              </div>
              <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button class="auto-btn auto-btn-logs" id="load-logs-btn">📋 Load Logs</button>
                <button class="auto-btn" style="background: #dc2626; color: white;" id="clear-logs-btn">🗑️ Clear Logs</button>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="auto-actions">
            <div style="display: flex; gap: 10px;">
              <button class="auto-btn auto-btn-test" id="test-webhook-btn">🧪 Test Webhook</button>
              <button class="auto-btn auto-btn-test" id="test-email-btn">📧 Test Email</button>
            </div>
            <button class="auto-btn auto-btn-primary" id="save-automation-btn">💾 Save Settings</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Tab switching
    modal.querySelectorAll('.auto-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.auto-tab').forEach(t => t.classList.remove('active'));
        modal.querySelectorAll('.auto-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        modal.querySelector('#tab-' + tab.dataset.tab).classList.add('active');
      });
    });
    
    // Webhook type change
    const webhookTypeSelect = modal.querySelector('#auto-webhook-type');
    webhookTypeSelect.addEventListener('change', () => {
      const type = webhookTypeSelect.value;
      modal.querySelector('#slack-url-section').style.display = type === 'slack' ? 'block' : 'none';
      modal.querySelector('#discord-url-section').style.display = type === 'discord' ? 'block' : 'none';
      modal.querySelector('#custom-webhook-section').style.display = type === 'custom' ? 'block' : 'none';
    });
    
    // Email service change - show/hide custom API fields
    const emailServiceSelect = modal.querySelector('#auto-email-service');
    emailServiceSelect.addEventListener('change', () => {
      const customFields = modal.querySelector('#custom-api-fields');
      if (customFields) {
        customFields.style.display = emailServiceSelect.value === 'custom' ? 'block' : 'none';
      }
    });
    
    // Save settings
    modal.querySelector('#save-automation-btn').addEventListener('click', async () => {
      const btn = modal.querySelector('#save-automation-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Saving...';
      
      const payload = {
        automation_enabled: modal.querySelector('#auto-enabled').checked ? 'true' : 'false',
        admin_email: modal.querySelector('#auto-admin-email').value.trim(),
        admin_webhook_type: modal.querySelector('#auto-webhook-type').value,
        admin_alert_new_order: modal.querySelector('#auto-new-order').checked ? 'true' : 'false',
        admin_alert_new_tip: modal.querySelector('#auto-new-tip').checked ? 'true' : 'false',
        admin_alert_new_review: modal.querySelector('#auto-new-review').checked ? 'true' : 'false',
        admin_alert_blog_comment: modal.querySelector('#auto-blog-comment').checked ? 'true' : 'false',
        admin_alert_forum_question: modal.querySelector('#auto-forum-question').checked ? 'true' : 'false',
        admin_alert_forum_reply: modal.querySelector('#auto-forum-reply').checked ? 'true' : 'false',
        admin_alert_chat_message: modal.querySelector('#auto-chat-message').checked ? 'true' : 'false',
        customer_email_enabled: modal.querySelector('#auto-cust-enabled').checked ? 'true' : 'false',
        customer_email_order_confirmed: modal.querySelector('#auto-cust-order-confirmed').checked ? 'true' : 'false',
        customer_email_order_delivered: modal.querySelector('#auto-cust-order-delivered').checked ? 'true' : 'false',
        customer_email_chat_reply: modal.querySelector('#auto-cust-chat-reply').checked ? 'true' : 'false',
        customer_email_forum_reply: modal.querySelector('#auto-cust-forum-reply').checked ? 'true' : 'false',
        slack_webhook_url: modal.querySelector('#auto-slack-url').value.trim(),
        discord_webhook_url: modal.querySelector('#auto-discord-url').value.trim(),
        custom_webhook_url: modal.querySelector('#auto-custom-url').value.trim(),
        custom_webhook_secret: modal.querySelector('#auto-custom-secret').value.trim(),
        email_service: modal.querySelector('#auto-email-service').value,
        email_from_name: modal.querySelector('#auto-email-from-name').value.trim(),
        email_from_address: modal.querySelector('#auto-email-from-address').value.trim(),
        // Custom API fields
        custom_email_api_url: modal.querySelector('#auto-custom-email-url')?.value.trim() || '',
        custom_email_api_method: modal.querySelector('#auto-custom-email-method')?.value || 'POST',
        custom_email_api_headers: modal.querySelector('#auto-custom-email-headers')?.value.trim() || '',
        custom_email_api_body: modal.querySelector('#auto-custom-email-body')?.value.trim() || ''
      };
      
      // Only include API key if changed
      const apiKey = modal.querySelector('#auto-email-api-key').value.trim();
      if (apiKey) {
        payload.email_api_key = apiKey;
      }
      
      try {
        const res = await fetch('/api/admin/automation/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
          alert('✅ Automation settings saved!');
        } else {
          alert('❌ Failed to save: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('❌ Error: ' + e.message);
      }
      
      btn.disabled = false;
      btn.textContent = '💾 Save Settings';
    });
    
    // Test webhook
    modal.querySelector('#test-webhook-btn').addEventListener('click', async () => {
      const btn = modal.querySelector('#test-webhook-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Testing...';
      
      try {
        const res = await fetch('/api/admin/automation/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'webhook' })
        });
        const data = await res.json();
        
        if (data.success) {
          alert('✅ Webhook test sent successfully!');
        } else {
          alert('❌ Webhook test failed: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('❌ Error: ' + e.message);
      }
      
      btn.disabled = false;
      btn.textContent = '🧪 Test Webhook';
    });
    
    // Test email
    modal.querySelector('#test-email-btn').addEventListener('click', async () => {
      const btn = modal.querySelector('#test-email-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Testing...';
      
      try {
        const res = await fetch('/api/admin/automation/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email' })
        });
        const data = await res.json();
        
        if (data.success) {
          alert('✅ Test email sent successfully!');
        } else {
          alert('❌ Email test failed: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('❌ Error: ' + e.message);
      }
      
      btn.disabled = false;
      btn.textContent = '📧 Test Email';
    });
    
    // Load logs
    modal.querySelector('#load-logs-btn').addEventListener('click', async () => {
      const container = modal.querySelector('#auto-logs-container');
      container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">⏳ Loading...</p>';
      
      try {
        const res = await fetch('/api/admin/automation/logs?limit=50');
        const data = await res.json();
        
        if (data.logs && data.logs.length > 0) {
          container.innerHTML = data.logs.map(log => `
            <div style="padding: 12px; margin-bottom: 8px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: 600; color: ${log.status === 'sent' ? '#16a34a' : log.status === 'error' ? '#dc2626' : '#6b7280'};">
                  ${log.status === 'sent' ? '✅' : log.status === 'error' ? '❌' : '⏳'} ${log.type}
                </span>
                <span style="font-size: 0.8em; color: #9ca3af;">${new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div style="font-size: 0.9em; color: #4b5563;">${log.subject || log.recipient || ''}</div>
              ${log.response ? `<div style="font-size: 0.8em; color: #9ca3af; margin-top: 5px;">Response: ${log.response.substring(0, 100)}</div>` : ''}
            </div>
          `).join('');
        } else {
          container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">No logs found</p>';
        }
      } catch (e) {
        container.innerHTML = '<p style="color: #dc2626; text-align: center; padding: 20px;">❌ Failed to load logs</p>';
      }
    });
    
    // Clear logs
    modal.querySelector('#clear-logs-btn').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all automation logs?')) return;
      
      try {
        const res = await fetch('/api/admin/automation/logs', { method: 'DELETE' });
        const data = await res.json();
        
        if (data.success) {
          modal.querySelector('#auto-logs-container').innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Logs cleared</p>';
          alert('✅ Logs cleared!');
        } else {
          alert('❌ Failed to clear logs');
        }
      } catch (e) {
        alert('❌ Error: ' + e.message);
      }
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  console.log('✅ Dashboard Settings loaded');
})(window.AdminDashboard);
