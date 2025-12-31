(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  let orderData = null;
  let selectedRating = 5;
  let countdownTimer = null;
  let tipCheckInterval = null;

  if (!orderId) { showError('Order ID not found'); return; }

  // Check if returning from tip payment
  const tipSuccess = urlParams.get('tip_success');
  const tipAmount = urlParams.get('tip_amount');
  if (tipSuccess === '1' && tipAmount) {
    // Mark tip as paid
    fetch('/api/order/tip-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount: parseFloat(tipAmount) })
    }).then(() => {
      // Clean URL and reload
      window.history.replaceState({}, '', `?id=${orderId}`);
      alert('🎉 Thank you for your generous tip!');
    });
  }

  // Fetch server time and load order
  fetchServerTimeOffset().then(offset => {
    window.timerOffset = offset;
    loadOrder();
  }).catch(() => {
    window.timerOffset = 0;
    loadOrder();
  });

  document.querySelectorAll('.rating-stars span').forEach(s => {
    s.addEventListener('click', function() {
      selectedRating = parseInt(this.dataset.rating);
      updateStars(selectedRating);
    });
  });

  document.getElementById('review-form')?.addEventListener('submit', submitReview);
  document.getElementById('approve-btn')?.addEventListener('click', () => {
    const reviewSection = document.getElementById('review-section');
    reviewSection.style.display = 'block';
    reviewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.getElementById('revision-btn')?.addEventListener('click', requestRevision);

  // Tip button handlers
  document.querySelectorAll('.tip-btn').forEach(b => {
    b.addEventListener('click', function() {
      const amount = this.dataset.amount;
      startTipCheckout(amount);
    });
  });

  function setTipButtonsDisabled(disabled) {
    const buttons = document.querySelectorAll('#tip-buttons .tip-btn');
    buttons.forEach(btn => {
      btn.disabled = !!disabled;
      btn.style.opacity = disabled ? '0.65' : '1';
      btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    });
  }

  async function startTipCheckout(amount) {
    const tipAmount = Number(amount);
    if (!orderData || !Number.isFinite(tipAmount) || tipAmount <= 0) return;

    // If already tipped, do nothing
    if (orderData.tip_paid) {
      showTipThankYou(orderData.tip_amount || tipAmount);
      return;
    }

    setTipButtonsDisabled(true);

    // 1) Check admin-enabled gateways
    let methods = [];
    try {
      if (window.TipCheckout && typeof window.TipCheckout.loadPaymentMethods === 'function') {
        methods = await window.TipCheckout.loadPaymentMethods();
      }
    } catch (e) {
      methods = [];
    }

    const paypalMethod = methods.find(m => m && m.id === 'paypal' && m.enabled !== false && m.client_id);
    const whopMethod = methods.find(m => m && m.id === 'whop' && m.enabled !== false);

    // 2) PayPal has priority if enabled
    if (paypalMethod && window.TipCheckout && typeof window.TipCheckout.openPayPalTip === 'function') {
      try {
        window.TipCheckout.openPayPalTip({
          clientId: paypalMethod.client_id,
          productId: orderData.product_id,
          amount: tipAmount,
          email: orderData.email || '',
          orderId: orderData.order_id,
          onSuccess: async () => {
            await markTipPaid(tipAmount);
          },
          onClose: () => {
            setTipButtonsDisabled(false);
          }
        });
        return;
      } catch (err) {
        alert('Error: ' + (err.message || 'PayPal checkout failed'));
        setTipButtonsDisabled(false);
        return;
      }
    }

    // 3) Fallback to Whop
    if (!whopMethod) {
      alert('Payment system not available');
      setTipButtonsDisabled(false);
      return;
    }

    try {
      // Create a temporary Whop plan for this tip amount
      const res = await fetch('/api/whop/create-plan-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: orderData.product_id,
          amount: tipAmount,
          email: orderData.email || '',
          metadata: {
            type: 'tip',
            orderId: orderData.order_id,
            tipAmount: tipAmount
          }
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create tip checkout');

      // Prefer the same embedded Whop popup used on product checkout
      if (typeof window.whopCheckout === 'function' && data.plan_id) {
        window.whopCheckout({
          planId: data.plan_id,
          amount: tipAmount,
          email: orderData.email || '',
          metadata: {
            type: 'tip',
            orderId: orderData.order_id,
            tipAmount: tipAmount
          },
          onComplete: async () => {
            await markTipPaid(tipAmount);
            if (typeof window.whopCheckoutClose === 'function') {
              window.whopCheckoutClose();
            }
          }
        });
        return;
      }

      // Fallback: redirect to checkout URL if popup is not available
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      throw new Error('Payment system not available');

    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setTipButtonsDisabled(false);
    }
  }

  async function markTipPaid(amount) {
    const tipAmount = Number(amount);
    if (!Number.isFinite(tipAmount) || tipAmount <= 0) return;
    try {
      await fetch('/api/order/tip-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount: tipAmount })
      });

      // Update local state + UI
      if (orderData) {
        orderData.tip_paid = 1;
        orderData.tip_amount = tipAmount;
      }

      const tipSection = document.getElementById('tip-section');
      if (tipSection) tipSection.style.display = 'none';
      showTipThankYou(tipAmount);
    } catch (e) {
      console.error('Failed to mark tip as paid:', e);
      alert('Tip received but we could not confirm it. Please refresh the page.');
    }
  }

  function showTipThankYou(amount) {
    const videoSection = document.getElementById('video-section');
    if (!videoSection) return;

    // Avoid duplicates
    if (document.getElementById('tip-thankyou')) return;

    const thankYou = document.createElement('div');
    thankYou.id = 'tip-thankyou';
    thankYou.style.cssText = 'background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #fbbf24; padding: 20px; border-radius: 12px; text-align: center; margin-top: 20px;';
    const safe = Number(amount);
    const shown = Number.isFinite(safe) ? safe : 0;
    thankYou.innerHTML = `<h3 style="color: #92400e; margin: 0;">💝 Thank you for your $${shown} tip!</h3><p style="color: #78350f; margin: 10px 0 0;">Your generosity means the world to us!</p>`;
    videoSection.appendChild(thankYou);
  }


  async function loadOrder() {

    try {
      const res = await fetch(`/api/order/buyer/${orderId}`);
      const data = await res.json();
      if (!res.ok || !data.order) throw new Error(data.error || 'Not found');
      orderData = data.order;
      displayOrder(orderData);
    } catch (err) {
      showError(err.message);
    }
  }

  function displayOrder(o) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('order-content').style.display = 'block';

    // Product summary (title + thumbnail)
    const productTitle = o.product_title || '';
    const productThumb = o.product_thumbnail || '';
    const productId = o.product_id || '';
    const productCard = document.getElementById('product-summary-card');
    if (productCard) {
      productCard.innerHTML = '';
      const img = document.createElement('img');
      img.className = 'product-summary-thumb';
      img.alt = productTitle ? `Product: ${productTitle}` : 'Product thumbnail';
      if (productThumb) img.src = productThumb;

      const meta = document.createElement('div');
      meta.className = 'product-summary-meta';

      const titleEl = document.createElement('p');
      titleEl.className = 'product-summary-title';

      // Use the legacy /product?id= route (Worker will redirect to the pretty slug URL).
      const productUrl = productId ? `/product?id=${encodeURIComponent(productId)}` : '/products';
      const a = document.createElement('a');
      a.href = productUrl;
      a.textContent = productTitle || 'View purchased product';
      a.rel = 'noopener';
      titleEl.appendChild(a);

      const actions = document.createElement('div');
      actions.className = 'product-summary-actions';

      const viewBtn = document.createElement('a');
      viewBtn.href = productUrl;
      viewBtn.textContent = 'View Product';
      viewBtn.rel = 'noopener';

      const buyAgainBtn = document.createElement('a');
      buyAgainBtn.href = productUrl;
      buyAgainBtn.textContent = 'Buy Again';
      buyAgainBtn.className = 'secondary';
      buyAgainBtn.rel = 'noopener';

      actions.appendChild(viewBtn);
      actions.appendChild(buyAgainBtn);

      meta.appendChild(titleEl);
      meta.appendChild(actions);

      // Only show image if we have a thumbnail, otherwise keep layout clean
      if (productThumb) productCard.appendChild(img);
      productCard.appendChild(meta);
      productCard.style.display = 'flex';
    }
    document.getElementById('order-id').textContent = o.order_id;
    document.getElementById('email').textContent = o.email || 'N/A';
    document.getElementById('amount').textContent = '$' + (o.amount || 0);
    document.getElementById('status').textContent = o.status;
    document.getElementById('date').textContent = new Date(o.created_at).toLocaleString();

    displayRequirements(o.addons || []);

    if (o.status === 'delivered' && o.delivered_video_url) {
      let videoMetadata = null;
      if (o.delivered_video_metadata) {
        try {
          videoMetadata = JSON.parse(o.delivered_video_metadata);
        } catch (e) {
          console.warn('Failed to parse video metadata:', e);
        }
      }
      showVideo(o.delivered_video_url, videoMetadata);
      
      // Show tip section if tip not paid yet
      if (!o.tip_paid) {
        document.getElementById('tip-section').style.display = 'block';
      } else {
        // Already tipped - show thank you message
        showTipThankYou(o.tip_amount || 0);
      }
      
      // Hide review/revision buttons if already reviewed
      if (o.has_review) {
        hideReviewUIElements();
        // Show thank you message
        const videoSection = document.getElementById('video-section');
        if (videoSection) {
          const thankYou = document.createElement('div');
          thankYou.style.cssText = 'background:#d1fae5;border:2px solid #10b981;padding:20px;border-radius:12px;text-align:center;margin-top:20px;';
          thankYou.innerHTML = '<h3 style="color:#065f46;margin:0;">✅ Thank you for your review!</h3><p style="color:#047857;margin:10px 0 0;">Your feedback has been submitted.</p>';
          videoSection.appendChild(thankYou);
        }
      }
    } else {
      startCountdown(o.delivery_time_minutes || 60, o.created_at);
    }
  }

  function displayRequirements(addons) {
    const list = document.getElementById('requirements');
    const photos = [];

    if (!addons || addons.length === 0) {
      list.innerHTML = '<div class="addon-item" style="color:#6b7280;font-style:italic;">No requirements provided.</div>';
      return;
    }

    const filtered = addons.filter(a => a.field !== '_temp_session');

    if (filtered.length === 0) {
      list.innerHTML = '<div class="addon-item" style="color:#6b7280;font-style:italic;">No requirements provided.</div>';
      return;
    }

    list.innerHTML = filtered.map(a => {
      let val = a.value || '';
      let label = a.field || 'Item';

      // Check for photo links
      if (val.includes('[TEMP_FILE]') || val.includes('[PHOTO LINK]')) {
        const url = val.split(']:')[1]?.trim();
        if (url) {
          photos.push(url);
          return `<div class="addon-item"><span class="addon-label">${label}:</span> <a href="${url}" target="_blank" style="color:#3b82f6;">View Photo 📷</a></div>`;
        }
        return `<div class="addon-item"><span class="addon-label">${label}:</span> Photo uploaded</div>`;
      }

      return `<div class="addon-item"><span class="addon-label">${label}:</span> ${val}</div>`;
    }).join('');

    if (photos.length > 0) {
      document.getElementById('photos-section').style.display = 'block';
      document.getElementById('photos').innerHTML = photos.map(url => `<div class="photo-item"><img src="${url}" onclick="window.open('${url}')" onerror="this.style.display='none'"></div>`).join('');
    }
  }

  function startCountdown(mins, created) {
    // Stop any existing timer
    if (countdownTimer) {
      countdownTimer.stop();
    }

    // Create and start new timer
    countdownTimer = new CountdownTimer('countdown-display', mins, created, {
      serverTimeOffset: window.timerOffset || 0
    });
    countdownTimer.start();
  }

  function showVideo(url, videoMetadata) {
    document.getElementById('countdown-section').style.display = 'none';
    document.getElementById('video-section').style.display = 'block';

    // FIXED: Use correct global object name
    if (window.UniversalVideoPlayer) {
      window.UniversalVideoPlayer.render('player-container', url, videoMetadata);
    }

    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn && window.UniversalVideoPlayer) {
      const detected = window.UniversalVideoPlayer.detect(url);
      const openOnlyTypes = ['youtube', 'vimeo', 'bunny-embed'];

      if (openOnlyTypes.includes(detected.type)) {
        // External video - open in new tab
        downloadBtn.textContent = '🔗 Open Video';
        downloadBtn.href = url;
        downloadBtn.target = '_blank';
        downloadBtn.removeAttribute('download');
      } else if (detected.type === 'archive') {
        // Archive.org - use direct download URL
        const itemId = window.UniversalVideoPlayer.extractArchiveId(url);
        if (itemId && url.includes('/download/')) {
          // Direct download link
          downloadBtn.textContent = '⬇️ Download';
          downloadBtn.href = url;
          downloadBtn.target = '_blank';
          downloadBtn.removeAttribute('download');
        } else {
          // Archive details page - open it
          downloadBtn.textContent = '🔗 Open Video';
          downloadBtn.href = url;
          downloadBtn.target = '_blank';
          downloadBtn.removeAttribute('download');
        }
      } else {
        // Direct video URL - download directly
        downloadBtn.textContent = '⬇️ Download';
        downloadBtn.href = url;
        downloadBtn.target = '_blank';
        downloadBtn.removeAttribute('download');
      }
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    
    const name = document.getElementById('reviewer-name').value.trim();
    const comment = document.getElementById('review-comment').value.trim();
    const portfolioEnabled = document.getElementById('portfolio-checkbox').checked;
    
    try {
      // Use shared utility function
      await submitReviewToAPI(orderData, {
        name,
        comment,
        rating: selectedRating,
        portfolioEnabled
      });
      
      alert('✅ Review submitted!');
      hideReviewUIElements();
      
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function requestRevision() {
    const reason = prompt('What needs to be changed?');
    if (!reason || !reason.trim()) return;
    try {
      const res = await fetch('/api/order/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reason: reason.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) { alert('✅ Revision requested!'); loadOrder(); }
      else throw new Error(data.error || 'Failed');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function updateStars(rating) {
    document.querySelectorAll('.rating-stars span').forEach((s, i) => s.classList.toggle('active', i < rating));
  }

  function showError(msg) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').textContent = msg;
    document.getElementById('error').style.display = 'block';
  }

  updateStars(5);
})();
