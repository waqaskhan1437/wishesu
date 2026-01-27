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
    } catch (e) {
      toast('❌ Failed to load settings', false);
    }
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
