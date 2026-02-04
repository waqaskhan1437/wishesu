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
      facade.style.cssText = 'position: relative; width: 100%; cursor: pointer; background: #000; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden;';
      
      // 1. The Image
      const img = createMainImage(product.thumbnail_url || 'https://via.placeholder.com/600');
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
      facade.appendChild(img);

      // 2. The Play Button Overlay - positioned above image (Accessibility Enhanced)
      const playBtn = document.createElement('button');
      playBtn.className = 'play-btn-overlay';
      playBtn.type = 'button';
      playBtn.setAttribute('aria-label', 'Play video');
      playBtn.setAttribute('role', 'button');
      playBtn.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80px;
        height: 80px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: background-color 0.15s ease, transform 0.15s ease;
        z-index: 10;
        cursor: pointer;
      `;
      // SVG Icon (aria-hidden for screen readers)
      playBtn.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="white" aria-hidden="true" focusable="false">
          <path d="M8 5v14l11-7z"></path>
        </svg>
      `;
      facade.appendChild(playBtn);

      // 3. Hover & Focus Effects
      playBtn.onmouseenter = () => {
        playBtn.style.background = 'rgba(79, 70, 229, 0.9)';
        playBtn.style.transform = 'translate(-50%, -50%) scale(1.1)';
      };
      playBtn.onmouseleave = () => {
        playBtn.style.background = 'rgba(0, 0, 0, 0.7)';
        playBtn.style.transform = 'translate(-50%, -50%) scale(1.0)';
      };
      playBtn.onfocus = () => {
        playBtn.style.outline = '3px solid #667eea';
        playBtn.style.outlineOffset = '2px';
      };
      playBtn.onblur = () => {
        playBtn.style.outline = 'none';
      };

      // 4. Click Handler - Load the real player
      const loadVideo = () => {
        // Clear the facade
        videoWrapper.innerHTML = '';
        
        // Check if mobile
        const isMobile = window.innerWidth <= 768;
        
        // Create container for the player
        const playerContainer = document.createElement('div');
        playerContainer.id = 'universal-player-container';
        playerContainer.style.cssText = `width: 100%; height: 100%; min-height: ${isMobile ? '200px' : '300px'}; border-radius: 12px; overflow: visible; background: #000;`;
        videoWrapper.appendChild(playerContainer);

        // On mobile, use simple HTML5 video for better compatibility
        if (isMobile) {
          const videoEl = document.createElement('video');
          videoEl.src = product.video_url;
          videoEl.controls = true;
          // Only load video metadata until the user initiates playback. According to MDN, setting
          // preload to 'metadata' defers downloading large video files until needed, saving bandwidth【187715498598355†L270-L279】.
          videoEl.preload = 'metadata';
          // Disable autoplay so the video does not start downloading immediately on mobile.
          videoEl.autoplay = false;
          videoEl.playsInline = true;
          videoEl.setAttribute('playsinline', '');
          videoEl.setAttribute('webkit-playsinline', '');
          videoEl.style.cssText = 'width:100%; height:100%; min-height:200px; border-radius:12px; background:#000;';
          videoEl.controlsList = 'nodownload';

          playerContainer.appendChild(videoEl);
          
          // Autoplay is disabled; the video will only download and play when the user taps play.
        } else {
          // Desktop - use UniversalVideoPlayer
          if (typeof window.UniversalVideoPlayer !== 'undefined') {
            window.UniversalVideoPlayer.render('universal-player-container', product.video_url, {
              poster: null,
              thumbnailUrl: null,
              autoplay: true
            });
          } else {
            // Fallback
            playerContainer.innerHTML = `<video src="${product.video_url}" controls autoplay playsinline style="width:100%;height:100%;min-height:200px;"></video>`;
          }
        }
      };

      // Add click listeners to both facade and playBtn
      facade.onclick = loadVideo;
      playBtn.onclick = (e) => {
        e.stopPropagation();
        loadVideo();
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
      img.style.cssText = 'min-width: 140px; width: 140px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 3px solid #667eea; transition: border-color 0.15s ease; contain: layout;';
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
                playBtn.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: rgba(0, 0, 0, 0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; transition: background-color 0.15s ease, transform 0.15s ease; z-index: 10;';
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
          galleryThumb.style.cssText = 'min-width: 140px; width: 140px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 3px solid transparent; transition: border-color 0.15s ease; contain: layout;';
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

    // Add slider arrows (with accessibility)
    const leftArrow = document.createElement('button');
    leftArrow.innerHTML = '‹';
    leftArrow.setAttribute('aria-label', 'Previous thumbnails');
    leftArrow.type = 'button';
    leftArrow.style.cssText = 'position: absolute; left: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 24px; z-index: 10; display: none;';
    leftArrow.onclick = () => {
      thumbsDiv.scrollBy({ left: -160, behavior: 'smooth' });
    };

    const rightArrow = document.createElement('button');
    rightArrow.innerHTML = '›';
    rightArrow.setAttribute('aria-label', 'Next thumbnails');
    rightArrow.type = 'button';
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
    
    // Set accessibility attributes after variables are defined
    ratingRow.setAttribute('role', 'img');
    ratingRow.setAttribute('aria-label', `Rating: ${ratingAverage.toFixed(1)} out of 5 stars, ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`);
    
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
    
    ratingRow.innerHTML = `<span class="stars" aria-hidden="true">${starsHtml}</span> <span class="review-count">${reviewText}</span>`;
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
    note.setAttribute('role', 'note');
    note.innerHTML = '<span aria-hidden="true">📩</span> <span><strong>Digital Delivery:</strong> Receive via WhatsApp/Email.</span>';
    panel.appendChild(note);
    
    // Book Now Button - reveals addons form
    const bookNowBtn = document.createElement('button');
    bookNowBtn.id = 'book-now-trigger';
    bookNowBtn.type = 'button';
    bookNowBtn.className = 'btn-book-now';
    bookNowBtn.setAttribute('aria-expanded', 'false');
    bookNowBtn.setAttribute('aria-controls', 'addons-container');
    bookNowBtn.innerHTML = '<span aria-hidden="true">🎬</span> Book Now - $' + window.basePrice.toLocaleString();
    // Apply high‑contrast golden styling to the Book Now button.  The
    // button's colour scheme has been chosen to maximise contrast for
    // users with low vision.  See the related CSS for more details.
    bookNowBtn.style.cssText = `
      width: 100%;
      padding: 16px 24px;
      margin-top: 1.5rem;
      /* Golden gradient for idle state */
      background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%);
      color: #000;
      border: none;
      border-radius: 12px;
      font-size: 1.2rem;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s ease, filter 0.15s ease;
      /* Golden‑toned shadow */
      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
    `;
    panel.appendChild(bookNowBtn);
    
    // Collapsible Addons Container
    const addonsContainer = document.createElement('div');
    addonsContainer.id = 'addons-container';
    addonsContainer.style.cssText = `
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s ease-out, opacity 0.25s ease;
      opacity: 0;
    `;
    
    // Addons Form inside container
    const addonsForm = document.createElement('form');
    addonsForm.id = 'addons-form';
    addonsForm.style.cssText = 'padding-top: 1.5rem; border-top: 1px solid #e5e7eb; margin-top: 1.5rem;';
    
    // No duplicate header - user can add custom heading via addons config
    
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
    addonsContainer.appendChild(addonsForm);
    
    // Sticky Footer with Checkout button (inside container)
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
      btnContainer.setAttribute('role', 'group');
      btnContainer.setAttribute('aria-label', 'Payment options');

      // Apple Pay Button
      const applePayBtn = document.createElement('button');
      applePayBtn.id = 'apple-pay-btn';
      applePayBtn.type = 'button';
      applePayBtn.className = 'btn-buy';
      applePayBtn.setAttribute('aria-label', 'Pay with Apple Pay');
      applePayBtn.style.cssText = 'flex: 1; min-width: 140px; background: #000; color: #fff;';
      applePayBtn.innerHTML = '<span aria-hidden="true"></span> Pay';
      applePayBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof handleCheckout === 'function') handleCheckout();
      });

      // Card Button
      const cardBtn = document.createElement('button');
      cardBtn.id = 'checkout-btn';
      cardBtn.type = 'button';
      cardBtn.className = 'btn-buy';
      cardBtn.setAttribute('aria-label', 'Pay with credit or debit card');
      cardBtn.style.cssText = 'flex: 1; min-width: 140px; background: #2563eb; color: #fff;';
      cardBtn.innerHTML = 'Pay with Card <span aria-hidden="true">💳</span>';
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
      checkoutBtn.type = 'button';
      checkoutBtn.className = 'btn-buy';
      checkoutBtn.innerHTML = '<span aria-hidden="true">✅</span> Proceed to Checkout - $' + window.currentTotal.toLocaleString();
      checkoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof handleCheckout === 'function') handleCheckout();
      });
      stickyFooter.appendChild(checkoutBtn);
    }
    
    addonsContainer.appendChild(stickyFooter);
    panel.appendChild(addonsContainer);
    
    // Book Now click handler - expand/collapse addons form
    // When the form expands we hide all other info in the right panel so the
    // form occupies the full column.  Upon collapse the info is shown again.
    let isExpanded = false;
    bookNowBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const isMobile = window.matchMedia('(max-width: 600px)').matches;
      if (!isExpanded) {
        // Hide other elements in the panel (except the trigger and form container)
        Array.from(panel.children).forEach(child => {
          if (child !== bookNowBtn && child !== addonsContainer) {
            child.dataset.origDisplay = child.style.display || '';
            child.style.display = 'none';
          }
        });

        // Expand - first set expanding class for animation
        addonsContainer.classList.add('expanding');
        addonsContainer.style.maxHeight = addonsContainer.scrollHeight + 1000 + 'px';
        addonsContainer.style.opacity = '1';
        addonsContainer.style.overflow = 'hidden';
        bookNowBtn.innerHTML = '<span aria-hidden="true">▲</span> Close Form';
        bookNowBtn.setAttribute('aria-expanded', 'true');
        // When the form is expanded, switch to a slightly darker golden
        // palette so the button still stands out.  We keep the text
        // colour black for consistency with the idle state.
        bookNowBtn.style.background = 'linear-gradient(135deg, #D1A20D 0%, #AF8A0E 100%)';
        bookNowBtn.style.boxShadow = '0 4px 15px rgba(209, 162, 13, 0.4)';
        bookNowBtn.style.color = '#000';
        // On mobile, keep the form inline (reverted from fullscreen overlay)
        isExpanded = true;
        
        // After animation completes, remove height constraint so content can grow freely
        setTimeout(() => {
          addonsContainer.classList.remove('expanding');
          addonsContainer.classList.add('expanded');
          addonsContainer.style.maxHeight = 'none';
          addonsContainer.style.overflow = 'visible';
        }, 550);
        
        // Scroll to form smoothly
        setTimeout(() => {
          addonsForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        // Collapse - first restore height constraint for animation
        addonsContainer.classList.remove('expanded');
        addonsContainer.style.overflow = 'hidden';
        addonsContainer.style.maxHeight = addonsContainer.scrollHeight + 'px';
        
        // Trigger reflow then collapse
        addonsContainer.offsetHeight;
        addonsContainer.style.maxHeight = '0';
        addonsContainer.style.opacity = '0';
        bookNowBtn.innerHTML = '<span aria-hidden="true">🎬</span> Book Now - $' + window.basePrice.toLocaleString();
        bookNowBtn.setAttribute('aria-expanded', 'false');
        // Restore the original golden styling when collapsing the form
        bookNowBtn.style.background = 'linear-gradient(135deg, #FFD700 0%, #FFC107 100%)';
        bookNowBtn.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)';
        bookNowBtn.style.color = '#000';

        // On mobile, nothing to remove (fullscreen overlay removed in this version)

        // Restore previously hidden elements
        Array.from(panel.children).forEach(child => {
          if (child !== bookNowBtn && child !== addonsContainer) {
            // If dataset.origDisplay is defined, restore it; otherwise blank resets to default
            const orig = child.dataset.origDisplay;
            child.style.display = orig !== undefined ? orig : '';
          }
        });

        isExpanded = false;
      }
    });
    
    // Update checkout button when price changes
    window.updateCheckoutPrice = function(newTotal) {
      const checkoutBtn = document.getElementById('checkout-btn');
      // Don't update if button is in loading state
      if (checkoutBtn && !useMinimal && !checkoutBtn.classList.contains('btn-loading')) {
        checkoutBtn.textContent = '✅ Proceed to Checkout - $' + newTotal.toLocaleString();
      }
    };
    
    rightCol.appendChild(panel);
    mainRow.appendChild(rightCol);
    wrapper.appendChild(mainRow);
    container.appendChild(wrapper);
    
    return { wrapper: wrapper, hasVideo: hasVideo };
  }
  window.renderProductMain = renderProductMain;
})();
