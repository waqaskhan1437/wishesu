/**
 * Product Main Layout Orchestrator
 * Constructs the primary layout for the product detail page
 * Builds media column, info column, and addons form
 * Updated: Implements Click-to-Load Facade for Video to ensure thumbnail visibility
 */

import { renderVideoWrapper } from './modules/video-facade.js';
import { renderThumbnailGallery } from './modules/thumbnail-gallery.js';
import { renderProductInfoPanel } from './modules/product-info-panel.js';

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

  // Video wrapper with facade or static image
  const videoWrapper = renderVideoWrapper(product);
  leftCol.appendChild(videoWrapper);

  // Thumbnail gallery with slider
  const thumbsContainer = renderThumbnailGallery(product);
  leftCol.appendChild(thumbsContainer);

  mainRow.appendChild(leftCol);

  // --- Right Column: Info & Form ---
  const rightCol = document.createElement('div');
  rightCol.className = 'product-info-col';

  const panel = renderProductInfoPanel(product, addonGroups);
  rightCol.appendChild(panel);

  mainRow.appendChild(rightCol);
  wrapper.appendChild(mainRow);
  container.appendChild(wrapper);

  return { wrapper: wrapper, hasVideo: !!product.video_url };
}

window.renderProductMain = renderProductMain;
