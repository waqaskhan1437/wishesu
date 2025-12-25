/**
 * Order Detail Video Player
 * Video delivery display and download handling
 */

export function showDelivery(order, isAdmin) {
  document.getElementById('countdown-section').style.display = 'none';
  document.getElementById('video-player-section').style.display = 'block';

  const playerContainer = document.getElementById('universal-video-player');
  if (playerContainer) {
    playerContainer.innerHTML = '';
    playerContainer.style.width = '100%';
    playerContainer.style.height = '400px';

    if (window.UniversalPlayer && order.delivered_video_url) {
      let videoMetadata = null;
      if (order.delivered_video_metadata) {
        try {
          videoMetadata = JSON.parse(order.delivered_video_metadata);
        } catch (e) {
          console.warn('Failed to parse video metadata:', e);
        }
      }
      window.UniversalPlayer.render('universal-video-player', order.delivered_video_url, videoMetadata);
    } else if (order.delivered_video_url) {
      playerContainer.innerHTML = `
        <video controls preload="metadata" style="width: 100%; height: 400px; background: #000;">
          <source src="${order.delivered_video_url}" type="video/mp4">
          Your browser does not support video playback.
        </video>
      `;
    } else {
      playerContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: #6b7280;">No delivered video URL found.</div>';
    }
  }

  setupDownloadButton(order, isAdmin);
  updateStatusMessage(order, isAdmin);
}

function setupDownloadButton(order, isAdmin) {
  const downloadBtn = document.getElementById('download-btn');
  const revisionBtn = document.getElementById('revision-btn');
  const approveBtn = document.getElementById('approve-btn');

  const attachSafeDownload = () => {
    if (!downloadBtn) return;
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
      downloadBtn.textContent = '⏳ Preparing…';
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
  };

  if (downloadBtn) {
    downloadBtn.style.display = 'inline-flex';
    if (window.UniversalPlayer && order.delivered_video_url) {
      const detected = window.UniversalPlayer.detect(order.delivered_video_url);
      const openOnlyTypes = ['youtube', 'vimeo', 'bunny-embed'];
      if (openOnlyTypes.includes(detected.type)) {
        downloadBtn.textContent = '🔗 Open Video';
        downloadBtn.href = order.delivered_video_url;
        downloadBtn.target = '_blank';
        downloadBtn.removeAttribute('download');
      } else {
        downloadBtn.textContent = '⬇️ Download Video';
        downloadBtn.href = `/download/${order.order_id}`;
        downloadBtn.removeAttribute('target');
        downloadBtn.setAttribute('download', '');
        attachSafeDownload();
      }
    } else if (order.delivered_video_url) {
      downloadBtn.textContent = '⬇️ Download Video';
      downloadBtn.href = `/download/${order.order_id}`;
      downloadBtn.removeAttribute('target');
      downloadBtn.setAttribute('download', '');
      attachSafeDownload();
    }
  }

  if (!isAdmin) {
    if (revisionBtn) revisionBtn.style.display = 'inline-flex';
    if (approveBtn) approveBtn.style.display = 'inline-flex';
    checkReviewStatus(order, approveBtn, revisionBtn);
  } else {
    if (revisionBtn) revisionBtn.style.display = 'none';
    if (approveBtn) approveBtn.style.display = 'none';
  }
}

async function checkReviewStatus(order, approveBtn, revisionBtn) {
  setTimeout(async () => {
    try {
      const reviewRes = await fetch('/api/reviews');
      const reviewData = await reviewRes.json();
      if (reviewData.reviews && Array.isArray(reviewData.reviews)) {
        const hasReview = reviewData.reviews.some(r => r.order_id === order.order_id);
        if (hasReview) {
          if (approveBtn) approveBtn.style.display = 'none';
          if (revisionBtn) revisionBtn.style.display = 'none';
          document.getElementById('review-section').style.display = 'none';
        }
      }
    } catch (e) {
      console.warn('Could not check review status:', e);
    }
  }, 100);
}

function updateStatusMessage(order, isAdmin) {
  const statusEl = document.getElementById('status-message');
  if (statusEl) {
    statusEl.className = 'status-message status-delivered';
    if (!isAdmin) {
      statusEl.innerHTML = '<h3>✅ Video Ready!</h3><p>Your video has been delivered and is ready to watch</p>';
    } else {
      statusEl.innerHTML = '<h3>Delivered</h3><p>Video has been delivered to the buyer.</p>';
    }
  }
}
