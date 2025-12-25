/**
 * Video Facade Module
 * Implements Click-to-Load Facade for Video to ensure thumbnail visibility
 * Handles video player initialization and facade interactions
 */

/**
 * Helper to create main image with SEO/LCP optimizations
 */
export function createMainImage(src, product) {
  const img = document.createElement('img');
  img.src = src;
  img.className = 'main-img';
  img.alt = product.title || 'Product Image';
  img.setAttribute('fetchpriority', 'high');
  img.loading = 'eager';
  return img;
}

/**
 * Create video facade with thumbnail and play button
 */
export function createVideoFacade(product, createMainImageFn) {
  const facade = document.createElement('div');
  facade.className = 'video-facade';
  facade.style.cssText = 'position: relative; width: 100%; height: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #000;';

  // 1. The Image
  const img = createMainImageFn(product.thumbnail_url || 'https://via.placeholder.com/600', product);
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.display = 'block';
  facade.appendChild(img);

  // 2. The Play Button Overlay
  const playBtn = document.createElement('div');
  playBtn.className = 'play-btn-overlay';
  playBtn.style.cssText = `
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 80px; height: 80px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: white;
    transition: all 0.2s ease;
    z-index: 10;
    backdrop-filter: blur(2px);
  `;
  playBtn.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style="display:block; margin-left:4px;">
      <path d="M8 5v14l11-7z"></path>
    </svg>
  `;
  facade.appendChild(playBtn);

  // 3. Hover Effects
  facade.onmouseenter = () => {
    playBtn.style.background = 'rgba(79, 70, 229, 0.9)';
    playBtn.style.transform = 'translate(-50%, -50%) scale(1.1)';
  };
  facade.onmouseleave = () => {
    playBtn.style.background = 'rgba(0, 0, 0, 0.6)';
    playBtn.style.transform = 'translate(-50%, -50%) scale(1.0)';
  };

  return { facade, playBtn };
}

/**
 * Initialize video player in the video wrapper
 */
export function initializeVideoPlayer(videoWrapper, product) {
  videoWrapper.innerHTML = '';

  const playerContainer = document.createElement('div');
  playerContainer.id = 'universal-player-container';
  playerContainer.style.cssText = 'width: 100%; height: 100%; min-height: 400px; border-radius: 12px; overflow: hidden; background: #000;';
  videoWrapper.appendChild(playerContainer);

  if (typeof window.UniversalVideoPlayer !== 'undefined') {
    window.UniversalVideoPlayer.render('universal-player-container', product.video_url, {
      poster: null,
      thumbnailUrl: null,
      autoplay: true
    });
  } else {
    // Fallback
    playerContainer.innerHTML = `<video src="${product.video_url}" controls autoplay style="width:100%;height:100%"></video>`;
  }
}

/**
 * Render video wrapper with facade or static image
 */
export function renderVideoWrapper(product) {
  const videoWrapper = document.createElement('div');
  videoWrapper.className = 'video-wrapper';

  if (product.video_url) {
    const { facade } = createVideoFacade(product, createMainImage);

    // Click Handler - Load the real player
    facade.onclick = () => {
      initializeVideoPlayer(videoWrapper, product);
    };

    videoWrapper.appendChild(facade);
  } else {
    // No video, show main image normally
    videoWrapper.appendChild(createMainImage(product.thumbnail_url || 'https://via.placeholder.com/600', product));
  }

  return videoWrapper;
}

/**
 * Re-render video facade (for thumbnail click handler)
 */
export function reRenderVideoFacade(product, videoWrapper) {
  if (!product.video_url) {
    videoWrapper.innerHTML = '';
    videoWrapper.appendChild(createMainImage(product.thumbnail_url || 'https://via.placeholder.com/600', product));
    return;
  }

  videoWrapper.innerHTML = '';
  const { facade } = createVideoFacade(product, createMainImage);

  facade.onclick = () => {
    initializeVideoPlayer(videoWrapper, product);
  };

  videoWrapper.appendChild(facade);
}
