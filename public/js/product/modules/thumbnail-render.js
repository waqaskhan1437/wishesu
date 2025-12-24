/**
 * Render thumbnail gallery with slider.
 */

import { createMainThumbnail } from './main-thumbnail.js';
import { createGalleryThumbnail } from './gallery-thumbnail.js';
import { createSliderArrows } from './slider-arrows.js';

export function renderThumbnailGallery(product) {
  const thumbsContainer = document.createElement('div');
  thumbsContainer.style.cssText = 'position: relative; margin-top: 15px;';

  const thumbsDiv = document.createElement('div');
  thumbsDiv.className = 'thumbnails';
  thumbsDiv.id = 'thumbnails-slider';
  thumbsDiv.style.cssText = 'display: flex; gap: 12px; overflow-x: auto; scroll-behavior: smooth; padding: 8px 0; scrollbar-width: thin;';

  if (product.thumbnail_url) {
    const mainThumb = createMainThumbnail(product, thumbsDiv);
    thumbsDiv.appendChild(mainThumb);
  }

  if (product.gallery_images) {
    let galleryImages = [];
    try {
      galleryImages = typeof product.gallery_images === 'string'
        ? JSON.parse(product.gallery_images)
        : product.gallery_images;
    } catch (_) {
      galleryImages = [];
    }

    if (Array.isArray(galleryImages) && galleryImages.length > 0) {
      galleryImages.forEach((imageUrl, index) => {
        if (!imageUrl) return;
        const galleryThumb = createGalleryThumbnail(imageUrl, product, index, thumbsDiv);
        thumbsDiv.appendChild(galleryThumb);
      });
    }
  }

  thumbsContainer.appendChild(thumbsDiv);

  const { leftArrow, rightArrow } = createSliderArrows(thumbsDiv);
  thumbsContainer.appendChild(leftArrow);
  thumbsContainer.appendChild(rightArrow);

  setTimeout(() => {
    if (thumbsDiv.scrollWidth > thumbsDiv.clientWidth) {
      leftArrow.style.display = 'block';
      rightArrow.style.display = 'block';
    }
  }, 100);

  window.productThumbnailsSlider = thumbsDiv;

  return thumbsContainer;
}
