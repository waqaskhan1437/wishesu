/**
 * Order Display Module
 * Handles rendering of order information, requirements, and photos
 */

/**
 * Display order summary and product card
 */
export function displayOrderSummary(order) {
  const productTitle = order.product_title || '';
  const productThumb = order.product_thumbnail || '';
  const productId = order.product_id || '';
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

    if (productThumb) productCard.appendChild(img);
    productCard.appendChild(meta);
    productCard.style.display = 'flex';
  }
}

/**
 * Display order details
 */
export function displayOrderDetails(order) {
  document.getElementById('order-id').textContent = order.order_id;
  document.getElementById('email').textContent = order.email || 'N/A';
  document.getElementById('amount').textContent = '$' + (order.amount || 0);
  document.getElementById('status').textContent = order.status;
  document.getElementById('date').textContent = new Date(order.created_at).toLocaleString();
}

/**
 * Display requirements (addons)
 */
export function displayRequirements(addons) {
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
        return `<div class="addon-item"><span class="addon-label">${label}:</span> <a href="${url}" target="_blank" style="color:#3b82f6;">View Photo </a></div>`;
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

/**
 * Display status message for delivered orders
 */
export function displayDeliveredStatus() {
  const statusEl = document.getElementById('status-message');
  if (statusEl) {
    statusEl.className = 'status-message status-delivered';
    statusEl.style.display = 'block';
    statusEl.innerHTML = '<h3 style="margin:0;">... Video Ready!</h3><p style="margin:8px 0 0;">Your video has been delivered and is ready to watch</p>';
  }
}

/**
 * Hide status message
 */
export function hideStatusMessage() {
  const statusEl = document.getElementById('status-message');
  if (statusEl) statusEl.style.display = 'none';
}

/**
 * Show thank you message for reviewed orders
 */
export function showThankYouMessage() {
  const videoSection = document.getElementById('video-section');
  if (videoSection) {
    const thankYou = document.createElement('div');
    thankYou.style.cssText = 'background:#d1fae5;border:2px solid #10b981;padding:20px;border-radius:12px;text-align:center;margin-top:20px;';
    thankYou.innerHTML = '<h3 style="color:#065f46;margin:0;">... Thank you for your review!</h3><p style="color:#047857;margin:10px 0 0;">Your feedback has been submitted.</p>';
    videoSection.appendChild(thankYou);
  }
}

/**
 * Start countdown timer
 */
export function startCountdown(mins, created) {
  // Stop any existing timer
  if (window.countdownTimer) {
    window.countdownTimer.stop();
  }

  // Create and start new timer
  window.countdownTimer = new CountdownTimer('countdown-display', mins, created, {
    serverTimeOffset: window.timerOffset || 0
  });
  window.countdownTimer.start();
}


