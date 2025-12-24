/**
 * Review player helpers.
 */

export function setPlayerSource(videoUrl, posterUrl) {
  if (!videoUrl) return;

  let playerContainer = document.getElementById('universal-player-container');

  if (!playerContainer) {
    const videoWrapper = document.querySelector('.video-wrapper');
    if (videoWrapper) {
      videoWrapper.innerHTML = '';
      playerContainer = document.createElement('div');
      playerContainer.id = 'universal-player-container';
      playerContainer.style.cssText = 'width: 100%; height: 100%; min-height: 400px; border-radius: 12px; overflow: hidden; background: #000;';
      videoWrapper.appendChild(playerContainer);
    }
  }

  if (playerContainer && typeof window.UniversalVideoPlayer !== 'undefined') {
    window.UniversalVideoPlayer.render('universal-player-container', videoUrl, {
      poster: posterUrl || '',
      thumbnailUrl: posterUrl || '',
      autoplay: true
    });
  }
}

export function scrollToPlayer() {
  const target = document.getElementById('review-highlight') || document.getElementById('player');
  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function showHighlight(review) {
  const highlight = document.getElementById('review-highlight');
  if (!highlight) return;

  const reviewerName = review.customer_name || review.author_name || 'Customer';
  const reviewText = review.review_text || review.comment || '';

  highlight.style.display = 'block';
  highlight.innerHTML = '';

  const strong = document.createElement('strong');
  strong.textContent = `${reviewerName} says: `;
  highlight.appendChild(strong);

  const span = document.createElement('span');
  span.textContent = reviewText ? `"${reviewText}"` : 'Shared a portfolio video.';
  highlight.appendChild(span);
}
