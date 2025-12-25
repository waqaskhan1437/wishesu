/**
 * Reviews Renderer Module
 */

import { buildReviewCard, enhanceReviewCard } from './card.js';
import { createPaginationControls } from './pagination.js';
import { addSliderReviews } from './slider.js';

export function renderReviews(reviews, product, container) {
  if (!reviews || reviews.length === 0) return;

  const grid = document.createElement('div');
  grid.className = 'reviews-grid';
  grid.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 25px; max-width: 1200px; margin: 0 auto;';

  const reviewsPerPage = 10;
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  let currentPage = 1;

  const renderPage = (page) => {
    currentPage = page;
    grid.innerHTML = '';
    const start = (page - 1) * reviewsPerPage;
    const end = start + reviewsPerPage;

    reviews.slice(start, end).forEach(review => {
      const card = buildReviewCard(review);
      if (!card) return;
      enhanceReviewCard(card, review);
      grid.appendChild(card);
    });

    const pagination = createPaginationControls(totalPages, currentPage, renderPage, container);
    if (pagination) grid.appendChild(pagination);
  };

  addSliderReviews(reviews, product);

  container.innerHTML = '';
  container.appendChild(grid);
  renderPage(1);

  if (window.ReviewsWidget) {
    window.ReviewsWidget.addStyles();
  }
}
