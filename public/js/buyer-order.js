(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  let orderData = null;
  let selectedRating = 5;
  let countdownTimer = null;

  if (!orderId) { showError('Order ID not found'); return; }


  async function loadWhopSettingsForPage() {
    try {
      if (typeof window.getWhopSettings === 'function') {
        const whopResp = await window.getWhopSettings();
        window.whopSettings = whopResp && whopResp.settings ? whopResp.settings : (window.whopSettings || {});
      }
    } catch (e) {
      console.warn('Whop settings load failed:', e);
      window.whopSettings = window.whopSettings || {};
    }
  }

  loadWhopSettingsForPage();

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
    const tipSection = document.getElementById('tip-section');
    reviewSection.style.display = 'block';
    tipSection.style.display = 'block';
    reviewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.getElementById('revision-btn')?.addEventListener('click', requestRevision);
  document.querySelectorAll('.tip-btn').forEach(b => b.addEventListener('click', function(e) { e.preventDefault(); processTip(this.dataset.amount, this); }));

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
      // Buyer-facing delivery message
      const statusEl = document.getElementById('status-message');
      if (statusEl) {
        statusEl.className = 'status-message status-delivered';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<h3 style="margin:0;">✅ Video Ready!</h3><p style="margin:8px 0 0;">Your video has been delivered and is ready to watch</p>';
      }

      let videoMetadata = null;
      if (o.delivered_video_metadata) {
        try {
          videoMetadata = JSON.parse(o.delivered_video_metadata);
        } catch (e) {
          console.warn('Failed to parse video metadata:', e);
        }
      }
      showVideo(o.delivered_video_url, videoMetadata);
      
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
      const statusEl = document.getElementById('status-message');
      if (statusEl) statusEl.style.display = 'none';
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
      // Small UX improvement:
      // - block double clicks (so multiple downloads don't start)
      // - show a simple "Preparing…" state while we fetch the file
      const attachSafeDownload = () => {
        if (downloadBtn.dataset.safeDownloadAttached === '1') return;
        downloadBtn.dataset.safeDownloadAttached = '1';

        downloadBtn.addEventListener('click', async (e) => {
          const href = downloadBtn.getAttribute('href') || '';
          const isDownloadLink = href.startsWith('/download/');
          if (!isDownloadLink) return; // for "Open Video" mode

          // If already downloading, block extra clicks
          if (downloadBtn.dataset.downloading === '1') {
            e.preventDefault();
            return;
          }

          e.preventDefault();
          downloadBtn.dataset.downloading = '1';

          const originalText = downloadBtn.textContent;
          downloadBtn.textContent = '⏳ Preparing…';
          downloadBtn.style.pointerEvents = 'none';
          downloadBtn.style.opacity = '0.75';

          try {
            const res = await fetch(href, { credentials: 'include' });
            if (!res.ok) throw new Error('Download failed');

            // Try to read filename from Content-Disposition
            let filename = 'video';
            const cd = res.headers.get('content-disposition') || '';
            const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
            if (match) {
              filename = decodeURIComponent(match[1] || match[2] || filename);
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
          } catch (err) {
            console.error(err);
            alert('Download failed. Please try again.');
          } finally {
            downloadBtn.dataset.downloading = '0';
            downloadBtn.textContent = originalText;
            downloadBtn.style.pointerEvents = '';
            downloadBtn.style.opacity = '';
          }
        });
      };

      const detected = window.UniversalVideoPlayer.detect(url);
      const openOnlyTypes = ['youtube', 'vimeo', 'bunny-embed'];

      // IMPORTANT:
      // Browsers often ignore the `download` attribute for cross-origin video URLs
      // and will open a new tab/player instead. To guarantee download, route
      // through our same-origin `/download/:orderId` endpoint which sets
      // Content-Disposition: attachment.
      const ensureDownload = () => {
        downloadBtn.textContent = '⬇️ Download';
        downloadBtn.href = `/download/${orderId}`;
        downloadBtn.removeAttribute('target');
        downloadBtn.setAttribute('download', '');
        attachSafeDownload();
      };

      const ensureOpen = () => {
        downloadBtn.textContent = '🔗 Open Video';
        downloadBtn.href = url;
        downloadBtn.target = '_blank';
        downloadBtn.removeAttribute('download');
      };

      if (openOnlyTypes.includes(detected.type)) {
        // External video - open in new tab
        ensureOpen();
      } else if (detected.type === 'archive') {
        // Archive.org - if it's a details page we can only open it.
        // If it's downloadable, use our secure download proxy.
        if (url.includes('/download/')) {
          ensureDownload();
        } else {
          ensureOpen();
        }
      } else {
        // Any direct video URL - download via proxy to force save-as
        ensureDownload();
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

  async function processTip(amount, btnEl) {
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return;

  // Prevent double-click / multiple checkout opens
  if (btnEl && btnEl.dataset.processing === '1') return;
  if (btnEl) {
    btnEl.dataset.processing = '1';
    btnEl.classList.add('is-processing');
    btnEl.disabled = true;
    const oldText = btnEl.textContent;
    btnEl.dataset.oldText = oldText;
    btnEl.textContent = '⏳ Preparing...';
  }

  try {
    if (!orderData || !orderData.product_id) {
      throw new Error('Order product not found');
    }
    const email = (orderData.email || '').trim();

    // Create a dynamic Whop plan checkout for this tip amount (no redirect)
    const resp = await fetch('/api/whop/create-plan-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: orderData.product_id,
        amount: amt,
        email: email,
        metadata: {
          type: 'tip',
          order_id: orderId,
          tip_amount: amt
        }
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error((data && (data.error || data.message)) || 'Payment not available');
    }
    if (!data || !data.plan_id) {
      throw new Error('Whop plan not returned');
    }

    // Store minimal context for the embedded checkout handler
    try {
      localStorage.setItem('pendingOrderData', JSON.stringify({
        email: email,
        amount: amt,
        productId: data.product_id || orderData.product_id,
        orderId: orderId,
        type: 'tip',
        timestamp: Date.now()
      }));
    } catch (e) {}

    if (!window.whopCheckout) {
      throw new Error('Payment not available');
    }

    window.whopCheckout({
      planId: data.plan_id,
      email: email,
      productId: data.product_id || orderData.product_id,
      amount: amt,
      metadata: {
        ...(data.metadata || {}),
        type: 'tip',
        order_id: orderId,
        tip_amount: amt
      }
    });
  } catch (err) {
    console.error('Tip checkout error:', err);
    alert(err.message || 'Payment not available');
  } finally {
    if (btnEl) {
      btnEl.dataset.processing = '0';
      btnEl.classList.remove('is-processing');
      btnEl.disabled = false;
      const oldText = btnEl.dataset.oldText;
      if (oldText) btnEl.textContent = oldText;
    }
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
