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

    const statusMsg = document.getElementById('status-message');
    
    if (order.status === 'delivered' && order.delivered_video_url) {
      showDelivery(order);
    } else {
      // Show countdown timer for BOTH admin and buyer
      startCountdown(order.delivery_time_minutes || 60, order.created_at);
      
      if (isAdmin) {
        // Admin view - show delivery upload section, hide status message
        document.getElementById('delivery-section').style.display = 'block';
        if (statusMsg) statusMsg.style.display = 'none';
      } else {
        // Buyer view - show processing message
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.className = 'status-message status-processing';
          statusMsg.innerHTML = '<h3>🎬 Video Being Created</h3><p>Our team is working on your personalized video. You\'ll be notified when it\'s ready!</p>';
        }
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
    // Show countdown section
    document.getElementById('countdown-section').style.display = 'block';
    
    // Stop any existing timer
    if (countdownTimer) {
      countdownTimer.stop();
    }

    // Create and start new timer
    countdownTimer = new CountdownTimer('countdown-display', minutes, createdAt, {
      serverTimeOffset: window.timerOffset || 0
    });
    countdownTimer.start();
  }

  async function showDelivery(order) {
    document.getElementById('countdown-section').style.display = 'none';
    document.getElementById('video-player-section').style.display = 'block';
    
    // Show appropriate status message based on view
    const statusMsg = document.getElementById('status-message');
    if (statusMsg) {
      if (isAdmin) {
        // Admin view - hide status message
        statusMsg.style.display = 'none';
      } else {
        // Buyer view - show Video Ready message
        statusMsg.style.display = 'block';
        statusMsg.className = 'status-message status-delivered';
        statusMsg.innerHTML = '<h3>✅ Video Ready!</h3><p>Your video has been delivered and is ready to watch.</p>';
      }
    }

    // Initialize Universal Video Player
    const playerContainer = document.getElementById('universal-video-player');
    if (playerContainer) {
      // Clear any existing content
      playerContainer.innerHTML = '';
      // Set a consistent height for iframes/videos
      playerContainer.style.width = '100%';
      playerContainer.style.height = '400px';

      if (window.UniversalPlayer && order.delivered_video_url) {
        // Parse video metadata if available
        let videoMetadata = null;
        if (order.delivered_video_metadata) {
          try {
            videoMetadata = JSON.parse(order.delivered_video_metadata);
          } catch (e) {
            console.warn('Failed to parse video metadata:', e);
          }
        }

        // Render with enhanced support for Archive.org videos
        window.UniversalPlayer.render('universal-video-player', order.delivered_video_url, videoMetadata);
      } else if (order.delivered_video_url) {
        // Fallback: show a direct video element/link
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

    // Show action buttons
    const downloadBtn = document.getElementById('download-btn');
    const revisionBtn = document.getElementById('revision-btn');
    const approveBtn = document.getElementById('approve-btn');

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
        }
      } else if (order.delivered_video_url) {
        downloadBtn.href = order.delivered_video_url;
      }
    }

    // Show buttons ONLY for buyers, not admin
    if (!isAdmin) {
      if (revisionBtn) revisionBtn.style.display = 'inline-flex';
      if (approveBtn) approveBtn.style.display = 'inline-flex';

      // Check if review already exists for this order (async, don't block)
      setTimeout(async () => {
        try {
          const reviewRes = await fetch('/api/reviews');
          const reviewData = await reviewRes.json();
          if (reviewData.reviews && Array.isArray(reviewData.reviews)) {
            const hasReview = reviewData.reviews.some(r => r.order_id === order.order_id);
            if (hasReview) {
              // Hide approve button and review section if review already submitted
              if (approveBtn) approveBtn.style.display = 'none';
              if (revisionBtn) revisionBtn.style.display = 'none';
              document.getElementById('review-section').style.display = 'none';
            }
          }
        } catch (e) {
          console.warn('Could not check review status:', e);
          // On error, keep buttons visible (fail safe)
        }
      }, 100);
    } else {
      if (revisionBtn) revisionBtn.style.display = 'none';
      if (approveBtn) approveBtn.style.display = 'none';
    }

    document.getElementById('status-message').className = 'status-message status-delivered';
    document.getElementById('status-message').innerHTML = '<h3>✅ Video Ready!</h3><p>Your video has been delivered and is ready to watch</p>';
  }

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
    if (file) {
      // Validate file size on frontend
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        alert(`File too large! Maximum size is 500MB for videos. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
        return;
      }

      const btn = document.getElementById('submit-delivery-btn');
      const progressDiv = document.getElementById('upload-progress');
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');
      
      btn.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>
          Uploading Video...
        </span>
      `;
      btn.disabled = true;
      progressDiv.style.display = 'block';
      
      try {
        const itemId = 'delivery_' + orderId + '_' + Date.now();
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uploadUrl = `/api/upload/customer-file?itemId=${itemId}&filename=${encodeURIComponent(filename)}&originalFilename=${encodeURIComponent(file.name)}&orderId=${encodeURIComponent(orderId)}`;
        
        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
            progressText.textContent = `Uploading... ${Math.round(percentComplete)}% (${(e.loaded / 1024 / 1024).toFixed(1)}MB / ${(e.total / 1024 / 1024).toFixed(1)}MB)`;
          }
        });
        
        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (data.url) {
              videoUrl = data.url;
              progressText.textContent = '✅ Upload complete!';
              progressBar.style.background = '#10b981';
              // Continue with delivery submission
              submitDeliveryWithUrl(videoUrl, thumb, subtitlesUrl, data);
            } else {
              throw new Error(data.error || 'Upload failed');
            }
          } else {
            const errorData = JSON.parse(xhr.responseText);
            throw new Error(errorData.error || 'Upload failed');
          }
        });
        
        // Handle errors
        xhr.addEventListener('error', () => {
          throw new Error('Network error during upload');
        });
        
        // Start upload
        xhr.open('POST', uploadUrl);
        xhr.send(file);
        
        // Don't continue with delivery submission here - it will be called from xhr.load
        return;
        
      } catch (err) {
        alert('Upload failed: ' + err.message);
        btn.textContent = '✅ Submit Delivery';
        btn.disabled = false;
        progressDiv.style.display = 'none';
        return;
      }
    } else {
      // No file upload, proceed directly
      submitDeliveryWithUrl(videoUrl, thumb, subtitlesUrl);
    }
  }

  async function submitDeliveryWithUrl(videoUrl, thumb, subtitlesUrl, uploadData) {
    const btn = document.getElementById('submit-delivery-btn');
    const progressDiv = document.getElementById('upload-progress');
    
    try {
      // Update button for delivery submission
      btn.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>
          Submitting Delivery...
        </span>
      `;
      
      // Include additional metadata for Archive.org uploads
      const deliveryData = { 
        orderId, 
        videoUrl, 
        thumbnailUrl: thumb 
      };

      if (subtitlesUrl) {
        deliveryData.subtitlesUrl = subtitlesUrl;
      }
      
      // Add archive.org specific data if available
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
        // Remove auto-reload, just reload the order data
        setTimeout(() => {
          loadOrder();
        }, 1500);
      } else throw new Error(data.error || 'Failed');
    } catch (err) {
      alert('Error: ' + err.message);
      btn.textContent = '✅ Submit Delivery';
      btn.disabled = false;
      progressDiv.style.display = 'none';
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
