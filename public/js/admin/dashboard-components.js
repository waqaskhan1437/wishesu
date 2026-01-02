/**
 * Advanced Dashboard Components - Multiple Headers, Footers, Product/Review lists
 * With code editor, templates, live preview, and server-side storage
 */

(function(AD) {
  // Utility: generate embed code for a product list
  function buildProductEmbed(id, options) {
    const END_SCRIPT = '</' + 'script>';
    return `<div id="${id}"></div>\n` +
      '<script src="/js/product-cards.js">' + END_SCRIPT + '\n' +
      '<script>\n  ProductCards.render(\'' + id + '\', ' + JSON.stringify(options, null, 2) + ');\n' + END_SCRIPT;
  }

  // Utility: generate embed code for a review list
  function buildReviewEmbed(id, options) {
    const END_SCRIPT = '</' + 'script>';
    return `<div id="${id}"></div>\n` +
      '<script src="/js/reviews-widget.js">' + END_SCRIPT + '\n' +
      '<script>\n  ReviewsWidget.render(\'' + id + '\', ' + JSON.stringify(options, null, 2) + ');\n' + END_SCRIPT;
  }

  // Header Templates
  const headerTemplates = [
    {
      name: 'Simple Centered',
      code: `<header style="background: #fff; padding: 20px 0; border-bottom: 1px solid #e5e7eb;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; text-align: center;">
    <a href="/" style="font-size: 1.8rem; font-weight: 800; color: #1f2937; text-decoration: none;">WISHVIDEO</a>
  </div>
</header>`
    },
    {
      name: 'With Navigation',
      code: `<header style="background: #fff; padding: 15px 0; border-bottom: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center;">
    <a href="/" style="font-size: 1.5rem; font-weight: 800; color: #4f46e5; text-decoration: none;">WISHVIDEO</a>
    <nav style="display: flex; gap: 25px;">
      <a href="/" style="color: #374151; text-decoration: none; font-weight: 500;">Home</a>
      <a href="/products-grid" style="color: #374151; text-decoration: none; font-weight: 500;">Products</a>
      <a href="/blog" style="color: #374151; text-decoration: none; font-weight: 500;">Blog</a>
      <a href="/forum" style="color: #374151; text-decoration: none; font-weight: 500;">Forum</a>
    </nav>
  </div>
</header>`
    },
    {
      name: 'Gradient Hero',
      code: `<header style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 60px 20px; text-align: center; color: white;">
  <div style="max-width: 800px; margin: 0 auto;">
    <h1 style="font-size: 2.5rem; margin: 0 0 10px; font-weight: 800;">Personalized Video Greetings</h1>
    <p style="font-size: 1.2rem; opacity: 0.9; margin: 0;">Make every occasion special with custom video messages</p>
  </div>
</header>`
    },
    {
      name: 'Dark Professional',
      code: `<header style="background: #1f2937; padding: 20px 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center;">
    <a href="/" style="font-size: 1.5rem; font-weight: 800; color: #fff; text-decoration: none;">WISHVIDEO</a>
    <nav style="display: flex; gap: 20px; align-items: center;">
      <a href="/" style="color: #d1d5db; text-decoration: none;">Home</a>
      <a href="/products-grid" style="color: #d1d5db; text-decoration: none;">Products</a>
      <a href="/products-grid" style="background: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Book Now</a>
    </nav>
  </div>
</header>`
    },
    {
      name: 'Sticky Transparent',
      code: `<header style="position: sticky; top: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 15px 0; border-bottom: 1px solid rgba(0,0,0,0.1); z-index: 100;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center;">
    <a href="/" style="font-size: 1.5rem; font-weight: 800; color: #1f2937; text-decoration: none;">WISHVIDEO</a>
    <nav style="display: flex; gap: 20px; align-items: center;">
      <a href="/" style="color: #374151; text-decoration: none; font-weight: 500;">Home</a>
      <a href="/products-grid" style="color: #374151; text-decoration: none; font-weight: 500;">Products</a>
      <a href="/blog" style="color: #374151; text-decoration: none; font-weight: 500;">Blog</a>
    </nav>
  </div>
</header>`
    }
  ];

  // Footer Templates
  const footerTemplates = [
    {
      name: 'Simple Copyright',
      code: `<footer style="background: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; margin: 0;">&copy; 2025 WishVideo. All rights reserved.</p>
</footer>`
    },
    {
      name: 'With Links',
      code: `<footer style="background: #1f2937; color: #d1d5db; padding: 50px 20px;">
  <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px;">
    <div>
      <h4 style="color: #fff; margin: 0 0 15px; font-size: 1.1rem;">WishVideo</h4>
      <p style="margin: 0; font-size: 0.9rem; line-height: 1.6;">Creating memorable video greetings for your special moments.</p>
    </div>
    <div>
      <h4 style="color: #fff; margin: 0 0 15px; font-size: 1.1rem;">Quick Links</h4>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <a href="/" style="color: #d1d5db; text-decoration: none; font-size: 0.9rem;">Home</a>
        <a href="/products-grid" style="color: #d1d5db; text-decoration: none; font-size: 0.9rem;">Products</a>
        <a href="/blog" style="color: #d1d5db; text-decoration: none; font-size: 0.9rem;">Blog</a>
      </div>
    </div>
    <div>
      <h4 style="color: #fff; margin: 0 0 15px; font-size: 1.1rem;">Contact</h4>
      <p style="margin: 0; font-size: 0.9rem;">support@wishvideo.com</p>
    </div>
  </div>
  <div style="max-width: 1200px; margin: 40px auto 0; padding-top: 20px; border-top: 1px solid #374151; text-align: center;">
    <p style="margin: 0; font-size: 0.85rem;">&copy; 2025 WishVideo. All rights reserved.</p>
  </div>
</footer>`
    },
    {
      name: 'Gradient CTA',
      code: `<footer style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center;">
  <div style="max-width: 800px; margin: 0 auto;">
    <h3 style="margin: 0 0 10px; font-size: 1.5rem;">Ready to create something special?</h3>
    <p style="margin: 0 0 20px; opacity: 0.9;">Order your personalized video greeting today!</p>
    <a href="/products-grid" style="display: inline-block; background: white; color: #667eea; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 700;">Browse Products</a>
  </div>
  <p style="margin: 30px 0 0; font-size: 0.85rem; opacity: 0.8;">&copy; 2025 WishVideo</p>
</footer>`
    },
    {
      name: 'Modern Minimal',
      code: `<footer style="background: #fff; padding: 40px 20px; border-top: 1px solid #e5e7eb;">
  <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
    <div>
      <a href="/" style="font-size: 1.3rem; font-weight: 800; color: #1f2937; text-decoration: none;">WISHVIDEO</a>
    </div>
    <nav style="display: flex; gap: 25px;">
      <a href="/" style="color: #6b7280; text-decoration: none; font-size: 0.9rem;">Home</a>
      <a href="/products-grid" style="color: #6b7280; text-decoration: none; font-size: 0.9rem;">Products</a>
      <a href="/blog" style="color: #6b7280; text-decoration: none; font-size: 0.9rem;">Blog</a>
      <a href="/forum" style="color: #6b7280; text-decoration: none; font-size: 0.9rem;">Forum</a>
    </nav>
    <p style="margin: 0; color: #9ca3af; font-size: 0.85rem;">&copy; 2025 WishVideo</p>
  </div>
</footer>`
    }
  ];

  // Load components from localStorage (server storage coming soon)
  function loadComponentsData() {
    return {
      headers: JSON.parse(localStorage.getItem('savedHeaders') || '[]'),
      footers: JSON.parse(localStorage.getItem('savedFooters') || '[]'),
      productLists: JSON.parse(localStorage.getItem('savedProductLists') || '[]'),
      reviewLists: JSON.parse(localStorage.getItem('savedReviewLists') || '[]'),
      defaultHeaderId: localStorage.getItem('defaultHeaderId') || null,
      defaultFooterId: localStorage.getItem('defaultFooterId') || null
    };
  }

  // Save components to localStorage
  function saveComponentsData(data) {
    localStorage.setItem('savedHeaders', JSON.stringify(data.headers || []));
    localStorage.setItem('savedFooters', JSON.stringify(data.footers || []));
    localStorage.setItem('savedProductLists', JSON.stringify(data.productLists || []));
    localStorage.setItem('savedReviewLists', JSON.stringify(data.reviewLists || []));
    if (data.defaultHeaderId) localStorage.setItem('defaultHeaderId', data.defaultHeaderId);
    else localStorage.removeItem('defaultHeaderId');
    if (data.defaultFooterId) localStorage.setItem('defaultFooterId', data.defaultFooterId);
    else localStorage.removeItem('defaultFooterId');
  }

  AD.loadComponents = async function(panel) {
    let componentsData = loadComponentsData();
    
    panel.innerHTML = `
      <style>
        .comp-container { background: white; border-radius: 12px; overflow: hidden; }
        .comp-header { padding: 25px 30px; border-bottom: 1px solid #e5e7eb; }
        .comp-header h2 { margin: 0 0 5px; font-size: 1.5rem; display: flex; align-items: center; gap: 10px; }
        .comp-header p { margin: 0; color: #6b7280; }
        
        .comp-tabs { display: flex; background: #f9fafb; border-bottom: 1px solid #e5e7eb; overflow-x: auto; }
        .comp-tab { padding: 15px 25px; cursor: pointer; border: none; background: none; font-weight: 600; color: #6b7280; transition: all 0.2s; position: relative; white-space: nowrap; }
        .comp-tab:hover { color: #374151; background: #f3f4f6; }
        .comp-tab.active { color: #4f46e5; background: white; }
        .comp-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #4f46e5; }
        .comp-tab .badge { background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; margin-left: 8px; }
        .comp-tab.active .badge { background: #4f46e5; color: white; }
        
        .comp-content { padding: 25px 30px; display: none; }
        .comp-content.active { display: block; }
        
        .comp-list { display: grid; gap: 15px; }
        .comp-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; transition: all 0.2s; }
        .comp-card:hover { border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .comp-card.is-default { border-color: #4f46e5; background: #f5f3ff; }
        .comp-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; }
        .comp-card-title { font-weight: 600; font-size: 1.05rem; color: #1f2937; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .comp-card-title .default-badge { background: #4f46e5; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; }
        .comp-card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .comp-card-actions button { padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor: pointer; border: 1px solid #d1d5db; background: white; color: #374151; transition: all 0.15s; }
        .comp-card-actions button:hover { background: #f3f4f6; border-color: #9ca3af; }
        .comp-card-actions button.primary { background: #4f46e5; color: white; border-color: #4f46e5; }
        .comp-card-actions button.primary:hover { background: #4338ca; }
        .comp-card-actions button.danger { color: #dc2626; border-color: #fca5a5; }
        .comp-card-actions button.danger:hover { background: #fef2f2; }
        .comp-card-preview { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-top: 10px; max-height: 120px; overflow: hidden; position: relative; font-size: 0.85rem; }
        .comp-card-preview::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(transparent, white); }
        .comp-card-meta { display: flex; gap: 15px; margin-top: 10px; font-size: 0.8rem; color: #6b7280; flex-wrap: wrap; }
        
        .editor-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .editor-modal-content { background: white; width: 95%; max-width: 1100px; height: 90vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
        .editor-modal-header { padding: 15px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .editor-modal-header h3 { margin: 0; font-size: 1.2rem; }
        .editor-modal-header .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; padding: 5px 10px; }
        .editor-modal-body { flex: 1; display: flex; overflow: hidden; }
        .editor-sidebar { width: 260px; background: #f9fafb; border-right: 1px solid #e5e7eb; padding: 15px; overflow-y: auto; flex-shrink: 0; }
        .editor-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .editor-toolbar { padding: 10px 15px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .editor-toolbar input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; }
        .editor-toolbar input[type="text"] { flex: 1; min-width: 150px; }
        .code-area { flex: 1; display: flex; flex-direction: column; min-height: 0; }
        .code-editor { flex: 1; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace; font-size: 13px; line-height: 1.6; padding: 15px; border: none; resize: none; background: #1e1e1e; color: #d4d4d4; }
        .code-editor:focus { outline: none; }
        .preview-toggle { padding: 10px 15px; background: #f3f4f6; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .preview-container { height: 200px; overflow: auto; border-top: 1px solid #e5e7eb; background: white; }
        .preview-frame { width: 100%; height: 100%; border: none; }
        .editor-modal-footer { padding: 15px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
        .editor-modal-footer .btn-group { display: flex; gap: 10px; }
        
        .template-section { margin-bottom: 20px; }
        .template-section h4 { font-size: 0.8rem; color: #6b7280; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .template-card { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s; }
        .template-card:hover { border-color: #4f46e5; background: #f5f3ff; }
        .template-card .name { font-weight: 500; font-size: 0.85rem; color: #374151; }
        
        .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; }
        .empty-state svg { width: 60px; height: 60px; margin-bottom: 15px; opacity: 0.5; }
        .empty-state h3 { margin: 0 0 8px; color: #374151; }
        .empty-state p { margin: 0 0 20px; }
        
        .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none; }
        .btn-primary { background: #4f46e5; color: white; }
        .btn-primary:hover { background: #4338ca; }
        .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
        .btn-secondary:hover { background: #e5e7eb; }
        .btn-success { background: #059669; color: white; }
        .btn-success:hover { background: #047857; }
        .btn-danger { background: #dc2626; color: white; }
        .btn-danger:hover { background: #b91c1c; }
        .btn-sm { padding: 6px 14px; font-size: 0.85rem; }
        
        .action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .action-bar-left { display: flex; gap: 10px; align-items: center; }
        .action-bar-right { display: flex; gap: 10px; }
        
        @media (max-width: 900px) {
          .editor-modal-body { flex-direction: column; }
          .editor-sidebar { width: 100%; max-height: 180px; border-right: none; border-bottom: 1px solid #e5e7eb; }
        }
      </style>

      <div class="comp-container">
        <div class="comp-header">
          <h2>🧩 Component Library</h2>
          <p>Create and manage reusable headers, footers, and embeddable components</p>
        </div>

        <div class="comp-tabs">
          <button class="comp-tab active" data-target="headers-tab">📄 Headers <span class="badge" id="headers-count">0</span></button>
          <button class="comp-tab" data-target="footers-tab">📄 Footers <span class="badge" id="footers-count">0</span></button>
          <button class="comp-tab" data-target="products-tab">🛍️ Product Lists <span class="badge" id="products-count">0</span></button>
          <button class="comp-tab" data-target="reviews-tab">⭐ Review Lists <span class="badge" id="reviews-count">0</span></button>
        </div>

        <div id="headers-tab" class="comp-content active">
          <div class="action-bar">
            <div class="action-bar-left">
              <button class="btn btn-primary" id="create-header">+ Create Header</button>
            </div>
            <div class="action-bar-right">
              <button class="btn btn-secondary btn-sm" id="export-headers">Export</button>
              <button class="btn btn-secondary btn-sm" id="import-headers">Import</button>
            </div>
          </div>
          <div id="headers-list" class="comp-list"></div>
        </div>

        <div id="footers-tab" class="comp-content">
          <div class="action-bar">
            <div class="action-bar-left">
              <button class="btn btn-primary" id="create-footer">+ Create Footer</button>
            </div>
            <div class="action-bar-right">
              <button class="btn btn-secondary btn-sm" id="export-footers">Export</button>
              <button class="btn btn-secondary btn-sm" id="import-footers">Import</button>
            </div>
          </div>
          <div id="footers-list" class="comp-list"></div>
        </div>

        <div id="products-tab" class="comp-content">
          <div class="action-bar">
            <div class="action-bar-left">
              <button class="btn btn-primary" id="create-product-list">+ Create Product List</button>
            </div>
          </div>
          <div id="product-lists" class="comp-list"></div>
          <div id="product-preview-area" style="margin-top:20px;display:none;"></div>
        </div>

        <div id="reviews-tab" class="comp-content">
          <div class="action-bar">
            <div class="action-bar-left">
              <button class="btn btn-primary" id="create-review-list">+ Create Review List</button>
            </div>
          </div>
          <div id="review-lists" class="comp-list"></div>
          <div id="review-preview-area" style="margin-top:20px;display:none;"></div>
        </div>
      </div>
    `;

    // Load scripts
    const loadScript = (src) => new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = script.onerror = resolve;
      document.body.appendChild(script);
    });
    await loadScript('/js/product-cards.js');
    await loadScript('/js/reviews-widget.js');

    // Tab switching
    panel.querySelectorAll('.comp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.comp-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panel.querySelectorAll('.comp-content').forEach(c => c.classList.remove('active'));
        panel.querySelector('#' + tab.dataset.target).classList.add('active');
      });
    });

    function updateCounts() {
      panel.querySelector('#headers-count').textContent = componentsData.headers?.length || 0;
      panel.querySelector('#footers-count').textContent = componentsData.footers?.length || 0;
      panel.querySelector('#products-count').textContent = componentsData.productLists?.length || 0;
      panel.querySelector('#reviews-count').textContent = componentsData.reviewLists?.length || 0;
    }

    // Render Headers
    function renderHeaders() {
      const container = panel.querySelector('#headers-list');
      const headers = componentsData.headers || [];
      if (!headers.length) {
        container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg><h3>No Headers Yet</h3><p>Create your first header to use across landing pages</p></div>`;
        return;
      }
      container.innerHTML = headers.map((h, i) => `
        <div class="comp-card ${h.id === componentsData.defaultHeaderId ? 'is-default' : ''}">
          <div class="comp-card-header">
            <div class="comp-card-title">${h.name || 'Untitled Header'} ${h.id === componentsData.defaultHeaderId ? '<span class="default-badge">DEFAULT</span>' : ''}</div>
            <div class="comp-card-actions">
              <button onclick="AD.editHeader(${i})">Edit</button>
              <button onclick="AD.previewComp('header',${i})">Preview</button>
              <button onclick="AD.copyCode('header',${i})">Copy</button>
              ${h.id !== componentsData.defaultHeaderId ? `<button class="primary" onclick="AD.setDefault('header',${i})">Set Default</button>` : ''}
              <button class="danger" onclick="AD.deleteComp('header',${i})">Delete</button>
            </div>
          </div>
          <div class="comp-card-preview">${h.code || ''}</div>
          <div class="comp-card-meta"><span>ID: ${h.id}</span></div>
        </div>
      `).join('');
    }

    // Render Footers
    function renderFooters() {
      const container = panel.querySelector('#footers-list');
      const footers = componentsData.footers || [];
      if (!footers.length) {
        container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg><h3>No Footers Yet</h3><p>Create your first footer to use across landing pages</p></div>`;
        return;
      }
      container.innerHTML = footers.map((f, i) => `
        <div class="comp-card ${f.id === componentsData.defaultFooterId ? 'is-default' : ''}">
          <div class="comp-card-header">
            <div class="comp-card-title">${f.name || 'Untitled Footer'} ${f.id === componentsData.defaultFooterId ? '<span class="default-badge">DEFAULT</span>' : ''}</div>
            <div class="comp-card-actions">
              <button onclick="AD.editFooter(${i})">Edit</button>
              <button onclick="AD.previewComp('footer',${i})">Preview</button>
              <button onclick="AD.copyCode('footer',${i})">Copy</button>
              ${f.id !== componentsData.defaultFooterId ? `<button class="primary" onclick="AD.setDefault('footer',${i})">Set Default</button>` : ''}
              <button class="danger" onclick="AD.deleteComp('footer',${i})">Delete</button>
            </div>
          </div>
          <div class="comp-card-preview">${f.code || ''}</div>
          <div class="comp-card-meta"><span>ID: ${f.id}</span></div>
        </div>
      `).join('');
    }

    // Editor Modal
    function openEditorModal(type, item = null, index = null) {
      const isEdit = item !== null;
      const templates = type === 'header' ? headerTemplates : footerTemplates;
      const modal = document.createElement('div');
      modal.className = 'editor-modal';
      modal.innerHTML = `
        <div class="editor-modal-content">
          <div class="editor-modal-header">
            <h3>${isEdit ? 'Edit' : 'Create'} ${type === 'header' ? 'Header' : 'Footer'}</h3>
            <button class="close-btn" onclick="this.closest('.editor-modal').remove()">&times;</button>
          </div>
          <div class="editor-modal-body">
            <div class="editor-sidebar">
              <div class="template-section">
                <h4>📋 Templates</h4>
                ${templates.map((t, i) => `<div class="template-card" data-tpl="${i}"><div class="name">${t.name}</div></div>`).join('')}
              </div>
              <div class="template-section">
                <h4>💡 Tips</h4>
                <p style="font-size:0.8rem;color:#6b7280;line-height:1.5;">• Use inline styles<br>• Test on mobile<br>• Keep it lightweight</p>
              </div>
            </div>
            <div class="editor-main">
              <div class="editor-toolbar">
                <input type="text" id="comp-name" placeholder="${type === 'header' ? 'Header' : 'Footer'} Name" value="${item?.name || ''}">
                <input type="text" id="comp-id" placeholder="ID" value="${item?.id || ''}" style="width:120px;" ${isEdit ? 'readonly' : ''}>
              </div>
              <div class="code-area">
                <textarea class="code-editor" id="comp-code" placeholder="Enter HTML code...">${item?.code || ''}</textarea>
              </div>
              <div class="preview-toggle">
                <span style="font-size:0.85rem;color:#6b7280;">Live Preview</span>
                <button class="btn btn-secondary btn-sm" id="toggle-preview">Show Preview</button>
              </div>
              <div class="preview-container" id="preview-box" style="display:none;">
                <iframe class="preview-frame" id="preview-frame"></iframe>
              </div>
            </div>
          </div>
          <div class="editor-modal-footer">
            <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;cursor:pointer;">
              <input type="checkbox" id="set-default"> Set as default
            </label>
            <div class="btn-group">
              <button class="btn btn-secondary" onclick="this.closest('.editor-modal').remove()">Cancel</button>
              <button class="btn btn-success" id="save-comp">Save</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Templates
      modal.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
          const tpl = templates[parseInt(card.dataset.tpl)];
          modal.querySelector('#comp-code').value = tpl.code;
          if (!modal.querySelector('#comp-name').value) modal.querySelector('#comp-name').value = tpl.name;
          updatePreview();
        });
      });

      // Preview
      const previewBox = modal.querySelector('#preview-box');
      const toggleBtn = modal.querySelector('#toggle-preview');
      let showPreview = false;
      const updatePreview = () => {
        const frame = modal.querySelector('#preview-frame');
        const doc = frame.contentDocument || frame.contentWindow.document;
        doc.open();
        doc.write(`<!DOCTYPE html><html><head><style>body{margin:0;font-family:system-ui,sans-serif;}</style></head><body>${modal.querySelector('#comp-code').value}</body></html>`);
        doc.close();
      };
      toggleBtn.addEventListener('click', () => {
        showPreview = !showPreview;
        previewBox.style.display = showPreview ? 'block' : 'none';
        toggleBtn.textContent = showPreview ? 'Hide Preview' : 'Show Preview';
        if (showPreview) updatePreview();
      });
      modal.querySelector('#comp-code').addEventListener('input', () => { if (showPreview) updatePreview(); });

      // Save
      modal.querySelector('#save-comp').addEventListener('click', () => {
        const name = modal.querySelector('#comp-name').value.trim() || `${type} ${Date.now()}`;
        const id = modal.querySelector('#comp-id').value.trim() || `${type}-${Date.now()}`;
        const code = modal.querySelector('#comp-code').value;
        const setDef = modal.querySelector('#set-default').checked;
        if (!code.trim()) { alert('Enter HTML code'); return; }

        const newItem = { id, name, code, updatedAt: new Date().toISOString() };
        if (type === 'header') {
          if (!componentsData.headers) componentsData.headers = [];
          if (isEdit && index !== null) componentsData.headers[index] = newItem;
          else componentsData.headers.push(newItem);
          if (setDef) componentsData.defaultHeaderId = id;
        } else {
          if (!componentsData.footers) componentsData.footers = [];
          if (isEdit && index !== null) componentsData.footers[index] = newItem;
          else componentsData.footers.push(newItem);
          if (setDef) componentsData.defaultFooterId = id;
        }
        saveComponentsData(componentsData);
        modal.remove();
        type === 'header' ? renderHeaders() : renderFooters();
        updateCounts();
        alert('✅ Saved!');
      });
    }

    // Expose functions
    AD.editHeader = (i) => openEditorModal('header', componentsData.headers[i], i);
    AD.editFooter = (i) => openEditorModal('footer', componentsData.footers[i], i);
    AD.deleteComp = (type, i) => {
      if (!confirm('Delete?')) return;
      if (type === 'header') {
        const del = componentsData.headers.splice(i, 1)[0];
        if (del.id === componentsData.defaultHeaderId) componentsData.defaultHeaderId = null;
        renderHeaders();
      } else {
        const del = componentsData.footers.splice(i, 1)[0];
        if (del.id === componentsData.defaultFooterId) componentsData.defaultFooterId = null;
        renderFooters();
      }
      saveComponentsData(componentsData);
      updateCounts();
    };
    AD.setDefault = (type, i) => {
      if (type === 'header') componentsData.defaultHeaderId = componentsData.headers[i].id;
      else componentsData.defaultFooterId = componentsData.footers[i].id;
      saveComponentsData(componentsData);
      type === 'header' ? renderHeaders() : renderFooters();
      alert('✅ Default updated!');
    };
    AD.copyCode = (type, i) => {
      const code = type === 'header' ? componentsData.headers[i].code : componentsData.footers[i].code;
      navigator.clipboard.writeText(code);
      alert('Code copied!');
    };
    AD.previewComp = (type, i) => {
      const item = type === 'header' ? componentsData.headers[i] : componentsData.footers[i];
      const win = window.open('', '_blank', 'width=1200,height=600');
      win.document.write(`<!DOCTYPE html><html><head><title>${item.name}</title><style>body{margin:0;font-family:system-ui,sans-serif;}</style></head><body>${item.code}</body></html>`);
    };

    // Product Lists
    async function renderProductLists() {
      const container = panel.querySelector('#product-lists');
      const lists = componentsData.productLists || [];
      if (!lists.length) {
        container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg><h3>No Product Lists</h3><p>Create embeddable product grids</p></div>`;
        return;
      }
      let products = [];
      try { const r = await fetch('/api/products'); const d = await r.json(); products = d.products || []; } catch(e) {}
      container.innerHTML = lists.map((item, i) => {
        let names = [];
        if (item.options?.ids?.length && products.length) {
          const set = new Set(item.options.ids.map(x => String(x)));
          names = products.filter(p => set.has(String(p.id))).map(p => p.title);
        }
        return `
          <div class="comp-card">
            <div class="comp-card-header">
              <div class="comp-card-title">${item.name || `Product List #${i+1}`}</div>
              <div class="comp-card-actions">
                <button onclick="AD.editPL(${i})">Edit</button>
                <button onclick="AD.previewPL(${i})">Preview</button>
                <button onclick="AD.copyPL(${i})">Copy Embed</button>
                <button class="danger" onclick="AD.deletePL(${i})">Delete</button>
              </div>
            </div>
            <div class="comp-card-meta">
              <span>${names.length ? names.slice(0,3).join(', ') + (names.length > 3 ? '...' : '') : 'All Products'}</span>
              <span>Limit: ${item.options?.limit || 9}</span>
              <span>Cols: ${item.options?.columns || 3}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Review Lists
    function renderReviewLists() {
      const container = panel.querySelector('#review-lists');
      const lists = componentsData.reviewLists || [];
      if (!lists.length) {
        container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><h3>No Review Lists</h3><p>Create embeddable review widgets</p></div>`;
        return;
      }
      container.innerHTML = lists.map((item, i) => `
        <div class="comp-card">
          <div class="comp-card-header">
            <div class="comp-card-title">${item.name || `Review List #${i+1}`}</div>
            <div class="comp-card-actions">
              <button onclick="AD.editRL(${i})">Edit</button>
              <button onclick="AD.previewRL(${i})">Preview</button>
              <button onclick="AD.copyRL(${i})">Copy Embed</button>
              <button class="danger" onclick="AD.deleteRL(${i})">Delete</button>
            </div>
          </div>
          <div class="comp-card-meta">
            <span>Product: ${item.options?.productId || 'All'}</span>
            <span>Limit: ${item.options?.limit || 6}</span>
            <span>Cols: ${item.options?.columns || 2}</span>
          </div>
        </div>
      `).join('');
    }

    // Product List Modal
    async function openPLModal(item = null, index = null) {
      const isEdit = item !== null;
      let products = [];
      try { const r = await fetch('/api/products'); const d = await r.json(); products = d.products || []; } catch(e) {}
      const modal = document.createElement('div');
      modal.className = 'editor-modal';
      modal.innerHTML = `
        <div class="editor-modal-content" style="max-width:700px;height:auto;max-height:90vh;">
          <div class="editor-modal-header">
            <h3>${isEdit ? 'Edit' : 'Create'} Product List</h3>
            <button class="close-btn" onclick="this.closest('.editor-modal').remove()">&times;</button>
          </div>
          <div style="padding:20px;overflow-y:auto;">
            <div style="margin-bottom:15px;">
              <label style="display:block;margin-bottom:5px;font-weight:500;">List Name</label>
              <input type="text" id="pl-name" value="${item?.name || ''}" placeholder="My Product List" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:15px;">
              <div>
                <label style="display:block;margin-bottom:5px;font-weight:500;">Filter</label>
                <select id="pl-filter" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;">
                  <option value="all" ${item?.options?.filter === 'all' ? 'selected' : ''}>All</option>
                  <option value="featured" ${item?.options?.filter === 'featured' ? 'selected' : ''}>Featured</option>
                  <option value="top-sales" ${item?.options?.filter === 'top-sales' ? 'selected' : ''}>Top Sales</option>
                </select>
              </div>
              <div>
                <label style="display:block;margin-bottom:5px;font-weight:500;">Limit</label>
                <input type="number" id="pl-limit" value="${item?.options?.limit || 9}" min="1" max="50" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;">
              </div>
              <div>
                <label style="display:block;margin-bottom:5px;font-weight:500;">Columns</label>
                <select id="pl-cols" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;">
                  <option value="2" ${item?.options?.columns == 2 ? 'selected' : ''}>2</option>
                  <option value="3" ${item?.options?.columns == 3 ? 'selected' : ''}>3</option>
                  <option value="4" ${item?.options?.columns == 4 ? 'selected' : ''}>4</option>
                </select>
              </div>
            </div>
            <div style="display:flex;gap:20px;margin-bottom:15px;">
              <label style="cursor:pointer;"><input type="checkbox" id="pl-reviews" ${item?.options?.showReviews !== false ? 'checked' : ''}> Show Reviews</label>
              <label style="cursor:pointer;"><input type="checkbox" id="pl-delivery" ${item?.options?.showDelivery !== false ? 'checked' : ''}> Show Delivery</label>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block;margin-bottom:5px;font-weight:500;">Select Products (optional)</label>
              <div style="max-height:180px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:6px;padding:10px;">
                ${products.map(p => `
                  <label style="display:flex;align-items:center;gap:8px;padding:6px;cursor:pointer;">
                    <input type="checkbox" name="pl-prods" value="${p.id}" ${item?.options?.ids?.map(String).includes(String(p.id)) ? 'checked' : ''}>
                    <span style="font-size:0.9rem;">${p.title}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="editor-modal-footer">
            <div></div>
            <div class="btn-group">
              <button class="btn btn-secondary" onclick="this.closest('.editor-modal').remove()">Cancel</button>
              <button class="btn btn-success" id="save-pl">Save</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('#save-pl').addEventListener('click', () => {
        const ids = [...modal.querySelectorAll('input[name="pl-prods"]:checked')].map(c => c.value);
        const newItem = {
          id: item?.id || `pl-${Date.now()}`,
          name: modal.querySelector('#pl-name').value.trim() || `Product List ${Date.now()}`,
          options: {
            filter: modal.querySelector('#pl-filter').value,
            limit: parseInt(modal.querySelector('#pl-limit').value) || 9,
            columns: parseInt(modal.querySelector('#pl-cols').value) || 3,
            showReviews: modal.querySelector('#pl-reviews').checked,
            showDelivery: modal.querySelector('#pl-delivery').checked,
            ids: ids.length ? ids : undefined
          }
        };
        if (!componentsData.productLists) componentsData.productLists = [];
        if (isEdit && index !== null) componentsData.productLists[index] = newItem;
        else componentsData.productLists.push(newItem);
        saveComponentsData(componentsData);
        modal.remove();
        renderProductLists();
        updateCounts();
        alert('✅ Product list saved!');
      });
    }

    // Review List Modal
    async function openRLModal(item = null, index = null) {
      const isEdit = item !== null;
      let products = [];
      try { const r = await fetch('/api/products'); const d = await r.json(); products = d.products || []; } catch(e) {}
      const modal = document.createElement('div');
      modal.className = 'editor-modal';
      modal.innerHTML = `
        <div class="editor-modal-content" style="max-width:550px;height:auto;max-height:90vh;">
          <div class="editor-modal-header">
            <h3>${isEdit ? 'Edit' : 'Create'} Review List</h3>
            <button class="close-btn" onclick="this.closest('.editor-modal').remove()">&times;</button>
          </div>
          <div style="padding:20px;">
            <div style="margin-bottom:15px;">
              <label style="display:block;margin-bottom:5px;font-weight:500;">List Name</label>
              <input type="text" id="rl-name" value="${item?.name || ''}" placeholder="My Review List" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
              <div>
                <label style="display:block;margin-bottom:5px;font-weight:500;">Product</label>
                <select id="rl-prod" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;">
                  <option value="">All Products</option>
                  ${products.map(p => `<option value="${p.id}" ${item?.options?.productId == p.id ? 'selected' : ''}>${p.title}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="display:block;margin-bottom:5px;font-weight:500;">Limit</label>
                <input type="number" id="rl-limit" value="${item?.options?.limit || 6}" min="1" max="20" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
              <div>
                <label style="display:block;margin-bottom:5px;font-weight:500;">Columns</label>
                <select id="rl-cols" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;">
                  <option value="1" ${item?.options?.columns == 1 ? 'selected' : ''}>1</option>
                  <option value="2" ${item?.options?.columns == 2 ? 'selected' : ''}>2</option>
                  <option value="3" ${item?.options?.columns == 3 ? 'selected' : ''}>3</option>
                </select>
              </div>
              <div>
                <label style="display:block;margin-bottom:5px;font-weight:500;">Min Rating</label>
                <select id="rl-rating" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;">
                  <option value="1" ${item?.options?.minRating == 1 ? 'selected' : ''}>1+</option>
                  <option value="3" ${item?.options?.minRating == 3 ? 'selected' : ''}>3+</option>
                  <option value="4" ${item?.options?.minRating == 4 ? 'selected' : ''}>4+</option>
                  <option value="5" ${item?.options?.minRating == 5 ? 'selected' : ''}>5 only</option>
                </select>
              </div>
            </div>
            <div style="display:flex;gap:20px;margin-bottom:15px;">
              <label style="cursor:pointer;"><input type="checkbox" id="rl-avatar" ${item?.options?.showAvatar !== false ? 'checked' : ''}> Show Avatar</label>
              <label style="cursor:pointer;"><input type="checkbox" id="rl-video" ${item?.options?.showVideo ? 'checked' : ''}> Show Video</label>
            </div>
          </div>
          <div class="editor-modal-footer">
            <div></div>
            <div class="btn-group">
              <button class="btn btn-secondary" onclick="this.closest('.editor-modal').remove()">Cancel</button>
              <button class="btn btn-success" id="save-rl">Save</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('#save-rl').addEventListener('click', () => {
        const pid = modal.querySelector('#rl-prod').value;
        const newItem = {
          id: item?.id || `rl-${Date.now()}`,
          name: modal.querySelector('#rl-name').value.trim() || `Review List ${Date.now()}`,
          options: {
            productId: pid || undefined,
            limit: parseInt(modal.querySelector('#rl-limit').value) || 6,
            columns: parseInt(modal.querySelector('#rl-cols').value) || 2,
            minRating: parseInt(modal.querySelector('#rl-rating').value) || 1,
            showAvatar: modal.querySelector('#rl-avatar').checked,
            showVideo: modal.querySelector('#rl-video').checked
          }
        };
        if (!componentsData.reviewLists) componentsData.reviewLists = [];
        if (isEdit && index !== null) componentsData.reviewLists[index] = newItem;
        else componentsData.reviewLists.push(newItem);
        saveComponentsData(componentsData);
        modal.remove();
        renderReviewLists();
        updateCounts();
        alert('✅ Review list saved!');
      });
    }

    AD.editPL = (i) => openPLModal(componentsData.productLists[i], i);
    AD.editRL = (i) => openRLModal(componentsData.reviewLists[i], i);
    AD.deletePL = (i) => { if (!confirm('Delete?')) return; componentsData.productLists.splice(i, 1); saveComponentsData(componentsData); renderProductLists(); updateCounts(); };
    AD.deleteRL = (i) => { if (!confirm('Delete?')) return; componentsData.reviewLists.splice(i, 1); saveComponentsData(componentsData); renderReviewLists(); updateCounts(); };
    AD.copyPL = (i) => { navigator.clipboard.writeText(buildProductEmbed(componentsData.productLists[i].id, componentsData.productLists[i].options)); alert('Embed copied!'); };
    AD.copyRL = (i) => { navigator.clipboard.writeText(buildReviewEmbed(componentsData.reviewLists[i].id, componentsData.reviewLists[i].options)); alert('Embed copied!'); };
    AD.previewPL = (i) => {
      const item = componentsData.productLists[i];
      const area = panel.querySelector('#product-preview-area');
      area.style.display = 'block';
      area.innerHTML = `<div style="background:#f9fafb;padding:20px;border-radius:8px;border:1px solid #e5e7eb;"><h4 style="margin:0 0 15px;">Preview: ${item.name}</h4><div id="${item.id}"></div></div>`;
      if (window.ProductCards) window.ProductCards.render(item.id, item.options);
    };
    AD.previewRL = (i) => {
      const item = componentsData.reviewLists[i];
      const area = panel.querySelector('#review-preview-area');
      area.style.display = 'block';
      area.innerHTML = `<div style="background:#f9fafb;padding:20px;border-radius:8px;border:1px solid #e5e7eb;"><h4 style="margin:0 0 15px;">Preview: ${item.name}</h4><div id="${item.id}"></div></div>`;
      if (window.ReviewsWidget) window.ReviewsWidget.render(item.id, item.options);
    };

    // Button handlers
    panel.querySelector('#create-header').addEventListener('click', () => openEditorModal('header'));
    panel.querySelector('#create-footer').addEventListener('click', () => openEditorModal('footer'));
    panel.querySelector('#create-product-list').addEventListener('click', () => openPLModal());
    panel.querySelector('#create-review-list').addEventListener('click', () => openRLModal());

    // Export/Import
    panel.querySelector('#export-headers').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(componentsData.headers || [], null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'headers.json'; a.click();
    });
    panel.querySelector('#export-footers').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(componentsData.footers || [], null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'footers.json'; a.click();
    });
    panel.querySelector('#import-headers').addEventListener('click', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
      inp.onchange = async (e) => {
        try {
          const imported = JSON.parse(await e.target.files[0].text());
          if (!Array.isArray(imported)) throw new Error('Invalid');
          componentsData.headers = [...(componentsData.headers || []), ...imported];
          saveComponentsData(componentsData); renderHeaders(); updateCounts();
          alert(`✅ Imported ${imported.length} headers!`);
        } catch(err) { alert('Import failed: ' + err.message); }
      };
      inp.click();
    });
    panel.querySelector('#import-footers').addEventListener('click', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
      inp.onchange = async (e) => {
        try {
          const imported = JSON.parse(await e.target.files[0].text());
          if (!Array.isArray(imported)) throw new Error('Invalid');
          componentsData.footers = [...(componentsData.footers || []), ...imported];
          saveComponentsData(componentsData); renderFooters(); updateCounts();
          alert(`✅ Imported ${imported.length} footers!`);
        } catch(err) { alert('Import failed: ' + err.message); }
      };
      inp.click();
    });

    // Initial render
    renderHeaders();
    renderFooters();
    renderProductLists();
    renderReviewLists();
    updateCounts();
  };

  console.log('✅ Advanced Dashboard Components loaded');
})(window.AdminDashboard);
