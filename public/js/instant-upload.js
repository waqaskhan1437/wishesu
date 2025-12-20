/*
 * FIXED: Instant File Upload with Debug Logging
 * Works with dynamically created file inputs
 */

(function() {
  console.log('🚀 INSTANT UPLOAD SCRIPT LOADED');
  
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
              console.log('🆕 New file input detected:', node.id || 'no-id');
            }
            // Check if added node contains file inputs
            const fileInputs = node.querySelectorAll ? node.querySelectorAll('input[type="file"]') : [];
            fileInputs.forEach(input => {
              console.log('🆕 New file input detected in container:', input.id || 'no-id');
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
      console.log('📸 FILE CHANGE EVENT DETECTED!');
      console.log('   Input ID:', e.target.id || 'NO ID');
      console.log('   Files count:', e.target.files.length);
      
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        console.log('   File name:', file.name);
        console.log('   File size:', file.size, 'bytes');
        console.log('   File type:', file.type);

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          console.error('❌ File too large:', sizeMB, 'MB (max 5MB)');
          alert(`File too large: ${sizeMB}MB\n\nMaximum file size is 5MB.\n\nPlease choose a smaller file.`);
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
        
        // Start upload
        uploadFileInBackground(inputId, file);
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
              <strong style="color: #1e40af;">⏳ Uploading...</strong>
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

  async function uploadFileInBackground(inputId, file) {
    console.log('🚀 STARTING UPLOAD');
    console.log('   Input ID:', inputId);
    console.log('   File:', file.name);

    try {
      // Generate unique itemId for Archive.org
      const itemId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

      console.log('📤 Uploading to Archive.org');
      console.log('   Item ID:', itemId);
      console.log('   Filename:', filename);

      const response = await fetch(`/api/upload/customer-file?itemId=${encodeURIComponent(itemId)}&filename=${encodeURIComponent(filename)}&originalFilename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response not OK:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.success && data.url) {
        uploadQueue.set(inputId, {
          tempId: itemId,
          fileName: file.name,
          status: 'uploaded',
          url: data.url
        });

        updatePreviewSuccess(inputId, file);
        console.log('✅ UPLOAD COMPLETE!');
        console.log('   Archive.org URL:', data.url);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('❌ UPLOAD FAILED:', err);
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
            <div style="color: #10b981; font-size: 24px;">✓</div>
            <div>
              <strong style="color: #065f46;">✅ Uploaded Successfully!</strong>
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
            <div style="color: #ef4444; font-size: 24px;">✗</div>
            <div>
              <strong style="color: #991b1b;">❌ Upload Failed</strong>
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
        // Return URL instead of just tempId for proper display
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

  console.log('✅ INSTANT UPLOAD READY');
  window.uploadQueue = uploadQueue; // For debugging
})();
