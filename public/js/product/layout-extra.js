/**
 * Product Layout Extra Module
 * Secondary layout helpers for the product page
 * Appends description/reviews section and initializes video player
 * Updated for Accessibility (Correct Heading Hierarchy h3 -> h2)
 */

import { renderReviews } from './modules/reviews-renderer.js';

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

  // Load reviews
  setTimeout(() => {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    if (typeof window.ReviewsWidget !== 'undefined') {
      if (product.reviews && product.reviews.length > 0) {
        // Use reviews from product data
        renderReviews(product.reviews, product, container);
      } else if (product.id) {
        // Fallback to API call for reviews
        window.ReviewsWidget.render('reviews-container', {
          productId: product.id,
          limit: 50,
          columns: 1,
          showAvatar: true
        });
      }
    } else {
      // No reviews widget available
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
