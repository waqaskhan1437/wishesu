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
    panel.innerHTML = `<div style="background: white; padding: 30px; border-radius: 12px;"><h3>Whop Settings</h3>
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
    </div>`;

    loadWhopSettings();
    loadPayPalSettings();
    document.getElementById('save-settings-btn').addEventListener('click', saveWhopSettings);
    document.getElementById('purge-cache-btn').addEventListener('click', purgeCache);
    
    setupExportImportHandlers();
    setupGoogleSheetsHandlers();
    setupPayPalHandlers();
    setupMaintenanceHandlers();
    setupWhopTestHandlers();
  };

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
        
        if (enabledEl) enabledEl.checked = data.settings.enabled || false;
        if (clientIdEl) clientIdEl.value = data.settings.client_id || '';
        if (modeEl) modeEl.value = data.settings.mode || 'sandbox';
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
      
      try {
        const res = await fetch('/api/settings/paypal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: document.getElementById('paypal-enabled').checked,
            client_id: document.getElementById('paypal-client-id').value.trim(),
            secret: document.getElementById('paypal-secret').value.trim(),
            mode: document.getElementById('paypal-mode').value
          })
        });
        
        const data = await res.json();
        if (data.success) {
          statusSpan.textContent = '✅ PayPal settings saved!';
          statusSpan.style.color = '#16a34a';
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

  console.log('✅ Dashboard Settings loaded');
})(window.AdminDashboard);
