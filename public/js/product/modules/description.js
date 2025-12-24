/**
 * Product description and reviews section.
 */

import { renderReviews } from './reviews-renderer.js';

function buildReviewSummary(reviewCount, ratingAverage) {
  if (reviewCount > 0) {
    return `
      <div style="background:#f9fafb; padding:1.5rem; border-radius:8px; text-align:center; color:#6b7280; margin-bottom: 2rem;">
        <span style="font-size:2rem;">Rating: ${ratingAverage.toFixed(1)}</span>
        <p style="margin-top: 0.5rem;">Based on ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}</p>
      </div>
    `;
  }

  return `
    <div style="background:#f9fafb; padding:1.5rem; border-radius:8px; text-align:center; color:#6b7280; margin-bottom: 2rem;">
      <div style="font-size:1.5rem; margin-bottom:15px;">No ratings yet</div>
      <p>No reviews yet. Be the first to leave a review!</p>
    </div>
  `;
}

function loadReviews(product) {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  if (typeof window.ReviewsWidget !== 'undefined') {
    if (product.reviews && product.reviews.length > 0) {
      renderReviews(product.reviews, product, container);
    } else if (product.id) {
      window.ReviewsWidget.render('reviews-container', {
        productId: product.id,
        limit: 50,
        columns: 1,
        showAvatar: true
      });
    }
  } else {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #6b7280;">
        <div style="font-size: 1.5rem; margin-bottom: 15px;">No ratings yet</div>
        <p>No reviews yet. Be the first to leave a review!</p>
      </div>
    `;
  }
}

export function renderProductDescription(wrapper, product) {
  const descRow = document.createElement('div');
  descRow.className = 'product-desc-row';

  const descBox = document.createElement('div');
  descBox.className = 'product-desc';

  const descText = product.description
    ? product.description.replace(/\n/g, '<br>')
    : 'No description available.';

  const reviewCount = product.review_count || 0;
  const ratingAverage = product.rating_average || 0;

  descBox.innerHTML = `
    <h2>Description</h2>
    <div>${descText}</div>
    <hr style="margin: 2rem 0; border: 0; border-top: 1px solid #eee;">
    <h2>Customer Reviews</h2>
    ${buildReviewSummary(reviewCount, ratingAverage)}
    <div id="reviews-container"></div>
  `;

  descRow.appendChild(descBox);
  wrapper.appendChild(descRow);

  setTimeout(() => {
    loadReviews(product);
  }, 100);
}

