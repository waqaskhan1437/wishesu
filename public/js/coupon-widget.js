/**
 * Coupon Widget for Product Page
 * Shows coupon input field above checkout button when coupons are enabled
 */

(function() {
  let couponsEnabled = false;
  let appliedCoupon = null;
  let originalPrice = 0;
  let discountedPrice = 0;
  
  // Initialize coupon widget
  async function initCouponWidget() {
    try {
      // Check if coupons are enabled
      const res = await fetch('/api/coupons/enabled');
      const data = await res.json();
      couponsEnabled = data.enabled;
      
      if (!couponsEnabled) return;
      
      // Wait for checkout section to be ready
      waitForCheckout();
    } catch (e) {
      console.error('Coupon widget init error:', e);
    }
  }
  
  // Wait for checkout section to exist
  function waitForCheckout() {
    const checkoutBtn = document.querySelector('.checkout-btn, #checkout-btn, [data-checkout-btn], .buy-now-btn');
    if (checkoutBtn) {
      injectCouponWidget(checkoutBtn);
    } else {
      // Retry after DOM updates
      setTimeout(waitForCheckout, 500);
    }
  }
  
  // Inject coupon widget HTML
  function injectCouponWidget(checkoutBtn) {
    // Don't inject twice
    if (document.getElementById('coupon-widget')) return;
    
    const widget = document.createElement('div');
    widget.id = 'coupon-widget';
    widget.innerHTML = `
      <style>
        #coupon-widget {
          margin-bottom: 15px;
          padding: 15px;
          background: linear-gradient(135deg, #f5f3ff, #ede9fe);
          border-radius: 12px;
          border: 1px solid #c4b5fd;
        }
        #coupon-widget .coupon-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-weight: 600;
          color: #6d28d9;
        }
        #coupon-widget .coupon-input-row {
          display: flex;
          gap: 8px;
        }
        #coupon-widget input {
          flex: 1;
          padding: 12px 15px;
          border: 2px solid #c4b5fd;
          border-radius: 8px;
          font-size: 1em;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        #coupon-widget input:focus {
          outline: none;
          border-color: #8b5cf6;
        }
        #coupon-widget .apply-btn {
          padding: 12px 20px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        #coupon-widget .apply-btn:hover {
          background: #7c3aed;
        }
        #coupon-widget .apply-btn:disabled {
          background: #a78bfa;
          cursor: not-allowed;
        }
        #coupon-widget .coupon-message {
          margin-top: 10px;
          padding: 10px;
          border-radius: 8px;
          font-size: 0.9em;
        }
        #coupon-widget .coupon-success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #6ee7b7;
        }
        #coupon-widget .coupon-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }
        #coupon-widget .coupon-applied {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #coupon-widget .remove-coupon {
          background: none;
          border: none;
          color: #991b1b;
          cursor: pointer;
          font-size: 0.9em;
          text-decoration: underline;
        }
        #coupon-widget .discount-info {
          margin-top: 10px;
          padding: 10px;
          background: white;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #coupon-widget .original-price {
          text-decoration: line-through;
          color: #9ca3af;
        }
        #coupon-widget .discounted-price {
          font-weight: bold;
          color: #16a34a;
          font-size: 1.2em;
        }
      </style>
      
      <div class="coupon-header">
        <span>🎟️</span>
        <span>Have a coupon code?</span>
      </div>
      
      <div id="coupon-input-section">
        <div class="coupon-input-row">
          <input type="text" id="coupon-code-input" placeholder="Enter code" maxlength="20">
          <button type="button" class="apply-btn" id="apply-coupon-btn">Apply</button>
        </div>
      </div>
      
      <div id="coupon-message" style="display: none;"></div>
      <div id="coupon-discount-info" style="display: none;"></div>
    `;
    
    // Insert before checkout button
    const parent = checkoutBtn.parentElement;
    parent.insertBefore(widget, checkoutBtn);
    
    // Setup event listeners
    setupCouponEvents();
  }
  
  // Setup coupon event listeners
  function setupCouponEvents() {
    const input = document.getElementById('coupon-code-input');
    const applyBtn = document.getElementById('apply-coupon-btn');
    
    applyBtn.addEventListener('click', applyCoupon);
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCoupon();
      }
    });
  }
  
  // Apply coupon
  async function applyCoupon() {
    const input = document.getElementById('coupon-code-input');
    const applyBtn = document.getElementById('apply-coupon-btn');
    const messageEl = document.getElementById('coupon-message');
    const discountEl = document.getElementById('coupon-discount-info');
    
    const code = input.value.trim();
    if (!code) {
      showMessage('Please enter a coupon code', 'error');
      return;
    }
    
    // Get current price
    const priceEl = document.querySelector('[data-product-price], .product-price, .price-value, #product-price');
    if (priceEl) {
      const priceText = priceEl.textContent || priceEl.dataset.price || '';
      originalPrice = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    }
    
    // Get product ID
    const productId = getProductId();
    
    applyBtn.disabled = true;
    applyBtn.textContent = '...';
    
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          product_id: productId,
          order_amount: originalPrice
        })
      });
      
      const data = await res.json();
      
      if (data.valid) {
        appliedCoupon = data.coupon;
        discountedPrice = data.discounted_price;
        
        // Show success
        showMessage(`✅ Coupon "${data.coupon.code}" applied! You save €${data.discount.toFixed(2)}`, 'success', true);
        
        // Show discount info
        discountEl.innerHTML = `
          <div class="discount-info">
            <span>Original: <span class="original-price">€${originalPrice.toFixed(2)}</span></span>
            <span>New Price: <span class="discounted-price">€${discountedPrice.toFixed(2)}</span></span>
          </div>
        `;
        discountEl.style.display = 'block';
        
        // Update checkout button
        updateCheckoutButton(discountedPrice, data.discount);
        
        // Hide input, show applied state
        document.getElementById('coupon-input-section').style.display = 'none';
        
        // Store in session for checkout
        sessionStorage.setItem('appliedCoupon', JSON.stringify({
          id: data.coupon.id,
          code: data.coupon.code,
          discount: data.discount,
          discounted_price: discountedPrice
        }));
        
      } else {
        showMessage('❌ ' + data.error, 'error');
        appliedCoupon = null;
      }
    } catch (err) {
      showMessage('❌ Failed to validate coupon', 'error');
    }
    
    applyBtn.disabled = false;
    applyBtn.textContent = 'Apply';
  }
  
  // Show message
  function showMessage(text, type, showRemove = false) {
    const messageEl = document.getElementById('coupon-message');
    messageEl.className = 'coupon-message coupon-' + type;
    
    if (showRemove) {
      messageEl.innerHTML = `
        <div class="coupon-applied">
          <span>${text}</span>
          <button type="button" class="remove-coupon" onclick="window.removeCoupon()">Remove</button>
        </div>
      `;
    } else {
      messageEl.textContent = text;
    }
    
    messageEl.style.display = 'block';
  }
  
  // Remove coupon
  window.removeCoupon = function() {
    appliedCoupon = null;
    discountedPrice = 0;
    
    document.getElementById('coupon-message').style.display = 'none';
    document.getElementById('coupon-discount-info').style.display = 'none';
    document.getElementById('coupon-input-section').style.display = 'block';
    document.getElementById('coupon-code-input').value = '';
    
    // Restore original checkout button
    restoreCheckoutButton();
    
    // Clear session storage
    sessionStorage.removeItem('appliedCoupon');
  };
  
  // Update checkout button with discounted price
  function updateCheckoutButton(newPrice, discount) {
    const checkoutBtn = document.querySelector('.checkout-btn, #checkout-btn, [data-checkout-btn], .buy-now-btn');
    if (!checkoutBtn) return;
    
    // Store original text
    if (!checkoutBtn.dataset.originalText) {
      checkoutBtn.dataset.originalText = checkoutBtn.innerHTML;
    }
    
    // Update button text
    const btnText = checkoutBtn.textContent || '';
    if (btnText.includes('€')) {
      checkoutBtn.innerHTML = checkoutBtn.innerHTML.replace(
        /€[\d.,]+/g,
        `<span style="text-decoration: line-through; opacity: 0.7; font-size: 0.85em;">€${originalPrice.toFixed(2)}</span> €${newPrice.toFixed(2)}`
      );
    } else {
      // Add price to button
      const originalInner = checkoutBtn.innerHTML;
      checkoutBtn.innerHTML = originalInner + ` <span style="background: #16a34a; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">-€${discount.toFixed(2)}</span>`;
    }
    
    checkoutBtn.style.background = 'linear-gradient(135deg, #16a34a, #059669)';
  }
  
  // Restore checkout button
  function restoreCheckoutButton() {
    const checkoutBtn = document.querySelector('.checkout-btn, #checkout-btn, [data-checkout-btn], .buy-now-btn');
    if (!checkoutBtn || !checkoutBtn.dataset.originalText) return;
    
    checkoutBtn.innerHTML = checkoutBtn.dataset.originalText;
    checkoutBtn.style.background = '';
  }
  
  // Get product ID from URL or page
  function getProductId() {
    // Try URL patterns
    const urlMatch = window.location.pathname.match(/product-(\d+)/);
    if (urlMatch) return urlMatch[1];
    
    // Try query string
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) return params.get('id');
    
    // Try data attribute
    const productEl = document.querySelector('[data-product-id]');
    if (productEl) return productEl.dataset.productId;
    
    return null;
  }
  
  // Get applied coupon (for checkout process)
  window.getAppliedCoupon = function() {
    const stored = sessionStorage.getItem('appliedCoupon');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return appliedCoupon ? {
      id: appliedCoupon.id,
      code: appliedCoupon.code,
      discount: originalPrice - discountedPrice,
      discounted_price: discountedPrice
    } : null;
  };
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCouponWidget);
  } else {
    initCouponWidget();
  }
})();
