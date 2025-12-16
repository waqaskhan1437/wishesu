/*
 * Construct the primary layout for the product detail page.
 * Builds media column, info column, and addons form.
 * Updated for SEO (Alt text) and Performance (LCP/Fetch Priority).
 */

;(function(){
  function renderProductMain(container, product, addonGroups) {
    container.className = '';
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'product-page';
    
    const mainRow = document.createElement('div');
    mainRow.className = 'product-main-row';
    
    // --- Left Column: Media ---
    const leftCol = document.createElement('div');
    leftCol.className = 'product-media-col';

    const reviewHighlight = document.createElement('div');
    reviewHighlight.id = 'review-highlight';
    reviewHighlight.style.cssText = 'display:none; background:#f0fdf4; padding:10px; margin-bottom:10px; border-radius:8px;';
    leftCol.appendChild(reviewHighlight);
    
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    let hasVideo = false;

    // Helper to create main image with SEO/LCP optimizations
    const createMainImage = (src) => {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'main-img';
      // Fix Accessibility: Add Alt text
      img.alt = product.title || 'Product Image';
      // Fix Performance: Prioritize loading for LCP
      img.setAttribute('fetchpriority', 'high');
      img.loading = 'eager'; 
      return img;
    };

    if (product.video_url) {
      const ytMatch = product.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (ytMatch) {
        videoWrapper.innerHTML = '<div id="player" data-plyr-provider="youtube" data-plyr-embed-id="' + ytMatch[1] + '"></div>';
        hasVideo = true;
      } else {
        const video = document.createElement('video');
        video.id = 'player';
        video.playsInline = true;
        video.src = product.video_url;
        if (product.thumbnail_url) video.poster = product.thumbnail_url;
        // Fallback if video fails
        video.onerror = function() {
          videoWrapper.innerHTML = '';
          const fallback = createMainImage(product.thumbnail_url || 'https://via.placeholder.com/600');
          videoWrapper.appendChild(fallback);
        };
        videoWrapper.appendChild(video);
        hasVideo = true;
      }
    } else {
      // No video, show main image
      videoWrapper.appendChild(createMainImage(product.thumbnail_url || 'https://via.placeholder.com/600'));
    }
    
    leftCol.appendChild(videoWrapper);

    // Thumbnails with slider
    const thumbsContainer = document.createElement('div');
    thumbsContainer.style.cssText = 'position: relative; margin-top: 15px;';

    const thumbsDiv = document.createElement('div');
    thumbsDiv.className = 'thumbnails';
    thumbsDiv.id = 'thumbnails-slider';
    thumbsDiv.style.cssText = 'display: flex; gap: 12px; overflow-x: auto; scroll-behavior: smooth; padding: 8px 0; scrollbar-width: thin;';

    // Add main product thumbnail
    if (product.thumbnail_url) {
      const img = document.createElement('img');
      img.src = product.thumbnail_url;
      img.className = 'thumb active';
      img.style.cssText = 'min-width: 140px; width: 140px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 3px solid #667eea; transition: all 0.3s;';
      img.alt = (product.title || 'Product') + ' - Thumbnail';
      img.dataset.type = 'main';
      thumbsDiv.appendChild(img);
    }

    thumbsContainer.appendChild(thumbsDiv);

    // Add slider arrows
    const leftArrow = document.createElement('button');
    leftArrow.innerHTML = '‹';
    leftArrow.style.cssText = 'position: absolute; left: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 24px; z-index: 10; display: none;';
    leftArrow.onclick = () => {
      thumbsDiv.scrollBy({ left: -160, behavior: 'smooth' });
    };

    const rightArrow = document.createElement('button');
    rightArrow.innerHTML = '›';
    rightArrow.style.cssText = 'position: absolute; right: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 24px; z-index: 10; display: none;';
    rightArrow.onclick = () => {
      thumbsDiv.scrollBy({ left: 160, behavior: 'smooth' });
    };

    thumbsContainer.appendChild(leftArrow);
    thumbsContainer.appendChild(rightArrow);

    // Check if arrows are needed
    setTimeout(() => {
      if (thumbsDiv.scrollWidth > thumbsDiv.clientWidth) {
        leftArrow.style.display = 'block';
        rightArrow.style.display = 'block';
      }
    }, 100);

    leftCol.appendChild(thumbsContainer);

    // Store reference for adding delivery videos later
    window.productThumbnailsSlider = thumbsDiv;
    mainRow.appendChild(leftCol);

    // --- Right Column: Info & Form ---
    const rightCol = document.createElement('div');
    rightCol.className = 'product-info-col';
    
    const panel = document.createElement('div');
    panel.className = 'product-info-panel';
    
    const title = document.createElement('h1');
    title.className = 'product-title';
    title.textContent = product.title;
    panel.appendChild(title);
    
    const ratingRow = document.createElement('div');
    ratingRow.className = 'rating-row';
    
    // Get review data from product (with fallbacks)
    const reviewCount = product.review_count || 0;
    const ratingAverage = product.rating_average || 5.0;
    
    // Generate stars based on rating
    const fullStars = Math.floor(ratingAverage);
    const halfStar = ratingAverage % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) starsHtml += '★';
    if (halfStar) starsHtml += '☆'; // Using empty star as half star placeholder
    for (let i = 0; i < emptyStars; i++) starsHtml += '☆';
    
    const reviewText = reviewCount === 0 
      ? 'No reviews yet' 
      : `${ratingAverage.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'Review' : 'Reviews'})`;
    
    ratingRow.innerHTML = `<span class="stars">${starsHtml}</span> <span class="review-count">${reviewText}</span>`;
    panel.appendChild(ratingRow);
    
    // Badges
    const badgeRow = document.createElement('div');
    badgeRow.className = 'badges-row';

    const computeDeliveryBadge = (label) => {
      const raw = (label || '').toString();
      const v = raw.toLowerCase();

      if (v.includes('instant') || v.includes('60') || v.includes('1 hour')) {
        return { icon: '⚡', text: raw || 'Instant Delivery In 60 Minutes' };
      }
      if (v.includes('24') || v.includes('express') || v.includes('1 day') || v.includes('24 hour')) {
        return { icon: '🚀', text: raw || '24 Hours Express Delivery' };
      }
      if (v.includes('48') || v.includes('2 day')) {
        return { icon: '📦', text: raw || '2 Days Delivery' };
      }
      if (v.includes('3 day') || v.includes('72')) {
        return { icon: '📅', text: raw || '3 Days Delivery' };
      }
      return { icon: '🚚', text: raw || '2 Days Delivery' };
    };

    const setDeliveryBadge = (label) => {
      const { icon, text } = computeDeliveryBadge(label);
      const iconEl = badgeRow.querySelector('#delivery-badge-icon');
      const textEl = badgeRow.querySelector('#delivery-badge-text');
      if (iconEl) iconEl.textContent = icon;
      if (textEl) textEl.textContent = text;
    };

    // Contrast Fix: main contrast fix will be in CSS.
    badgeRow.innerHTML = `
      <div class="badge-box badge-delivery" id="delivery-badge">
        <div class="icon" id="delivery-badge-icon"></div>
        <span id="delivery-badge-text"></span>
      </div>
    `;

    // Initial delivery badge state - prefer the default option from the delivery addon when present.
    let initialDeliveryLabel = '';
    const deliveryField = (addonGroups || []).find(g => g && g.id === 'delivery-time' && (g.type === 'radio' || g.type === 'select') && Array.isArray(g.options));
    if (deliveryField) {
      initialDeliveryLabel = deliveryField.options.find(o => o && o.default)?.label || deliveryField.options[0]?.label || '';
    }

    if (!initialDeliveryLabel) {
      const normText = (product.normal_delivery_text || '').toLowerCase();
      if (product.instant_delivery) initialDeliveryLabel = 'Instant Delivery In 60 Minutes';
      else if (normText.includes('1 day') || normText.includes('24 hour')) initialDeliveryLabel = '24 Hours Express Delivery';
      else if (normText.includes('48') || normText.includes('2 day')) initialDeliveryLabel = '2 Days Delivery';
      else if (normText.includes('3 day') || normText.includes('72')) initialDeliveryLabel = '3 Days Delivery';
      else initialDeliveryLabel = product.normal_delivery_text || '2 Days Delivery';
    }

    setDeliveryBadge(initialDeliveryLabel);
    window.updateDeliveryBadge = setDeliveryBadge;

    const priceBadge = document.createElement('div');
    priceBadge.className = 'badge-box badge-price';
    const normalPrice = parseFloat(product.normal_price) || 0;
    let priceHtml = '<div class="price-final">$' + window.basePrice.toLocaleString() + '</div>';
    if (window.basePrice < normalPrice) {
      const off = Math.round(((normalPrice - window.basePrice) / normalPrice) * 100);
      priceHtml += '<div style="font-size:0.9rem"><span class="price-original">$' + normalPrice + '</span></div>';
      priceHtml += '<div class="discount-tag">' + off + '% OFF</div>';
    }
    priceBadge.innerHTML = priceHtml;
    badgeRow.appendChild(priceBadge);
    panel.appendChild(badgeRow);
    
    const note = document.createElement('div');
    note.className = 'digital-note';
    note.innerHTML = '<span>📩</span> <span><strong>Digital Delivery:</strong> Receive via WhatsApp/Email.</span>';
    panel.appendChild(note);
    
    // Addons Form
    const addonsForm = document.createElement('form');
    addonsForm.id = 'addons-form';
    addonsForm.style.marginTop = '1.5rem';
    if (addonGroups && addonGroups.length > 0) {
      addonGroups.forEach(group => {
        if (group.type === 'heading') {
          const h = document.createElement('h3'); // Changed h4 to h3 for hierarchy
          h.textContent = group.text || group.label;
          h.style.marginTop = '1.5rem';
          h.style.fontSize = '1.1rem'; // Visual adjustment
          addonsForm.appendChild(h);
        } else {
          addonsForm.appendChild(window.renderAddonField(group));
        }
      });
    }
    panel.appendChild(addonsForm);
    
    const stickyFooter = document.createElement('div');
    stickyFooter.style.marginTop = '2rem';
    stickyFooter.style.paddingTop = '1rem';
    stickyFooter.style.borderTop = '1px solid #e5e5e5';
    
    const checkoutBtn = document.createElement('button');
    checkoutBtn.id = 'checkout-btn';
    checkoutBtn.className = 'btn-buy';
    checkoutBtn.textContent = 'Checkout - $' + window.currentTotal.toLocaleString();
    checkoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof handleCheckout === 'function') handleCheckout();
    });
    stickyFooter.appendChild(checkoutBtn);
    panel.appendChild(stickyFooter);
    
    rightCol.appendChild(panel);
    mainRow.appendChild(rightCol);
    wrapper.appendChild(mainRow);
    container.appendChild(wrapper);
    
    return { wrapper: wrapper, hasVideo: hasVideo };
  }
  window.renderProductMain = renderProductMain;
})();
