/**
 * Dashboard Components - Header, Footer, Product/Review lists management
 */

(function(AD) {
  // Utility: generate embed code for a product list
  function buildProductEmbed(id, options) {
    const END_SCRIPT = String.fromCharCode(60,47,115,99,114,105,112,116,62);
    return `<div id="${id}"></div>\n` +
      '<script src="../js/product-cards.js">' + END_SCRIPT + '\n' +
      '<script>\n  ProductCards.render(\'' + id + '\', ' + JSON.stringify(options) + ');\n' + END_SCRIPT;
  }

  // Utility: generate embed code for a review list
  function buildReviewEmbed(id, options) {
    const END_SCRIPT = String.fromCharCode(60,47,115,99,114,105,112,116,62);
    return `<div id="${id}"></div>\n` +
      '<script src="../js/reviews-widget.js">' + END_SCRIPT + '\n' +
      '<script>\n  ReviewsWidget.render(\'' + id + '\', ' + JSON.stringify(options) + ');\n' + END_SCRIPT;
  }

  AD.loadComponents = async function(panel) {
    panel.innerHTML = `
      <style>
        .component-tabs { display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 25px; }
        .component-tab { padding: 12px 20px; cursor: pointer; border: none; background: none; border-bottom: 3px solid transparent; font-weight: 600; color: #6b7280; transition: all 0.2s; }
        .component-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
        .component-tab-content { display: none; }
        .component-tab-content.active { display: block; }
        .component-textarea { width: 100%; min-height: 200px; font-family: 'Courier New', monospace; font-size: 0.9rem; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #1f2937; margin-bottom: 10px; }
        .component-list-container { margin-top: 20px; }
        .component-list-item { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .component-list-item h4 { margin: 0 0 8px; font-size: 1rem; color: #1f2937; }
        .component-list-item pre { background: #f3f4f6; padding: 10px; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; color: #374151; }
        .component-list-item .actions { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }
        .component-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .component-modal-content { background: #fff; padding: 20px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
        .component-modal-content h3 { margin-top: 0; margin-bottom: 15px; }
        .component-modal-content .item-list { max-height: 300px; overflow-y: auto; margin-bottom: 15px; }
        .component-modal-content .item { display: flex; align-items: center; margin-bottom: 8px; }
        .component-modal-content .item img { width: 40px; height: 40px; object-fit: cover; margin-right: 8px; border-radius: 4px; }
        .component-modal-content .item .title { flex: 1; }
        .component-modal-content .fields { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
        .component-modal-content .fields label { display: block; font-size: 0.85rem; margin-bottom: 2px; }
        .component-modal-content .fields input, .component-modal-content .fields select { padding: 5px; border: 1px solid #d1d5db; border-radius: 4px; width: 100%; min-width: 100px; }
        .component-modal-content .options { margin-bottom: 10px; }
        .component-modal-content .actions { text-align: right; margin-top: 10px; }
        .component-modal-content .actions button { margin-left: 8px; }
      </style>

      <div style="background: white; padding: 30px; border-radius: 12px;">
        <h2 style="margin-bottom: 10px;">🧩 Manage Components</h2>
        <p style="color: #6b7280; margin-bottom: 30px;">Create reusable headers, footers, and component lists for your landing pages</p>

        <div class="component-tabs">
          <button class="component-tab active" data-target="header-tab">Header</button>
          <button class="component-tab" data-target="footer-tab">Footer</button>
          <button class="component-tab" data-target="product-tab">Product Lists</button>
          <button class="component-tab" data-target="review-tab">Review Lists</button>
        </div>

        <div id="header-tab" class="component-tab-content active">
          <p>Edit the default header HTML/CSS. This header will be used whenever a page includes a header section and no custom header is provided.</p>
          <textarea id="header-editor" class="component-textarea" placeholder="Enter header HTML here..."></textarea>
          <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
            <button id="save-header" class="btn btn-primary">Save Header</button>
            <button id="clear-header" class="btn btn-danger">Clear Header</button>
            <button id="preview-header" class="btn btn-secondary">Preview Header</button>
          </div>
          <div id="header-preview" style="display:none;"></div>
        </div>

        <div id="footer-tab" class="component-tab-content">
          <p>Edit the default footer HTML/CSS. This footer will be used whenever a page includes a footer section and no custom footer is provided.</p>
          <textarea id="footer-editor" class="component-textarea" placeholder="Enter footer HTML here..."></textarea>
          <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
            <button id="save-footer" class="btn btn-primary">Save Footer</button>
            <button id="clear-footer" class="btn btn-danger">Clear Footer</button>
            <button id="preview-footer" class="btn btn-secondary">Preview Footer</button>
          </div>
          <div id="footer-preview" style="display:none;"></div>
        </div>

        <div id="product-tab" class="component-tab-content">
          <p>Create reusable product lists that you can embed into your landing pages.</p>
          <button id="create-product-list" class="btn btn-primary" style="margin-bottom:15px;">+ Create Product List</button>
          <div id="product-lists" class="component-list-container"></div>
          <div id="product-preview" style="display:none;"></div>
        </div>

        <div id="review-tab" class="component-tab-content">
          <p>Create reusable review lists that you can embed into your landing pages.</p>
          <button id="create-review-list" class="btn btn-primary" style="margin-bottom:15px;">+ Create Review List</button>
          <div id="review-lists" class="component-list-container"></div>
          <div id="review-preview" style="display:none;"></div>
        </div>
      </div>
    `;

    // Load widget scripts
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) { resolve(); return; }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    try {
      await loadScript('/js/product-cards.js');
      await loadScript('/js/reviews-widget.js');
    } catch (err) {
      console.error('Failed to load widget scripts:', err);
    }

    // Tab switching
    panel.querySelectorAll('.component-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.component-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-target');
        panel.querySelectorAll('.component-tab-content').forEach(c => c.classList.remove('active'));
        panel.querySelector('#' + target).classList.add('active');
      });
    });

    // Load header/footer
    const header = localStorage.getItem('defaultHeader') || '';
    panel.querySelector('#header-editor').value = header;
    const footer = localStorage.getItem('defaultFooter') || '';
    panel.querySelector('#footer-editor').value = footer;

    // Header handlers
    panel.querySelector('#save-header').addEventListener('click', () => {
      const code = panel.querySelector('#header-editor').value.trim();
      if (!code) { alert('Header HTML cannot be empty.'); return; }
      localStorage.setItem('defaultHeader', code);
      alert('✅ Default header saved!');
    });

    panel.querySelector('#clear-header').addEventListener('click', () => {
      if (confirm('Delete the saved default header?')) {
        localStorage.removeItem('defaultHeader');
        panel.querySelector('#header-editor').value = '';
        alert('Default header cleared.');
      }
    });

    panel.querySelector('#preview-header').addEventListener('click', () => {
      const previewEl = panel.querySelector('#header-preview');
      const code = panel.querySelector('#header-editor').value.trim();
      if (!code) { alert('No header to preview.'); return; }
      previewEl.style.display = 'block';
      previewEl.innerHTML = code;
    });

    // Footer handlers
    panel.querySelector('#save-footer').addEventListener('click', () => {
      const code = panel.querySelector('#footer-editor').value.trim();
      if (!code) { alert('Footer HTML cannot be empty.'); return; }
      localStorage.setItem('defaultFooter', code);
      alert('✅ Default footer saved!');
    });

    panel.querySelector('#clear-footer').addEventListener('click', () => {
      if (confirm('Delete the saved default footer?')) {
        localStorage.removeItem('defaultFooter');
        panel.querySelector('#footer-editor').value = '';
        alert('Default footer cleared.');
      }
    });

    panel.querySelector('#preview-footer').addEventListener('click', () => {
      const previewEl = panel.querySelector('#footer-preview');
      const code = panel.querySelector('#footer-editor').value.trim();
      if (!code) { alert('No footer to preview.'); return; }
      previewEl.style.display = 'block';
      previewEl.innerHTML = code;
    });

    // Product modal
    async function openProductModal(existing = null, index = null) {
      const overlay = document.createElement('div');
      overlay.className = 'component-modal-overlay';
      const modal = document.createElement('div');
      modal.className = 'component-modal-content';
      overlay.appendChild(modal);
      modal.innerHTML = '<h3>Select Products</h3>';

      const listDiv = document.createElement('div');
      listDiv.className = 'item-list';
      modal.appendChild(listDiv);

      const fieldsDiv = document.createElement('div');
      fieldsDiv.className = 'fields';
      fieldsDiv.innerHTML = `
        <div style="flex:1;min-width:120px;"><label>Filter</label><select id="prod-filter"><option value="all">All</option><option value="featured">Featured</option><option value="top-sales">Top Sales</option></select></div>
        <div style="flex:1;min-width:120px;"><label>Number to show</label><input type="number" id="prod-limit" min="1" value="6"></div>
        <div style="flex:1;min-width:120px;"><label>Columns</label><input type="number" id="prod-cols" min="1" max="4" value="3"></div>
      `;
      modal.appendChild(fieldsDiv);

      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'options';
      optionsDiv.innerHTML = `<label><input type="checkbox" id="prod-show-reviews" checked> Show ratings</label><label style="margin-left:20px;"><input type="checkbox" id="prod-show-delivery" checked> Show delivery info</label>`;
      modal.appendChild(optionsDiv);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'actions';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = 'Save';
      actionsDiv.appendChild(cancelBtn);
      actionsDiv.appendChild(saveBtn);
      modal.appendChild(actionsDiv);
      document.body.appendChild(overlay);

      let products = [];
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        products = data.products || [];
      } catch (e) { console.error('Failed to load products:', e); }

      if (!products.length) {
        listDiv.innerHTML = '<p style="color:#ef4444;">Failed to load products.</p>';
      } else {
        products.forEach(p => {
          const item = document.createElement('div');
          item.className = 'item';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.dataset.id = p.id;
          if (existing && existing.options && Array.isArray(existing.options.ids)) {
            if (existing.options.ids.map(x => Number(x)).includes(Number(p.id))) checkbox.checked = true;
          }
          const img = document.createElement('img');
          img.src = p.thumbnail_url || '/placeholder.jpg';
          img.alt = p.title;
          const titleDiv = document.createElement('div');
          titleDiv.className = 'title';
          titleDiv.textContent = p.title;
          item.appendChild(checkbox);
          item.appendChild(img);
          item.appendChild(titleDiv);
          listDiv.appendChild(item);
        });
      }

      if (existing && existing.options) {
        document.getElementById('prod-filter').value = existing.options.filter || 'all';
        document.getElementById('prod-limit').value = existing.options.limit || 6;
        document.getElementById('prod-cols').value = existing.options.columns || 3;
        document.getElementById('prod-show-reviews').checked = !!existing.options.showReviews;
        document.getElementById('prod-show-delivery').checked = !!existing.options.showDelivery;
      }

      cancelBtn.addEventListener('click', () => overlay.remove());

      saveBtn.addEventListener('click', () => {
        const selected = Array.from(listDiv.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked).map(cb => Number(cb.dataset.id));
        const options = {
          filter: document.getElementById('prod-filter').value || 'all',
          limit: parseInt(document.getElementById('prod-limit').value, 10) || 6,
          columns: parseInt(document.getElementById('prod-cols').value, 10) || 3,
          ids: selected,
          showReviews: document.getElementById('prod-show-reviews').checked,
          showDelivery: document.getElementById('prod-show-delivery').checked
        };
        const lists = JSON.parse(localStorage.getItem('savedProductLists') || '[]');
        if (existing && index !== null && index >= 0) {
          lists[index] = { id: existing.id, options };
        } else {
          lists.push({ id: 'product-list-' + Date.now(), options });
        }
        localStorage.setItem('savedProductLists', JSON.stringify(lists));
        overlay.remove();
        renderProductLists();
      });
    }

    // Review modal
    async function openReviewModal(existing = null, index = null) {
      const overlay = document.createElement('div');
      overlay.className = 'component-modal-overlay';
      const modal = document.createElement('div');
      modal.className = 'component-modal-content';
      overlay.appendChild(modal);
      modal.innerHTML = '<h3>Select Reviews</h3>';

      const listDiv = document.createElement('div');
      listDiv.className = 'item-list';
      modal.appendChild(listDiv);

      const fieldsDiv = document.createElement('div');
      fieldsDiv.className = 'fields';
      fieldsDiv.innerHTML = `
        <div style="flex:1;min-width:120px;"><label>Filter by rating</label><select id="review-rating"><option value="">All</option><option value="5">5★</option><option value="4">4★</option><option value="3">3★</option><option value="2">2★</option><option value="1">1★</option></select></div>
        <div style="flex:1;min-width:120px;"><label>Number to show</label><input type="number" id="review-limit" min="1" value="6"></div>
        <div style="flex:1;min-width:120px;"><label>Columns</label><input type="number" id="review-cols" min="1" max="4" value="2"></div>
      `;
      modal.appendChild(fieldsDiv);

      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'options';
      optionsDiv.innerHTML = `<label><input type="checkbox" id="review-show-avatar" checked> Show reviewer avatars</label>`;
      modal.appendChild(optionsDiv);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'actions';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = 'Save';
      actionsDiv.appendChild(cancelBtn);
      actionsDiv.appendChild(saveBtn);
      modal.appendChild(actionsDiv);
      document.body.appendChild(overlay);

      let reviews = [];
      try {
        const res = await fetch('/api/reviews');
        const data = await res.json();
        reviews = data.reviews || [];
      } catch (e) { console.error('Failed to load reviews:', e); }

      if (!reviews.length) {
        listDiv.innerHTML = '<p style="color:#ef4444;">Failed to load reviews.</p>';
      } else {
        reviews.forEach(r => {
          const item = document.createElement('div');
          item.className = 'item';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.dataset.id = r.id;
          if (existing && existing.options && Array.isArray(existing.options.ids)) {
            if (existing.options.ids.map(x => Number(x)).includes(Number(r.id))) checkbox.checked = true;
          }
          const ratingSpan = document.createElement('span');
          ratingSpan.textContent = `${r.rating}★`;
          ratingSpan.style.marginRight = '8px';
          const commentSpan = document.createElement('div');
          const comment = r.comment || r.comment_text || '';
          commentSpan.textContent = comment ? comment.slice(0, 40) + (comment.length > 40 ? '…' : '') : '';
          commentSpan.className = 'title';
          item.appendChild(checkbox);
          item.appendChild(ratingSpan);
          item.appendChild(commentSpan);
          listDiv.appendChild(item);
        });
      }

      if (existing && existing.options) {
        document.getElementById('review-rating').value = existing.options.rating ? existing.options.rating.toString() : '';
        document.getElementById('review-limit').value = existing.options.limit || 6;
        document.getElementById('review-cols').value = existing.options.columns || 2;
        document.getElementById('review-show-avatar').checked = !!existing.options.showAvatar;
      }

      cancelBtn.addEventListener('click', () => overlay.remove());

      saveBtn.addEventListener('click', () => {
        const selected = Array.from(listDiv.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked).map(cb => Number(cb.dataset.id));
        const ratingVal = document.getElementById('review-rating').value;
        const options = {
          productIds: [],
          ids: selected,
          rating: ratingVal ? parseInt(ratingVal, 10) : null,
          limit: parseInt(document.getElementById('review-limit').value, 10) || 6,
          columns: parseInt(document.getElementById('review-cols').value, 10) || 2,
          showAvatar: document.getElementById('review-show-avatar').checked
        };
        const lists = JSON.parse(localStorage.getItem('savedReviewLists') || '[]');
        if (existing && index !== null && index >= 0) {
          lists[index] = { id: existing.id, options };
        } else {
          lists.push({ id: 'reviews-list-' + Date.now(), options });
        }
        localStorage.setItem('savedReviewLists', JSON.stringify(lists));
        overlay.remove();
        renderReviewLists();
      });
    }

    // Render product lists
    async function renderProductLists() {
      const container = panel.querySelector('#product-lists');
      container.innerHTML = '';
      const lists = JSON.parse(localStorage.getItem('savedProductLists') || '[]');
      if (!lists.length) {
        container.innerHTML = '<p style="color:#6b7280;">No product lists saved yet.</p>';
        return;
      }

      let allProducts = [];
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        allProducts = data.products || [];
      } catch (e) { console.warn('Could not load products', e); }

      lists.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'component-list-item';
        let names = [];
        if (item.options && Array.isArray(item.options.ids) && item.options.ids.length > 0 && allProducts.length > 0) {
          const idSet = new Set(item.options.ids.map(x => Number(x)));
          names = allProducts.filter(p => idSet.has(Number(p.id))).map(p => p.title);
        }
        const namesHtml = names.length ? `<small style="color:#6b7280;">Products: ${names.slice(0,5).join(', ')}${names.length>5?'…':''}</small>` : '<small style="color:#6b7280;">Products: All</small>';
        div.innerHTML = `<h4>Product List #${index + 1}</h4>${namesHtml}<pre>${buildProductEmbed(item.id, item.options)}</pre>`;

        const actions = document.createElement('div');
        actions.className = 'actions';

        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn btn-secondary';
        previewBtn.textContent = 'Preview';
        previewBtn.addEventListener('click', () => {
          const preview = panel.querySelector('#product-preview');
          preview.style.display = 'block';
          preview.innerHTML = `<div id="${item.id}"></div>`;
          if (window.ProductCards) window.ProductCards.render(item.id, item.options);
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => openProductModal(item, index));

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-secondary';
        copyBtn.textContent = 'Copy Embed Code';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(buildProductEmbed(item.id, item.options)).then(() => alert('Embed code copied!'));
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
          if (confirm('Delete this product list?')) {
            lists.splice(index, 1);
            localStorage.setItem('savedProductLists', JSON.stringify(lists));
            renderProductLists();
          }
        });

        actions.appendChild(previewBtn);
        actions.appendChild(editBtn);
        actions.appendChild(copyBtn);
        actions.appendChild(delBtn);
        div.appendChild(actions);
        container.appendChild(div);
      });
    }

    // Render review lists
    async function renderReviewLists() {
      const container = panel.querySelector('#review-lists');
      container.innerHTML = '';
      const lists = JSON.parse(localStorage.getItem('savedReviewLists') || '[]');
      if (!lists.length) {
        container.innerHTML = '<p style="color:#6b7280;">No review lists saved yet.</p>';
        return;
      }

      for (let index = 0; index < lists.length; index++) {
        const item = lists[index];
        const div = document.createElement('div');
        div.className = 'component-list-item';
        div.innerHTML = `<h4>Review List #${index + 1}</h4><pre>${buildReviewEmbed(item.id, item.options)}</pre>`;

        const actions = document.createElement('div');
        actions.className = 'actions';

        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn btn-secondary';
        previewBtn.textContent = 'Preview';
        previewBtn.addEventListener('click', () => {
          const preview = panel.querySelector('#review-preview');
          preview.style.display = 'block';
          preview.innerHTML = `<div id="${item.id}"></div>`;
          if (window.ReviewsWidget) window.ReviewsWidget.render(item.id, item.options);
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => openReviewModal(item, index));

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-secondary';
        copyBtn.textContent = 'Copy Embed Code';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(buildReviewEmbed(item.id, item.options)).then(() => alert('Embed code copied!'));
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
          if (confirm('Delete this review list?')) {
            lists.splice(index, 1);
            localStorage.setItem('savedReviewLists', JSON.stringify(lists));
            renderReviewLists();
          }
        });

        actions.appendChild(previewBtn);
        actions.appendChild(editBtn);
        actions.appendChild(copyBtn);
        actions.appendChild(delBtn);
        div.appendChild(actions);
        container.appendChild(div);
      }
    }

    // Bind create buttons
    panel.querySelector('#create-product-list').addEventListener('click', () => openProductModal());
    panel.querySelector('#create-review-list').addEventListener('click', () => openReviewModal());

    // Initialize
    renderProductLists();
    renderReviewLists();
  };

  console.log('✅ Dashboard Components loaded');
})(window.AdminDashboard);
