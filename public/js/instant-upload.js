/*
  * Instant File Upload - Direct to Archive.org
  * Zero Worker CPU - Browser uploads directly to Archive.org
  */

(function() {
  const uploadQueue = new Map();
  let activeUploads = 0;

  initFileUploads();

  // Disable/Enable checkout button during upload
  function setCheckoutButtonState(disabled) {
    const btn = document.getElementById('checkout-btn');
    if (btn) {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.5' : '1';
      btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    }
  }

  function initFileUploads() {
    document.addEventListener('change', handleFileChange, true);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Watch for new file inputs
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function handleFileChange(e) {
    if (e.target && e.target.type === 'file' && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file size
      const isVideo = file.name.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/);
      const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
      const maxSizeLabel = isVideo ? '500MB' : '10MB';

      if (file.size > maxSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        alert(`File too large: ${sizeMB}MB\n\nMaximum size: ${maxSizeLabel}`);
        e.target.value = '';
        return;
      }

      let inputId = e.target.id || ('file_' + Date.now());
      e.target.id = inputId;

      showPreview(e.target, file);
      uploadToArchive(inputId, file);
    }
  }

  function showPreview(input, file) {
    try {
      let preview = input.nextElementSibling;
      if (!preview || !preview.classList.contains('file-preview')) {
        preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.style.cssText = 'margin-top: 10px;';
        input.parentNode.insertBefore(preview, input.nextSibling);
      }

      preview.innerHTML = `
        <div style="padding: 12px; background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="spinner" style="width: 18px; height: 18px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <div>
              <strong style="color: #1e40af;">Uploading...</strong>
              <div style="font-size: 0.85em; color: #6b7280; margin-top: 2px;">${file.name}</div>
            </div>
          </div>
        </div>
      `;

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-top: 8px; border: 2px solid #3b82f6;';
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Preview error:', err);
    }
  }

  async function uploadToArchive(inputId, file) {
    activeUploads++;
    setCheckoutButtonState(true);

    try {
      // Step 1: Get upload credentials from worker (lightweight - no file data)
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 9);
      const itemId = `wishesu_${timestamp}_${randomStr}`;
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

      const credResponse = await fetch('/api/upload/archive-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, filename: safeFilename })
      });

      if (!credResponse.ok) {
        throw new Error('Failed to get upload credentials');
      }

      const creds = await credResponse.json();
      if (!creds.success) {
        throw new Error(creds.error || 'Failed to get credentials');
      }

      // Step 2: Upload DIRECTLY to Archive.org from browser (Zero Worker CPU)
      const archiveUrl = `https://s3.us.archive.org/${itemId}/${safeFilename}`;

      const uploadResponse = await fetch(archiveUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `LOW ${creds.accessKey}:${creds.secretKey}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-archive-auto-make-bucket': '1',
          'x-archive-meta-mediatype': file.type.startsWith('video/') ? 'movies' : (file.type.startsWith('image/') ? 'image' : 'data'),
          'x-archive-meta-collection': file.type.startsWith('video/') ? 'opensource_movies' : 'opensource',
          'x-archive-meta-title': file.name,
          'x-archive-meta-description': 'Uploaded via WishesU'
        },
        body: file
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => '');
        throw new Error(`Archive.org upload failed: ${uploadResponse.status} ${errorText}`);
      }

      // Success - build final URL
      const finalUrl = `https://archive.org/download/${itemId}/${safeFilename}`;

      uploadQueue.set(inputId, {
        fileName: file.name,
        status: 'uploaded',
        url: finalUrl,
        itemId: itemId
      });

      updatePreviewSuccess(inputId, file);

    } catch (err) {
      console.error('Upload failed:', err);
      uploadQueue.set(inputId, { status: 'failed', error: err.message });
      updatePreviewError(inputId, file, err.message);
    } finally {
      activeUploads--;
      if (activeUploads <= 0) {
        activeUploads = 0;
        setCheckoutButtonState(false);
      }
    }
  }

  function updatePreviewSuccess(inputId, file) {
    const input = document.getElementById(inputId);
    const preview = input?.nextElementSibling;

    if (preview && preview.classList.contains('file-preview')) {
      preview.innerHTML = `
        <div style="padding: 12px; background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="color: #10b981; font-size: 20px;">✓</div>
            <div>
              <strong style="color: #065f46;">Uploaded</strong>
              <div style="font-size: 0.85em; color: #6b7280; margin-top: 2px;">${file.name}</div>
            </div>
          </div>
        </div>
      `;

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-top: 8px; border: 2px solid #10b981;';
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  function updatePreviewError(inputId, file, errorMsg) {
    const input = document.getElementById(inputId);
    const preview = input?.nextElementSibling;

    if (preview && preview.classList.contains('file-preview')) {
      preview.innerHTML = `
        <div style="padding: 12px; background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="color: #ef4444; font-size: 20px;">✕</div>
            <div>
              <strong style="color: #991b1b;">Upload Failed</strong>
              <div style="font-size: 0.85em; color: #6b7280; margin-top: 2px;">${errorMsg || 'Please try again'}</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Public API
  window.getUploadedFiles = function() {
    const files = {};
    uploadQueue.forEach((data, inputId) => {
      if (data.status === 'uploaded' && data.url) {
        files[inputId] = data.url;
      }
    });
    return files;
  };

  window.areAllFilesUploaded = function() {
    let allUploaded = true;
    uploadQueue.forEach((data) => {
      if (data.status !== 'uploaded') allUploaded = false;
    });
    return allUploaded;
  };

  window.isUploadInProgress = function() {
    return activeUploads > 0;
  };

  // CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    .file-preview { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `;
  document.head.appendChild(style);

  window.uploadQueue = uploadQueue;
})();
