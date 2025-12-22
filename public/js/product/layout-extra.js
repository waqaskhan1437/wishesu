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
      
      // Always try to render reviews, either from embedded data or by fetching.
      if (typeof window.ReviewsWidget !== 'undefined') {
        if (product.reviews && product.reviews.length > 0) {
          // Use reviews from product data (more efficient)
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
            
            // Find or create player container
            let playerContainer = document.getElementById('universal-player-container');
            
            // If container doesn't exist (main video not clicked yet), create it
            if (!playerContainer) {
              const videoWrapper = document.querySelector('.video-wrapper');
              if (videoWrapper) {
                // Clear the facade/thumbnail
                videoWrapper.innerHTML = '';
                
                // Create player container
                playerContainer = document.createElement('div');
                playerContainer.id = 'universal-player-container';
                playerContainer.style.cssText = 'width: 100%; height: 100%; min-height: 400px; border-radius: 12px; overflow: hidden; background: #000;';
                videoWrapper.appendChild(playerContainer);
              }
            }
            
            // Now render the video
            if (playerContainer && typeof window.UniversalVideoPlayer !== 'undefined') {
              window.UniversalVideoPlayer.render('universal-player-container', videoUrl, {
                poster: posterUrl || '',
                thumbnailUrl: posterUrl || '',
                autoplay: true
              });
            }
          };

          // Pagination
          let currentPage = 1;
          const reviewsPerPage = 10;
          const totalPages = Math.ceil(product.reviews.length / reviewsPerPage);
          
          const renderPage = (page) => {
            currentPage = page;
            grid.innerHTML = '';
            const start = (page - 1) * reviewsPerPage;
            const end = start + reviewsPerPage;
            product.reviews.slice(start, end).forEach(review => {
            const temp = document.createElement('div');
            temp.innerHTML = window.ReviewsWidget.renderReview(review, true);
            const card = temp.firstElementChild;
            if (!card) return;
            
            // Add Read More functionality
            const reviewText = review.review_text || review.comment || '';
            if (reviewText) {
              const words = reviewText.split(' ');
              const maxWords = 60; // ~5 lines
              
              if (words.length > maxWords) {
                const shortText = words.slice(0, maxWords).join(' ') + '...';
                const fullText = reviewText;
                
                const textDiv = card.querySelector('.review-text') || document.createElement('div');
                textDiv.className = 'review-text';
                
                const textSpan = document.createElement('span');
                textSpan.textContent = shortText;
                textDiv.innerHTML = '';
                textDiv.appendChild(textSpan);
                
                const readMoreBtn = document.createElement('button');
                readMoreBtn.textContent = 'Read More';
                readMoreBtn.style.cssText = 'color:#667eea;background:none;border:none;cursor:pointer;font-weight:600;margin-left:6px;text-decoration:underline';
                
                let expanded = false;
                readMoreBtn.onclick = (e) => {
                  e.stopPropagation();
                  expanded = !expanded;
                  textSpan.textContent = expanded ? fullText : shortText;
                  readMoreBtn.textContent = expanded ? 'Read Less' : 'Read More';
                };
                
                textDiv.appendChild(readMoreBtn);
                
                if (!card.querySelector('.review-text')) {
                  card.appendChild(textDiv);
                }
              }
            }

            // Only show portfolio video if buyer explicitly allowed it
            const portfolioVideoUrl = (review.delivered_video_url || '').toString().trim();
            const canWatch = !!portfolioVideoUrl && Number(review.show_on_product) === 1;

            if (canWatch) {
              const portfolioRow = document.createElement('div');
              portfolioRow.className = 'review-portfolio-row';
              portfolioRow.style.cssText = 'display:flex; align-items:center; gap:16px; margin-top:16px; padding-top:16px; border-top:1px solid #f3f4f6; flex-wrap:wrap;';

              // Create video thumbnail container - use video itself as thumbnail source
              const thumbContainer = document.createElement('div');
              thumbContainer.style.cssText = 'position:relative; width:260px; height:146px; flex-shrink:0; cursor:pointer; border-radius:10px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1); transition:transform 0.2s, box-shadow 0.2s; background:#000;';
              thumbContainer.setAttribute('role', 'button');
              thumbContainer.setAttribute('tabindex', '0');
              thumbContainer.setAttribute('aria-label', 'Watch review video');

              // Use HTML5 video element to show actual video frame as thumbnail
              // Browser will automatically show a frame from the video
              const videoThumb = document.createElement('video');
              videoThumb.src = portfolioVideoUrl;
              videoThumb.preload = 'metadata'; // Load just enough to show first frame
              videoThumb.style.cssText = 'width:100%; height:100%; object-fit:cover;';
              videoThumb.muted = true; // Muted so it doesn't autoplay with sound
              videoThumb.setAttribute('aria-hidden', 'true');
              videoThumb.setAttribute('tabindex', '-1');
              
              thumbContainer.appendChild(videoThumb);
              
              // Add "Review" badge overlay
              const reviewBadge = document.createElement('div');
              reviewBadge.textContent = 'Review';
              reviewBadge.style.cssText = 'position:absolute; top:8px; right:8px; background:rgba(16,185,129,0.95); color:white; padding:5px 12px; border-radius:6px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; box-shadow:0 2px 6px rgba(0,0,0,0.3);';
              thumbContainer.appendChild(reviewBadge);
              
              // Add play icon overlay
              const playIcon = document.createElement('div');
              playIcon.innerHTML = '▶';
              playIcon.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.75); color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; padding-left:3px; transition:background 0.2s;';
              playIcon.setAttribute('aria-hidden', 'true');
              thumbContainer.appendChild(playIcon);

              const btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = '▶ Watch Video';
              btn.style.cssText = 'background:#111827; color:white; border:0; padding:12px 16px; border-radius:8px; cursor:pointer; font-weight:600; font-size:15px; transition:background 0.2s;';

              const onWatch = () => {
                showHighlight(review);
                scrollToPlayer();
                setPlayerSource(portfolioVideoUrl, null); // Use video itself for preview
              };
              
              // Hover effects
              thumbContainer.addEventListener('mouseenter', () => {
                thumbContainer.style.transform = 'scale(1.03)';
                thumbContainer.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                playIcon.style.background = 'rgba(0,0,0,0.85)';
              });
              
              thumbContainer.addEventListener('mouseleave', () => {
                thumbContainer.style.transform = 'scale(1)';
                thumbContainer.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                playIcon.style.background = 'rgba(0,0,0,0.75)';
              });
              
              btn.addEventListener('mouseenter', () => {
                btn.style.background = '#1f2937';
              });
              
              btn.addEventListener('mouseleave', () => {
                btn.style.background = '#111827';
              });

              thumbContainer.addEventListener('click', onWatch);
              thumbContainer.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onWatch();
                }
              });
              btn.addEventListener('click', onWatch);

              portfolioRow.appendChild(thumbContainer);
              portfolioRow.appendChild(btn);
              card.appendChild(portfolioRow);
            }

            grid.appendChild(card);
            }); // End forEach
            
            // Pagination controls - add to grid so they don't get cleared
            if (totalPages > 1) {
              const pag = document.createElement('div');
              pag.style.cssText = 'display:flex;justify-content:center;gap:12px;margin-top:30px;padding:20px 0;';
              
              const prev = document.createElement('button');
              prev.type = 'button';
              prev.textContent = 'Prev';
              prev.setAttribute('aria-label', 'Previous reviews page');
              prev.disabled = currentPage === 1;
              prev.style.cssText = `padding:10px 20px;background:${currentPage===1?'#94a3b8':'#0f172a'};color:#fff;border:none;border-radius:8px;cursor:${currentPage===1?'not-allowed':'pointer'};font-weight:600`;
              if (currentPage > 1) prev.onclick = () => { renderPage(currentPage - 1); container.scrollIntoView({behavior:'smooth'}); };
              pag.appendChild(prev);
              
              const info = document.createElement('span');
              info.textContent = `Page ${currentPage} of ${totalPages}`;
              info.style.cssText = 'color:#666;font-weight:600;padding:10px;display:flex;align-items:center;';
              pag.appendChild(info);
              
              const next = document.createElement('button');
              next.type = 'button';
              next.textContent = 'Next';
              next.setAttribute('aria-label', 'Next reviews page');
              next.disabled = currentPage === totalPages;
              next.style.cssText = `padding:10px 20px;background:${currentPage===totalPages?'#94a3b8':'#0f172a'};color:#fff;border:none;border-radius:8px;cursor:${currentPage===totalPages?'not-allowed':'pointer'};font-weight:600`;
              if (currentPage < totalPages) next.onclick = () => { renderPage(currentPage + 1); container.scrollIntoView({behavior:'smooth'}); };
              pag.appendChild(next);
              
              grid.appendChild(pag);
            }
          }; // End renderPage
          
          // Gallery thumbnails - only last 20 reviews with allowed portfolio videos
          const reviewsWithVideo = product.reviews.filter(review => {
            const portfolioVideoUrl = (review.delivered_video_url || '').toString().trim();
            return !!portfolioVideoUrl && Number(review.show_on_product) === 1;
          });
          
          // Take only last 20 for slider
          const sliderReviews = reviewsWithVideo.slice(-20);
          
          sliderReviews.forEach(review => {
            const portfolioVideoUrl = (review.delivered_video_url || '').toString().trim();

            if (window.productThumbnailsSlider) {
              const galleryThumb = document.createElement('div');
              galleryThumb.style.cssText = 'position: relative; min-width: 140px; width: 140px; height: 100px; flex-shrink: 0; cursor: pointer; border-radius: 10px; overflow: hidden; border: 3px solid transparent; transition: all 0.3s; background:#000;';
              galleryThumb.setAttribute('role', 'button');
              galleryThumb.setAttribute('tabindex', '0');
              galleryThumb.setAttribute('aria-label', 'View review video');

              // Use actual video as thumbnail source - browser shows video frame automatically
              const videoThumb = document.createElement('video');
              videoThumb.src = portfolioVideoUrl;
              videoThumb.preload = 'metadata'; // Load just first frame
              videoThumb.muted = true;
              videoThumb.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
              videoThumb.setAttribute('aria-hidden', 'true');
              videoThumb.setAttribute('tabindex', '-1');
              galleryThumb.appendChild(videoThumb);

              // Add review badge to gallery thumbnail
              const badge = document.createElement('div');
              badge.textContent = 'Review';
              badge.style.cssText = 'position: absolute; bottom: 4px; right: 4px; background: rgba(16,185,129,0.95); color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;';

              const playIcon = document.createElement('div');
              playIcon.className = 'thumb-play-btn';
              playIcon.innerHTML = '▶';
              playIcon.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.6); color:white; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; padding-left:2px; opacity:1 !important; z-index:100;';
              playIcon.setAttribute('aria-hidden', 'true');

              galleryThumb.appendChild(videoThumb);
              galleryThumb.appendChild(badge);
              galleryThumb.appendChild(playIcon);

              // Click handler
              galleryThumb.onclick = () => {
                // Remove active from all thumbs
                document.querySelectorAll('#thumbnails-slider .thumb, #thumbnails-slider > div').forEach(t => {
                  if (t.style) t.style.border = '3px solid transparent';
                });
                galleryThumb.style.border = '3px solid #667eea';

                showHighlight(review);
                scrollToPlayer();
	              // Always use the unified setPlayerSource function
	              // Fallback to product thumbnail if review poster is missing to avoid black screen.
	              setPlayerSource(portfolioVideoUrl, review.thumbnail_url || product.thumbnail_url);
              };
              galleryThumb.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  galleryThumb.click();
                }
              });

              // Hover effect
              galleryThumb.onmouseenter = () => {
                galleryThumb.style.transform = 'scale(1.05)';
              };
              galleryThumb.onmouseleave = () => {
                galleryThumb.style.transform = 'scale(1)';
              };

              window.productThumbnailsSlider.appendChild(galleryThumb);

              // Update slider arrows visibility
              setTimeout(() => {
                const slider = window.productThumbnailsSlider;
                const container = slider.parentElement;
                if (slider && container && slider.scrollWidth > slider.clientWidth) {
                  const leftArrow = container.querySelector('button:first-of-type');
                  const rightArrow = container.querySelector('button:last-of-type');
                  if (leftArrow) leftArrow.style.display = 'block';
                  if (rightArrow) rightArrow.style.display = 'block';
                }
              }, 50);
            }
          });

          // Initial render - add grid to container first, then render page
          container.innerHTML = '';
          container.appendChild(grid);
          renderPage(1);

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


