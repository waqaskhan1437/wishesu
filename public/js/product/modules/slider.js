/**
 * Review slider helpers.
 */

import { setPlayerSource, showHighlight, scrollToPlayer } from './player.js';

function showSliderArrows(slider) {
  const container = slider ? slider.parentElement : null;
  if (!slider || !container) return;
  if (slider.scrollWidth > slider.clientWidth) {
    const leftArrow = container.querySelector('button:first-of-type');
    const rightArrow = container.querySelector('button:last-of-type');
    if (leftArrow) leftArrow.style.display = 'block';
    if (rightArrow) rightArrow.style.display = 'block';
  }
}

export function addReviewToSlider(review, product, portfolioVideoUrl) {
  if (!window.productThumbnailsSlider) return;

  const galleryThumb = document.createElement('div');
  galleryThumb.style.cssText = 'position: relative; min-width: 140px; width: 140px; height: 100px; flex-shrink: 0; cursor: pointer; border-radius: 10px; overflow: hidden; border: 3px solid transparent; transition: all 0.3s; background:#000;';
  galleryThumb.setAttribute('role', 'button');
  galleryThumb.setAttribute('tabindex', '0');
  galleryThumb.setAttribute('aria-label', 'View review video');

  const videoThumb = document.createElement('video');
  videoThumb.src = portfolioVideoUrl;
  videoThumb.preload = 'metadata';
  videoThumb.muted = true;
  videoThumb.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
  videoThumb.setAttribute('aria-hidden', 'true');
  videoThumb.setAttribute('tabindex', '-1');
  galleryThumb.appendChild(videoThumb);

  const badge = document.createElement('div');
  badge.textContent = 'Review';
  badge.style.cssText = 'position: absolute; bottom: 4px; right: 4px; background: rgba(16,185,129,0.95); color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;';

  const playIcon = document.createElement('div');
  playIcon.className = 'thumb-play-btn';
  playIcon.innerHTML = 'Play';
  playIcon.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.6); color:white; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; padding-left:2px; opacity:1 !important; z-index:100;';
  playIcon.setAttribute('aria-hidden', 'true');

  galleryThumb.appendChild(videoThumb);
  galleryThumb.appendChild(badge);
  galleryThumb.appendChild(playIcon);

  galleryThumb.onclick = () => {
    document.querySelectorAll('#thumbnails-slider .thumb, #thumbnails-slider > div').forEach(t => {
      if (t.style) t.style.border = '3px solid transparent';
    });
    galleryThumb.style.border = '3px solid #667eea';
    showHighlight(review);
    scrollToPlayer();
    setPlayerSource(portfolioVideoUrl, review.thumbnail_url || product.thumbnail_url);
  };

  galleryThumb.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      galleryThumb.click();
    }
  });

  galleryThumb.onmouseenter = () => {
    galleryThumb.style.transform = 'scale(1.05)';
  };
  galleryThumb.onmouseleave = () => {
    galleryThumb.style.transform = 'scale(1)';
  };

  window.productThumbnailsSlider.appendChild(galleryThumb);

  setTimeout(() => {
    showSliderArrows(window.productThumbnailsSlider);
  }, 50);
}

export function addSliderReviews(reviews, product) {
  const reviewsWithVideo = reviews.filter(review => {
    const portfolioVideoUrl = (review.delivered_video_url || '').toString().trim();
    return !!portfolioVideoUrl && Number(review.show_on_product) === 1;
  });

  reviewsWithVideo.slice(-20).forEach(review => {
    const portfolioVideoUrl = (review.delivered_video_url || '').toString().trim();
    addReviewToSlider(review, product, portfolioVideoUrl);
  });
}
