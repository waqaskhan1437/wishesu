/**
 * Dashboard Pages - Landing pages management with page types and defaults
 */

(function(AD) {
  const PAGE_TYPE_LABELS = {
    custom: { icon: '📄', label: 'Custom' },
    home: { icon: '🏠', label: 'Home' },
    product_grid: { icon: '🛒', label: 'Products' }
  };

  function renderAdminPageCard(page) {
    const uploadDate = new Date(page.uploaded).toLocaleDateString();
    const sizeKB = ((page.size || 0) / 1024).toFixed(1);
    const fullURL = window.location.origin + page.url;
    
    // Status badge
    const statusBadge = page.status === 'draft'
      ? '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:12px;font-size:0.75em;font-weight:600;">Draft</span>'
      : '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:0.75em;font-weight:600;">Published</span>';
    
    // Page type badge
    const typeInfo = PAGE_TYPE_LABELS[page.page_type] || PAGE_TYPE_LABELS.custom;
    const typeBadge = page.page_type && page.page_type !== 'custom'
      ? `<span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:12px;font-size:0.75em;font-weight:600;">${typeInfo.icon} ${typeInfo.label}</span>`
      : '';
    
    // Default badge
    const defaultBadge = page.is_default
      ? '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:0.75em;font-weight:600;">⭐ Default</span>'
      : '';
    
    const toggleLabel = page.status === 'draft' ? 'Publish' : 'Unpublish';
    const nextStatus = page.status === 'draft' ? 'published' : 'draft';
    
    return `<div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 6px rgba(0,0,0,0.1);display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div style="font-size:1.2em;font-weight:700;color:#1f2937;flex:1;">${page.name}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          ${statusBadge}
        </div>
      </div>
      ${(typeBadge || defaultBadge) ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">${typeBadge}${defaultBadge}</div>` : ''}
      <div style="font-family:monospace;font-size:0.8em;color:#6b7280;background:#f3f4f6;padding:6px 10px;border-radius:6px;word-break:break-all;">${fullURL}</div>
      <div style="display:flex;justify-content:space-between;font-size:0.8em;color:#9ca3af;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
        <span>📅 ${uploadDate}</span>
        <span>📦 ${sizeKB} KB</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        <a href="${page.url}" target="_blank" class="btn btn-primary" style="flex:1;text-align:center;">👁️ View</a>
        <button class="btn btn-secondary" onclick="editAdminPage('${page.name}')">✏️ Edit</button>
        <button class="btn btn-info" onclick="duplicateAdminPage(${page.id})">📋</button>
        <button class="btn btn-warning" onclick="changeAdminPageStatus(${page.id},'${nextStatus}')">${toggleLabel}</button>
        <button class="btn btn-danger" onclick="deleteAdminPage(${page.id},'${page.name}')">🗑️</button>
      </div>
      ${page.page_type && page.page_type !== 'custom' && !page.is_default ? `
        <button class="btn btn-success" style="width:100%;margin-top:5px;" onclick="setPageAsDefault(${page.id},'${page.page_type}')">
          ⭐ Set as Default ${typeInfo.label}
        </button>
      ` : ''}
    </div>`;
  }

  AD.loadPages = async function(panel) {
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <h2 style="margin:0;font-size:1.5em;color:#1f2937;">📄 Landing Pages</h2>
        <button id="create-page-btn" class="btn btn-primary">+ Create New Page</button>
      </div>
      
      <!-- Current Defaults -->
      <div id="defaults-summary" style="background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);border-radius:12px;padding:20px;margin-bottom:25px;">
        <h3 style="margin:0 0 15px;font-size:1rem;color:#0369a1;">📌 Current Default Pages</h3>
        <div id="defaults-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;">
          Loading...
        </div>
      </div>
      
      <div id="admin-pages-container">Loading pages...</div>`;

    const createBtn = panel.querySelector('#create-page-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        window.location.href = '/page-builder.html';
      });
    }

    // Load defaults summary
    loadDefaultsSummary();

    const container = panel.querySelector('#admin-pages-container');
    try {
      const res = await fetch('/api/pages/list');
      const data = await res.json();
      if (!data.success || !data.pages || data.pages.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#6b7280;">
          <div style="font-size:3rem;margin-bottom:10px;">📄</div>
          <h3 style="margin-bottom:10px;">No pages yet</h3>
          <p style="margin-bottom:20px;">Create your first landing page using the page builder</p>
          <button class="btn btn-primary" onclick="window.location.href='/page-builder.html'">Create Page</button>
        </div>`;
        return;
      }
      const cards = data.pages.map(p => renderAdminPageCard(p)).join('');
      container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;">${cards}</div>`;
    } catch (err) {
      console.error('Failed to load pages:', err);
      container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:red;">Error loading pages: ${err.message}</div>`;
    }
  };

  async function loadDefaultsSummary() {
    const container = document.getElementById('defaults-grid');
    if (!container) return;
    
    const types = ['home', 'product_grid'];
    let html = '';
    
    for (const type of types) {
      try {
        const res = await fetch(`/api/pages/default?type=${type}`);
        const data = await res.json();
        const info = PAGE_TYPE_LABELS[type];
        
        if (data.page) {
          html += `<div style="background:white;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:5px;">${info.icon}</div>
            <div style="font-weight:600;color:#1f2937;font-size:0.85rem;">${info.label}</div>
            <div style="color:#10b981;font-size:0.75rem;margin-top:3px;">✓ ${data.page.slug}</div>
          </div>`;
        } else {
          html += `<div style="background:white;border-radius:8px;padding:12px;text-align:center;opacity:0.6;">
            <div style="font-size:1.5rem;margin-bottom:5px;">${info.icon}</div>
            <div style="font-weight:600;color:#1f2937;font-size:0.85rem;">${info.label}</div>
            <div style="color:#9ca3af;font-size:0.75rem;margin-top:3px;">Not set</div>
          </div>`;
        }
      } catch (e) {
        console.error('Error loading default:', type, e);
      }
    }
    
    // Add links to built-in pages
    html += `<a href="/blog/" target="_blank" style="background:white;border-radius:8px;padding:12px;text-align:center;text-decoration:none;display:block;">
      <div style="font-size:1.5rem;margin-bottom:5px;">📝</div>
      <div style="font-weight:600;color:#1f2937;font-size:0.85rem;">Blog</div>
      <div style="color:#3b82f6;font-size:0.75rem;margin-top:3px;">Built-in →</div>
    </a>`;
    
    html += `<a href="/forum/" target="_blank" style="background:white;border-radius:8px;padding:12px;text-align:center;text-decoration:none;display:block;">
      <div style="font-size:1.5rem;margin-bottom:5px;">💬</div>
      <div style="font-weight:600;color:#1f2937;font-size:0.85rem;">Forum</div>
      <div style="color:#3b82f6;font-size:0.75rem;margin-top:3px;">Built-in →</div>
    </a>`;
    
    container.innerHTML = html;
  }

  // Global helper functions
  window.copyAdminPageURL = function(url) {
    const fullURL = window.location.origin + url;
    navigator.clipboard.writeText(fullURL);
    alert('✅ URL copied to clipboard!\n\n' + fullURL);
  };

  window.showAdminEmbedCode = function(name, url) {
    const fullURL = window.location.origin + url;
    const embedCode = `<iframe src="${fullURL}" width="100%" height="800" frameborder="0"></iframe>`;
    prompt('Copy this embed code:', embedCode);
  };

  window.deleteAdminPage = async function(id, name) {
    if (!confirm(`Delete page "${name}"?\n\nThis cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/page/delete?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('✅ Page deleted!');
        const panel = document.getElementById('main-panel');
        if (panel) AD.loadPages(panel);
      } else {
        alert('❌ Failed to delete: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  window.editAdminPage = function(slug) {
    if (!slug) return;
    window.location.href = '/page-builder.html?edit=' + encodeURIComponent(slug);
  };

  window.duplicateAdminPage = async function(id) {
    if (!id) return;
    if (!confirm('Duplicate this page?')) return;
    try {
      const res = await fetch('/api/pages/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Page duplicated!');
        const panel = document.getElementById('main-panel');
        if (panel) AD.loadPages(panel);
      } else {
        alert('❌ Failed to duplicate: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  window.changeAdminPageStatus = async function(id, status) {
    if (!id || !status) return;
    const confirmMsg = status === 'published'
      ? 'Publish this page? It will become publicly accessible.'
      : 'Unpublish this page? It will no longer be publicly accessible.';
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch('/api/pages/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, status: status })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Status updated!');
        const panel = document.getElementById('main-panel');
        if (panel) AD.loadPages(panel);
      } else {
        alert('❌ Failed to update status: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  window.setPageAsDefault = async function(id, pageType) {
    const typeLabel = PAGE_TYPE_LABELS[pageType]?.label || pageType;
    if (!confirm(`Set this page as the default ${typeLabel} page?`)) return;
    
    try {
      const res = await fetch('/api/pages/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, page_type: pageType })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Default page updated!');
        const panel = document.getElementById('main-panel');
        if (panel) AD.loadPages(panel);
      } else {
        alert('❌ Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  console.log('✅ Dashboard Pages loaded');
})(window.AdminDashboard);
