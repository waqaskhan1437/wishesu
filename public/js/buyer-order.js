(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  let orderData = null;
  let selectedRating = 5;
  let countdownTimer = null;

  if (!orderId) { showError('Order ID not found'); return; }

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
  document.querySelectorAll('.tip-btn').forEach(b => b.addEventListener('click', function() { processTip(this.dataset.amount); }));

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
    list.innerHTML = addons.filter(a => a.field !== '_temp_session').map(a => {
      let val = a.value || '';
      if (val.includes('[TEMP_FILE]') || val.includes('[PHOTO LINK]')) {
        const url = val.split(']:')[1]?.trim();
        if (url) { photos.push(url); return `<div class="addon-item"><span class="addon-label">${a.field}:</span> <a href="${url}" target="_blank">View</a></div>`; }
      }
      return `<div class="addon-item"><span class="addon-label">${a.field}:</span> ${val}</div>`;
    }).join('');

    if (photos.length > 0) {
      document.getElementById('photos-section').style.display = 'block';
      document.getElementById('photos').innerHTML = photos.map(url => `<div class="photo-item"><img src="${url}" onclick="window.open('${url}')"></div>`).join('');
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

      // For direct file links, we download through our Worker so the browser
      // gets Content-Disposition: attachment (instead of opening a player tab).
      const workerDownloadUrl = `/api/order/buyer/${encodeURIComponent(orderId)}/download`;

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
        // Direct video URL - download via Worker (forces file download)
        downloadBtn.textContent = '⬇️ Download';
        downloadBtn.href = workerDownloadUrl;
        downloadBtn.removeAttribute('target');
        downloadBtn.setAttribute('download', `wishvideo-order-${orderId}.mp4`);
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

  function processTip(amount) {
    if (!window.whopCheckout) { alert('Payment not available'); return; }
    window.whopCheckout({ amount: parseFloat(amount), email: orderData.email || '', metadata: { type: 'tip', orderId: orderData.order_id }, productPlan: orderData.whop_plan || '', productPriceMap: orderData.whop_price_map || '' });
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
