/**
 * Dashboard System Pages - Built-in pages (Blog, Forum) SEO management
 * These pages cannot be edited in Page Builder - only SEO/settings here
 */

(function(AD) {
  const SYSTEM_PAGE_INFO = {
    blog_archive: {
      icon: '📝',
      label: 'Blog Archive',
      description: 'Main blog listing page showing all posts',
      url: '/blog/'
    },
    blog_post: {
      icon: '📄',
      label: 'Blog Post Template',
      description: 'Individual blog post pages (SEO template for all posts)',
      url: '/blog/{slug}'
    },
    forum: {
      icon: '💬',
      label: 'Forum',
      description: 'Community forum page with questions',
      url: '/forum/'
    },
    forum_question: {
      icon: '❓',
      label: 'Forum Question Template',
      description: 'Individual question pages (SEO template for all questions)',
      url: '/forum/{slug}'
    }
  };

  function renderSystemPageCard(page) {
    const info = SYSTEM_PAGE_INFO[page.page_type] || { icon: '📄', label: page.page_type, description: '', url: '' };
    const statusBadge = page.enabled
      ? '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:0.75em;font-weight:600;">Active</span>'
      : '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:12px;font-size:0.75em;font-weight:600;">Disabled</span>';
    
    const hasSEO = page.seo_title || page.seo_description || page.seo_keywords;
    const seoStatus = hasSEO
      ? '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:12px;font-size:0.75em;font-weight:600;">✓ SEO Set</span>'
      : '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:0.75em;font-weight:600;">⚠ SEO Missing</span>';

    return `<div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px;">
        <div style="display:flex;gap:12px;align-items:center;">
          <span style="font-size:2rem;">${info.icon}</span>
          <div>
            <div style="font-size:1.2em;font-weight:700;color:#1f2937;">${info.label}</div>
            <div style="font-size:0.85em;color:#6b7280;">${info.description}</div>
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          ${statusBadge}
          ${seoStatus}
        </div>
      </div>
      
      <div style="background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="font-size:0.8em;color:#6b7280;margin-bottom:4px;">URL Pattern:</div>
        <div style="font-family:monospace;font-size:0.85em;color:#1f2937;">${info.url}</div>
      </div>
      
      ${page.seo_title ? `<div style="font-size:0.85em;margin-bottom:6px;"><strong>SEO Title:</strong> ${escapeHtml(page.seo_title)}</div>` : ''}
      ${page.seo_description ? `<div style="font-size:0.85em;margin-bottom:6px;color:#6b7280;"><strong>Meta Description:</strong> ${escapeHtml(page.seo_description).substring(0, 100)}${page.seo_description.length > 100 ? '...' : ''}</div>` : ''}
      ${page.seo_keywords ? `<div style="font-size:0.85em;margin-bottom:6px;color:#6b7280;"><strong>Keywords:</strong> ${escapeHtml(page.seo_keywords).substring(0, 80)}${page.seo_keywords.length > 80 ? '...' : ''}</div>` : ''}
      
      <div style="display:flex;gap:8px;margin-top:15px;">
        <button class="btn btn-primary" onclick="editSystemPage('${page.page_type}')" style="flex:1;">✏️ Edit SEO Settings</button>
        <a href="${info.url.replace('{slug}', '')}" target="_blank" class="btn btn-secondary">👁️ View</a>
        <button class="btn ${page.enabled ? 'btn-warning' : 'btn-success'}" onclick="toggleSystemPageStatus('${page.page_type}', ${page.enabled ? 0 : 1})">
          ${page.enabled ? '🚫 Disable' : '✓ Enable'}
        </button>
      </div>
    </div>`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  AD.loadSystemPages = async function(panel) {
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <h2 style="margin:0;font-size:1.5em;color:#1f2937;">🔧 Built-in Pages</h2>
      </div>
      
      <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:12px;padding:20px;margin-bottom:25px;">
        <h3 style="margin:0 0 10px;font-size:1rem;color:#92400e;">ℹ️ About Built-in Pages</h3>
        <p style="margin:0;font-size:0.9rem;color:#78350f;">
          These are core system pages that cannot be edited in the Page Builder. You can configure their SEO settings 
          (title, meta description, keywords) here. The actual content is dynamically generated from your blog posts and forum questions.
        </p>
      </div>
      
      <div id="system-pages-container">Loading...</div>`;

    const container = panel.querySelector('#system-pages-container');
    
    try {
      const res = await fetch('/api/admin/system-pages');
      const data = await res.json();
      
      if (!data.success || !data.pages || data.pages.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#6b7280;">No system pages found.</div>`;
        return;
      }
      
      const cards = data.pages.map(p => renderSystemPageCard(p)).join('');
      container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:20px;">${cards}</div>`;
    } catch (err) {
      console.error('Failed to load system pages:', err);
      container.innerHTML = `<div style="text-align:center;padding:40px;color:red;">Error: ${err.message}</div>`;
    }
  };

  // Edit system page modal
  window.editSystemPage = async function(pageType) {
    const info = SYSTEM_PAGE_INFO[pageType] || { icon: '📄', label: pageType };
    
    // Fetch current data
    let page = {};
    try {
      const res = await fetch(`/api/system-page?type=${pageType}`);
      const data = await res.json();
      if (data.page) page = data.page;
    } catch (e) {}
    
    const modal = document.createElement('div');
    modal.id = 'system-page-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    
    modal.innerHTML = `
      <div style="background:white;border-radius:16px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;padding:30px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="margin:0;font-size:1.3em;color:#1f2937;">${info.icon} ${info.label} - SEO Settings</h2>
          <button onclick="closeSystemPageModal()" style="background:none;border:none;font-size:1.5em;cursor:pointer;color:#9ca3af;">×</button>
        </div>
        
        <form id="system-page-form">
          <input type="hidden" name="page_type" value="${pageType}">
          
          <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;">SEO Title</label>
            <input type="text" name="seo_title" value="${escapeHtml(page.seo_title || '')}" 
              placeholder="Page title for search engines"
              style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.95rem;">
            <div style="font-size:0.8em;color:#9ca3af;margin-top:4px;">Recommended: 50-60 characters</div>
          </div>
          
          <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;">Meta Description</label>
            <textarea name="seo_description" rows="3"
              placeholder="Description for search engines"
              style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.95rem;resize:vertical;">${escapeHtml(page.seo_description || '')}</textarea>
            <div style="font-size:0.8em;color:#9ca3af;margin-top:4px;">Recommended: 150-160 characters</div>
          </div>
          
          <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;">Keywords</label>
            <input type="text" name="seo_keywords" value="${escapeHtml(page.seo_keywords || '')}" 
              placeholder="keyword1, keyword2, keyword3"
              style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.95rem;">
            <div style="font-size:0.8em;color:#9ca3af;margin-top:4px;">Comma separated keywords</div>
          </div>
          
          <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;">Custom CSS (Optional)</label>
            <textarea name="custom_css" rows="3"
              placeholder="/* Custom CSS styles */"
              style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.85rem;font-family:monospace;resize:vertical;">${escapeHtml(page.custom_css || '')}</textarea>
          </div>
          
          <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;">Custom JavaScript (Optional)</label>
            <textarea name="custom_js" rows="3"
              placeholder="// Custom JavaScript"
              style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.85rem;font-family:monospace;resize:vertical;">${escapeHtml(page.custom_js || '')}</textarea>
          </div>
          
          <div style="display:flex;gap:10px;">
            <button type="submit" class="btn btn-primary" style="flex:1;padding:12px;">💾 Save Settings</button>
            <button type="button" onclick="closeSystemPageModal()" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Form submit handler
    modal.querySelector('#system-page-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const data = Object.fromEntries(formData.entries());
      
      try {
        const res = await fetch('/api/admin/system-pages/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success) {
          alert('✅ Settings saved!');
          closeSystemPageModal();
          const panel = document.getElementById('main-panel');
          if (panel) AD.loadSystemPages(panel);
        } else {
          alert('❌ Error: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    });
  };

  window.closeSystemPageModal = function() {
    const modal = document.getElementById('system-page-modal');
    if (modal) modal.remove();
  };

  window.toggleSystemPageStatus = async function(pageType, enabled) {
    const action = enabled ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} this page?`)) return;
    
    try {
      const res = await fetch('/api/admin/system-pages/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_type: pageType, enabled: enabled })
      });
      const result = await res.json();
      
      if (result.success) {
        alert(`✅ Page ${action}d!`);
        const panel = document.getElementById('main-panel');
        if (panel) AD.loadSystemPages(panel);
      } else {
        alert('❌ Error: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  console.log('✅ Dashboard System Pages loaded');
})(window.AdminDashboard);
