/**
 * Order Video Player Module
 * Handles video player rendering for different sources
 */

const detectVideoType = (url) => {
  if (!url) return { type: 'unknown' };
  const lower = url.toLowerCase();
  
  if (lower.includes('archive.org')) {
    const match = url.match(/\/details\/([^\/\?]+)/);
    return { type: 'archive', itemId: match ? match[1] : null };
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    let videoId = null;
    if (lower.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split(/[?&#]/)[0];
    else if (lower.includes('v=')) videoId = url.split('v=')[1]?.split(/[&#]/)[0];
    return { type: 'youtube', videoId };
  }
  if (lower.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return { type: 'vimeo', videoId: match ? match[1] : null };
  }
  if (lower.match(/\.(mp4|webm|mov|m4v)$/i)) {
    return { type: 'direct' };
  }
  return { type: 'embed' };
};

const createArchivePlayer = (container, itemId) => {
  const iframe = document.createElement('iframe');
  iframe.src = `https://archive.org/embed/${itemId}`;
  iframe.className = 'video-iframe';
  iframe.allowFullscreen = true;
  iframe.setAttribute('frameborder', '0');
  container.appendChild(iframe);
};

const createYouTubePlayer = (container, videoId) => {
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${videoId}`;
  iframe.className = 'video-iframe';
  iframe.allowFullscreen = true;
  iframe.setAttribute('frameborder', '0');
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  container.appendChild(iframe);
};

const createVimeoPlayer = (container, videoId) => {
  const iframe = document.createElement('iframe');
  iframe.src = `https://player.vimeo.com/video/${videoId}`;
  iframe.className = 'video-iframe';
  iframe.allowFullscreen = true;
  iframe.setAttribute('frameborder', '0');
  container.appendChild(iframe);
};

const createDirectPlayer = (container, url) => {
  const video = document.createElement('video');
  video.src = url;
  video.className = 'video-player';
  video.controls = true;
  video.preload = 'metadata';
  container.appendChild(video);
};

const createEmbedPlayer = (container, url) => {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.className = 'video-iframe';
  iframe.allowFullscreen = true;
  iframe.setAttribute('frameborder', '0');
  container.appendChild(iframe);
};

const configureDownload = (url, orderId) => {
  const btn = document.getElementById('download-btn');
  if (!btn) return;

  const detected = detectVideoType(url);
  const openOnly = ['youtube', 'vimeo'];

  if (openOnly.includes(detected.type)) {
    btn.textContent = '🔗 Open Video';
    btn.href = url;
    btn.target = '_blank';
    btn.removeAttribute('download');
  } else if (detected.type === 'archive') {
    btn.textContent = '🔗 Open on Archive.org';
    btn.href = url;
    btn.target = '_blank';
    btn.removeAttribute('download');
  } else {
    btn.textContent = '⬇️ Download';
    btn.href = url;
    btn.setAttribute('download', `video-${orderId}`);
    btn.removeAttribute('target');
  }
};

export function showVideo(url, orderId) {
  const container = document.getElementById('player-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  const detected = detectVideoType(url);

  switch (detected.type) {
    case 'archive':
      if (detected.itemId) createArchivePlayer(container, detected.itemId);
      else createEmbedPlayer(container, url);
      break;
    case 'youtube':
      if (detected.videoId) createYouTubePlayer(container, detected.videoId);
      else createEmbedPlayer(container, url);
      break;
    case 'vimeo':
      if (detected.videoId) createVimeoPlayer(container, detected.videoId);
      else createEmbedPlayer(container, url);
      break;
    case 'direct':
      createDirectPlayer(container, url);
      break;
    default:
      createEmbedPlayer(container, url);
  }

  configureDownload(url, orderId);
}
