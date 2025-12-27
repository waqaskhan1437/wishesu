/**
 * Dashboard Pages - Landing pages management
 */

(function(AD) {
  function renderAdminPageCard(page) {
    const uploadDate = new Date(page.uploaded).toLocaleDateString();
    const sizeKB = ((page.size || 0) / 1024).toFixed(1);
    const fullURL = window.location.origin + page.url;
    const statusBadge = page.status === 'draft'
      ? '<span style="background:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:4px;font-size:0.75em;">Draft</span>'
      : '<span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-size:0.75em;">Published</span>';
    const toggleLabel = page.status === 'draft' ? 'Publish' : 'Unpublish';
    const nextStatus = page.status === 'draft' ? 'published' : 'draft';
    return `<div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 6px rgba(0,0,0,0.1);display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:1.2em;font-weight:700;color:#1f2937;">${page.name}</div>
        ${statusBadge}
      </div>
      <div style="font-family:monospace;font-size:0.8em;color:#6b7280;background:#f3f4f6;padding:6px 10px;border-radius:6px;word-break:break-all;">${fullURL}</div>
      <div style="display:flex;justify-content:space-between;font-size:0.8em;color:#9ca3af;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
        <span>📅 ${uploadDate}</span>
        <span>📦 ${sizeKB} KB</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        <a href="${page.url}" target="_blank" class="btn btn-primary" style="flex:1;text-align:center;">👁️ View</a>
        <button class="btn btn-secondary" onclick="editAdminPage('${page.slug}')">✏️ Edit</button>
        <button class="btn btn-info" onclick="duplicateAdminPage('${page.slug}')">📄 Duplicate</button>
        <button class="btn btn-warning" onclick="changeAdminPageStatus('${page.slug}','${nextStatus}')">${toggleLabel}</button>
        <button class="btn btn-secondary" onclick="copyAdminPageURL('${page.url}')">📋 Copy</button>
        <button class="btn btn-danger" onclick="deleteAdminPage('${page.name}')">🗑️ Delete</button>
      </div>
      <div style="margin-top:8px;background:#f0f9ff;padding:10px;border-radius:8px;">
        <div style="font-size:0.9em;font-weight:600;color:#1e40af;margin-bottom:6px;">📍 Embed Options</div>
        <button class="btn btn-info btn-sm" style="width:100%;" onclick="showAdminEmbedCode('${page.name}','${page.url}')">Get Embed Code</button>
      </div>
    </div>`;
  }

  AD.loadPages = async function(panel) {
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <h2 style="margin:0;font-size:1.5em;color:#1f2937;">Your Landing Pages</h2>
        <button id="create-page-btn" class="btn btn-primary">+ Create New Page</button>
      </div>
      <div id="admin-pages-container">Loading pages...</div>`;

    const createBtn = panel.querySelector('#create-page-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        window.location.href = '/page-builder.html';
      });
    }

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

  window.deleteAdminPage = async function(name) {
    if (!confirm(`Delete page "${name}"?\n\nThis cannot be undone.`)) return;
    try {
      const res = await fetch('/api/pages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
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
    window.location.href = '/page-builder.html?name=' + encodeURIComponent(slug);
  };

  window.duplicateAdminPage = async function(slug) {
    if (!slug) return;
    if (!confirm('Duplicate this page?')) return;
    try {
      const res = await fetch('/api/pages/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: slug })
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

  window.changeAdminPageStatus = async function(slug, status) {
    if (!slug || !status) return;
    const confirmMsg = status === 'published'
      ? 'Publish this page? It will become publicly accessible.'
      : 'Unpublish this page? It will no longer be publicly accessible.';
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch('/api/pages/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: slug, status })
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

  console.log('✅ Dashboard Pages loaded');
})(window.AdminDashboard);
