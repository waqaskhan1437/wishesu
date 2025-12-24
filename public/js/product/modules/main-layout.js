/**
 * Product main layout builder.
 */

import { renderVideoWrapper } from '../video-facade.js';
import { renderThumbnailGallery } from '../thumbnail-gallery.js';
import { renderProductInfoPanel } from '../product-info-panel.js';

export function renderProductMain(container, product, addonGroups) {
  container.className = '';
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'product-page';

  const mainRow = document.createElement('div');
  mainRow.className = 'product-main-row';

  const leftCol = document.createElement('div');
  leftCol.className = 'product-media-col';

  const reviewHighlight = document.createElement('div');
  reviewHighlight.id = 'review-highlight';
  reviewHighlight.style.cssText = 'display:none; background:#f0fdf4; padding:10px; margin-bottom:10px; border-radius:8px;';
  leftCol.appendChild(reviewHighlight);

  const videoWrapper = renderVideoWrapper(product);
  leftCol.appendChild(videoWrapper);

  const thumbsContainer = renderThumbnailGallery(product);
  leftCol.appendChild(thumbsContainer);

  mainRow.appendChild(leftCol);

  const rightCol = document.createElement('div');
  rightCol.className = 'product-info-col';

  const panel = renderProductInfoPanel(product, addonGroups);
  rightCol.appendChild(panel);

  mainRow.appendChild(rightCol);
  wrapper.appendChild(mainRow);
  container.appendChild(wrapper);

  return { wrapper: wrapper, hasVideo: !!product.video_url };
}
