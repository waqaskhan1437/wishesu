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
      // Use UniversalVideoPlayer for all video types (YouTube, Vimeo, Archive.org, Bunny, Cloudinary, R2, etc.)
      const playerContainer = document.createElement('div');
      playerContainer.id = 'universal-player-container';
      playerContainer.style.cssText = 'width: 100%; height: 100%; min-height: 400px; border-radius: 12px; overflow: hidden; background: #000;';
      videoWrapper.appendChild(playerContainer);

      // Render video using UniversalVideoPlayer with thumbnail as poster
      if (typeof window.UniversalVideoPlayer !== 'undefined') {
        window.UniversalVideoPlayer.render('universal-player-container', product.video_url, {
          poster: product.thumbnail_url || '',
          thumbnailUrl: product.thumbnail_url || ''
        });
        hasVideo = true;
      } else {
        // Fallback to basic HTML5 video if UniversalVideoPlayer not loaded
        const video = document.createElement('video');
        video.id = 'player';
        video.controls = true;
        video.playsInline = true;
        video.src = product.video_url;
        video.style.cssText = 'width: 100%; height: 100%; border-radius: 12px;';
        if (product.thumbnail_url) video.poster = product.thumbnail_url;
        playerContainer.innerHTML = '';
        playerContainer.appendChild(video);
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
      // Create wrapper for thumbnail with play button overlay
      const thumbWrapper = document.createElement('div');
      thumbWrapper.style.cssText = 'position: relative; display: inline-block;';
      
      const img = document.createElement('img');
      img.src = product.thumbnail_url;
      img.className = 'thumb active';
      img.style.cssText = 'min-width: 140px; width: 140px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; transition: all 0.3s;';
      img.alt = (product.title || 'Product') + ' - Thumbnail';
      img.dataset.type = 'main';
      
      // Add play button overlay ONLY if video exists
      if (product.video_url) {
        const playOverlay = document.createElement('div');
        playOverlay.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; padding-left: 2px; pointer-events: none;';
        playOverlay.innerHTML = '▶';
        thumbWrapper.appendChild(playOverlay);
      }
      
      // Click handler to show main image/video
      img.onclick = () => {
        // Remove active from all thumbs
        thumbsDiv.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
        img.classList.add('active');
        
        // Switch back to main video or thumbnail
        const videoWrapper = document.querySelector('.video-wrapper');
        if (videoWrapper && product.video_url) {
          // Re-render the video player
          const playerContainer = document.getElementById('universal-player-container');
          if (playerContainer && typeof window.UniversalVideoPlayer !== 'undefined') {
            window.UniversalVideoPlayer.render('universal-player-container', product.video_url, {
              poster: product.thumbnail_url || '',
              thumbnailUrl: product.thumbnail_url || ''
            });
          }
        } else if (videoWrapper) {
          // Show main thumbnail image
          videoWrapper.innerHTML = '';
          const mainImg = createMainImage(product.thumbnail_url);
          videoWrapper.appendChild(mainImg);
        }
      };
      
      thumbWrapper.appendChild(img);
      thumbsDiv.appendChild(thumbWrapper);
    }

    // Add gallery images thumbnails
    // Gallery images are stored as JSON array in database, like: ["url1.jpg", "url2.jpg"]
    // We need to parse this JSON and create thumbnails for each image
    if (product.gallery_images) {
      let galleryImages = [];
      try {
        // Try to parse gallery_images if it's a JSON string
        galleryImages = typeof product.gallery_images === 'string' 
          ? JSON.parse(product.gallery_images) 
          : product.gallery_images;
      } catch (e) {
        console.warn('Failed to parse gallery_images:', e);
        galleryImages = [];
      }

      // Create thumbnails for each gallery image
      if (Array.isArray(galleryImages) && galleryImages.length > 0) {
        galleryImages.forEach((imageUrl, index) => {
          if (!imageUrl) return; // Skip empty URLs
          
          const galleryThumb = document.createElement('img');
          galleryThumb.src = imageUrl;
          galleryThumb.className = 'thumb';
          galleryThumb.style.cssText = 'min-width: 140px; width: 140px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; transition: all 0.3s;';
          galleryThumb.alt = (product.title || 'Product') + ' - Gallery Image ' + (index + 1);
          galleryThumb.dataset.type = 'gallery';
          
          // Click handler to show gallery image in main view
          galleryThumb.onclick = () => {
            // Remove active from all thumbs
            thumbsDiv.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
            galleryThumb.classList.add('active');
            
            // Show this gallery image in main video wrapper
            const videoWrapper = document.querySelector('.video-wrapper');
            if (videoWrapper) {
              videoWrapper.innerHTML = '';
              const largeImg = createMainImage(imageUrl);
              videoWrapper.appendChild(largeImg);
            }
          };
          
          // Hover effect
          galleryThumb.onmouseenter = () => {
            if (!galleryThumb.classList.contains('active')) {
              galleryThumb.style.transform = 'scale(1.05)';
            }
          };
          galleryThumb.onmouseleave = () => {
            galleryThumb.style.transform = 'scale(1)';
          };
          
          thumbsDiv.appendChild(galleryThumb);
        });
      }
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
