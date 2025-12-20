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
    if (btn) btn.textContent = 'Checkout - $' + window.currentTotal.toLocaleString();
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
    
    // Show loading spinner
    btn.disabled = true;
    btn.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>
        Opening checkout...
      </span>
    `;
    
    // 1. Check if files are still uploading
    if (window.isUploadInProgress && window.isUploadInProgress()) {
      alert('Please wait for file uploads to complete.');
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    // 2. Gather form data (text fields, selects, radios, checkboxes)
    const formEl = document.getElementById('addons-form');
    const selectedAddons = [];

    if (formEl) {
      const formData = new FormData(formEl);
      for (const pair of formData.entries()) {
        const key = pair[0];
        const val = pair[1];

        // Skip file inputs - they are handled by instant-upload.js
        if (val instanceof File) {
          continue;
        }

        if (val) {
          selectedAddons.push({ field: key, value: val });
        }
      }
    }

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

    // 3. Whop Dynamic Checkout - Auto Plan Creation
    btn.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>
        Processing...
      </span>
    `;
    let email = cachedAddonEmail || '';
    const emailInput = document.querySelector('#addons-form input[type="email"]');
    if (emailInput && emailInput.value.includes('@')) email = emailInput.value.trim();
    if (email) syncEmailToWhop(email);

    console.log('🔵 Creating Dynamic Whop Checkout...');
    console.log('🔵 Product ID:', window.productData.id);
    console.log('🔵 Amount:', window.currentTotal);
    console.log('🔵 Email:', email || '(none)');
    console.log('🔵 Selected Addons:', selectedAddons);

    try {
      // Call dynamic plan creation endpoint
      const response = await fetch('/api/whop/create-plan-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: window.productData.id,
          amount: window.currentTotal,
          email: email,
          metadata: {
            addons: selectedAddons
          }
        })
      });

      console.log('🔵 API Response Status:', response.status);
      const data = await response.json();
      console.log('🔵 API Response Data:', data);

      if (!response.ok || data.error) {
        console.error('🔴 Checkout creation failed:', data);
        let errorMsg = 'Failed to create checkout';
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMsg = data.error;
          } else if (typeof data.error === 'object') {
            errorMsg = JSON.stringify(data.error, null, 2);
          }
        }
        alert('❌ Checkout Error:\n\n' + errorMsg);
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      if (!data.plan_id && !data.checkout_url) {
        console.error('🔴 No plan ID or checkout URL in response');
        alert('❌ Error: No checkout information received');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      console.log('✅ Checkout created successfully!');
      console.log('🔵 Plan ID:', data.plan_id);
      console.log('🔵 Checkout URL:', data.checkout_url);
      console.log('🔵 Email Prefilled:', data.email_prefilled);

      // Reset button
      btn.disabled = false;
      btn.textContent = originalText;

      // Always use embedded popup with email prefill
      if (typeof window.whopCheckout === 'function') {
        console.log('🔵 Opening Whop embedded checkout modal with email prefill...');
        
        // Show email prefill status
        if (data.email_prefilled) {
          btn.textContent = '✅ Email Auto-filled! Opening checkout...';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
        
        window.whopCheckout({
          planId: data.plan_id,
          email: data.email || email,
          metadata: data.metadata,
          productId: data.product_id,
          // Pass the latest calculated total so the embedded modal can display
          // the correct price next to our sticky "Place Order" button.
          amount: window.currentTotal,
          checkoutUrl: data.checkout_url // Pass checkout URL for embedded popup
        });
      } 
      // Fallback to direct URL only if embedded not available
      else if (data.checkout_url) {
        console.log('🔵 Embedded checkout not available, using direct URL...');
        window.location.href = data.checkout_url;
      } else {
        console.error('🔴 No checkout method available!');
        alert('❌ Checkout not available. Please refresh the page and try again.');
      }

    } catch (err) {
      console.error('🔴 CHECKOUT ERROR:', err);
      alert('❌ Checkout Error:\n\n' + err.message + '\n\nPlease check your internet connection and try again.');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  window.updateTotal = updateTotal;
  window.handleCheckout = handleCheckout;
  document.addEventListener('DOMContentLoaded', initAddonEmailListener);
})();
