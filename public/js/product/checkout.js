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
    if (btn) btn.textContent = '✅ Proceed to Checkout - $' + window.currentTotal.toLocaleString();
    // Also update via global function if available
    if (typeof window.updateCheckoutPrice === 'function') {
      window.updateCheckoutPrice(window.currentTotal);
    }
  }

  async function handleCheckout() {
    console.log('🔵 CHECKOUT STARTED');
    console.log('🔵 Product Data:', window.productData);
    console.log('🔵 Current Total:', window.currentTotal);
    console.log('🔵 Base Price:', window.basePrice);

    const btn = document.getElementById('checkout-btn');
    if (!btn) {
      console.error('🔴 CHECKOUT BUTTON NOT FOUND');
      return;
    }

    // Prevent double clicks
    if (btn.disabled) {
      console.warn('⚠️ CHECKOUT BUTTON ALREADY DISABLED');
      return;
    }

    // Validation
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
      console.error('🔴 VALIDATION FAILED - Required fields missing');
      alert('Please fill required fields');
      return;
    }
    console.log('✅ Validation passed');

    const originalText = btn.textContent;
    
    // Also get Apple Pay button if exists
    const applePayBtn = document.getElementById('apple-pay-btn');
    const applePayOriginal = applePayBtn ? applePayBtn.innerHTML : '';
    
    // Show loading spinner on both buttons
    btn.disabled = true;
    btn.style.opacity = '0.8';
    btn.style.cursor = 'not-allowed';
    btn.innerHTML = `
      <span style="display: inline-flex; align-items: center; justify-content: center; gap: 10px;">
        <span class="checkout-spinner"></span>
        Processing...
      </span>
    `;
    
    // Also disable Apple Pay button if exists
    if (applePayBtn) {
      applePayBtn.disabled = true;
      applePayBtn.style.opacity = '0.6';
      applePayBtn.style.cursor = 'not-allowed';
    }
    
    // Add spinner CSS if not exists
    if (!document.getElementById('checkout-spinner-css')) {
      const style = document.createElement('style');
      style.id = 'checkout-spinner-css';
      style.textContent = `
        .checkout-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: checkoutSpin 0.8s linear infinite;
        }
        @keyframes checkoutSpin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Helper to restore buttons
    const restoreButtons = () => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.textContent = originalText;
      if (applePayBtn) {
        applePayBtn.disabled = false;
        applePayBtn.style.opacity = '1';
        applePayBtn.style.cursor = 'pointer';
        applePayBtn.innerHTML = applePayOriginal;
      }
    };
    
    // 1. Check if files are still uploading
    if (window.isUploadInProgress && window.isUploadInProgress()) {
      alert('Please wait for file uploads to complete.');
      restoreButtons();
      return;
    }

    // 2. Gather form data (text fields, selects, radios, checkboxes)
    const formEl = document.getElementById('addons-form');
    const selectedAddons = [];

    console.log('🔵 Form element found:', !!formEl);
    console.log('🔵 Form innerHTML preview:', formEl ? formEl.innerHTML.substring(0, 500) : 'N/A');

    if (formEl) {
      // Method 1: FormData
      const formData = new FormData(formEl);
      console.log('🔵 FormData entries count:', [...formData.entries()].length);
      console.log('🔵 FormData entries:');
      for (const pair of formData.entries()) {
        const key = pair[0];
        const val = pair[1];
        console.log(`   - ${key}:`, val instanceof File ? `[File: ${val.name}]` : val);

        // Skip file inputs - they are handled by instant-upload.js
        if (val instanceof File) {
          continue;
        }

        if (val) {
          selectedAddons.push({ field: key, value: val });
        }
      }

      // Method 2: Also check all form elements directly
      console.log('🔵 Direct form elements:');
      const allInputs = formEl.querySelectorAll('input, select, textarea');
      allInputs.forEach(el => {
        if (el.type === 'file') return;
        if (el.type === 'radio' && !el.checked) return;
        if (el.type === 'checkbox' && !el.checked) return;
        console.log(`   - ${el.name || el.id}: ${el.value} (type: ${el.type})`);
      });
    }

    console.log('🔵 Selected addons from form:', selectedAddons);

    // 3. Get uploaded files from instant-upload.js
    const uploadedFiles = window.getUploadedFiles ? window.getUploadedFiles() : {};
    console.log('📁 Files from instant-upload:', uploadedFiles);

    // Add uploaded file URLs to addons
    Object.keys(uploadedFiles).forEach(inputId => {
      const fileUrl = uploadedFiles[inputId];
      if (fileUrl) {
        selectedAddons.push({
          field: inputId,
          value: `[PHOTO LINK]: ${fileUrl}`
        });
        console.log(`📸 Added photo: ${inputId} -> ${fileUrl}`);
      }
    });

    // 4. Determine delivery time from selected addon or product default
    let deliveryDays = window.productData?.delivery_time_days || 1;
    let isInstant = window.productData?.instant_delivery || false;
    
    // Check if any addon has delivery time setting
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
      } catch (e) {
        console.warn('Could not parse addon delivery config:', e);
      }
    }
    
    // Convert days to minutes for order (instant = 60 minutes)
    const deliveryTimeMinutes = isInstant ? 60 : (deliveryDays * 24 * 60);
    console.log('📦 Delivery:', isInstant ? 'Instant (60min)' : `${deliveryDays} day(s) (${deliveryTimeMinutes} min)`);

    // 5. Open Payment Selector Modal
    btn.innerHTML = `
      <span style="display: inline-flex; align-items: center; justify-content: center; gap: 10px;">
        <span class="checkout-spinner"></span>
        Loading payment...
      </span>
    `;
    
    let email = cachedAddonEmail || '';
    const emailInput = document.querySelector('#addons-form input[type="email"]');
    if (emailInput && emailInput.value.includes('@')) email = emailInput.value.trim();
    if (email) syncEmailToWhop(email);

    console.log('🔵 Opening Payment Selector...');
    console.log('🔵 Product ID:', window.productData.id);
    console.log('🔵 Amount:', window.currentTotal);
    console.log('🔵 Email:', email || '(none)');
    console.log('🔵 Selected Addons:', selectedAddons);

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
    console.log('🔵 Stored order data in localStorage:', orderData);

    // Reset buttons before opening modal
    restoreButtons();

    // Check if PaymentSelector is available
    if (typeof window.PaymentSelector !== 'undefined') {
      // Open payment selector modal
      window.PaymentSelector.open({
        productId: window.productData.id,
        amount: window.currentTotal,
        email: email,
        addons: selectedAddons,
        deliveryTimeMinutes: deliveryTimeMinutes
      });
    } else {
      // Fallback to direct Whop checkout
      console.log('🔵 PaymentSelector not loaded, using direct Whop checkout...');
      await processDirectWhopCheckout(selectedAddons, email, originalText, btn, deliveryTimeMinutes, restoreButtons);
    }
  }

  // Direct Whop checkout (fallback)
  async function processDirectWhopCheckout(selectedAddons, email, originalText, btn, deliveryTimeMinutes, restoreButtons) {
    btn.disabled = true;
    btn.style.opacity = '0.8';
    btn.innerHTML = `
      <span style="display: inline-flex; align-items: center; justify-content: center; gap: 10px;">
        <span class="checkout-spinner"></span>
        Processing...
      </span>
    `;

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

      // Restore buttons
      if (restoreButtons) restoreButtons();
      else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = originalText;
      }

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
      // Restore buttons on error
      if (restoreButtons) restoreButtons();
      else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = originalText;
      }
    }
  }

  window.updateTotal = updateTotal;
  window.handleCheckout = handleCheckout;
  document.addEventListener('DOMContentLoaded', initAddonEmailListener);
})();
