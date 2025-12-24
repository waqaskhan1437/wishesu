/**
 * Order Video Module
 * Handles video player rendering and download functionality
 */

/**
 * Attach safe download handler to download button
 */
function attachSafeDownload(downloadBtn) {
  if (downloadBtn.dataset.safeDownloadAttached === '1') return;
  downloadBtn.dataset.safeDownloadAttached = '1';

  downloadBtn.addEventListener('click', async (e) => {
    const href = downloadBtn.getAttribute('href') || '';
    const isDownloadLink = href.startsWith('/download/');
    if (!isDownloadLink) return;

    if (downloadBtn.dataset.downloading === '1') {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    downloadBtn.dataset.downloading = '1';

    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'Preparing';
    downloadBtn.style.pointerEvents = 'none';
    downloadBtn.style.opacity = '0.75';

    try {
      const res = await fetch(href, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');

      let filename = 'video';
      const cd = res.headers.get('content-disposition') || '';
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      if (match) {
        filename = decodeURIComponent(match[1] || match[2] || filename);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert('Download failed. Please try again.');
    } finally {
      downloadBtn.dataset.downloading = '0';
      downloadBtn.textContent = originalText;
      downloadBtn.style.pointerEvents = '';
      downloadBtn.style.opacity = '';
    }
  });
}

/**
 * Configure download button based on video type
 */
function configureDownloadButton(url, orderId) {
  const downloadBtn = document.getElementById('download-btn');
  if (!downloadBtn || !window.UniversalVideoPlayer) return;

  const detected = window.UniversalVideoPlayer.detect(url);
  const openOnlyTypes = ['youtube', 'vimeo', 'bunny-embed'];

  const ensureDownload = () => {
    downloadBtn.textContent = 'Download';
    downloadBtn.href = `/download/${orderId}`;
    downloadBtn.removeAttribute('target');
    downloadBtn.setAttribute('download', '');
    attachSafeDownload(downloadBtn);
  };

  const ensureOpen = () => {
    downloadBtn.textContent = '- Open Video';
    downloadBtn.href = url;
    downloadBtn.target = '_blank';
    downloadBtn.removeAttribute('download');
  };

  if (openOnlyTypes.includes(detected.type)) {
    ensureOpen();
  } else if (detected.type === 'archive') {
    if (url.includes('/download/')) {
      ensureDownload();
    } else {
      ensureOpen();
    }
  } else {
    ensureDownload();
  }
}

/**
 * Show video player
 */
export function showVideo(url, videoMetadata, orderId) {
  document.getElementById('countdown-section').style.display = 'none';
  document.getElementById('video-section').style.display = 'block';

  if (window.UniversalVideoPlayer) {
    window.UniversalVideoPlayer.render('player-container', url, videoMetadata);
  }

  configureDownloadButton(url, orderId);
}


