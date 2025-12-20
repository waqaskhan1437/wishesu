/*
 * Instant File Upload
 *
 * Performance:
 * - Uses event delegation (single capture listener) for dynamic file inputs.
 * - Optional scoped MutationObserver (disabled by default) that observes ONLY the addons container.
 */

(function () {
  const uploadQueue = new Map();

  // Disabled by default. Enable only if you truly need to react to file-input insertion.
  const ENABLE_SCOPED_OBSERVER = false;

  initFileUploads();

  function getObserveRoot() {
    return (
      document.getElementById('addons-form') ||
      document.getElementById('addons-fields') ||
      null
    );
  }

  function initFileUploads() {
    // Event delegation: works for dynamically created inputs with no observer needed.
    document.addEventListener('change', handleFileChange, true);

    if (ENABLE_SCOPED_OBSERVER) {
      const root = getObserveRoot();
      if (!root) return;

      const observer = new MutationObserver((mutations) => {
        // Keep this intentionally lightweight; delegation already handles change events.
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!node || node.nodeType !== 1) continue;
            // no-op
          }
        }
      });

      observer.observe(root, { childList: true, subtree: true });
    }
  }

  function handleFileChange(e) {
    const input = e.target;
    if (!input || input.type !== 'file') return;

    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      alert(
        `File too large: ${sizeMB}MB\n\nMaximum file size is 5MB.\n\nPlease choose a smaller file.`
      );
      input.value = '';
      return;
    }

    let inputId = input.id;
    if (!inputId) {
      inputId = 'file_' + Date.now();
      input.id = inputId;
    }

    showPreview(input, file);
    uploadFileInBackground(inputId, file);
  }

  function showPreview(input, file) {
    try {
      // Find or create preview container
      let preview = input.nextElementSibling;
      if (!preview || !preview.classList.contains('file-preview')) {
        preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.style.cssText = 'margin-top: 10px;';

        if (input.parentNode) {
          input.parentNode.insertBefore(preview, input.nextSibling);
        } else {
          input.parentNode && input.parentNode.appendChild(preview);
        }
      }

      preview.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f3f4f6; border-radius: 8px;">
          <div style="width: 20px; height: 20px; border: 2px solid #3b82f6; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span style="color: #374151; font-size: 14px;">Uploading ${escapeHtml(file.name)}...</span>
        </div>
      `;

      // Thumbnail for images
      if (file.type && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (ev) {
          const imgPreview = document.createElement('img');
          imgPreview.src = ev.target.result;
          imgPreview.style.cssText =
            'width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 10px; border: 2px solid #3b82f6;';
          preview.appendChild(imgPreview);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Preview error:', err);
    }
  }

  async function uploadFileInBackground(inputId, file) {
    try {
      const itemId =
        'upload_' +
        Date.now() +
        '_' +
        Math.random().toString(36).substr(2, 9);
      const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

      const response = await fetch(
        `/api/upload/customer-file?itemId=${encodeURIComponent(
          itemId
        )}&filename=${encodeURIComponent(
          filename
        )}&originalFilename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.success && data.url) {
        uploadQueue.set(inputId, {
          status: 'uploaded',
          url: data.url,
        });

        updatePreviewSuccess(inputId, file);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      uploadQueue.set(inputId, { status: 'failed', error: err.message });
      updatePreviewError(inputId, file, err.message);
    }
  }

  function updatePreviewSuccess(inputId, file) {
    const input = document.getElementById(inputId);
    const preview = input?.nextElementSibling;

    if (!preview || !preview.classList.contains('file-preview')) return;

    preview.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #dcfce7; border-radius: 8px; border: 1px solid #22c55e;">
        <div style="width: 20px; height: 20px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 12px;">✓</span>
        </div>
        <span style="color: #166534; font-size: 14px;">${escapeHtml(
          file.name
        )} uploaded successfully!</span>
      </div>
    `;
  }

  function updatePreviewError(inputId, file, errorMsg) {
    const input = document.getElementById(inputId);
    const preview = input?.nextElementSibling;

    if (!preview || !preview.classList.contains('file-preview')) return;

    preview.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px; background: #fee2e2; border-radius: 8px; border: 1px solid #ef4444;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 20px; height: 20px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 12px;">✕</span>
          </div>
          <span style="color: #991b1b; font-size: 14px;">Upload failed: ${escapeHtml(
            file.name
          )}</span>
        </div>
        <span style="color: #991b1b; font-size: 12px;">${escapeHtml(
          errorMsg || 'Unknown error'
        )}</span>
      </div>
    `;
  }

  // Public API
  window.getUploadedFiles = function () {
    const files = {};
    uploadQueue.forEach((data, inputId) => {
      if (data.status === 'uploaded' && data.url) {
        files[inputId] = data.url;
      }
    });
    return files;
  };

  window.areAllFilesUploaded = function () {
    let allUploaded = true;
    uploadQueue.forEach((data) => {
      if (data.status === 'uploading') allUploaded = false;
    });
    return allUploaded;
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Spinner CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
})();
