/**
 * Order Detail Upload Handler
 * Admin upload functionality to Archive.org
 */

export async function submitDelivery(orderId, loadOrder) {
  const url = document.getElementById('delivery-url').value.trim();
  const file = document.getElementById('delivery-file').files[0];
  const thumb = document.getElementById('thumbnail-url').value.trim();
  const subtitlesUrl = document.getElementById('subtitles-url')?.value.trim();

  if (!url && !file) {
    alert('Provide URL or upload file');
    return;
  }

  let videoUrl = url;

  const btn = document.getElementById('submit-delivery-btn');
  const progressDiv = document.getElementById('upload-progress');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  const resetUI = (msg) => {
    alert(msg);
    btn.innerHTML = '✅ Submit Delivery';
    btn.disabled = false;
    progressDiv.style.display = 'none';
  };

  if (file) {
    const maxSize = 1000 * 1024 * 1024; // 1GB Limit
    if (file.size > maxSize) {
      alert(`File too large! Max size 1GB. Yours: ${(file.size/1024/1024).toFixed(1)}MB`);
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ Initializing Upload...';
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = 'Getting credentials...';

    try {
      const credRes = await fetch('/api/upload/archive-credentials', { method: 'POST' });
      const creds = await credRes.json();
      if (!creds.success) throw new Error('Authentication failed. Check admin settings.');

      const timestamp = Date.now();
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const cleanOrderId = orderId.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
      const itemId = `delivery_${cleanOrderId}_${timestamp}`;
      const archiveUrl = `https://s3.us.archive.org/${itemId}/${safeFilename}`;

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          progressBar.style.width = pct + '%';

          if (pct >= 99) {
            progressText.textContent = '⏳ Processing... (Do not close tab)';
            progressText.style.color = '#2563eb';
            progressBar.style.background = '#f59e0b';
          } else {
            progressText.textContent = `Uploading... ${pct}%`;
          }
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const finalUrl = `https://archive.org/download/${itemId}/${safeFilename}`;
          const embedUrl = `https://archive.org/details/${itemId}`;

          progressText.textContent = '✅ Upload Complete!';
          progressBar.style.background = '#10b981';

          submitDeliveryWithUrl(orderId, finalUrl, thumb, subtitlesUrl, { embedUrl, itemId }, loadOrder);
        } else {
          resetUI(`Upload Failed: Server returned ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => resetUI('Network Error during upload'));

      xhr.open('PUT', archiveUrl);
      xhr.setRequestHeader('Authorization', `LOW ${creds.accessKey}:${creds.secretKey}`);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.setRequestHeader('x-archive-auto-make-bucket', '1');
      xhr.setRequestHeader('x-archive-meta-mediatype', 'movies');
      xhr.setRequestHeader('x-archive-meta-title', `Order ${orderId} Delivery`);
      xhr.send(file);

    } catch (err) {
      resetUI('Error: ' + err.message);
    }
  } else {
    submitDeliveryWithUrl(orderId, videoUrl, thumb, subtitlesUrl, null, loadOrder);
  }
}

async function submitDeliveryWithUrl(orderId, videoUrl, thumb, subtitlesUrl, uploadData, loadOrder) {
  const btn = document.getElementById('submit-delivery-btn');
  const progressDiv = document.getElementById('upload-progress');

  btn.innerHTML = '💾 Saving to Database...';
  btn.disabled = true;

  try {
    const deliveryData = {
      orderId,
      videoUrl,
      thumbnailUrl: thumb
    };

    if (subtitlesUrl) deliveryData.subtitlesUrl = subtitlesUrl;

    if (uploadData && uploadData.embedUrl) {
      deliveryData.embedUrl = uploadData.embedUrl;
      deliveryData.itemId = uploadData.itemId;
    }

    const res = await fetch('/api/order/deliver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deliveryData)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      btn.innerHTML = '✅ Delivered Successfully!';
      alert('Order delivered successfully!');
      loadOrder();
      setTimeout(() => {
        if(progressDiv) progressDiv.style.display = 'none';
        btn.innerHTML = '✅ Submit Delivery';
        btn.disabled = false;
      }, 2000);
    } else {
      throw new Error(data.error || 'Failed to save delivery');
    }
  } catch (err) {
    alert('Error saving delivery: ' + err.message);
    btn.textContent = '✅ Submit Delivery';
    btn.disabled = false;
  }
}
