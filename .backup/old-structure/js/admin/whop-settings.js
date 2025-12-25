/*
 * Admin Whop Settings
 *
 * This script loads and saves global configuration for the Whop checkout.
 * It relies on API helpers defined in api.js: getWhopSettings and
 * saveWhopSettings.  Fields include theme, default plan ID and a
 * price map.  Keeping this file under 200 lines allows easy
 * maintenance.
 */

;(function(){
  // Populate form inputs with existing settings from the server
  async function loadSettings() {
    try {
      const resp = await window.getWhopSettings();
      
      const settings = (resp && resp.settings) || {};
      
      const themeSel = document.getElementById('whop-theme');
      const defaultPlan = document.getElementById('whop-default-plan');
      const priceMap = document.getElementById('whop-price-map');

      // New default product ID input
      const defaultProduct = document.getElementById('whop-default-product');
      
      if (themeSel) themeSel.value = settings.theme || 'light';
      if (defaultPlan) defaultPlan.value = settings.default_plan || settings.default_plan_id || '';
      if (priceMap) priceMap.value = settings.price_map || '';

      if (defaultProduct) defaultProduct.value = settings.default_product_id || '';
      
      // Populate API key and webhook secret if present
      const apiKeyEl = document.getElementById('whop-api-key');
      const webhookEl = document.getElementById('whop-webhook-secret');
      if (apiKeyEl) apiKeyEl.value = settings.api_key || '';
      if (webhookEl) webhookEl.value = settings.webhook_secret || '';

      // Populate webhook URL field based on current origin.  We compute this
      // client-side so that it reflects the deployed domain.  The
      // /api/whop/webhook endpoint is used for all webhooks.
      const webhookUrlEl = document.getElementById('whop-webhook-url');
      if (webhookUrlEl) {
        try {
          const origin = window.location.origin;
          webhookUrlEl.value = `${origin}/api/whop/webhook`;
        } catch (_) {
          // Fallback to empty value
          webhookUrlEl.value = '';
        }
      }
      
    } catch (err) {
      console.error('Failed to load Whop settings', err);
    }
  }

  // Submit handler to save settings via API
  async function handleSubmit(e) {
    e.preventDefault();
    
    
    const themeSel = document.getElementById('whop-theme');
    const defaultPlan = document.getElementById('whop-default-plan');
    const priceMap = document.getElementById('whop-price-map');
    const defaultProduct = document.getElementById('whop-default-product');
    const apiKeyEl = document.getElementById('whop-api-key');
    const webhookEl = document.getElementById('whop-webhook-secret');
    
    const payload = {
      theme: themeSel ? themeSel.value : 'light',
      default_plan: defaultPlan ? defaultPlan.value.trim() : '',
      price_map: priceMap ? priceMap.value.trim() : '',
      default_product_id: defaultProduct ? defaultProduct.value.trim() : '',
      api_key: apiKeyEl ? apiKeyEl.value.trim() : '',
      webhook_secret: webhookEl ? webhookEl.value.trim() : ''
    };
    
    
    try {
      const res = await window.saveWhopSettings(payload);
      
      if (res && res.success) {
        alert('... Settings saved successfully!');
      } else {
        console.error('Save failed:', res);
        throw new Error(res && res.error ? res.error : 'Unknown error');
      }
    } catch (err) {
      console.error('Error:', err);
      alert(' Failed to save: ' + (err.message || 'Unknown error'));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    const form = document.getElementById('whop-settings-form');
    if (form) form.addEventListener('submit', handleSubmit);

    // Copy webhook URL to clipboard when copy button is clicked
    const copyBtn = document.getElementById('copy-webhook-url');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const webhookUrlEl = document.getElementById('whop-webhook-url');
        if (!webhookUrlEl || !webhookUrlEl.value) return;
        navigator.clipboard.writeText(webhookUrlEl.value)
          .then(() => {
            alert('Webhook URL copied to clipboard');
          })
          .catch(() => {
            alert('Failed to copy URL');
          });
      });
    }

    // Test API connectivity by calling backend test endpoint
    const testApiBtn = document.getElementById('whop-test-api');
    const testWebhookBtn = document.getElementById('whop-test-webhook');
    const statusSpan = document.getElementById('whop-test-status');
    if (testApiBtn) {
      testApiBtn.addEventListener('click', async () => {
        statusSpan.textContent = 'Testing API';
        try {
          const res = await apiFetch('/api/whop/test-api');
          if (res && res.success) {
            statusSpan.textContent = 'API OK';
          } else {
            statusSpan.textContent = res.error ? `API error: ${res.error}` : 'API failed';
          }
        } catch (err) {
          statusSpan.textContent = 'API test failed:' + (err.message || 'Unknown error');
        }
      });
    }
    if (testWebhookBtn) {
      testWebhookBtn.addEventListener('click', async () => {
        statusSpan.textContent = 'Testing webhook';
        try {
          const res = await apiFetch('/api/whop/test-webhook');
          if (res && res.success) {
            statusSpan.textContent = 'Webhook OK';
          } else {
            statusSpan.textContent = res.error ? `Webhook error: ${res.error}` : 'Webhook failed';
          }
        } catch (err) {
          statusSpan.textContent = 'Webhook test failed:' + (err.message || 'Unknown error');
        }
      });
    }
  });
})();


