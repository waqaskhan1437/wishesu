/**
 * R2 Upload Dashboard - File upload to R2 storage with direct links
 */

(function (AD) {

  function toast(msg, ok = true) {
    const el = document.getElementById('r2-upload-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = ok ? '#10b981' : '#ef4444';
    setTimeout(() => el.style.display = 'none', 3000);
  }

  async function jfetch(url, opts = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts
    });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }

  async function uploadFile(file, callback) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Create a temporary session ID for this upload
      const sessionId = 'admin_' + Date.now();
      const filename = encodeURIComponent(file.name);
      
      const url = `/api/admin/r2-upload?sessionId=${sessionId}&filename=${filename}&adminToken=${btoa(Date.now() + '.' + generateAdminToken())}`;
      
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          // Remove Content-Type so browser sets it correctly for FormData
          ...((opts || {}).headers || {})
        }
      });
      
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data.url;
    } catch (err) {
      throw new Error('Upload failed: ' + err.message);
    }
  }

  function generateAdminToken() {
    if (!window.env || !window.env.ADMIN_SESSION_SECRET) {
      return 'dev-bypass';
    }
    
    const ts = Date.now();
    const enc = new TextEncoder();
    const key = crypto.subtle.importKey(
      'raw',
      enc.encode(window.env.ADMIN_SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    return key.then(k => crypto.subtle.sign('HMAC', k, enc.encode(String(ts)))).then(sig => {
      const sigBytes = new Uint8Array(sig);
      return btoa(String.fromCharCode(...sigBytes))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }).catch(() => 'fallback-token');
  }

  async function loadR2Upload(panel) {
    panel.innerHTML = `
      <div style="max-width:800px;margin:0 auto;padding:20px;">
        <div id="r2-upload-toast" style="display:none;position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:10px;color:white;font-weight:600;z-index:1000;"></div>
        
        <!-- Header -->
        <div style="margin-bottom:30px;">
          <h2 style="margin:0 0 8px;font-size:28px;color:#1f2937;">⬆️ R2 File Upload</h2>
          <p style="margin:0;color:#6b7280;font-size:15px;">Upload files to R2 storage and get direct download links</p>
        </div>

        <!-- Upload Area -->
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 20px;font-size:18px;color:#1f2937;">📁 Upload Files</h3>
          
          <div style="display:grid;gap:15px;">
            <div>
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">
                📄 Select File
              </label>
              <input type="file" id="r2-file-input" 
                style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;cursor:pointer;"
                accept="video/*,.pdf,.zip,.jpg,.jpeg,.png,.gif,.webp,.svg">
              <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">
                Supported: Videos (MP4, MOV, AVI, MKV), Images, Documents, Archives
              </p>
            </div>

            <div>
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">
                🔧 Upload Settings
              </label>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <div style="flex:1;min-width:150px;">
                  <label style="display:block;font-size:13px;color:#374151;margin-bottom:5px;">Max Size</label>
                  <select id="r2-max-size" style="width:100%;padding:8px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;">
                    <option value="10">10 MB (Images, Documents)</option>
                    <option value="100">100 MB (Larger Files)</option>
                    <option value="500" selected>500 MB (Videos)</option>
                    <option value="1000">1 GB (Very Large)</option>
                  </select>
                </div>
                <div style="flex:1;min-width:150px;">
                  <label style="display:block;font-size:13px;color:#374151;margin-bottom:5px;">File Type</label>
                  <select id="r2-file-type" style="width:100%;padding:8px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;">
                    <option value="any">Any Type</option>
                    <option value="video">Video Only</option>
                    <option value="image">Image Only</option>
                    <option value="document">Document Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <button id="r2-upload-btn" 
                style="padding:12px 24px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:10px;cursor:pointer;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(59,130,246,0.3);width:100%;"
                onclick="AD.startUpload()">
                ⬆️ Upload to R2
              </button>
            </div>
          </div>
        </div>

        <!-- Recent Uploads -->
        <div id="r2-recent-uploads" style="background:white;border-radius:16px;padding:25px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);"></div>
      </div>
    `;

    // Load recent uploads
    loadRecentUploads();
  }

  async function loadRecentUploads() {
    try {
      // For now, we'll just show the last 5 uploads
      // In a real implementation, you'd store upload history in database
      const recentUploads = JSON.parse(localStorage.getItem('r2_upload_history') || '[]').slice(-5);
      
      const container = document.getElementById('r2-recent-uploads');
      if (!container) return;
      
      if (recentUploads.length === 0) {
        container.innerHTML = `
          <h3 style="margin:0 0 20px;font-size:18px;color:#1f2937;">📊 Recent Uploads</h3>
          <p style="color:#6b7280;">No files uploaded yet</p>
        `;
        return;
      }

      container.innerHTML = `
        <h3 style="margin:0 0 20px;font-size:18px;color:#1f2937;">📊 Recent Uploads</h3>
        <div style="display:flex;gap:15px;flex-wrap:wrap;">
          ${recentUploads.map(upload => `
            <div style="background:#f9fafb;border-radius:12px;padding:15px;flex:1;min-width:200px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-weight:600;color:#374151;">${upload.filename}</span>
                <button onclick="AD.copyLink('${upload.url}')" 
                  style="padding:4px 8px;background:#3b82f6;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;">
                  📋 Copy
                </button>
              </div>
              <div style="font-size:13px;color:#6b7280;margin-bottom:10px;">
                ${formatFileSize(upload.size)}
              </div>
              <div style="display:flex;gap:10px;">
                <a href="${upload.url}" target="_blank" 
                  style="padding:6px 12px;background:#10b981;color:white;border:none;border-radius:6px;font-size:13px;text-decoration:none;flex:1;"
                  onclick="event.stopPropagation()">
                  🔗 Open
                </a>
                <button onclick="AD.deleteUpload('${upload.url}')" 
                  style="padding:6px 8px;background:#ef4444;color:white;border:none;border-radius:6px;font-size:13px;cursor:pointer;"
                  title="Delete upload">
                  🗑️
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top:20px;text-align:center;">
          <button onclick="AD.showAllUploads()" 
            style="padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">
            🔿️ Show All Uploads
          </button>
        </div>
      `;
    } catch (e) {
      console.log('Failed to load recent uploads:', e);
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function showAllUploads() {
    // In a real implementation, this would show all uploads from database
    toast('📋 Show All feature coming soon - uploads stored in localStorage for now');
  }

  function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
      toast('📋 Link copied to clipboard!', true);
    }).catch(() => {
      toast('❌ Failed to copy link', false);
    });
  }

  function deleteUpload(url) {
    // In a real implementation, this would delete from R2 and update storage
    toast('🗑️ Delete feature coming soon', false);
  }

  async function startUpload() {
    const fileInput = document.getElementById('r2-file-input');
    const maxSizeSelect = document.getElementById('r2-max-size');
    const fileTypeSelect = document.getElementById('r2-file-type');

    const file = fileInput.files[0];
    if (!file) {
      toast('❌ Please select a file to upload', false);
      return;
    }

    // Validate file type
    const fileType = fileTypeSelect.value;
    if (fileType !== 'any') {
      const videoTypes = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'flv', 'wmv'];
      const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (fileType === 'video' && !videoTypes.includes(ext)) {
        toast(`❌ Please select a video file (.${videoTypes.join(', .')})`, false);
        return;
      }
      if (fileType === 'image' && !imageTypes.includes(ext)) {
        toast(`❌ Please select an image file (.${imageTypes.join(', .')})`, false);
        return;
      }
      if (fileType === 'document' && !['pdf', 'zip', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext)) {
        toast(`❌ Please select a document file (.pdf, .zip, .doc, .xls, .txt)`, false);
        return;
      }
    }

    // Validate file size
    const maxSizeMB = parseInt(maxSizeSelect.value);
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast(`❌ File too large. Maximum size is ${maxSizeMB}MB`, false);
      return;
    }

    // Show uploading state
    const uploadBtn = document.getElementById('r2-upload-btn');
    uploadBtn.textContent = '⏳ Uploading...';
    uploadBtn.disabled = true;

    try {
      const url = await uploadFile(file);
      
      // Store in recent uploads
      const recentUploads = JSON.parse(localStorage.getItem('r2_upload_history') || '[]');
      recentUploads.push({
        filename: file.name,
        url: url,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
      localStorage.setItem('r2_upload_history', JSON.stringify(recentUploads));

      toast(`✅ Upload complete!`, true);
      
      // Copy link to clipboard
      navigator.clipboard.writeText(url).then(() => {
        toast(`✅ Upload complete! Link copied to clipboard.`, true);
      });

      // Reload recent uploads
      loadRecentUploads();

    } catch (err) {
      toast(err.message, false);
    } finally {
      uploadBtn.textContent = '⬆️ Upload to R2';
      uploadBtn.disabled = false;
    }
  }

  // Export
  AD.loadR2Upload = loadR2Upload;
  AD.startUpload = startUpload;
  AD.copyLink = copyLink;
  AD.deleteUpload = deleteUpload;
  AD.showAllUploads = showAllUploads;

})(window.AdminDashboard);
