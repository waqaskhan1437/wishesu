/*
 * Admin Whop Settings (LEGACY - DEPRECATED)
 *
 * This file is kept for backward compatibility only.
 * All Whop settings are now managed in the Payment tab.
 *
 * IMPORTANT: API Key should be set as Cloudflare environment variable: WHOP_API_KEY
 */

;(function(){
  // Show deprecation notice and redirect to Payment tab
  function showDeprecationNotice() {
    const container = document.getElementById('whop-settings-container') ||
                      document.getElementById('main-panel') ||
                      document.querySelector('.whop-settings');

    if (container) {
      container.innerHTML = `
        <div style="max-width: 600px; margin: 40px auto; padding: 30px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center;">
          <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
          <h2 style="margin: 0 0 15px; color: #92400e; font-size: 24px;">Whop Settings Moved!</h2>
          <p style="color: #78350f; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Whop settings have been moved to the <strong>Payment</strong> tab for better organization.
            <br><br>
            All payment gateways (Whop, PayPal, Stripe, etc.) are now managed in one place.
          </p>
          <div style="background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: left;">
            <strong style="color: #b45309;">API Key Note:</strong>
            <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">
              For security, API key should be set as a Cloudflare environment variable:
              <code style="background: #fde68a; padding: 2px 6px; border-radius: 4px;">WHOP_API_KEY</code>
            </p>
          </div>
          <button onclick="navigateToPaymentTab()" style="
            padding: 14px 28px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            transition: transform 0.2s;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            Go to Payment Settings →
          </button>
        </div>
      `;
    }
  }

  // Navigate to Payment tab
  window.navigateToPaymentTab = function() {
    // Try to click the Payment menu item
    const paymentMenuItem = document.querySelector('[data-view="payment"]');
    if (paymentMenuItem) {
      paymentMenuItem.click();
    } else {
      // Fallback: reload with payment hash
      window.location.hash = 'payment';
      window.location.reload();
    }
  };

  // Legacy functions for backward compatibility (now redirect to payment_gateways)
  async function loadSettings() {
    try {
      const resp = await window.getWhopSettings();
      console.log('[DEPRECATED] Whop settings loaded:', resp);
      const settings = (resp && resp.settings) || {};

      // Populate form if it exists (for backward compatibility)
      const themeSel = document.getElementById('whop-theme');
      const defaultProduct = document.getElementById('whop-default-product');
      const webhookEl = document.getElementById('whop-webhook-secret');

      if (themeSel) themeSel.value = settings.theme || 'light';
      if (defaultProduct) defaultProduct.value = settings.default_product_id || '';
      if (webhookEl) webhookEl.value = settings.webhook_secret || '';

      // Show API key status
      const apiKeyEl = document.getElementById('whop-api-key');
      if (apiKeyEl) {
        apiKeyEl.value = settings.api_key || '';
        apiKeyEl.placeholder = 'Set via WHOP_API_KEY env variable';
        apiKeyEl.disabled = true;
      }

    } catch (err) {
      console.error('[DEPRECATED] Failed to load Whop settings', err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    console.log('[DEPRECATED] Saving via legacy API - please use Payment tab instead');

    const themeSel = document.getElementById('whop-theme');
    const defaultProduct = document.getElementById('whop-default-product');
    const webhookEl = document.getElementById('whop-webhook-secret');

    const payload = {
      theme: themeSel ? themeSel.value : 'light',
      default_product_id: defaultProduct ? defaultProduct.value.trim() : '',
      webhook_secret: webhookEl ? webhookEl.value.trim() : ''
      // API key NOT sent - must be set via env variable
    };

    try {
      const res = await window.saveWhopSettings(payload);
      if (res && res.success) {
        alert('✅ Settings saved! Note: Please use Payment tab for future changes.');
      } else {
        throw new Error(res && res.error ? res.error : 'Unknown error');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('❌ Failed to save: ' + (err.message || 'Unknown error'));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Show deprecation notice
    showDeprecationNotice();

    // Still load settings for backward compatibility
    loadSettings();
    const form = document.getElementById('whop-settings-form');
    if (form) form.addEventListener('submit', handleSubmit);
  });
})();
