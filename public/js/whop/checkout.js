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
          <button class="whop-close" type="button">×</button>
          <div class="whop-price-header">
            <div class="whop-price-header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V10a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm-2 6V6a2 2 0 114 0v2H8z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="whop-price-header-text">
              <span class="whop-price-title">Secure Checkout</span>
              <span class="whop-price-amount"></span>
            </div>
          </div>
          <div class="whop-container"></div>
          <div class="whop-powered-by">
            <svg class="whop-stripe-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V10a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm-2 6V6a2 2 0 114 0v2H8z" clip-rule="evenodd" />
            </svg>
            <span>Secured by <b>Stripe</b></span>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = () => { overlay.style.display = 'none'; };
      overlay.querySelector('.whop-close').addEventListener('click', close);
      overlay.querySelector('.whop-backdrop').addEventListener('click', close);
    }
    return overlay;
  }

  function updatePriceHeader(overlay, amount) {
    const priceEl = overlay?.querySelector?.('.whop-price-amount');
    if (priceEl) {
      const formatted = formatUSD(amount);
      priceEl.textContent = formatted ? `for ${formatted}` : '';
    }
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

        // Get addons from pending order data (already includes photo URLs from checkout.js)
        console.log('📦 Full pendingOrderData:', JSON.stringify(pendingOrderData, null, 2));
        console.log('📦 pendingOrderData.metadata:', pendingOrderData?.metadata);

        // Try to get addons from multiple sources
        let addons = pendingOrderData?.metadata?.addons || [];

        // Fallback: Check localStorage if addons are empty
        if (!addons || addons.length === 0) {
            try {
                const storedData = localStorage.getItem('pendingOrderData');
                if (storedData) {
                    const parsed = JSON.parse(storedData);
                    console.log('📦 Found stored order data in localStorage:', parsed);
                    if (parsed.addons && parsed.addons.length > 0) {
                        addons = parsed.addons;
                        // Also update email/amount if missing
                        if (!pendingOrderData.email && parsed.email) {
                            pendingOrderData.email = parsed.email;
                        }
                        if (!pendingOrderData.amount && parsed.amount) {
                            pendingOrderData.amount = parsed.amount;
                        }
                        if (!pendingOrderData.productId && parsed.productId) {
                            pendingOrderData.productId = parsed.productId;
                        }
                    }
                    // Clear localStorage after use
                    localStorage.removeItem('pendingOrderData');
                }
            } catch (e) {
                console.log('localStorage parse error:', e);
            }
        }

        console.log('📦 Final Addons array:', addons.length, 'items:', addons);

        // Calculate delivery time based on selected delivery option
        let deliveryTime = 2880; // Default: 48 hours (2 days);
        const deliveryAddon = addons.find(a => a.field === 'delivery-time');
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
            addons: addons, // Includes photo URLs and form data
            deliveryTime: deliveryTime
        };

        // Final validation - make sure we have addons
        if (!payload.addons || payload.addons.length === 0) {
            console.warn('⚠️ No addons found in payload!');
        } else {
            console.log('✅ Payload has', payload.addons.length, 'addons');
        }

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

    // Update the price header with current total
    updatePriceHeader(overlay, lastAmount);

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
    // Use Whop's native submit button for best reliability
    const embed = `<div id="whop-embedded-checkout" data-whop-checkout-plan-id="${selectedPlan}" data-whop-checkout-theme="${theme}" ${emailAttribute} data-whop-checkout-metadata='${metadataStr}' data-whop-checkout-on-complete="whopCheckoutComplete"></div>`;
    
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

      // The embed renders async. Update price header when ready.
      let tries = 0;
      const interval = setInterval(() => {
        tries += 1;

        // Keep updating the price header
        updatePriceHeader(overlay, lastAmount);

        // Check if Whop embed has loaded
        const embedRoot = document.getElementById('whop-embedded-checkout');
        const hasContent = embedRoot && embedRoot.children.length > 0;

        if (hasContent || tries > 40) {
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
