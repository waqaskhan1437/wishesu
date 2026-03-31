/*
  * Instant File Upload
  * Photos → R2 (fast, free tier)
  * Videos → Archive.org (unlimited, streaming)
  */

(function() {
  const uploadQueue = new Map();
  let activeUploads = 0;

  initFileUploads();

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
    // Previously a MutationObserver was attached to the entire document body without
    // a callback. This observer served no functional purpose and consumed resources
    // by monitoring all DOM mutations. It has been removed as part of the audit.
  }

  function handleFileChange(e) {
    if (e.target && e.target.type === 'file' && e.target.files.length > 0) {
      const file = e.target.files[0];
      const isVideo = file.type.startsWith('video/') || file.name.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/);

      // Size limits
      const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
      const maxSizeLabel = isVideo ? '500MB' : '10MB';

      if (file.size > maxSize) {
        alert(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB\nMaximum: ${maxSizeLabel}`);
        e.target.value = '';
        return;
      }

      let inputId = e.target.id || ('file_' + Date.now());
      e.target.id = inputId;

      showPreview(e.target, file);

      // Route based on file type
      if (isVideo) {
        uploadToArchive(inputId, file);
      } else {
        uploadToR2(inputId, file);
      }
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

  // Upload Photos to R2 (fast, free tier 10GB)
  async function uploadToR2(inputId, file) {
    activeUploads++;
    setCheckoutButtonState(true);

    try {
      const sessionId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

      const uploadUrl = `/api/upload/temp-file?sessionId=${encodeURIComponent(sessionId)}&filename=${encodeURIComponent(filename)}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' }
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');

      const finalUrl = `/api/r2/file?key=${encodeURIComponent(data.tempUrl.replace('r2://', ''))}`;

      uploadQueue.set(inputId, {
        fileName: file.name,
        status: 'uploaded',
        url: finalUrl,
        storage: 'r2'
      });

      updatePreviewSuccess(inputId, file);

    } catch (err) {
      console.error('R2 upload failed:', err);
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

  // Upload Videos to Archive.org (unlimited, streaming)
  async function uploadToArchive(inputId, file) {
    activeUploads++;
    setCheckoutButtonState(true);

    try {
      const sessionId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 9);
      const itemId = `prankwish_${timestamp}_${randomStr}`;
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

      const uploadUrl = `/api/upload/customer-file?sessionId=${encodeURIComponent(sessionId)}&itemId=${encodeURIComponent(itemId)}&filename=${encodeURIComponent(safeFilename)}&originalFilename=${encodeURIComponent(file.name)}`;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'video/mp4'
        },
        body: file
      });

      if (!uploadResponse.ok) {
        const err = await uploadResponse.json().catch(() => ({}));
        throw new Error(err.error || `Archive upload failed: ${uploadResponse.status}`);
      }

      const data = await uploadResponse.json();
      if (!data.success || !data.url) {
        throw new Error(data.error || 'Archive upload failed');
      }

      uploadQueue.set(inputId, {
        fileName: file.name,
        status: 'uploaded',
        url: data.url,
        itemId: itemId,
        storage: 'archive'
      });

      updatePreviewSuccess(inputId, file);

    } catch (err) {
      console.error('Archive upload failed:', err);
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
