/*
 * Instant File Upload
 *
 * Performance:
 * - Uses event delegation (single capture listener) so dynamic inputs work without DOM-wide MutationObserver.
 * - Optional scoped MutationObserver (disabled by default) can observe only the addons container if ever needed.
 */

(function () {
  const uploadQueue = new Map();

  // Disabled by default. Turn on only if you truly need to react to file-input insertion.
  const ENABLE_SCOPED_OBSERVER = false;

  initFileUploads();

  function getObserveRoot() {
    return (
      document.getElementById("addons-form") ||
      document.getElementById("addons-fields") ||
      null
    );
  }

  function initFileUploads() {
    // Event delegation handles dynamically created inputs.
    document.addEventListener("change", handleFileChange, true);

    if (!ENABLE_SCOPED_OBSERVER) return;

    const root = getObserveRoot();
    if (!root) return;

    const observer = new MutationObserver((mutations) => {
      // Keep intentionally lightweight. Delegation already handles uploads.
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!node || node.nodeType !== 1) continue;
          // no-op: observer is only here for projects that need to "notice" insertion
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  }

  function handleFileChange(e) {
    const input = e.target;
    if (!input || input.type !== "file") return;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      alert(
        `File too large: ${sizeMB}MB\n\nMaximum file size is 5MB.\n\nPlease choose a smaller file.`
      );
      input.value = "";
      return;
    }

    let inputId = input.id;
    if (!inputId) {
      inputId = "file_" + Date.now();
      input.id = inputId;
    }

    showPreview(input, file);
    uploadFileInBackground(inputId, file);
  }

  function showPreview(input, file) {
    try {
      // Find or create preview container
      let preview = input.nextElementSibling;
      if (!preview || !preview.classList.contains("file-preview")) {
        preview = document.createElement("div");
        preview.className = "file-preview";
        preview.style.cssText = "margin-top: 10px;";
        if (input.parentNode) input.parentNode.appendChild(preview);
      }

      // Loading state
      preview.innerHTML = `
        <div class="upload-status uploading">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="spinner"></div>
            <div>
              <div style="font-weight:600;">Uploading ${escapeHtml(file.name)}...</div>
              <div style="font-size:12px; opacity:0.8;">Please wait</div>
            </div>
          </div>
        </div>
      `;

      // Thumbnail for images
      if (file.type && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = function (ev) {
          const imgPreview = document.createElement("img");
          imgPreview.src = String(ev.target && ev.target.result || "");
          imgPreview.style.cssText =
            "width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 10px; border: 2px solid #3b82f6;";
          preview.appendChild(imgPreview);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Preview error:", err);
    }
  }

  async function uploadFileInBackground(inputId, file) {
    try {
      const itemId =
        "upload_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2, 11);

      const filename = String(file.name || "file")
        .replace(/[^a-zA-Z0-9.-]/g, "_");

      const response = await fetch(
        `/api/upload/customer-file?itemId=${encodeURIComponent(
          itemId
        )}&filename=${encodeURIComponent(
          filename
        )}&originalFilename=${encodeURIComponent(file.name || filename)}`,
        {
          method: "POST",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data && data.success && data.url) {
        uploadQueue.set(inputId, {
          status: "uploaded",
          itemId,
          filename,
          url: data.url,
        });
        updatePreviewSuccess(inputId, file);
      } else {
        throw new Error((data && data.error) || "Upload failed");
      }
    } catch (err) {
      uploadQueue.set(inputId, { status: "failed", error: err.message });
      updatePreviewError(inputId, file, err.message);
      console.error("Upload failed:", err);
    }
  }

  function updatePreviewSuccess(inputId, file) {
    const input = document.getElementById(inputId);
    const preview = input && input.nextElementSibling;
    if (!preview || !preview.classList.contains("file-preview")) return;

    preview.innerHTML = `
      <div class="upload-status success">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="color:#10b981; font-size:20px;">✓</div>
          <div>
            <div style="font-weight:600;">${escapeHtml(file.name)} uploaded!</div>
            <div style="font-size:12px; opacity:0.8;">Ready for checkout</div>
          </div>
        </div>
      </div>
    `;
  }

  function updatePreviewError(inputId, file, errorMsg) {
    const input = document.getElementById(inputId);
    const preview = input && input.nextElementSibling;
    if (!preview || !preview.classList.contains("file-preview")) return;

    preview.innerHTML = `
      <div class="upload-status error">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="color:#ef4444; font-size:20px;">✗</div>
          <div>
            <div style="font-weight:600;">Upload failed</div>
            <div style="font-size:12px; opacity:0.8;">${escapeHtml(errorMsg || "Please try again")}</div>
            <button type="button" onclick="location.reload()" style="margin-top:8px; padding:6px 12px; border:none; border-radius:6px; background:#3b82f6; color:white; cursor:pointer;">
              Retry
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Public API
  window.getUploadedFiles = function () {
    const files = {};
    uploadQueue.forEach((data, inputId) => {
      if (data && data.status === "uploaded" && data.url) {
        files[inputId] = data.url;
      }
    });
    return files;
  };

  window.areAllFilesUploaded = function () {
    for (const [, data] of uploadQueue) {
      if (!data || data.status !== "uploaded") return false;
    }
    return true;
  };

  // Styles
  const style = document.createElement("style");
  style.textContent = `
    .upload-status {
      padding: 12px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
    }
    .upload-status.uploading { background: #3b82f6; }
    .upload-status.success { background: #10b981; }
    .upload-status.error { background: #ef4444; }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
})();
