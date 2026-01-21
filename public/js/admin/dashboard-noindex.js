/**
 * Noindex Pages Manager 2025 - Exclude pages from search results
 * Based on Google's official noindex guidelines
 * 
 * Features:
 * - Add URLs to exclude from search
 * - Auto-inject noindex meta tags
 * - Google-compliant implementation
 */

(function(AD) {
  
  function toast(msg, ok=true) {
    const el = document.getElementById('noindex-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = ok ? '#10b981' : '#ef4444';
    setTimeout(() => el.style.display = 'none', 3000);
  }

  async function jfetch(url, opts={}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) },
      ...opts
    });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }

  async function loadNoindex(panel) {
    panel.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:20px;">
        <div id="noindex-toast" style="display:none;position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:10px;color:white;font-weight:600;z-index:1000;"></div>
        
        <!-- Header -->
        <div style="margin-bottom:30px;">
          <h2 style="margin:0 0 8px;font-size:28px;color:#1f2937;">🚫 Hide Pages from Search</h2>
          <p style="margin:0;color:#6b7280;font-size:15px;">Add URLs to exclude from Google search results</p>
        </div>

        <!-- Info Card -->
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #f59e0b;">
          <h3 style="margin:0 0 15px;font-size:18px;color:#1f2937;">ℹ️ How It Works</h3>
          <ul style="margin:0;padding-left:20px;color:#4b5563;font-size:14px;line-height:1.8;">
            <li>Add URLs you want to hide from search engines</li>
            <li>System adds <code>&lt;meta name="robots" content="noindex"&gt;</code> to these pages</li>
            <li>Google will stop showing these pages in search results</li>
            <li>Changes take effect within days (depends on crawling)</li>
          </ul>
        </div>

        <!-- Add URL Form -->
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 20px;font-size:18px;color:#1f2937;">➕ Add Page to Hide</h3>
          
          <div style="display:flex;gap:12px;align-items:end;">
            <div style="flex:1;">
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">Page URL</label>
              <input id="noindex-url" type="url" placeholder="/hidden-page.html" 
                style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;">
              <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">Enter relative URL (starts with /) or full URL</p>
            </div>
            <button onclick="AD.addNoindexUrl()" 
              style="padding:12px 24px;background:#10b981;color:white;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:600;white-space:nowrap;">
              Add URL
            </button>
          </div>
        </div>

        <!-- Current Hidden Pages -->
        <div style="background:white;border-radius:16px;padding:25px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div style="display:flex;justify-content:space-between;align-items-center;margin-bottom:20px;">
            <h3 style="margin:0;font-size:18px;color:#1f2937;">📋 Hidden Pages</h3>
            <span id="count-display" style="background:#e5e7eb;padding:5px 12px;border-radius:20px;font-size:14px;color:#4b5563;">Loading...</span>
          </div>
          
          <div id="noindex-list" style="min-height:100px;">
            <div style="text-align:center;padding:40px 20px;color:#9ca3af;">
              <div style="font-size:48px;margin-bottom:12px;">🔍</div>
              <p style="margin:0;font-size:16px;">No pages hidden yet</p>
              <p style="margin-top:8px;font-size:14px;">Add URLs above to hide them from search engines</p>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div style="margin-top:30px;padding:20px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
          <h4 style="margin:0 0 12px;font-size:16px;color:#1f2937;">💡 Pro Tips</h4>
          <ul style="margin:0;padding-left:20px;color:#4b5563;font-size:14px;line-height:1.8;">
            <li>Use relative URLs like <code>/admin/</code>, <code>/private-page.html</code></li>
            <li>For products/pages you can use wildcards: <code>/product-*</code></li>
            <li>Changes take 1-7 days to reflect in search results</li>
            <li>Make sure pages are crawlable (not blocked by robots.txt)</li>
          </ul>
        </div>
      </div>
    `;

    // Load current list
    await loadNoindexList();
  }

  async function loadNoindexList() {
    const panel = document.getElementById('main-panel');
    try {
      const data = await jfetch('/api/admin/noindex/list');
      const urls = data.urls || [];
      
      const listDiv = panel.querySelector('#noindex-list');
      const countSpan = panel.querySelector('#count-display');
      
      if (urls.length === 0) {
        listDiv.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:#9ca3af;">
            <div style="font-size:48px;margin-bottom:12px;">🔍</div>
            <p style="margin:0;font-size:16px;">No pages hidden yet</p>
            <p style="margin-top:8px;font-size:14px;">Add URLs above to hide them from search engines</p>
          </div>
        `;
      } else {
        listDiv.innerHTML = `
          <div style="display:grid;gap:12px;">
            ${urls.map((url, index) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                <div style="font-family:monospace;font-size:14px;color:#1f2937;word-break:break-all;">${url}</div>
                <button onclick="AD.removeNoindexUrl(${index})" 
                  style="padding:6px 12px;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
                  Remove
                </button>
              </div>
            `).join('')}
          </div>
        `;
      }
      
      countSpan.textContent = `${urls.length} page${urls.length !== 1 ? 's' : ''}`;
      
    } catch (e) {
      toast('Failed to load hidden pages list', false);
    }
  }

  async function addNoindexUrl() {
    const panel = document.getElementById('main-panel');
    const urlInput = panel.querySelector('#noindex-url');
    const url = urlInput.value.trim();
    
    if (!url) {
      toast('Please enter a URL to hide', false);
      return;
    }

    // Validate URL format
    if (!url.startsWith('/') && !url.startsWith('http')) {
      toast('URL must start with / (relative) or http (absolute)', false);
      return;
    }

    try {
      await jfetch('/api/admin/noindex/add', {
        method: 'POST',
        body: JSON.stringify({ url })
      });
      
      urlInput.value = '';
      await loadNoindexList();
      toast('✅ Page added to hidden list', true);
    } catch (e) {
      toast('Failed to add page', false);
    }
  }

  async function removeNoindexUrl(index) {
    try {
      await jfetch('/api/admin/noindex/remove', {
        method: 'POST',
        body: JSON.stringify({ index })
      });
      
      await loadNoindexList();
      toast('✅ Page removed from hidden list', true);
    } catch (e) {
      toast('Failed to remove page', false);
    }
  }

  // Export
  AD.loadNoindex = loadNoindex;
  AD.addNoindexUrl = addNoindexUrl;
  AD.removeNoindexUrl = removeNoindexUrl;

})(window.AdminDashboard);
