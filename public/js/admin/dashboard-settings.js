/**
 * Clean Settings Panel 2025 - Essential Only
 * Based on research: minimal, focused, user-friendly
 */

(function (AD) {

  function toast(msg, ok = true) {
    const el = document.getElementById('settings-toast');
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

  async function loadSettings(panel) {
    panel.innerHTML = `
      <div style="max-width:800px;margin:0 auto;padding:20px;">
        <div id="settings-toast" style="display:none;position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:10px;color:white;font-weight:600;z-index:1000;"></div>
        
        <!-- Header -->
        <div style="margin-bottom:30px;">
          <h2 style="margin:0 0 8px;font-size:28px;color:#1f2937;">⚙️ Site Settings</h2>
          <p style="margin:0;color:#6b7280;font-size:15px;">Essential settings for your website</p>
        </div>

        <!-- Site Info Card -->
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 20px;font-size:18px;color:#1f2937;">🌐 Site Information</h3>
          
          <div style="display:grid;gap:20px;">
            <div>
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">Site Title *</label>
              <input id="site-title" type="text" placeholder="Your Store Name" required
                style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;">
            </div>

            <div>
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">Site Description *</label>
              <textarea id="site-description" placeholder="Brief description of your website..." rows="3" required
                style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;font-family:inherit;resize:vertical;"></textarea>
              <div style="display:flex;justify-content:space-between;margin-top:6px;">
                <span style="font-size:13px;color:#6b7280;">Used for search results and social sharing</span>
                <span id="desc-count" style="font-size:13px;color:#9ca3af;">0/160</span>
              </div>
            </div>

            <div>
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">Admin Email *</label>
              <input id="admin-email" type="email" placeholder="admin@yoursite.com" required
                style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;">
              <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">Where you receive order notifications</p>
            </div>
          </div>
        </div>

        <!-- Payment Settings Card -->
<!-- Payment Settings Removed - Managed in Payment Tab -->

        <!-- Security Card -->
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 20px;font-size:18px;color:#1f2937;">🔒 Security Settings</h3>
          
          <div style="display:grid;gap:15px;">
            <label style="display:flex;align-items:center;cursor:pointer;">
              <input id="enable-rate-limit" type="checkbox" style="width:20px;height:20px;margin-right:12px;cursor:pointer;">
              <span style="font-weight:600;color:#374151;">Enable Rate Limiting</span>
            </label>
            
            <div style="padding-left:32px;">
              <p style="margin:0 0 10px;font-size:14px;color:#4b5563;">Protect against spam and abuse</p>
              <div style="display:flex;gap:15px;align-items:center;">
                <div>
                  <label style="display:block;font-size:13px;color:#374151;margin-bottom:5px;">Requests per minute</label>
                  <input id="rate-limit" type="number" min="1" max="100" value="10"
                    style="padding:8px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;width:100px;">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Emergency Uploads Card -->
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 8px;font-size:18px;color:#1f2937;">⬆️ Emergency Upload (Public Link)</h3>
          <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Upload any file to R2 and get a public downloadable link.</p>

          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
            <input id="emg-file" type="file" style="flex:1;min-width:220px;">
            <button id="emg-upload-btn" 
              style="padding:10px 16px;background:#111827;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;">
              Upload
            </button>
            <span id="emg-upload-status" style="font-size:13px;color:#6b7280;"></span>
          </div>

          <div style="margin-top:14px;border-top:1px solid #f3f4f6;padding-top:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
              <div>
                <div style="font-weight:700;color:#374151;font-size:14px;">Last link</div>
                <div id="emg-last-link" style="margin-top:6px;font-size:13px;color:#6b7280;word-break:break-all;">No uploads yet</div>
              </div>
              <div style="display:flex;gap:10px;align-items:center;">
                <button id="emg-copy-last" style="padding:8px 12px;border:1px solid #e5e7eb;background:white;border-radius:10px;cursor:pointer;font-weight:600;">Copy</button>
                <button id="emg-show-all" style="padding:8px 12px;border:1px solid #e5e7eb;background:white;border-radius:10px;cursor:pointer;font-weight:600;">Show all</button>
              </div>
            </div>

            <div id="emg-all-wrap" style="display:none;margin-top:14px;">
              <div style="font-weight:700;color:#374151;font-size:14px;margin-bottom:8px;">All uploads</div>
              <div id="emg-all-list" style="display:grid;gap:8px;"></div>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div style="display:flex;justify-content:flex-end;">
          <button onclick="AD.saveCleanSettings()" 
            style="padding:14px 32px;background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;border-radius:12px;cursor:pointer;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(16,185,129,0.3);">
            💾 Save Settings
          </button>
        </div>
      </div>
    `;

    // Character counter
    const descField = panel.querySelector('#site-description');
    const countSpan = panel.querySelector('#desc-count');
    const updateCount = () => {
      const len = descField.value.length;
      countSpan.textContent = `${len}/160`;
      countSpan.style.color = len > 160 ? '#ef4444' : '#9ca3af';
    };
    descField.addEventListener('input', updateCount);
    updateCount();

    function setLastLink(url) {
      const el = panel.querySelector('#emg-last-link');
      const btn = panel.querySelector('#emg-copy-last');
      if (!el || !btn) return;
      if (!url) {
        el.textContent = 'No uploads yet';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        return;
      }
      el.innerHTML = `<a href="${url}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline;">${url}</a>`;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.dataset.url = url;
    }

    function renderAllUploads(uploads) {
      const list = panel.querySelector('#emg-all-list');
      if (!list) return;
      if (!uploads || !uploads.length) {
        list.innerHTML = '<div style="color:#6b7280;font-size:13px;">No uploads yet</div>';
        return;
      }
      list.innerHTML = uploads.map(u => {
        const url = u.downloadUrl;
        const meta = `${(u.filename || 'file')} • ${(u.size ? Math.round(u.size/1024) + ' KB' : '')}`;
        return `
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;">
            <div style="min-width:0;">
              <div style="font-weight:700;color:#111827;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${meta}</div>
              <div style="margin-top:4px;font-size:12px;color:#6b7280;word-break:break-all;">${url}</div>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
              <a class="btn" href="${url}" target="_blank" rel="noopener" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:10px;">Open</a>
              <button class="btn emg-copy" data-url="${url}" style="padding:6px 10px;border:1px solid #e5e7eb;background:white;border-radius:10px;cursor:pointer;font-weight:600;">Copy</button>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.emg-copy').forEach(btn => {
        btn.addEventListener('click', async () => {
          const url = btn.dataset.url;
          try {
            await navigator.clipboard.writeText(url);
            toast('✅ Link copied', true);
          } catch {
            toast('❌ Copy failed', false);
          }
        });
      });
    }

    async function refreshUploads() {
      try {
        const data = await jfetch('/api/admin/emergency-uploads?limit=50');
        const uploads = data.uploads || [];
        setLastLink(uploads[0]?.downloadUrl);
        renderAllUploads(uploads);
      } catch (e) {
        // Don't block settings load
      }
    }

    // Buttons wiring
    const copyLastBtn = panel.querySelector('#emg-copy-last');
    if (copyLastBtn) {
      copyLastBtn.addEventListener('click', async () => {
        const url = copyLastBtn.dataset.url;
        if (!url) return;
        try {
          await navigator.clipboard.writeText(url);
          toast('✅ Link copied', true);
        } catch {
          toast('❌ Copy failed', false);
        }
      });
    }

    const showAllBtn = panel.querySelector('#emg-show-all');
    const allWrap = panel.querySelector('#emg-all-wrap');
    if (showAllBtn && allWrap) {
      showAllBtn.addEventListener('click', async () => {
        const isOpen = allWrap.style.display !== 'none';
        allWrap.style.display = isOpen ? 'none' : 'block';
        showAllBtn.textContent = isOpen ? 'Show all' : 'Hide';
        if (!isOpen) {
          await refreshUploads();
        }
      });
    }

    const uploadBtn = panel.querySelector('#emg-upload-btn');
    const fileInput = panel.querySelector('#emg-file');
    const statusEl = panel.querySelector('#emg-upload-status');
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', async () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) {
          toast('❌ Please choose a file first', false);
          return;
        }
        uploadBtn.disabled = true;
        uploadBtn.style.opacity = '0.7';
        if (statusEl) statusEl.textContent = 'Uploading...';

        try {
          const fd = new FormData();
          fd.append('file', f);

          const res = await fetch('/api/admin/emergency-uploads', {
            method: 'POST',
            body: fd
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.downloadUrl) {
            throw new Error(data?.error || 'Upload failed');
          }

          setLastLink(data.downloadUrl);
          if (statusEl) statusEl.textContent = 'Done';
          toast('✅ Uploaded! Link ready.', true);

          // Refresh list quietly
          await refreshUploads();
        } catch (e) {
          if (statusEl) statusEl.textContent = '';
          toast('❌ ' + (e.message || 'Upload failed'), false);
        } finally {
          uploadBtn.disabled = false;
          uploadBtn.style.opacity = '1';
        }
      });
    }

    // Load current settings
    try {
      const data = await jfetch('/api/admin/settings/clean');
      const s = data.settings || {};

      panel.querySelector('#site-title').value = s.site_title || '';
      panel.querySelector('#site-description').value = s.site_description || '';
      panel.querySelector('#admin-email').value = s.admin_email || '';
      panel.querySelector('#enable-rate-limit').checked = s.enable_rate_limit !== false; // Default true
      panel.querySelector('#rate-limit').value = s.rate_limit || 10;

      updateCount();
      toast('✅ Settings loaded', true);
    } catch (e) {
      toast('❌ Failed to load settings', false);
    }

    // Load last upload link (non-blocking)
    refreshUploads();
  }

  async function saveCleanSettings() {
    const panel = document.getElementById('main-panel');

    const settings = {
      site_title: panel.querySelector('#site-title').value.trim(),
      site_description: panel.querySelector('#site-description').value.trim(),
      admin_email: panel.querySelector('#admin-email').value.trim(),
      // Payment settings removed - managed in Payment Tab
      enable_rate_limit: panel.querySelector('#enable-rate-limit').checked,
      rate_limit: parseInt(panel.querySelector('#rate-limit').value) || 10
    };

    // Validation
    if (!settings.site_title || !settings.site_description || !settings.admin_email) {
      toast('❌ Please fill all required fields (marked with *)', false);
      return;
    }

    if (settings.site_description.length > 160) {
      toast('❌ Description must be 160 characters or less', false);
      return;
    }

    try {
      await jfetch('/api/admin/settings/clean', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      toast('✅ Settings saved successfully!', true);
    } catch (e) {
      toast('❌ Failed to save settings', false);
    }
  }

  // Export
  AD.loadSettings = loadSettings;
  AD.saveCleanSettings = saveCleanSettings;

})(window.AdminDashboard);
