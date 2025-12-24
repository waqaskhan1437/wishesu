/**
 * Thumbnail gallery image.
 */

import { createMainImage } from '../video-facade.js';

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
