/**
 * Payment Selector - Unified payment method selector
 * Shows all available payment methods and handles checkout
 * Supports PayPal Smart Buttons for embedded checkout
 */

;(function() {
  let paymentMethods = [];
  let selectedMethod = null;
  let checkoutData = null;
  let modalElement = null;
  let paypalButtonsRendered = false;

  /**
   * Load available payment methods from API
   */
  async function loadPaymentMethods() {
    try {
      const res = await fetch('/api/payment/methods');
      const data = await res.json();
      paymentMethods = data.methods || [];
      return paymentMethods;
    } catch (e) {
      console.error('Failed to load payment methods:', e);
      // Fallback to Whop only
      paymentMethods = [{
        id: 'whop',
        name: 'Card Payment',
        icon: '💳',
        description: 'Pay with Credit/Debit Card',
        enabled: true
      }];
      return paymentMethods;
    }
  }

  /**
   * Load PayPal SDK dynamically
   */
  function loadPayPalSDK(clientId) {
    return new Promise((resolve, reject) => {
      if (window.paypal) {
        resolve(window.paypal);
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
      script.onload = () => resolve(window.paypal);
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(script);
    });
  }

  /**
   * Create and show payment modal
   */
  function createModal() {
    // Remove existing modal if any
    if (modalElement) {
      modalElement.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'payment-modal';
    modal.innerHTML = `
      <style>
        #payment-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.7);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .payment-modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 450px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .payment-modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
          position: relative;
          border-radius: 16px 16px 0 0;
        }
        .payment-modal-header h3 {
          margin: 0;
          font-size: 1.3em;
        }
        .payment-modal-close {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .payment-modal-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .payment-modal-body {
          padding: 20px;
        }
        .payment-amount {
          text-align: center;
          margin-bottom: 20px;
          padding: 15px;
          background: #f3f4f6;
          border-radius: 10px;
        }
        .payment-amount-label {
          font-size: 0.9em;
          color: #6b7280;
        }
        .payment-amount-value {
          font-size: 2em;
          font-weight: 700;
          color: #1f2937;
        }
        .payment-methods-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .payment-method-btn {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 16px 20px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .payment-method-btn:hover {
          border-color: #3b82f6;
          background: #f0f7ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .payment-method-btn[data-method="whop"]:hover {
          background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
          border-color: transparent;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .payment-method-btn.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        .payment-method-btn.loading {
          opacity: 0.7;
          pointer-events: none;
        }
        .payment-method-icon {
          font-size: 1.8em;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 10px;
        }
        .payment-method-info {
          flex: 1;
        }
        .payment-method-name {
          font-weight: 600;
          font-size: 1.1em;
          color: #1f2937;
        }
        .payment-method-desc {
          font-size: 0.85em;
          color: #6b7280;
        }
        .payment-method-arrow {
          color: #9ca3af;
          font-size: 1.2em;
        }
        .payment-loading {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
        .payment-loading .spinner {
          display: inline-block;
          width: 30px;
          height: 30px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 10px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .paypal-buttons-container {
          margin-top: 15px;
          min-height: 150px;
        }
        .payment-divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
          color: #9ca3af;
          font-size: 0.9em;
        }
        .payment-divider::before,
        .payment-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        .payment-divider span {
          padding: 0 15px;
        }
      </style>
      <div class="payment-modal-content">
        <div class="payment-modal-header">
          <h3>💳 Complete Payment</h3>
          <button class="payment-modal-close" onclick="window.PaymentSelector.close()">&times;</button>
        </div>
        <div class="payment-modal-body">
          <div class="payment-amount">
            <div class="payment-amount-label">Total Amount</div>
            <div class="payment-amount-value">$<span id="payment-total">0</span></div>
          </div>
          <div id="payment-methods-container">
            <div class="payment-loading">
              <div class="spinner"></div>
              <p>Loading payment options...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modalElement = modal;

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        window.PaymentSelector.close();
      }
    });

    // Close on escape
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        window.PaymentSelector.close();
        document.removeEventListener('keydown', escHandler);
      }
    });

    return modal;
  }

  /**
   * Render payment methods in modal
   */
  async function renderPaymentMethods() {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    if (paymentMethods.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#ef4444;">No payment methods available. Please contact support.</p>';
      return;
    }

    // Check if PayPal is available
    const paypalMethod = paymentMethods.find(m => m.id === 'paypal');
    const whopMethod = paymentMethods.find(m => m.id === 'whop');

    let html = '';

    // PayPal Smart Buttons (if available)
    if (paypalMethod && paypalMethod.client_id) {
      html += `
        <div id="paypal-buttons-container" class="paypal-buttons-container">
          <div class="payment-loading">
            <div class="spinner"></div>
            <p>Loading PayPal...</p>
          </div>
        </div>
      `;
      // Only show extra text if both methods are available
      if (whopMethod) {
        html += `
          <div style="text-align: center; font-size: 0.75em; color: #94a3b8; margin-top: -5px; margin-bottom: 10px;">
            PayPal also accepts GPay, Apple Pay & Cards
          </div>
        `;
      }
    }

    // Divider if both methods available
    if (paypalMethod && whopMethod) {
      html += `<div class="payment-divider"><span>more payment options</span></div>`;
    }

    // Whop Payment button - All methods
    if (whopMethod) {
      html += `
        <button class="payment-method-btn" data-method="whop" onclick="window.PaymentSelector.selectMethod('whop')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; color: white;">
          <div class="payment-method-icon" style="background: rgba(255,255,255,0.2);">🌐</div>
          <div class="payment-method-info">
            <div class="payment-method-name" style="color: white;">All Payment Methods</div>
            <div class="payment-method-desc" style="color: rgba(255,255,255,0.85);">GPay • Apple Pay • Cards • Bank & 50+ more</div>
          </div>
          <div class="payment-method-arrow" style="color: white;">→</div>
        </button>
      `;
    }

    container.innerHTML = html;

    // Initialize PayPal Smart Buttons
    if (paypalMethod && paypalMethod.client_id) {
      await initPayPalButtons(paypalMethod.client_id);
    }
  }

  /**
   * Initialize PayPal Smart Buttons
   */
  async function initPayPalButtons(clientId) {
    const container = document.getElementById('paypal-buttons-container');
    if (!container || paypalButtonsRendered) return;

    try {
      const paypal = await loadPayPalSDK(clientId);
      
      container.innerHTML = ''; // Clear loading
      
      paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 45
        },
        
        // Create order on PayPal
        createOrder: async (data, actions) => {
          
          
          const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: checkoutData.productId,
              amount: checkoutData.amount,
              email: checkoutData.email || '',
              deliveryTimeMinutes: checkoutData.deliveryTimeMinutes || 60,
              metadata: {
                addons: checkoutData.addons || [],
                deliveryTimeMinutes: checkoutData.deliveryTimeMinutes || 60
              }
            })
          });
          
          const orderData = await response.json();
          
          if (orderData.error) {
            throw new Error(orderData.error);
          }
          
          
          return orderData.order_id;
        },
        
        // Capture payment after approval
        onApprove: async (data, actions) => {
          
          
          const response = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: data.orderID })
          });
          
          const captureData = await response.json();
          
          if (captureData.success && captureData.order_id) {
            
            window.PaymentSelector.close();
            // Redirect to success page
            window.location.href = `/success.html?provider=paypal_direct&order_id=${captureData.order_id}&product=${checkoutData.productId}`;
          } else {
            alert('Payment capture failed. Please contact support.');
          }
        },
        
        onError: (err) => {
          console.error('🅿️ PayPal error:', err);
          alert('Payment error: ' + err.message);
        },
        
        onCancel: () => {
          
        }
        
      }).render('#paypal-buttons-container');
      
      paypalButtonsRendered = true;
      
    } catch (err) {
      console.error('Failed to load PayPal:', err);
      container.innerHTML = `<p style="color:#ef4444;text-align:center;">Failed to load PayPal. <a href="#" onclick="window.PaymentSelector.selectMethod('paypal_redirect')">Click here</a> to try redirect method.</p>`;
    }
  }

  /**
   * Handle payment method selection
   */
  async function selectMethod(methodId) {
    const method = paymentMethods.find(m => m.id === methodId);
    if (!method && methodId !== 'paypal_redirect') return;

    selectedMethod = method;

    // Update UI - show loading on selected button
    const btn = document.querySelector(`.payment-method-btn[data-method="${methodId}"]`);
    if (btn) {
      btn.classList.add('selected', 'loading');
      btn.innerHTML = `
        <div class="payment-method-icon">${method?.icon || '💳'}</div>
        <div class="payment-method-info">
          <div class="payment-method-name">${method?.name || 'Processing'}</div>
          <div class="payment-method-desc">Processing...</div>
        </div>
        <div class="spinner" style="width:20px;height:20px;border-width:2px;"></div>
      `;
    }

    try {
      switch (methodId) {
        case 'whop':
          await processWhopCheckout();
          break;
        case 'paypal_redirect':
          await processPayPalRedirect();
          break;
        case 'stripe':
          await processStripeCheckout();
          break;
        default:
          throw new Error('Unknown payment method');
      }
    } catch (err) {
      console.error('Payment error:', err);
      
      // Show error but keep modal open if there are other payment methods
      if (paymentMethods.length > 1) {
        alert('Payment error: ' + err.message + '\n\nPlease try another payment method.');
        renderPaymentMethods(); // Reset UI so user can choose another method
      } else {
        alert('Payment error: ' + err.message);
        window.PaymentSelector.close();
      }
    }
  }

  /**
   * Process Whop checkout
   */
  async function processWhopCheckout() {
    const response = await fetch('/api/whop/create-plan-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: checkoutData.productId,
        amount: checkoutData.amount,
        email: checkoutData.email || '',
        deliveryTimeMinutes: checkoutData.deliveryTimeMinutes || 60,
        metadata: {
          addons: checkoutData.addons || [],
          deliveryTimeMinutes: checkoutData.deliveryTimeMinutes || 60
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Close selector modal
    window.PaymentSelector.close();

    // Use embedded Whop checkout if available
    if (typeof window.whopCheckout === 'function' && data.checkout_url) {
      window.whopCheckout({
        planId: data.plan_id,
        email: data.email || checkoutData.email,
        deliveryTimeMinutes: checkoutData.deliveryTimeMinutes || 60,
        metadata: {
          addons: checkoutData.addons,
          product_id: checkoutData.productId,
          deliveryTimeMinutes: checkoutData.deliveryTimeMinutes || 60
        },
        amount: checkoutData.amount,
        checkoutUrl: data.checkout_url
      });
    } else if (data.checkout_url) {
      window.location.href = data.checkout_url;
    }
  }

  /**
   * Process PayPal redirect checkout (fallback)
   */
  async function processPayPalRedirect() {
    const response = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: checkoutData.productId,
        amount: checkoutData.amount,
        email: checkoutData.email || '',
        deliveryTimeMinutes: checkoutData.deliveryTimeMinutes || 60,
        metadata: {
          addons: checkoutData.addons || [],
          deliveryTimeMinutes: checkoutData.deliveryTimeMinutes || 60
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Close modal and redirect to PayPal
    window.PaymentSelector.close();
    
    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      throw new Error('No PayPal checkout URL received');
    }
  }

  /**
   * Process Stripe checkout (future)
   */
  async function processStripeCheckout() {
    throw new Error('Stripe checkout coming soon!');
  }

  /**
   * Open payment selector modal
   */
  let onCloseCallback = null;
  
  async function open(data) {
    checkoutData = data;
    paypalButtonsRendered = false;
    onCloseCallback = data.onClose || null; // Store callback
    
    // Load payment methods first
    await loadPaymentMethods();
    
    // If only Whop available, use it directly (no modal)
    if (paymentMethods.length === 1 && paymentMethods[0].id === 'whop') {
      
      await selectMethod('whop');
      return;
    }
    
    // If no payment methods, show error
    if (paymentMethods.length === 0) {
      alert('No payment methods configured. Please contact support.');
      if (onCloseCallback) onCloseCallback();
      return;
    }
    
    createModal();
    
    // Update amount display
    const totalEl = document.getElementById('payment-total');
    if (totalEl) {
      totalEl.textContent = (data.amount || 0).toLocaleString();
    }

    // Render payment methods with PayPal Smart Buttons
    await renderPaymentMethods();
  }

  /**
   * Close payment selector modal
   */
  function close() {
    if (modalElement) {
      modalElement.remove();
      modalElement = null;
    }
    selectedMethod = null;
    paypalButtonsRendered = false;
    
    // Call onClose callback to restore buttons
    if (onCloseCallback) {
      onCloseCallback();
      onCloseCallback = null;
    }
    
    // Also try global restore function
    if (typeof window.restoreCheckoutButtons === 'function') {
      window.restoreCheckoutButtons();
    }
  }

  // Export to window
  window.PaymentSelector = {
    open,
    close,
    selectMethod,
    loadPaymentMethods
  };

  
})();
