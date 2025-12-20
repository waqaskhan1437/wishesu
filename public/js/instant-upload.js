/*
  * FIXED: Instant File Upload with Direct R2 Upload (ZERO-CPU)
  * Works with dynamically created file inputs
  */

(function() {
  console.log('🚀 INSTANT UPLOAD SCRIPT LOADED (ZERO-CPU MODE)');
  
  const uploadQueue = new Map();
  let isProcessing = false;

  // Initialize IMMEDIATELY
  initFileUploads();

  function initFileUploads() {
    console.log('📁 Initializing instant file uploads...');
    
    // Method 1: Direct event listener on document
    document.addEventListener('change', handleFileChange, true);
    
    // Method 2: MutationObserver for dynamic inputs
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if added node is file input
            if (node.tagName === 'INPUT' && node.type === 'file') {
              console.log('📕 New file input detected:', node.id || 'no-id');
            }
            // Check if added node contains file inputs
            const fileInputs = node.querySelectorAll ? node.querySelectorAll('input[type="file"]') : [];
            fileInputs.forEach(input => {
              console.log('📕 New file input detected in container:', input.id || 'no-id');
            });
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('✅ File upload system initialized');
    console.log('✅ Event listener attached');
    console.log('✅ Mutation observer watching for new inputs');
  }

  function handleFileChange(e) {
    if (e.target && e.target.type === 'file') {
      console.log('📷 FILE CHANGE EVENT DETECTED!');
      console.log('   Input ID:', e.target.id || 'NO ID');
      console.log('   Files count:', e.target.files.length);
      
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        console.log('   File name:', file.name);
        console.log('   File size:', file.size, 'bytes');
        console.log('   File type:', file.type);

        // Validate file size (max 500MB for video, 10MB for files)
        const isVideo = file.name.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/);
        const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
        const maxSizeLabel = isVideo ? '500MB' : '10MB';
        
        if (file.size > maxSize) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          console.error('❌ File too large:', sizeMB, 'MB (max', maxSizeLabel, ')');
          alert(`File too large: ${sizeMB}MB\n\nMaximum file size is ${maxSizeLabel}.\n\nPlease choose a smaller file.`);
          e.target.value = ''; // Clear the input
          return;
        }

        let inputId = e.target.id;
        if (!inputId) {
          inputId = 'file_' + Date.now();
          e.target.id = inputId;
          console.log('   ⚠️ Generated ID:', inputId);
        }
        
        // Show preview immediately
        showPreview(e.target, file);
        
        // Start direct upload
        uploadFileDirectly(inputId, file);
      }
    }
  }

  function showPreview(input, file) {
    console.log('🖼️ SHOWING PREVIEW');
    console.log('   File:', file.name);
    console.log('   Input:', input.id);

    try {
      // Find or create preview container
      let preview = input.nextElementSibling;
      if (!preview || !preview.classList.contains('file-preview')) {
        console.log('   Creating new preview container...');
        preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.style.cssText = 'margin-top: 10px;';
        
        // Insert after input
        if (input.nextSibling) {
          input.parentNode.insertBefore(preview, input.nextSibling);
        } else {
          input.parentNode.appendChild(preview);
        }
        console.log('   ✅ Preview container created');
      } else {
        console.log('   Using existing preview container');
      }

      // Show loading state
      preview.innerHTML = `
        <div style="padding: 15px; background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <div>
              <strong style="color: #1e40af;">🚀 Uploading directly to storage...</strong>
              <div style="font-size: 0.85em; color: #6b7280; margin-top: 3px;">${file.name} (${(file.size / 1024).toFixed(1)} KB)</div>
            </div>
          </div>
        </div>
      `;

      // Show thumbnail for images
      if (file.type.startsWith('image/')) {
        console.log('   Creating image thumbnail...');
        const reader = new FileReader();
        reader.onload = function(e) {
          const imgPreview = document.createElement('img');
          imgPreview.src = e.target.result;
          imgPreview.style.cssText = 'width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 10px; border: 2px solid #3b82f6;';
          preview.appendChild(imgPreview);
          console.log('   ✅ Thumbnail added');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('❌ Preview error:', err);
    }
  }

  async function uploadFileDirectly(inputId, file) {
    console.log('🚀 STARTING DIRECT UPLOAD (ZERO-CPU)');
    console.log('   Input ID:', inputId);
    console.log('   File:', file.name);

    try {
      // Generate unique sessionId for upload
      const sessionId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

      console.log('☁️ Using Direct R2 Upload Flow');
      console.log('   Session ID:', sessionId);
      console.log('   Filename:', filename);

      // STEP 1: Get presigned URL from Worker (NO binary data sent)
      console.log('🔑 Getting R2 presigned URL...');
      const presignUrl = `/api/upload/presign-r2?sessionId=${sessionId}&filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(file.type || 'application/octet-stream')}`;
      
      const presignResponse = await fetch(presignUrl);
      
      if (!presignResponse.ok) {
        const errorText = await presignResponse.text();
        console.error('❌ Presigned URL request failed:', errorText);
        throw new Error(`Failed to get upload URL: ${presignResponse.status} - ${errorText}`);
      }

      const presignData = await presignResponse.json();
      console.log('🔑 Presigned URL received:', presignData);

      if (!presignData.success || !presignData.presignedUrl) {
        throw new Error(presignData.error || 'Failed to get upload URL');
      }

      // STEP 2: Upload DIRECTLY to R2 (bypassing Worker completely)
      console.log('☁️ Uploading directly to R2...');
      const uploadResponse = await fetch(presignData.presignedUrl, {
        method: 'PUT',
        body: file, // Send file directly to R2
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      });

      console.log('☁️ R2 Upload status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ R2 Upload failed:', errorText);
        throw new Error(`R2 upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      console.log('✅ R2 Upload successful! ZERO CPU used!');

      // STEP 3: Store upload results
      uploadQueue.set(inputId, {
        sessionId: sessionId,
        fileName: file.name,
        status: 'uploaded',
        url: presignData.finalUrl, // Clean URL without query params
        r2Key: presignData.key,
        uploadMethod: 'direct-r2-zero-cpu'
      });

      updatePreviewSuccess(inputId, file);
      console.log('✅ DIRECT UPLOAD COMPLETE!');
      console.log('   Final URL:', presignData.finalUrl);
      console.log('   R2 Key:', presignData.key);
      console.log('   CPU Usage: 0% (ZERO-CPU Upload!)');
      
    } catch (err) {
      console.error('❌ DIRECT UPLOAD FAILED:', err);
      uploadQueue.set(inputId, { status: 'failed', error: err.message });
      updatePreviewError(inputId, file, err.message);
    }
  }

  function updatePreviewSuccess(inputId, file) {
    console.log('✅ Updating preview to SUCCESS');
    const input = document.getElementById(inputId);
    const preview = input?.nextElementSibling;
    
    if (preview && preview.classList.contains('file-preview')) {
      preview.innerHTML = `
        <div style="padding: 15px; background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="color: #10b981; font-size: 24px;">✅</div>
            <div>
              <strong style="color: #065f46;">☁️ Uploaded Successfully! (Zero-CPU)</strong>
              <div style="font-size: 0.85em; color: #6b7280; margin-top: 3px;">${file.name}</div>
            </div>
          </div>
        </div>
      `;
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const imgPreview = document.createElement('img');
          imgPreview.src = e.target.result;
          imgPreview.style.cssText = 'width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 10px; border: 2px solid #10b981;';
          preview.appendChild(imgPreview);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  function updatePreviewError(inputId, file, errorMsg) {
    console.log('❌ Updating preview to ERROR');
    const input = document.getElementById(inputId);
    const preview = input?.nextElementSibling;
    
    if (preview && preview.classList.contains('file-preview')) {
      preview.innerHTML = `
        <div style="padding: 15px; background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="color: #ef4444; font-size: 24px;">❌</div>
            <div>
              <strong style="color: #991b1b;">Upload Failed</strong>
              <div style="font-size: 0.85em; color: #6b7280; margin-top: 3px;">${errorMsg || 'Please try again'}</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Public API
  window.getUploadedFiles = function() {
    console.log('📁 Getting uploaded files:', uploadQueue.size);
    const files = {};
    uploadQueue.forEach((data, inputId) => {
      if (data.status === 'uploaded' && data.url) {
        // Return final URL instead of tempId for proper display
        files[inputId] = data.url;
        console.log(`   ${inputId}: ${data.url}`);
      }
    });
    console.log('   Total uploaded files:', Object.keys(files).length);
    return files;
  };

  window.areAllFilesUploaded = function() {
    let allUploaded = true;
    uploadQueue.forEach((data) => {
      if (data.status !== 'uploaded') {
        allUploaded = false;
      }
    });
    console.log('   All files uploaded?', allUploaded);
    return allUploaded;
  };

  // CSS for spinner
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .file-preview {
      animation: fadeIn 0.3s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  console.log('✅ INSTANT UPLOAD READY (ZERO-CPU MODE)');
  window.uploadQueue = uploadQueue; // For debugging
})();
