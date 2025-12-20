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
    window.currentTotal = (Number(window.basePrice)||0) + addonTotal;
    const btn = document.getElementById('checkout-btn');
    if (btn) btn.textContent = 'Checkout - $' + window.currentTotal.toLocaleString();
  }

  async function handleCheckout() {
    
    try { if (typeof updateTotal === "function") updateTotal(); } catch (e) {}
const btn = document.getElementById('checkout-btn');
    if (!btn) {
      console.error('🔴 CHECKOUT BUTTON NOT FOUND');
      return;
    }

    // Prevent double clicks
    if (btn.disabled) {
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
    const originalText = btn.textContent;
    
    // Show loading spinner
    btn.disabled = true;
    btn.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>
        Opening checkout...
      </span>
    `;
    
    // 1. Gather Data & Find Files
    const formEl = document.getElementById('addons-form');
    const selectedAddons = [];
    const fileUploads = []; 
    
    if (formEl) {
      const formData = new FormData(formEl);
      for (const pair of formData.entries()) {
        const key = pair[0];
        const val = pair[1];
        
        if (val instanceof File) {
          if (val.size > 0) fileUploads.push({ key: key, file: val });
        } else if (val) {
          selectedAddons.push({ field: key, value: val });
        }
      }
    }

    // 2. Upload Files to R2 TEMP Storage (FAST - CloudFlare CDN)
    if (fileUploads.length > 0) {
      btn.disabled = true;
      
      try {
        const sessionId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const totalFiles = fileUploads.length;
        let uploadedCount = 0;

        // PARALLEL UPLOAD for maximum speed (batch of 3 at a time)
        const batchSize = 3;
        for (let i = 0; i < fileUploads.length; i += batchSize) {
          const batch = fileUploads.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (item) => {
            const safeName = item.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uploadUrl = `/api/upload/temp-file?sessionId=${sessionId}&filename=${encodeURIComponent(safeName)}`;
            
            const res = await fetch(uploadUrl, {
              method: 'POST',
              body: item.file
            });
            
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || errData.details || 'Upload failed: ' + res.status);
            }
            
            const data = await res.json();
            uploadedCount++;
            btn.textContent = `Uploading (${uploadedCount}/${totalFiles})... ⏳`;
            
            if (data.success && data.tempUrl) {
              return { 
                field: item.key, 
                tempUrl: data.tempUrl,
                filename: safeName
              };
            } else {
              throw new Error(data.error || 'Unknown upload error');
            }
          });

          await Promise.all(batchPromises).then(results => {
            results.forEach(result => {
              selectedAddons.push({ 
                field: result.field, 
                value: `[TEMP_FILE]: ${result.tempUrl}`,
                filename: result.filename
              });
            });
          });
        }

        // Store session ID for background processing
        selectedAddons.push({
          field: '_temp_session',
          value: sessionId
        });

        btn.textContent = 'Upload Complete ✓';
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error('Upload error:', err);
        alert('Upload Error: ' + err.message + '\n\nPlease check your internet connection and try again.');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
    }

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
      const data = await response.json();
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
      // Reset button
      btn.disabled = false;
      btn.textContent = originalText;

      // Always use embedded popup with email prefill
      if (typeof window.whopCheckout === 'function') {
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
