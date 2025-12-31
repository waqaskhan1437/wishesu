/*
 * Construct the primary layout for the product detail page.
 * Builds media column, info column, and addons form.
 * Updated: Implements Click-to-Load Facade for Video to ensure thumbnail visibility.
 */

;(function(){
  // Helper to optimize image URLs for Cloudinary
  function optimizeImageUrl(src, width) {
    if (!src || !src.includes('res.cloudinary.com')) return src;
    const cloudinaryRegex = /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/;
    const match = src.match(cloudinaryRegex);
    if (match) {
      const baseUrl = match[1];
      const imagePath = match[2];
      return `${baseUrl}f_auto,q_auto,w_${width || 400}/${imagePath}`;
    }
    return src;
  }

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
    videoWrapper.style.cssText = 'aspect-ratio: 16/9; width: 100%;';
    let hasVideo = false;

    // Helper to create main image with SEO/LCP optimizations
    const createMainImage = (src) => {
      const img = document.createElement('img');
      
      // Cloudinary URL optimization - convert to WebP and add responsive sizes
      let optimizedSrc = src;
      let srcsetAttr = '';
      
      if (src && src.includes('res.cloudinary.com')) {
        // Extract parts of Cloudinary URL and add transformations
        const cloudinaryRegex = /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/;
        const match = src.match(cloudinaryRegex);
        if (match) {
          const baseUrl = match[1];
          const imagePath = match[2];
          
          // Add WebP format and quality optimization
          optimizedSrc = `${baseUrl}f_auto,q_auto/${imagePath}`;
          
          // Create srcset for responsive images
          srcsetAttr = [
            `${baseUrl}f_auto,q_auto,w_400/${imagePath} 400w`,
            `${baseUrl}f_auto,q_auto,w_600/${imagePath} 600w`,
            `${baseUrl}f_auto,q_auto,w_800/${imagePath} 800w`,
            `${baseUrl}f_auto,q_auto,w_1200/${imagePath} 1200w`
          ].join(', ');
        }
      }
      
      img.src = optimizedSrc;
      if (srcsetAttr) {
        img.srcset = srcsetAttr;
        img.sizes = '(max-width: 600px) 100vw, (max-width: 900px) 55vw, 650px';
      }
      
      img.className = 'main-img';
      // Fix Accessibility: Add Alt text
      img.alt = product.title || 'Product Image';
      // Fix Performance: Prioritize loading for LCP
      img.setAttribute('fetchpriority', 'high');
      img.loading = 'eager';
      // Add explicit dimensions to prevent layout shift
      img.width = 650;
      img.height = 433;
      img.decoding = 'async';
      return img;
    };

    if (product.video_url) {
      // --- FIX: Manual Facade implementation ---
      // Instead of loading the heavy player immediately, we load the image + play button.
      // This ensures the thumbnail IS ALWAYS VISIBLE first.
      
      const facade = document.createElement('div');
      facade.className = 'video-facade';
      facade.style.cssText = 'position: relative; width: 100%; height: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #000; aspect-ratio: 16/9;';
      
      // 1. The Image
      const img = createMainImage(product.thumbnail_url || 'https://via.placeholder.com/600');
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover'; // Ensures image covers the area without distortion
      img.style.display = 'block';
      facade.appendChild(img);

      // 2. The Play Button Overlay
      const playBtn = document.createElement('div');
      playBtn.className = 'play-btn-overlay';
      playBtn.style.cssText = `
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 80px; height: 80px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: white;
        transition: all 0.2s ease;
        z-index: 10;
        backdrop-filter: blur(2px);
      `;
      // SVG Icon
      playBtn.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style="display:block; margin-left:4px;">
          <path d="M8 5v14l11-7z"></path>
        </svg>
      `;
      facade.appendChild(playBtn);

      // 3. Hover Effects
      facade.onmouseenter = () => {
        playBtn.style.background = 'rgba(79, 70, 229, 0.9)'; // Brand color on hover
        playBtn.style.transform = 'translate(-50%, -50%) scale(1.1)';
      };
      facade.onmouseleave = () => {
        playBtn.style.background = 'rgba(0, 0, 0, 0.6)';
        playBtn.style.transform = 'translate(-50%, -50%) scale(1.0)';
      };

      // 4. Click Handler - Load the real player
      facade.onclick = () => {
        // Clear the facade
        videoWrapper.innerHTML = '';
        
        // Create container for the player
        const playerContainer = document.createElement('div');
        playerContainer.id = 'universal-player-container';
        playerContainer.style.cssText = 'width: 100%; height: 100%; min-height: 400px; border-radius: 12px; overflow: hidden; background: #000;';
        videoWrapper.appendChild(playerContainer);

        // Initialize Player
        if (typeof window.UniversalVideoPlayer !== 'undefined') {
          window.UniversalVideoPlayer.render('universal-player-container', product.video_url, {
            poster: null, // Don't pass poster here, we already handled the thumbnail
            thumbnailUrl: null,
            autoplay: true // Attempt autoplay since user interacted
          });
        } else {
          // Fallback
          playerContainer.innerHTML = `<video src="${product.video_url}" controls autoplay style="width:100%;height:100%"></video>`;
        }
      };

      videoWrapper.appendChild(facade);
      hasVideo = true;

    } else {
      // No video, show main image normally
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
      thumbWrapper.className = 'thumb-wrapper';
      thumbWrapper.style.cssText = 'position: relative; display: inline-block;';
      
      const img = document.createElement('img');
      // Optimize thumbnail URL for smaller size
      img.src = optimizeImageUrl(product.thumbnail_url, 280);
      img.className = 'thumb active';
      img.style.cssText = 'min-width: 140px; width: 140px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 3px solid #667eea; transition: all 0.3s;';
      img.alt = (product.title || 'Product') + ' - Thumbnail';
      img.dataset.type = 'main';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 140;
      img.height = 100;
      
      // Add play button overlay ONLY if video exists
      if (product.video_url) {
        const playOverlay = document.createElement('div');
        playOverlay.className = 'thumb-play-btn';
        playOverlay.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; padding-left: 2px; pointer-events: none; opacity: 1 !important; visibility: visible !important; z-index: 100;';
        playOverlay.innerHTML = '▶';
        thumbWrapper.appendChild(playOverlay);
      }
      
      // Click handler to show main image/video
      img.onclick = () => {
        // Remove active from all thumbs
        thumbsDiv.querySelectorAll('.thumb').forEach(t => t.style.border = '3px solid transparent');
        img.style.border = '3px solid #667eea';
        
        // Reset the main video wrapper to initial state (Thumbnail + Play Button)
        const videoWrapper = document.querySelector('.video-wrapper');
        if (videoWrapper) {
            videoWrapper.innerHTML = '';
            // Re-run the main logic to recreate the facade
            // We can simply call a small helper or duplicate the facade creation logic lightly here
            // For simplicity, we just reload the page or re-render. 
            // Better: Re-trigger the initial render logic for the video wrapper part.
            
            // Re-render Main View (Facade)
            if (product.video_url) {
                const facade = document.createElement('div');
                facade.className = 'video-facade';
                facade.style.cssText = 'position: relative; width: 100%; height: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #000;';
                
                const mainImg = createMainImage(product.thumbnail_url);
                mainImg.style.width = '100%';
                mainImg.style.height = '100%';
                mainImg.style.objectFit = 'cover';
                facade.appendChild(mainImg);

                const playBtn = document.createElement('div');
                playBtn.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: rgba(0, 0, 0, 0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; transition: all 0.2s ease; z-index: 10; backdrop-filter: blur(2px);';
                playBtn.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style="display:block; margin-left:4px;"><path d="M8 5v14l11-7z"></path></svg>';
                facade.appendChild(playBtn);

                facade.onclick = () => {
                    videoWrapper.innerHTML = '';
                    const playerContainer = document.createElement('div');
                    playerContainer.id = 'universal-player-container';
                    playerContainer.style.cssText = 'width: 100%; height: 100%; min-height: 400px; border-radius: 12px; overflow: hidden; background: #000;';
                    videoWrapper.appendChild(playerContainer);
                    if (typeof window.UniversalVideoPlayer !== 'undefined') {
                        window.UniversalVideoPlayer.render('universal-player-container', product.video_url, { poster: product.thumbnail_url, autoplay: true });
                    }
                };
                videoWrapper.appendChild(facade);
            } else {
                videoWrapper.appendChild(createMainImage(product.thumbnail_url));
            }
        }
      };
      
      thumbWrapper.appendChild(img);
      thumbsDiv.appendChild(thumbWrapper);
    }

    // Add gallery images thumbnails
    if (product.gallery_images) {
      let galleryImages = [];
      try {
        galleryImages = typeof product.gallery_images === 'string' 
          ? JSON.parse(product.gallery_images) 
          : product.gallery_images;
      } catch (e) {
        galleryImages = [];
      }

      if (Array.isArray(galleryImages) && galleryImages.length > 0) {
        galleryImages.forEach((imageUrl, index) => {
          if (!imageUrl) return; 
          
          const galleryThumb = document.createElement('img');
          galleryThumb.src = imageUrl;
          galleryThumb.className = 'thumb';
          galleryThumb.style.cssText = 'min-width: 140px; width: 140px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 3px solid transparent; transition: all 0.3s;';
          galleryThumb.alt = (product.title || 'Product') + ' - Gallery Image ' + (index + 1);
          galleryThumb.dataset.type = 'gallery';
          
          galleryThumb.onclick = () => {
            thumbsDiv.querySelectorAll('.thumb').forEach(t => t.style.border = '3px solid transparent');
            galleryThumb.style.border = '3px solid #667eea';
            
            const videoWrapper = document.querySelector('.video-wrapper');
            if (videoWrapper) {
              videoWrapper.innerHTML = '';
              const largeImg = createMainImage(imageUrl);
              largeImg.style.width = '100%';
              largeImg.style.height = '100%';
              largeImg.style.objectFit = 'contain'; // Better for gallery images
              videoWrapper.appendChild(largeImg);
            }
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

    setTimeout(() => {
      if (thumbsDiv.scrollWidth > thumbsDiv.clientWidth) {
        leftArrow.style.display = 'block';
        rightArrow.style.display = 'block';
      }
    }, 100);

    leftCol.appendChild(thumbsContainer);
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
    
    const reviewCount = product.review_count || 0;
    const ratingAverage = product.rating_average || 5.0;
    
    const fullStars = Math.floor(ratingAverage);
    const halfStar = ratingAverage % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) starsHtml += '★';
    if (halfStar) starsHtml += '☆'; 
    for (let i = 0; i < emptyStars; i++) starsHtml += '☆';
    
    const reviewText = reviewCount === 0 
      ? 'No reviews yet' 
      : `${ratingAverage.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'Review' : 'Reviews'})`;
    
    ratingRow.innerHTML = `<span class="stars">${starsHtml}</span> <span class="review-count">${reviewText}</span>`;
    panel.appendChild(ratingRow);
    
    // Badges
    const badgeRow = document.createElement('div');
    badgeRow.className = 'badges-row';

    // Helper function to get delivery text from instant/days
    const getDeliveryText = (isInstant, days) => {
      if (isInstant) return 'Instant Delivery In 60 Minutes';
      days = parseInt(days) || 1;
      if (days === 1) return '24 Hour Express Delivery';
      return `${days} Days Delivery`;
    };

    const computeDeliveryBadge = (label) => {
      const raw = (label || '').toString();
      const v = raw.toLowerCase();

      if (v.includes('instant') || v.includes('60') || v.includes('1 hour')) {
        return { icon: '⚡', text: raw || 'Instant Delivery In 60 Minutes' };
      }
      if (v.includes('24') || v.includes('express') || v.includes('1 day') || v.includes('24 hour')) {
        return { icon: '🚀', text: raw || '24 Hour Express Delivery' };
      }
      if (v.includes('48') || v.includes('2 day')) {
        return { icon: '📦', text: raw || '2 Days Delivery' };
      }
      if (v.includes('3 day') || v.includes('72')) {
        return { icon: '📅', text: raw || '3 Days Delivery' };
      }
      // Check for any number of days pattern
      const daysMatch = v.match(/(\d+)\s*day/i);
      if (daysMatch) {
        const numDays = parseInt(daysMatch[1]) || 2;
        return { icon: '📦', text: raw || `${numDays} Days Delivery` };
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

    badgeRow.innerHTML = `
      <div class="badge-box badge-delivery" id="delivery-badge">
        <div class="icon" id="delivery-badge-icon"></div>
        <span id="delivery-badge-text"></span>
      </div>
    `;

    let initialDeliveryLabel = '';
    
    // First check if addon has delivery time field with default selected
    const deliveryField = (addonGroups || []).find(g => g && g.id === 'delivery-time' && (g.type === 'radio' || g.type === 'select') && Array.isArray(g.options));
    if (deliveryField) {
      const defaultOption = deliveryField.options.find(o => o && o.default) || deliveryField.options[0];
      if (defaultOption) {
        // Check if option has delivery settings
        if (defaultOption.delivery && typeof defaultOption.delivery === 'object') {
          const isInstant = !!defaultOption.delivery.instant;
          const days = parseInt(defaultOption.delivery.days) || 1;
          initialDeliveryLabel = getDeliveryText(isInstant, days);
        } else {
          // Use option label as fallback
          initialDeliveryLabel = defaultOption.label || '';
        }
      }
    }

    // If no addon delivery field, use product settings
    if (!initialDeliveryLabel) {
      const isInstant = !!product.instant_delivery;
      const days = parseInt(product.delivery_time_days) || parseInt(product.normal_delivery_text) || 1;
      initialDeliveryLabel = getDeliveryText(isInstant, days);
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
          const h = document.createElement('h3'); 
          h.textContent = group.text || group.label;
          h.style.marginTop = '1.5rem';
          h.style.fontSize = '1.1rem'; 
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

    // Check if Minimal Checkout is enabled
    const useMinimal = window.whopSettings && window.whopSettings.enable_minimal_checkout;

    if (useMinimal) {
      // Minimal Checkout: Apple Pay + Card buttons side by side
      const btnContainer = document.createElement('div');
      btnContainer.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

      // Apple Pay Button
      const applePayBtn = document.createElement('button');
      applePayBtn.id = 'apple-pay-btn';
      applePayBtn.className = 'btn-buy';
      applePayBtn.style.cssText = 'flex: 1; min-width: 140px; background: #000; color: #fff;';
      applePayBtn.innerHTML = ' Pay';
      applePayBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof handleCheckout === 'function') handleCheckout();
      });

      // Card Button
      const cardBtn = document.createElement('button');
      cardBtn.id = 'checkout-btn';
      cardBtn.className = 'btn-buy';
      cardBtn.style.cssText = 'flex: 1; min-width: 140px; background: #2563eb; color: #fff;';
      cardBtn.textContent = 'Pay with Card 💳';
      cardBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof handleCheckout === 'function') handleCheckout();
      });

      btnContainer.appendChild(applePayBtn);
      btnContainer.appendChild(cardBtn);
      stickyFooter.appendChild(btnContainer);
    } else {
      // Standard Checkout Button
      const checkoutBtn = document.createElement('button');
      checkoutBtn.id = 'checkout-btn';
      checkoutBtn.className = 'btn-buy';
      checkoutBtn.textContent = 'Checkout - $' + window.currentTotal.toLocaleString();
      checkoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof handleCheckout === 'function') handleCheckout();
      });
      stickyFooter.appendChild(checkoutBtn);
    }
    panel.appendChild(stickyFooter);
    
    rightCol.appendChild(panel);
    mainRow.appendChild(rightCol);
    wrapper.appendChild(mainRow);
    container.appendChild(wrapper);
    
    return { wrapper: wrapper, hasVideo: hasVideo };
  }
  window.renderProductMain = renderProductMain;
})();
