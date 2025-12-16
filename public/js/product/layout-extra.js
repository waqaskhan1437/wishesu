/*
 * Secondary layout helpers for the product page.
 * Appends description/reviews section and initializes video player.
 * Updated for Accessibility (Correct Heading Hierarchy h3 -> h2).
 */

;(function(){
  const PLAYER_OPTIONS = {
    controls: ['play-large','play','progress','current-time','mute','volume','fullscreen'],
    ratio: '16:9',
    clickToPlay: true,
    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
  };

  function renderProductDescription(wrapper, product) {
    const descRow = document.createElement('div');
    descRow.className = 'product-desc-row';
    
    const descBox = document.createElement('div');
    descBox.className = 'product-desc';
    
    // Convert newlines to breaks for display
    const descText = product.description ? product.description.replace(/\n/g, '<br>') : 'No description available.';
    
    // Get review statistics
    const reviewCount = product.review_count || 0;
    const ratingAverage = product.rating_average || 0;
    
    // Fix: Changed <h3> to <h2> to maintain correct heading hierarchy
    // (h1 is Product Title, so next logical level is h2)
    descBox.innerHTML = `
      <h2>Description</h2>
      <div>${descText}</div>
      <hr style="margin: 2rem 0; border: 0; border-top: 1px solid #eee;">
      <h2>Customer Reviews</h2>
      ${reviewCount > 0 ? `
        <div style="background:#f9fafb; padding:1.5rem; border-radius:8px; text-align:center; color:#6b7280; margin-bottom: 2rem;">
          <span style="font-size:2rem;">⭐ ${ratingAverage.toFixed(1)}</span>
          <p style="margin-top: 0.5rem;">Based on ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}</p>
        </div>
      ` : `
        <div style="background:#f9fafb; padding:1.5rem; border-radius:8px; text-align:center; color:#6b7280; margin-bottom: 2rem;">
          <div style="font-size:3rem; margin-bottom:15px;">⭐</div>
          <p>No reviews yet. Be the first to leave a review!</p>
        </div>
      `}
      <div id="reviews-container"></div>
    `;
    
    descRow.appendChild(descBox);
    wrapper.appendChild(descRow);
    
    // Load reviews - first try from existing product data, then fallback to widget
    setTimeout(() => {
      const container = document.getElementById('reviews-container');
      if (!container) return;
      
      if (product.reviews && product.reviews.length > 0) {
        // Use reviews from product data (more efficient)
        if (typeof window.ReviewsWidget !== 'undefined') {
          const grid = document.createElement('div');
          grid.className = 'reviews-grid';
          grid.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 25px; max-width: 1200px; margin: 0 auto;';

          const scrollToPlayer = () => {
            const target = document.getElementById('review-highlight') || document.getElementById('player');
            if (target && typeof target.scrollIntoView === 'function') {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          };

          const showHighlight = (review) => {
            const highlight = document.getElementById('review-highlight');
            if (!highlight) return;

            const reviewerName = review.customer_name || review.author_name || 'Customer';
            const reviewText = review.review_text || review.comment || '';

            highlight.style.display = 'block';
            highlight.innerHTML = '';

            const strong = document.createElement('strong');
            strong.textContent = `${reviewerName} says: `;
            highlight.appendChild(strong);

            const span = document.createElement('span');
            span.textContent = reviewText ? `"${reviewText}"` : 'Shared a portfolio video.';
            highlight.appendChild(span);
          };

          const setPlayerSource = (videoUrl, posterUrl) => {
            if (!videoUrl) return;

            const currentPlayerEl = document.getElementById('player');
            if (!currentPlayerEl) return;

            try {
              if (window.productPlayer && window.productPlayer.source) {
                window.productPlayer.source = {
                  type: 'video',
                  sources: [{ src: videoUrl }]
                };
                if (posterUrl && currentPlayerEl.tagName && currentPlayerEl.tagName.toLowerCase() === 'video') {
                  currentPlayerEl.poster = posterUrl;
                }
                if (typeof window.productPlayer.play === 'function') {
                  window.productPlayer.play();
                }
                return;
              }
            } catch (e) {
              console.warn('Failed to update player source. Rebuilding player...', e);
            }

            // Fallback: if the current player element isn't a <video> (e.g., YouTube embed), rebuild as HTML5 video
            const playerEl = document.getElementById('player');
            if (!playerEl) return;

            let videoEl = playerEl;
            if (!videoEl.tagName || videoEl.tagName.toLowerCase() !== 'video') {
              try {
                if (window.productPlayer && typeof window.productPlayer.destroy === 'function') {
                  window.productPlayer.destroy();
                }
              } catch (_) {}

              videoEl = document.createElement('video');
              videoEl.id = 'player';
              videoEl.playsInline = true;
              videoEl.controls = true;
              if (posterUrl) videoEl.poster = posterUrl;
              playerEl.replaceWith(videoEl);
            }

            videoEl.src = videoUrl;
            videoEl.play().catch(() => {});

            if (window.Plyr) {
              try {
                window.productPlayer = new window.Plyr('#player', PLAYER_OPTIONS);
              } catch (_) {}
            }
          };

          product.reviews.slice(0, 50).forEach(review => {
            const temp = document.createElement('div');
            temp.innerHTML = window.ReviewsWidget.renderReview(review, true);
            const card = temp.firstElementChild;
            if (!card) return;

            const portfolioVideoUrl = (review.delivered_video_url || '').toString().trim();
            const portfolioThumbUrl = (review.delivered_thumbnail_url || '').toString().trim();
            const canWatch = !!portfolioVideoUrl && Number(review.show_on_product) === 1;

            if (canWatch) {
              const portfolioRow = document.createElement('div');
              portfolioRow.style.cssText = 'display:flex; align-items:center; gap:12px; margin-top:12px; padding-top:12px; border-top:1px solid #f3f4f6;';

              const thumb = document.createElement('img');
              thumb.src = portfolioThumbUrl || product.thumbnail_url || 'https://via.placeholder.com/160x90?text=Video';
              thumb.alt = 'Review video thumbnail';
              thumb.style.cssText = 'width:140px; height:80px; object-fit:cover; border-radius:8px; cursor:pointer; border:1px solid #e5e7eb; flex-shrink:0;';

              const btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = '▶ Watch Review';
              btn.style.cssText = 'background:#111827; color:white; border:0; padding:10px 12px; border-radius:8px; cursor:pointer; font-weight:600;';

              const onWatch = () => {
                showHighlight(review);
                scrollToPlayer();
                setPlayerSource(portfolioVideoUrl, portfolioThumbUrl);
              };

              thumb.addEventListener('click', onWatch);
              btn.addEventListener('click', onWatch);

              portfolioRow.appendChild(thumb);
              portfolioRow.appendChild(btn);
              card.appendChild(portfolioRow);
            }

            grid.appendChild(card);
          });

          container.innerHTML = '';
          container.appendChild(grid);

          // Add styles if needed
          window.ReviewsWidget.addStyles();
        }
      } else if (typeof window.ReviewsWidget !== 'undefined' && product.id) {
        // Fallback to API call for reviews
        window.ReviewsWidget.render('reviews-container', {
          productId: product.id,
          limit: 50,
          columns: 1,
          showAvatar: true
        });
      } else {
        // No reviews widget available and no reviews in product data
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #6b7280;">
            <div style="font-size: 3rem; margin-bottom: 15px;">⭐</div>
            <p>No reviews yet. Be the first to leave a review!</p>
          </div>
        `;
      }
    }, 100);
  }

  function initializePlayer(hasVideo) {
    if (!hasVideo) return;
    // Small delay to ensure DOM is ready
    setTimeout(function() {
      if (document.getElementById('player') && window.Plyr) {
        try {
          if (window.productPlayer && typeof window.productPlayer.destroy === 'function') {
            window.productPlayer.destroy();
          }
        } catch (_) {}

        window.productPlayer = new window.Plyr('#player', PLAYER_OPTIONS);
      }
    }, 100);
  }

  window.renderProductDescription = renderProductDescription;
  window.initializePlayer = initializePlayer;
})();
