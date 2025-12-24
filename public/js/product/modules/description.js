/**
 * Product description and reviews section.
 */

import { renderReviews } from './reviews-renderer.js';

function buildReviewHeading(reviewCount, ratingAverage) {
  if (reviewCount > 0) {
    return `Customer Reviews ${ratingAverage.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'Review' : 'Reviews'})`;
  }
  return 'Customer Reviews';
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

  const heading = buildReviewHeading(reviewCount, ratingAverage);

  descBox.innerHTML = `
    <h2>Description</h2>
    <div>${descText}</div>
    <hr style="margin: 2rem 0; border: 0; border-top: 1px solid #eee;">
    <h2>${heading}</h2>
    <div id="reviews-container"></div>
  `;

  descRow.appendChild(descBox);
  wrapper.appendChild(descRow);

  setTimeout(() => {
    loadReviews(product);
  }, 100);
}

