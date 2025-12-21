(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const isAdmin = urlParams.get('admin') === '1';
  let orderData = null;
  let selectedRating = 5;
  let countdownTimer = null;
  let videoPlayer = null;

  if (!orderId) {
    showError('Order ID not found');
    return;
  }

  // Setup view
  if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    document.getElementById('back-btn').href = '/admin/dashboard.html';
  } else {
    document.querySelectorAll('.buyer-only').forEach(el => el.style.display = 'block');
    document.getElementById('back-btn').href = '/';
  }

  // Initialize timer offset (no server sync for admin page)
  window.timerOffset = 0;

  loadOrder();

  // Rating stars
  document.querySelectorAll('.rating-stars span').forEach(star => {
    star.addEventListener('click', function() {
      selectedRating = parseInt(this.dataset.rating);
      updateStars(selectedRating);
    });
  });

  // Review form
  document.getElementById('review-form')?.addEventListener('submit', submitReview);

  // Approve button
  document.getElementById('approve-btn')?.addEventListener('click', () => {
    document.getElementById('review-section').style.display = 'block';
    document.getElementById('tip-section').style.display = 'block';
    document.getElementById('review-section').scrollIntoView({ behavior: 'smooth' });
  });

  // Revision button
  document.getElementById('revision-btn')?.addEventListener('click', requestRevision);

  // Tip buttons
  document.querySelectorAll('.tip-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      processTip(this.dataset.amount);
    });
  });

  // Admin delivery
  document.getElementById('submit-delivery-btn')?.addEventListener('click', submitDelivery);

  async function loadOrder() {
    try {
      const res = await fetch(`/api/order/buyer/${orderId}`);
      const data = await res.json();
      if (!res.ok || !data.order) throw new Error(data.error || 'Order not found');
      orderData = data.order;
      displayOrder(orderData);
    } catch (err) {
      showError('Error: ' + err.message);
    }
  }

  function displayOrder(order) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('order-content').style.display = 'block';

    document.getElementById('order-id-display').textContent = 'Order #' + order.order_id;
    document.getElementById('order-date').textContent = new Date(order.created_at).toLocaleString();
    document.getElementById('email-display').textContent = order.email || 'N/A';
    document.getElementById('amount-display').textContent = '$' + (order.amount || 0);
    document.getElementById('status-display').textContent = order.status;
    document.getElementById('delivery-time-display').textContent = (order.delivery_time_minutes || 60) + ' minutes';

    displayRequirements(order.addons || []);

    if (order.status === 'delivered' && order.delivered_video_url) {
      showDelivery(order);
    } else {
      if (isAdmin) {
        document.getElementById('delivery-section').style.display = 'block';
      } else {
        startCountdown(order.delivery_time_minutes || 60, order.created_at);
        document.getElementById('status-message').className = 'status-message status-processing';
        document.getElementById('status-message').innerHTML = '<h3>🎬 Video Being Created</h3><p>Processing your order...</p>';
      }
    }
  }

  function displayRequirements(addons) {
    const list = document.getElementById('requirements-list');
    list.innerHTML = '';
    const photos = [];

    addons.forEach(addon => {
      if (addon.field === '_temp_session') return;
      const item = document.createElement('div');
      item.className = 'addon-item';
      
      let value = addon.value || '';
      if (value.includes('[TEMP_FILE]') || value.includes('[PHOTO LINK]')) {
        const url = value.split(']:')[1]?.trim();
        if (url) {
          photos.push(url);
          item.innerHTML = `<span class="addon-label">${addon.field}:</span> <a href="${url}" target="_blank">View Photo</a>`;
        } else {
          item.innerHTML = `<span class="addon-label">${addon.field}:</span> Photo uploaded`;
        }
      } else {
        item.innerHTML = `<span class="addon-label">${addon.field}:</span> ${value}`;
      }
      list.appendChild(item);
    });

    if (photos.length > 0) {
      document.getElementById('photos-section').style.display = 'block';
      const grid = document.getElementById('photos-grid');
      grid.innerHTML = photos.map(url => `<div class="photo-item"><img src="${url}" onclick="window.open('${url}', '_blank')"></div>`).join('');
    }
  }

  function startCountdown(minutes, createdAt) {
    if (countdownTimer) {
      countdownTimer.stop();
    }
    countdownTimer = new CountdownTimer('countdown-display', minutes, createdAt, {
      serverTimeOffset: window.timerOffset || 0
    });
    countdownTimer.start();
  }

  async function showDelivery(order) {
    document.getElementById('countdown-section').style.display = 'none';
    document.getElementById('video-player-section').style.display = 'block';

    const playerContainer = document.getElementById('universal-video-player');
    if (playerContainer) {
      playerContainer.innerHTML = '';
      playerContainer.style.width = '100%';
      playerContainer.style.height = '400px';

      if (window.UniversalPlayer && order.delivered_video_url) {
        let videoMetadata = null;
        if (order.delivered_video_metadata) {
          try {
            videoMetadata = JSON.parse(order.delivered_video_metadata);
          } catch (e) {
            console.warn('Failed to parse video metadata:', e);
          }
        }
        window.UniversalPlayer.render('universal-video-player', order.delivered_video_url, videoMetadata);
      } else if (order.delivered_video_url) {
        playerContainer.innerHTML = `
          <video controls preload="metadata" style="width: 100%; height: 400px; background: #000;">
            <source src="${order.delivered_video_url}" type="video/mp4">
            Your browser does not support video playback.
          </video>
        `;
      } else {
        playerContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: #6b7280;">No delivered video URL found.</div>';
      }
    }

    const downloadBtn = document.getElementById('download-btn');
    const revisionBtn = document.getElementById('revision-btn');
    const approveBtn = document.getElementById('approve-btn');

    // Small UX improvement:
    // - block double clicks (so multiple downloads don't start)
    // - show a simple "Preparing…" state while we fetch the file
    const attachSafeDownload = () => {
      if (!downloadBtn) return;
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

    if (downloadBtn) {
      downloadBtn.style.display = 'inline-flex';
      if (window.UniversalPlayer && order.delivered_video_url) {
        const detected = window.UniversalPlayer.detect(order.delivered_video_url);
        const openOnlyTypes = ['youtube', 'vimeo', 'bunny-embed'];
        if (openOnlyTypes.includes(detected.type)) {
          downloadBtn.textContent = '🔗 Open Video';
          downloadBtn.href = order.delivered_video_url;
          downloadBtn.target = '_blank';
          downloadBtn.removeAttribute('download');
        } else {
          downloadBtn.textContent = '⬇️ Download Video';
          downloadBtn.href = `/download/${order.order_id}`;
          downloadBtn.removeAttribute('target');
          downloadBtn.setAttribute('download', '');
          attachSafeDownload();
        }
      } else if (order.delivered_video_url) {
        // IMPORTANT:
        // Many browsers ignore the `download` attribute for cross-origin video URLs
        // and will open a new tab/player instead. Always route downloads through
        // our same-origin `/download/:orderId` endpoint which sets
        // Content-Disposition: attachment.
        downloadBtn.textContent = '⬇️ Download Video';
        downloadBtn.href = `/download/${order.order_id}`;
        downloadBtn.removeAttribute('target');
        downloadBtn.setAttribute('download', '');
        attachSafeDownload();
      }
    }

    if (!isAdmin) {
      if (revisionBtn) revisionBtn.style.display = 'inline-flex';
      if (approveBtn) approveBtn.style.display = 'inline-flex';
      setTimeout(async () => {
        try {
          const reviewRes = await fetch('/api/reviews');
          const reviewData = await reviewRes.json();
          if (reviewData.reviews && Array.isArray(reviewData.reviews)) {
            const hasReview = reviewData.reviews.some(r => r.order_id === order.order_id);
            if (hasReview) {
              if (approveBtn) approveBtn.style.display = 'none';
              if (revisionBtn) revisionBtn.style.display = 'none';
              document.getElementById('review-section').style.display = 'none';
            }
          }
        } catch (e) {
          console.warn('Could not check review status:', e);
        }
      }, 100);
    } else {
      if (revisionBtn) revisionBtn.style.display = 'none';
      if (approveBtn) approveBtn.style.display = 'none';
    }

    document.getElementById('status-message').className = 'status-message status-delivered';
    document.getElementById('status-message').innerHTML = '<h3>✅ Video Ready!</h3><p>Your video has been delivered and is ready to watch</p>';
  }

  // --- UPDATED: DIRECT CLIENT-SIDE UPLOAD TO ARCHIVE.ORG ---
  async function submitDelivery() {
    const url = document.getElementById('delivery-url').value.trim();
    const file = document.getElementById('delivery-file').files[0];
    const thumb = document.getElementById('thumbnail-url').value.trim();
    const subtitlesUrl = document.getElementById('subtitles-url')?.value.trim();

    if (!url && !file) {
      alert('Provide URL or upload file');
      return;
    }

    let videoUrl = url;
    
    // UI Helpers
    const btn = document.getElementById('submit-delivery-btn');
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    const resetUI = (msg) => {
      alert(msg);
      btn.innerHTML = '✅ Submit Delivery';
      btn.disabled = false;
      progressDiv.style.display = 'none';
    };

    if (file) {
      const maxSize = 1000 * 1024 * 1024; // 1GB Limit
      if (file.size > maxSize) {
        alert(`File too large! Max size 1GB. Yours: ${(file.size/1024/1024).toFixed(1)}MB`);
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '⏳ Initializing Upload...';
      progressDiv.style.display = 'block';
      progressBar.style.width = '0%';
      progressText.textContent = 'Getting credentials...';

      try {
        // 1. Get Archive.org Credentials
        const credRes = await fetch('/api/upload/archive-credentials', { method: 'POST' });
        const creds = await credRes.json();
        if (!creds.success) throw new Error('Authentication failed. Check admin settings.');

        // 2. Prepare Direct Upload
        const timestamp = Date.now();
        const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        // Unique Bucket Name
        const cleanOrderId = orderId.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
const itemId = `delivery_${cleanOrderId}_${timestamp}`;
        const archiveUrl = `https://s3.us.archive.org/${itemId}/${safeFilename}`;

        // 3. Upload directly using XHR
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = pct + '%';
            
            if (pct >= 99) {
              progressText.textContent = '⏳ Processing... (Do not close tab)';
              progressText.style.color = '#2563eb';
              progressBar.style.background = '#f59e0b'; // Orange
            } else {
              progressText.textContent = `Uploading... ${pct}%`;
            }
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            // Success
            const finalUrl = `https://archive.org/download/${itemId}/${safeFilename}`;
            const embedUrl = `https://archive.org/details/${itemId}`;
            
            progressText.textContent = '✅ Upload Complete!';
            progressBar.style.background = '#10b981';
            
            // Proceed to save to DB
            submitDeliveryWithUrl(finalUrl, thumb, subtitlesUrl, { embedUrl, itemId });
          } else {
            resetUI(`Upload Failed: Server returned ${xhr.status}`);
          }
        });

        xhr.addEventListener('error', () => resetUI('Network Error during upload'));
        
        xhr.open('PUT', archiveUrl);
        xhr.setRequestHeader('Authorization', `LOW ${creds.accessKey}:${creds.secretKey}`);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.setRequestHeader('x-archive-auto-make-bucket', '1');
        xhr.setRequestHeader('x-archive-meta-mediatype', 'movies');
        xhr.setRequestHeader('x-archive-meta-title', `Order ${orderId} Delivery`);
        xhr.send(file);

      } catch (err) {
        resetUI('Error: ' + err.message);
      }
    } else {
      // Direct URL flow
      submitDeliveryWithUrl(videoUrl, thumb, subtitlesUrl);
    }
  }

  async function submitDeliveryWithUrl(videoUrl, thumb, subtitlesUrl, uploadData) {
    const btn = document.getElementById('submit-delivery-btn');
    const progressDiv = document.getElementById('upload-progress');
    
    btn.innerHTML = '💾 Saving to Database...';
    btn.disabled = true;

    try {
      const deliveryData = { 
        orderId, 
        videoUrl, 
        thumbnailUrl: thumb 
      };

      if (subtitlesUrl) deliveryData.subtitlesUrl = subtitlesUrl;
      
      if (uploadData && uploadData.embedUrl) {
        deliveryData.embedUrl = uploadData.embedUrl;
        deliveryData.itemId = uploadData.itemId;
      }
      
      const res = await fetch('/api/order/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryData)
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        btn.innerHTML = '✅ Delivered Successfully!';
        alert('Order delivered successfully!');
        // Reload order data without page refresh
        loadOrder();
        // Hide upload UI after a moment
        setTimeout(() => {
          if(progressDiv) progressDiv.style.display = 'none';
          btn.innerHTML = '✅ Submit Delivery';
          btn.disabled = false;
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to save delivery');
      }
    } catch (err) {
      alert('Error saving delivery: ' + err.message);
      btn.textContent = '✅ Submit Delivery';
      btn.disabled = false;
    }
  }

  async function requestRevision(e) {
    e.preventDefault();
    const reason = prompt('What needs to be changed?');
    if (!reason || !reason.trim()) return;
    try {
      const res = await fetch('/api/order/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reason: reason.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('✅ Revision requested!');
        loadOrder();
      } else throw new Error(data.error || 'Failed');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    const name = document.getElementById('reviewer-name').value.trim();
    const comment = document.getElementById('review-comment').value.trim();
    const portfolioEnabled = document.getElementById('portfolio-checkbox').checked;

    if (!name || !comment) {
      alert('Fill all fields');
      return;
    }

    try {
      const res = await fetch('/api/reviews/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: orderData.product_id,
          author: name,
          rating: selectedRating,
          comment: comment,
          orderId: orderData.order_id,
          showOnProduct: portfolioEnabled ? 1 : 0
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('✅ Review submitted!');
        document.getElementById('review-section').style.display = 'none';
        // Hide approve and revision buttons after review submission
        const approveBtn = document.getElementById('approve-btn');
        const revisionBtn = document.getElementById('revision-btn');
        if (approveBtn) approveBtn.style.display = 'none';
        if (revisionBtn) revisionBtn.style.display = 'none';
        if (portfolioEnabled) {
          await fetch('/api/order/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderData.order_id, portfolioEnabled: 1 })
          });
        }
      } else throw new Error(data.error || 'Failed');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function processTip(amount) {
    if (!window.whopCheckout) {
      alert('Payment system not available');
      return;
    }
    window.whopCheckout({
      amount: parseFloat(amount),
      email: orderData.email || '',
      metadata: { type: 'tip', orderId: orderData.order_id },
      productPlan: orderData.whop_plan || '',
      productPriceMap: orderData.whop_price_map || ''
    });
  }

  function updateStars(rating) {
    document.querySelectorAll('.rating-stars span').forEach((star, i) => {
      star.classList.toggle('active', i < rating);
    });
  }

  function showError(msg) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').textContent = msg;
    document.getElementById('error').style.display = 'block';
  }

  updateStars(5);
})();
