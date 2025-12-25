/**
 * Thumbnail main image.
 */

import { reRenderVideoFacade } from './video-facade.js';

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

  if (product.video_url) {
    const playOverlay = document.createElement('div');
    playOverlay.className = 'thumb-play-btn';
    playOverlay.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; padding-left: 2px; pointer-events: none; opacity: 1 !important; visibility: visible !important; z-index: 100;';
    playOverlay.innerHTML = 'Play';
    thumbWrapper.appendChild(playOverlay);
  }

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
