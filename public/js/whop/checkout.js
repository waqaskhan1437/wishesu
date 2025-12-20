/*
 * Whop checkout integration.
 *
 * This module encapsulates loading the Whop checkout loader,
 * determining the correct plan based on price maps, and
 * presenting a modal overlay with an embedded checkout.
 * Updated to SAVE ORDER before redirecting.
 */

;(function(){
  let scriptPromise = null;
  /**
   * Load the Whop checkout loader script.
   * (Fix for: loadWhopScript is not defined)
   */
  function loadWhopScript() {
    if (window.Whop) return Promise.resolve();
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.whop.com/static/checkout/loader.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Whop checkout'));
      document.head.appendChild(s);
    });
    return scriptPromise;
  }
  // Yeh variable order ki details store karega taake completion par save kar saken
  let pendingOrderData = null;

  let lastAmount = 0;

  function formatUSD(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '';
    return `$${n.toFixed(2)}`;
  }

  function getTotalDueInfo(overlay) {
    const root = overlay?.querySelector?.('.whop-container');
    if (!root) return null;

    const needle = 'total due today';
    const moneyRe = /\$\s*[0-9][0-9.,]*/;

    let bestEl = null;
    let bestText = '';

    const nodes = root.querySelectorAll('div, span, p, strong, b, label');
    for (const el of nodes) {
      const raw = (el.textContent || '').trim();
      const low = raw.toLowerCase();
      if (!low.includes(needle)) continue;
      if (!moneyRe.test(raw)) continue;

      // Prefer the smallest/most-specific element to avoid hiding large containers.
      if (!bestEl || raw.length < bestText.length) {
        bestEl = el;
        bestText = raw;
      }
    }

    if (!bestEl) return null;

    const match = bestText.match(moneyRe);
    const priceText = match ? match[0].replace(/\s+/g, '') : null;

    return { row: bestEl, priceText };
  }

  function setPlaceOrderLabel(overlay, amount) {
    const btn = overlay?.querySelector?.('.whop-place-order');
    if (!btn) return;

    // Prefer the real total shown inside Whop UI (updates when addons change).
    const info = getTotalDueInfo(overlay);
    const uiPrice = info?.priceText || '';
    // Whop/Stripe sometimes shows $0.00 briefly while calculating.
    // Treat that as "not ready" so we can fall back to the real amount.
    const uiReady = uiPrice && uiPrice !== '$0.00';

    // Fallback to passed amount only if UI total not available yet.
    const fallback = formatUSD(amount);
    const price = uiReady ? uiPrice : fallback;

    btn.dataset.originalLabel = 'Place Order';
    btn.textContent = price ? `Place Order · ${price}` : 'Place Order';
  }

  function hideTotalDueRow(overlay) {
    const info = getTotalDueInfo(overlay);
    if (!info?.row) return false;

    const row = info.row.closest('div') || info.row;
    row.style.display = 'none';
    return true;
  }

  function parseMap(str) {
    const map = {};
    if (!str || typeof str !== 'string') return map;
    str.split(/[\n,]+/).forEach(item => {
      const parts = item.split('|');
      if (parts.length === 2) {
        const amt = parseFloat(parts[0].trim());
        const plan = parts[1].trim();
        if (!isNaN(amt) && plan) {
          map[amt.toFixed(2)] = plan;
        }
      }
    });
    return map;
  }

  function choosePlan(amount, priceMap, defaultPlan) {
    const amt = parseFloat(amount);
    if (!isNaN(amt)) {
      const keys = Object.keys(priceMap);
      for (const k of keys) {
        const price = parseFloat(k);
        if (Math.abs(price - amt) < 0.01) {
          return priceMap[k];
        }
      }
    }
    return defaultPlan || '';
  }

  function ensureOverlay() {
    let overlay = document.getElementById('whop-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'whop-overlay';
      overlay.className = 'whop-overlay';
      overlay.style.display = 'none';
      overlay.innerHTML = `
        <div class="whop-backdrop"></div>
        <div class="whop-modal">
          <div class="whop-header">
            <svg class="whop-lock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V10a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm-2 6V6a2 2 0 114 0v2H8z" clip-rule="evenodd" />
            </svg>
            <span>Powered by <b>Stripe</b></span>
          </div>
          <button class="whop-close" type="button">×</button>
          <div class="whop-container"></div>
          <div class="whop-sticky-footer">
            <button class="whop-place-order" type="button">Place Order</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = () => { overlay.style.display = 'none'; };
      overlay.querySelector('.whop-close').addEventListener('click', close);
      overlay.querySelector('.whop-backdrop').addEventListener('click', close);

      // Sticky Place Order button: disable + show Processing... to prevent double clicks
      const placeBtn = overlay.querySelector('.whop-place-order');
      if (placeBtn) {
        let isProcessing = false;
        placeBtn.addEventListener('click', () => {
          if (isProcessing) return;
          isProcessing = true;

          const original = placeBtn.dataset.originalLabel || 'Place Order';
          placeBtn.disabled = true;
          placeBtn.textContent = 'Processing...';
          placeBtn.setAttribute('aria-busy', 'true');

          try {
            if (window.wco && typeof window.wco.submit === 'function') {
              window.wco.submit('whop-embedded-checkout');
            } else {
              const embedRoot = document.getElementById('whop-embedded-checkout');
              const btn = embedRoot ? embedRoot.querySelector('button') : null;
              if (btn) btn.click();
            }
          } catch (e) {
            console.error('Failed to submit checkout:', e);
          }

          // Safety reset (if modal stays open due to validation errors, etc.)
          setTimeout(() => {
            isProcessing = false;
            placeBtn.disabled = false;
            // restore label with latest amount
            setPlaceOrderLabel(overlay, lastAmount);
            placeBtn.removeAttribute('aria-busy');
          }, 15000);
        });
      }
    }
    return overlay;
  }

  /**
   * Handle successful checkout: Save Order -> Redirect
   */
  async function handleComplete() {
    console.log('🎉 WHOP CHECKOUT COMPLETE!');
    console.log('📦 Pending order data:', pendingOrderData);
    
    const overlay = document.getElementById('whop-overlay');
    
    // User ko batayen ke order save ho raha hai
    if (overlay) {
        overlay.innerHTML = '<div style="color:white; font-size:1.5rem; font-weight:bold;">✅ Payment Successful!<br>Saving Order... Please wait.</div>';
    }

    try {
        if (!pendingOrderData) {
            console.error('❌ No pending order data!');
            alert('Payment successful but order data missing. Please contact support.');
            window.location.href = '/';
            return;
        }

        // Get uploaded files
        const uploadedFiles = window.getUploadedFiles ? window.getUploadedFiles() : {};
        console.log('📁 Uploaded files:', uploadedFiles);

        // Get addons from pending order data
        const addons = pendingOrderData?.metadata?.addons || [];

        // Filter out file upload placeholders and replace with actual URLs
        const nonFileAddons = addons.filter(a => {
            // Remove any addon that's a file input (will be replaced with actual URL)
            return !uploadedFiles.hasOwnProperty(a.field);
        });

        console.log('🔧 Filtered addons (removed file placeholders):', nonFileAddons.length);

        // Add uploaded file URLs to addons in proper format
        Object.keys(uploadedFiles).forEach(inputId => {
            const fileUrl = uploadedFiles[inputId];
            if (fileUrl) {
                // Format: [PHOTO LINK]: url (this is what buyer-order.js expects)
                nonFileAddons.push({
                    field: inputId,
                    value: `[PHOTO LINK]: ${fileUrl}`
                });
                console.log(`📸 Added photo link: ${inputId} -> ${fileUrl}`);
            }
        });

        console.log('📦 Final addons count:', nonFileAddons.length);

        // Calculate delivery time based on selected delivery option
        let deliveryTime = 2880; // Default: 48 hours (2 days);
        const deliveryAddon = nonFileAddons.find(a => a.field === 'delivery-time');
        if (deliveryAddon) {
            const deliveryValue = (deliveryAddon.value || '').toString();
            const v = deliveryValue.toLowerCase();

            if (v.includes('instant') || v.includes('60 min') || v.includes('60')) {
                deliveryTime = 60; // 60 minutes
            } else if (v.includes('24') || v.includes('express') || v.includes('1 day') || v.includes('24 hour')) {
                deliveryTime = 1440; // 24 hours
            } else if (v.includes('standard') || v.includes('48') || v.includes('2 day') || v.includes('2 days')) {
                deliveryTime = 2880; // 48 hours (2 days)
            }
        }
        console.log('⏰ Delivery time:', deliveryTime, 'minutes');

        // Data prepare karein
        const payload = {
            // Check metadata.product_id (from backend), metadata.productId, or root productId
            productId: pendingOrderData?.metadata?.product_id || pendingOrderData?.metadata?.productId || pendingOrderData?.productId || 1,
            amount: pendingOrderData?.amount || 0,
            email: pendingOrderData?.email || '',
            addons: nonFileAddons, // Includes uploaded file URLs without duplicates
            deliveryTime: deliveryTime
        };

        console.log('🚀 Sending to API:', payload);

        // Backend API call to save order
        const res = await fetch('/api/order/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('📡 API Response status:', res.status);
        const data = await res.json();
        console.log('📦 API Response data:', data);
        
        // Success: Redirect DIRECTLY to buyer order page
        if (data && data.orderId) {
            console.log('✅ Order created! ID:', data.orderId);
            console.log('🎯 Redirecting to buyer order page...');
            // Direct buyer order page pe redirect
            window.location.href = `/buyer-order?id=${data.orderId}`;
        } else {
            console.warn('⚠️ No order ID in response');
            window.location.href = '/';
        }

    } catch (err) {
        console.error('❌ Order Save Failed:', err);
        alert('Payment successful! Please check your email or contact support with this info: ' + err.message);
        window.location.href = '/';
    }
  }

  /**
   * Main function to open the Whop checkout.
   */
  async function openCheckout(opts = {}) {
    console.log('🟢 WHOP CHECKOUT: openCheckout called');
    console.log('🟢 Options received:', opts);

    // 1. Store order details for later use in handleComplete
    const mergedEmail = opts.email || window.cachedAddonEmail || '';
    pendingOrderData = Object.assign({}, opts, { email: mergedEmail });

    // Keep the latest calculated total so we can show it on the sticky button.
    lastAmount = Number(opts.amount || 0);

    const overlay = ensureOverlay();
    console.log('🟢 Overlay element:', overlay ? 'Created' : 'Failed');

    // Always show total price next to "Place Order".
    setPlaceOrderLabel(overlay, lastAmount);

    const globals = window.whopSettings || {};
    console.log('🟢 Global Whop Settings:', globals);

    // Check if planId is directly provided (from dynamic plan creation)
    let selectedPlan = opts.planId || '';

    // If no direct planId, try to find from price maps
    if (!selectedPlan) {
      const prodMapStr = opts.productPriceMap || (window.productData && window.productData.whop_price_map) || '';
      const globalMapStr = globals.price_map || '';
      const priceMap = Object.assign({}, parseMap(globalMapStr), parseMap(prodMapStr));
      console.log('🟢 Price Map:', priceMap);

      const defaultPlan = opts.productPlan || (window.productData && window.productData.whop_plan) || globals.default_plan_id || '';
      console.log('🟢 Default Plan:', defaultPlan);

      selectedPlan = choosePlan(opts.amount || 0, priceMap, defaultPlan);
    }

    console.log('🟢 Selected Plan ID:', selectedPlan);

    if (!selectedPlan) {
      console.error('🔴 NO PLAN ID FOUND!');
      console.error('🔴 Options:', opts);
      alert('❌ Whop checkout not configured!\n\nNo plan ID found for this product.');
      return;
    }

    const theme = globals.theme || 'light';
    const metadataObj = opts.metadata || {};
    
    // Email is passed directly to the checkout embed, not metadata.
    // The email is also in `pendingOrderData` for the `handleComplete` function.
    
    const metadataStr = JSON.stringify(metadataObj);
    console.log('🟢 Metadata:', metadataStr);

    // Prepare email attribute for the embed
    const email = pendingOrderData.email || '';
    const emailAttribute = email ? `data-whop-checkout-email="${email}"` : '';
    console.log('🟢 Email attribute:', emailAttribute);

    // Construct the embed HTML with email attribute
    // Hide Whop's internal submit button (we use our own sticky Place Order button)
    const embed = `<div id="whop-embedded-checkout" data-whop-checkout-plan-id="${selectedPlan}" data-whop-checkout-theme="${theme}" ${emailAttribute} data-whop-checkout-hide-submit-button="true" data-whop-checkout-metadata='${metadataStr}' data-whop-checkout-on-complete="whopCheckoutComplete"></div>`;
    
    console.log('🟢 Embed HTML:', embed);

    const container = overlay.querySelector('.whop-container');
    if (!container) {
      console.error('🔴 WHOP CONTAINER NOT FOUND!');
      alert('Error: Checkout container not found');
      return;
    }

    container.innerHTML = embed;
    console.log('🟢 Embed inserted into container');

    overlay.style.display = 'flex';
    console.log('🟢 Overlay displayed');

    // Attach our custom save handler to the global scope
    window.whopCheckoutComplete = handleComplete;
    console.log('🟢 Completion handler attached');

    console.log('🟢 Loading Whop script...');
    try {
      await loadWhopScript();
      console.log('✅ Whop script loaded successfully!');

      // The embed renders async. Hide the "Total due today" row and rely on our sticky
      // button to show the total price.
      let tries = 0;
      const interval = setInterval(() => {
        tries += 1;

        // Keep updating the button label from the live Whop UI total.
        setPlaceOrderLabel(overlay, lastAmount);

        const hidden = hideTotalDueRow(overlay);
        const btn = overlay?.querySelector?.('.whop-place-order');
        const hasPrice = btn && /\$\s*[0-9]/.test(btn.textContent || '');

        if ((hidden && hasPrice) || tries > 40) {
          clearInterval(interval);
        }
      }, 150);
    } catch (err) {
      console.error('🔴 FAILED TO LOAD WHOP SCRIPT:', err);
      alert('❌ Failed to load Whop checkout:\n\n' + err.message + '\n\nPlease refresh and try again.');
      overlay.style.display = 'none';
    }
  }

  window.whopCheckout = openCheckout;
})();
