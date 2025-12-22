/**
 * Thumbnail Gallery Module
 * Handles thumbnail slider with gallery images
 * Manages thumbnail interactions and slider arrows
 */

import { createMainImage, reRenderVideoFacade } from './video-facade.js';

/**
 * Create main thumbnail with play button overlay
 */
export function createMainThumbnail(product, thumbsDiv) {
  const thumbWrapper = document.createElement('div');
  thumbWrapper.className = 'thumb-wrapper';
  thumbWrapper.style.cssText = 'position: relative; display: inline-block;';

  const img = document.createElement('img');
  img.src = product.thumbnail_url;
  img.className = 'thumb active';
  img.style.cssText = 'min-width: 140px; width: 140px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 3px solid #667eea; transition: all 0.3s;';
  img.alt = (product.title || 'Product') + ' - Thumbnail';
  img.dataset.type = 'main';

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
    thumbsDiv.querySelectorAll('.thumb').forEach(t => t.style.border = '3px solid transparent');
    img.style.border = '3px solid #667eea';

    const videoWrapper = document.querySelector('.video-wrapper');
    if (videoWrapper) {
      reRenderVideoFacade(product, videoWrapper);
    }
  };

  thumbWrapper.appendChild(img);
  return thumbWrapper;
}

/**
 * Create gallery thumbnail
 */
export function createGalleryThumbnail(imageUrl, product, index, thumbsDiv) {
  const galleryThumb = document.createElement('img');
  galleryThumb.src = imageUrl;
  galleryThumb.className = 'thumb';
  galleryThumb.style.cssText = 'min-width: 140px; width: 140px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 3px solid transparent; transition: all 0.3s;';
  galleryThumb.alt = (product.title || 'Product') + ' - Gallery Image ' + (index + 1);
  galleryThumb.dataset.type = 'gallery';

  galleryThumb.onclick = () => {
    thumbsDiv.querySelectorAll('.thumb').forEach(t => t.style.border = '3px solid transparent');
    galleryThumb.style.border = '3px solid #667eea';

    const videoWrapper = document.querySelector('.video-wrapper');
    if (videoWrapper) {
      videoWrapper.innerHTML = '';
      const largeImg = createMainImage(imageUrl, product);
      largeImg.style.width = '100%';
      largeImg.style.height = '100%';
      largeImg.style.objectFit = 'contain';
      videoWrapper.appendChild(largeImg);
    }
  };

  return galleryThumb;
}

/**
 * Create slider arrows
 */
export function createSliderArrows(thumbsDiv) {
  const leftArrow = document.createElement('button');
  leftArrow.innerHTML = '‹';
  leftArrow.style.cssText = 'position: absolute; left: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 24px; z-index: 10; display: none;';
  leftArrow.onclick = () => {
    thumbsDiv.scrollBy({ left: -160, behavior: 'smooth' });
  };

  const rightArrow = document.createElement('button');
  rightArrow.innerHTML = '›';
  rightArrow.style.cssText = 'position: absolute; right: 0; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 24px; z-index: 10; display: none;';
  rightArrow.onclick = () => {
    thumbsDiv.scrollBy({ left: 160, behavior: 'smooth' });
  };

  return { leftArrow, rightArrow };
}

/**
 * Render thumbnail gallery with slider
 */
export function renderThumbnailGallery(product) {
  const thumbsContainer = document.createElement('div');
  thumbsContainer.style.cssText = 'position: relative; margin-top: 15px;';

  const thumbsDiv = document.createElement('div');
  thumbsDiv.className = 'thumbnails';
  thumbsDiv.id = 'thumbnails-slider';
  thumbsDiv.style.cssText = 'display: flex; gap: 12px; overflow-x: auto; scroll-behavior: smooth; padding: 8px 0; scrollbar-width: thin;';

  // Add main product thumbnail
  if (product.thumbnail_url) {
    const mainThumb = createMainThumbnail(product, thumbsDiv);
    thumbsDiv.appendChild(mainThumb);
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
        const galleryThumb = createGalleryThumbnail(imageUrl, product, index, thumbsDiv);
        thumbsDiv.appendChild(galleryThumb);
      });
    }
  }

  thumbsContainer.appendChild(thumbsDiv);

  // Add slider arrows
  const { leftArrow, rightArrow } = createSliderArrows(thumbsDiv);
  thumbsContainer.appendChild(leftArrow);
  thumbsContainer.appendChild(rightArrow);

  // Show arrows if needed
  setTimeout(() => {
    if (thumbsDiv.scrollWidth > thumbsDiv.clientWidth) {
      leftArrow.style.display = 'block';
      rightArrow.style.display = 'block';
    }
  }, 100);

  // Store global reference
  window.productThumbnailsSlider = thumbsDiv;

  return thumbsContainer;
}
