/*
 * Pricing and checkout helpers.
 * OPTIMIZED: Fast R2 temp upload + background Archive.org processing
 * - Parallel uploads for speed
 * - Progress indicator
 * - Temporary R2 storage before Archive.org
 * - Background server-side processing
 */

;(function(){
  let cachedAddonEmail = '';
  let isCheckoutInProgress = false; // Prevent double clicks

  function syncEmailToWhop(email) {
    cachedAddonEmail = email || '';
    window.cachedAddonEmail = cachedAddonEmail;

    const embed = document.getElementById('whop-embedded-checkout');
    if (!embed) return;

    if (cachedAddonEmail) {
      embed.setAttribute('data-whop-checkout-email', cachedAddonEmail);
    } else {
      embed.removeAttribute('data-whop-checkout-email');
    }
  }

  function initAddonEmailListener() {
    const form = document.getElementById('addons-form');
    if (!form) return;
    const emailInput = form.querySelector('input[type="email"]');
    if (!emailInput) return;

    const handleEmailUpdate = () => {
      const val = (emailInput.value || '').trim();
      if (val && val.includes('@')) {
        syncEmailToWhop(val);
      } else {
        syncEmailToWhop('');
      }
    };

    emailInput.addEventListener('input', handleEmailUpdate);
    emailInput.addEventListener('change', handleEmailUpdate);
    handleEmailUpdate();
  }

  // Add spinner CSS once
  function ensureSpinnerCSS() {
    if (document.getElementById('checkout-spinner-css')) return;
    const style = document.createElement('style');
    style.id = 'checkout-spinner-css';
    style.textContent = `
      .checkout-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: checkoutSpin 0.8s linear infinite;
        vertical-align: middle;
      }
      @keyframes checkoutSpin {
        to { transform: rotate(360deg); }
      }
      .btn-loading {
        pointer-events: none !important;
        opacity: 0.7 !important;
        cursor: wait !important;
      }
    `;
    document.head.appendChild(style);
  }

  function updateTotal() {
    let addonTotal = 0;
    const selects = document.querySelectorAll('select.form-select');
    selects.forEach(sel => {
      const opt = sel.selectedOptions[0];
      if (opt && opt.dataset.price) addonTotal += parseFloat(opt.dataset.price);
    });
    const inputs = document.querySelectorAll('input.addon-radio:checked, input.addon-checkbox:checked');
    inputs.forEach(el => {
      if (el.dataset.price) addonTotal += parseFloat(el.dataset.price);
    });
    window.currentTotal = window.basePrice + addonTotal;
    const btn = document.getElementById('checkout-btn');
    // Only update text if NOT in loading state
    if (btn && !btn.classList.contains('btn-loading')) {
      btn.textContent = '✅ Proceed to Checkout - $' + window.currentTotal.toLocaleString();
    }
    // Also update via global function if available
    if (typeof window.updateCheckoutPrice === 'function') {
      window.updateCheckoutPrice(window.currentTotal);
    }
  }

  async function handleCheckout() {
    // Prevent double clicks
    if (isCheckoutInProgress) {
      console.warn('⚠️ Checkout already in progress');
      return;
    }

    const btn = document.getElementById('checkout-btn');
    const payBtn = document.getElementById('apple-pay-btn');
    
    if (!btn) {
      console.error('🔴 CHECKOUT BUTTON NOT FOUND');
      return;
    }

    // Mark checkout in progress
    isCheckoutInProgress = true;
    
    // Ensure spinner CSS exists
    ensureSpinnerCSS();

    // Validation first
    let valid = true;
    document.querySelectorAll('.addon-group').forEach(grp => {
      const lbl = grp.querySelector('.addon-group-label');
      if (lbl && lbl.innerText.includes('*')) {
        const inp = grp.querySelector('input, select, textarea');
        if (inp && !inp.value) {
          inp.style.borderColor = 'red';
          valid = false;
        }
      }
    });
    if (!valid) {
      console.error('🔴 VALIDATION FAILED');
      alert('Please fill required fields');
      isCheckoutInProgress = false;
      return;
    }

    // Store original text
    const originalText = btn.textContent;
    const payBtnOriginal = payBtn ? payBtn.innerHTML : '';
    
    // Show spinner on checkout button
    btn.classList.add('btn-loading');
    btn.disabled = true;
    btn.innerHTML = '<span class="checkout-spinner"></span> Processing...';
    
    // Also disable Pay button
    if (payBtn) {
      payBtn.classList.add('btn-loading');
      payBtn.disabled = true;
      payBtn.innerHTML = '<span class="checkout-spinner"></span> Wait...';
    }

    // Helper to restore buttons
    const restoreButtons = () => {
      isCheckoutInProgress = false;
      btn.classList.remove('btn-loading');
      btn.disabled = false;
      btn.textContent = originalText;
      if (payBtn) {
        payBtn.classList.remove('btn-loading');
        payBtn.disabled = false;
        payBtn.innerHTML = payBtnOriginal;
      }
    };
    
    // Expose restore function globally for payment selector
    window.restoreCheckoutButtons = restoreButtons;
    
    // Check if files are still uploading
    if (window.isUploadInProgress && window.isUploadInProgress()) {
      alert('Please wait for file uploads to complete.');
      restoreButtons();
      return;
    }

    // Gather form data
    const formEl = document.getElementById('addons-form');
    const selectedAddons = [];

    if (formEl) {
      const formData = new FormData(formEl);
      for (const pair of formData.entries()) {
        const key = pair[0];
        const val = pair[1];
        if (val instanceof File) continue;
        if (val) selectedAddons.push({ field: key, value: val });
      }
    }

    // Get uploaded files from instant-upload.js
    const uploadedFiles = window.getUploadedFiles ? window.getUploadedFiles() : {};
    Object.keys(uploadedFiles).forEach(inputId => {
      const fileUrl = uploadedFiles[inputId];
      if (fileUrl) {
        selectedAddons.push({
          field: inputId,
          value: `[PHOTO LINK]: ${fileUrl}`
        });
      }
    });

    // Determine delivery time
    let deliveryDays = window.productData?.delivery_time_days || 1;
    let isInstant = window.productData?.instant_delivery || false;
    
    const deliveryAddon = selectedAddons.find(a => {
      const fieldId = (a.field || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return fieldId.includes('delivery') || fieldId === 'delivery-time';
    });
    
    if (deliveryAddon && window.productData?.addons_config) {
      try {
        const config = JSON.parse(window.productData.addons_config);
        const deliveryField = config.find(f => {
          const fid = (f.id || '').toLowerCase();
          return fid.includes('delivery') || fid === 'delivery-time';
        });
        
        if (deliveryField && deliveryField.options) {
          const selectedOption = deliveryField.options.find(o => o.label === deliveryAddon.value);
          if (selectedOption && selectedOption.delivery) {
            isInstant = !!selectedOption.delivery.instant;
            if (!isInstant && selectedOption.delivery.days) {
              deliveryDays = parseInt(selectedOption.delivery.days) || 1;
            }
          }
        }
      } catch (e) {}
    }
    
    const deliveryTimeMinutes = isInstant ? 60 : (deliveryDays * 24 * 60);

    // Get email
    let email = cachedAddonEmail || '';
    const emailInput = document.querySelector('#addons-form input[type="email"]');
    if (emailInput && emailInput.value.includes('@')) email = emailInput.value.trim();
    if (email) syncEmailToWhop(email);

    // Store order data in localStorage as backup
    const orderData = {
      addons: selectedAddons,
      email: email,
      amount: window.currentTotal,
      productId: window.productData.id,
      deliveryTimeMinutes: deliveryTimeMinutes,
      timestamp: Date.now()
    };
    localStorage.setItem('pendingOrderData', JSON.stringify(orderData));

    // Check if PaymentSelector is available
    if (typeof window.PaymentSelector !== 'undefined') {
      // Open payment selector modal - buttons will be restored when modal closes
      window.PaymentSelector.open({
        productId: window.productData.id,
        amount: window.currentTotal,
        email: email,
        addons: selectedAddons,
        deliveryTimeMinutes: deliveryTimeMinutes,
        onClose: restoreButtons // Restore when modal closes
      });
    } else {
      // Fallback to direct Whop checkout
      await processDirectWhopCheckout(selectedAddons, email, originalText, btn, deliveryTimeMinutes, restoreButtons);
    }
  }

  // Direct Whop checkout (fallback)
  async function processDirectWhopCheckout(selectedAddons, email, originalText, btn, deliveryTimeMinutes, restoreButtons) {
    try {
      const response = await fetch('/api/whop/create-plan-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: window.productData.id,
          amount: window.currentTotal,
          email: email,
          metadata: { 
            addons: selectedAddons,
            deliveryTimeMinutes: deliveryTimeMinutes || 60
          }
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      // Restore buttons before redirect
      restoreButtons();

      if (typeof window.whopCheckout === 'function' && data.checkout_url) {
        window.whopCheckout({
          planId: data.plan_id,
          email: data.email || email,
          metadata: { 
            addons: selectedAddons, 
            product_id: window.productData.id,
            deliveryTimeMinutes: deliveryTimeMinutes || 60
          },
          amount: window.currentTotal,
          checkoutUrl: data.checkout_url
        });
      } else if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Checkout Error: ' + err.message);
      restoreButtons();
    }
  }

  window.updateTotal = updateTotal;
  window.handleCheckout = handleCheckout;
  document.addEventListener('DOMContentLoaded', initAddonEmailListener);
})();
