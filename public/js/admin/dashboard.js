(function() {
  let currentView = 'dashboard';
  let orders = [], products = [], reviews = [];
  const VERSION = Date.now(); // Cache buster

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Format date properly
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // API fetch with cache busting
  async function apiFetch(url, options = {}) {
    const sep = url.includes('?') ? '&' : '?';
    const fetchUrl = url + sep + '_t=' + VERSION;
    const res = await fetch(fetchUrl, options);
    return res.json();
  }

  function init() {
    try {
      const menuItems = document.querySelectorAll('.menu-item');
      if (menuItems.length === 0) {
        console.error('No menu items found in DOM');
        return;
      }
      menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
          e.preventDefault();
          menuItems.forEach(m => m.classList.remove('active'));
          this.classList.add('active');
          currentView = this.dataset.view;
          loadView(currentView);
        });
      });
      loadView('dashboard');
    } catch (err) {
      console.error('Init error:', err);
    }
  }

  async function loadView(view) {
    // Cleanup chat polling if user navigates away
    if (window.__chatPollTimer) {
      clearInterval(window.__chatPollTimer);
      window.__chatPollTimer = null;
    }
    document.getElementById('page-title').textContent = view.charAt(0).toUpperCase() + view.slice(1);
    const panel = document.getElementById('main-panel');
    
    switch(view) {
      case 'dashboard': await loadDashboard(panel); break;
      case 'orders': await loadOrders(panel); break;
      case 'chats': await loadChats(panel); break;
      case 'products': await loadProducts(panel); break;
      case 'reviews': await loadReviews(panel); break;
      case 'settings': loadSettings(panel); break;
      case 'pages':
        // Load the landing pages manager directly inside the dashboard.  In
        // earlier versions this view triggered a full navigation to
        // /admin/pages.html.  That broke the single‑page experience and
        // caused the UI to feel inconsistent.  Now we fetch and display
        // pages within the existing dashboard panel just like orders and
        // products.  See the loadPages() helper below.
        await loadPages(panel);
        break;
      case 'components':
        // Load the components manager (header, footer, product lists, review lists)
        await loadComponents(panel);
        break;
    }
  }

  async function loadDashboard(panel) {
    panel.innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-value" id="total-orders">0</div><div class="stat-label">Total Orders</div></div><div class="stat-card"><div class="stat-value" id="pending-orders">0</div><div class="stat-label">Pending</div></div><div class="stat-card"><div class="stat-value" id="total-revenue">$0</div><div class="stat-label">Revenue</div></div><div class="stat-card"><div class="stat-value" id="total-products">0</div><div class="stat-label">Products</div></div></div><div class="table-container"><h3 style="padding: 20px; margin: 0;">Recent Orders</h3><table><thead><tr><th>Order ID</th><th>Email</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody id="recent-orders"><tr><td colspan="5" style="text-align: center;">Loading...</td></tr></tbody></table></div>`;

    try {
      const data = await apiFetch('/api/orders');
      if (data.orders) {
        orders = data.orders;
        document.getElementById('total-orders').textContent = orders.length;
        document.getElementById('pending-orders').textContent = orders.filter(o => o.status !== 'delivered').length;
        const revenue = orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
        document.getElementById('total-revenue').textContent = '$' + revenue.toFixed(2);
        
        const recent = orders.slice(0, 10);
        document.getElementById('recent-orders').innerHTML = recent.map(o => `<tr onclick="window.location.href='/order-detail.html?id=${o.order_id}&admin=1'" style="cursor:pointer;"><td><strong>#${o.order_id}</strong></td><td>${o.email || 'N/A'}</td><td>$${o.amount || 0}</td><td><span class="status-${o.status}">${o.status}</span></td><td>${formatDate(o.created_at)}</td></tr>`).join('');
      }

      const pdata = await apiFetch('/api/products');
      if (pdata.products) document.getElementById('total-products').textContent = pdata.products.length;
    } catch (err) { console.error('Dashboard error:', err); }
  }

  async function loadOrders(panel) {
    panel.innerHTML = `
      <!-- Create Order Modal -->
      <div id="create-order-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:white; padding:30px; border-radius:12px; max-width:500px; width:90%; max-height:90vh; overflow-y:auto;">
          <h3 style="margin:0 0 20px; color:#1f2937;">➕ Create New Order</h3>
          <form id="create-order-form">
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Product</label>
              <select id="new-order-product" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px;" required>
                <option value="">Select Product...</option>
              </select>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Customer Email</label>
              <input type="email" id="new-order-email" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;" required>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Amount ($)</label>
              <input type="number" id="new-order-amount" step="0.01" min="0" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;" required>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Delivery Time (minutes)</label>
              <input type="number" id="new-order-delivery" value="60" min="1" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;" required>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Status</label>
              <select id="new-order-status" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px;">
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Notes (Optional)</label>
              <textarea id="new-order-notes" rows="2" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box; resize:vertical;" placeholder="Any special requirements..."></textarea>
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
              <button type="button" id="cancel-create-order" style="padding:10px 20px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Cancel</button>
              <button type="submit" style="padding:10px 20px; background:#10b981; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Create Order</button>
            </div>
          </form>
        </div>
      </div>
      
      <button class="btn btn-primary" onclick="openCreateOrderModal()" style="margin-bottom: 20px;">➕ Create New Order</button>
      <div class="table-container"><table><thead><tr><th>Order ID</th><th>Email</th><th>Amount</th><th>Status</th><th>Time Left</th><th>Date</th><th>Action</th></tr></thead><tbody id="orders-tbody"><tr><td colspan="7" style="text-align: center;">Loading...</td></tr></tbody></table></div>`;
    
    // Setup modal handlers
    const modal = document.getElementById('create-order-modal');
    const createForm = document.getElementById('create-order-form');
    const cancelBtn = document.getElementById('cancel-create-order');
    
    cancelBtn.onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    
    // Open modal function
    window.openCreateOrderModal = async () => {
      // Load products into dropdown
      const productSelect = document.getElementById('new-order-product');
      try {
        const pdata = await apiFetch('/api/products/list');
        if (pdata.products && pdata.products.length > 0) {
          productSelect.innerHTML = '<option value="">Select Product...</option>' + 
            pdata.products.map(p => `<option value="${p.id}" data-price="${p.sale_price || p.normal_price}">${p.title} - $${p.sale_price || p.normal_price}</option>`).join('');
        }
      } catch (err) {
        console.error('Failed to load products', err);
      }
      
      // Auto-fill amount when product selected
      productSelect.onchange = function() {
        const selected = this.options[this.selectedIndex];
        if (selected && selected.dataset.price) {
          document.getElementById('new-order-amount').value = selected.dataset.price;
        }
      };
      
      modal.style.display = 'flex';
    };
    
    // Create order form submit
    createForm.onsubmit = async (e) => {
      e.preventDefault();
      
      const data = {
        productId: document.getElementById('new-order-product').value,
        email: document.getElementById('new-order-email').value.trim(),
        amount: document.getElementById('new-order-amount').value,
        deliveryTime: document.getElementById('new-order-delivery').value,
        status: document.getElementById('new-order-status').value,
        notes: document.getElementById('new-order-notes').value.trim()
      };
      
      if (!data.productId) {
        alert('Please select a product');
        return;
      }
      
      try {
        const res = await fetch('/api/order/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
          alert('✅ Order created! Order ID: ' + result.orderId);
          modal.style.display = 'none';
          createForm.reset();
          loadOrders(panel);
        } else {
          alert('Error: ' + (result.error || 'Create failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };
    
    try {
      const data = await apiFetch('/api/orders');
      if (data.orders) {
        orders = data.orders;
        document.getElementById('orders-tbody').innerHTML = orders.map(o => {
          const countdown = getCountdown(o);
          return `<tr onclick="showOrderDetail('${o.order_id}')" style="cursor:pointer;">
            <td><strong>#${o.order_id}</strong></td>
            <td>${o.email || 'N/A'}</td>
            <td><strong>${o.amount || 0}</strong></td>
            <td><span class="status-${o.status}">${o.status}</span></td>
            <td>${countdown}</td>
            <td>${formatDate(o.created_at)}</td>
            <td>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <a href="/order-detail.html?id=${o.order_id}&admin=1" class="btn btn-primary" onclick="event.stopPropagation()" style="font-size: 12px; padding: 6px 12px;">👁️ Admin View</a>
                <a href="/buyer-order.html?id=${o.order_id}" class="btn" onclick="event.stopPropagation()" target="_blank" style="background: #10b981; color: white; font-size: 12px; padding: 6px 12px;">👤 Buyer Link</a>
              </div>
            </td>
          </tr>`;
        }).join('');
      }
    } catch (err) { document.getElementById('orders-tbody').innerHTML = '<tr><td colspan="7" style="color: red;">Error loading orders</td></tr>'; }
  }

  async function loadProducts(panel) {
    panel.innerHTML = `<button class="btn btn-primary" onclick="window.location.href='/admin/product-form.html'" style="margin-bottom: 20px;">+ Add Product</button><div id="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;"></div>`;
    
    try {
      // Fetch all products including drafts.  The admin listing should show
      // products regardless of status so that drafts can be managed.
      const data = await apiFetch('/api/products/list');
      if (data.products) {
        products = data.products;
        document.getElementById('products-grid').innerHTML = products.map(p => `<div class="product-card" onclick="showProductDetail(${p.id})" style="cursor:pointer;"><img src="${p.thumbnail_url || 'https://via.placeholder.com/300x180'}" class="product-thumb"><div class="product-info"><div class="product-title">${p.title}</div><div class="product-price">$${p.sale_price || p.normal_price}</div><div class="product-meta"><span>⏱️ ${p.normal_delivery_text || '60 min'}</span></div></div></div>`).join('');
      }
    } catch (err) { console.error('Products error:', err); }
  }

  async function loadReviews(panel) {
    panel.innerHTML = `
      <div id="edit-review-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:white; padding:30px; border-radius:12px; max-width:500px; width:90%; max-height:90vh; overflow-y:auto;">
          <h3 style="margin:0 0 20px; color:#1f2937;">Edit Review</h3>
          <form id="edit-review-form">
            <input type="hidden" id="edit-review-id">
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Author Name</label>
              <input type="text" id="edit-author" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Rating</label>
              <select id="edit-rating" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px;">
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Comment</label>
              <textarea id="edit-comment" rows="4" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box; resize:vertical;"></textarea>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Status</label>
              <select id="edit-status" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px;">
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div style="margin-bottom:20px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="edit-show-portfolio">
                <span>Show in Portfolio</span>
              </label>
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
              <button type="button" id="cancel-edit-btn" style="padding:10px 20px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Cancel</button>
              <button type="submit" style="padding:10px 20px; background:#667eea; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Author</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Product</th>
              <th>Status</th>
              <th>Date</th>
              <th style="width:140px;">Actions</th>
            </tr>
          </thead>
          <tbody id="reviews-tbody">
            <tr><td colspan="8" style="text-align: center;">Loading...</td></tr>
          </tbody>
        </table>
      </div>`;
    
    // Setup modal handlers
    const modal = document.getElementById('edit-review-modal');
    const editForm = document.getElementById('edit-review-form');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    
    cancelBtn.onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-review-id').value;
      const data = {
        id: id,
        author_name: document.getElementById('edit-author').value.trim(),
        rating: document.getElementById('edit-rating').value,
        comment: document.getElementById('edit-comment').value.trim(),
        status: document.getElementById('edit-status').value,
        show_on_product: document.getElementById('edit-show-portfolio').checked ? 1 : 0
      };
      
      try {
        const res = await fetch('/api/reviews/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
          alert('✅ Review updated!');
          modal.style.display = 'none';
          loadReviews(panel);
        } else {
          alert('Error: ' + (result.error || 'Update failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };
    
    // Delete function
    window.deleteReview = async (id) => {
      if (!confirm('Are you sure you want to delete this review?')) return;
      try {
        const res = await fetch(`/api/reviews/delete?id=${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          alert('✅ Review deleted!');
          loadReviews(panel);
        } else {
          alert('Error: ' + (result.error || 'Delete failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };
    
    // Edit function
    window.editReview = (review) => {
      document.getElementById('edit-review-id').value = review.id;
      document.getElementById('edit-author').value = review.author_name || '';
      document.getElementById('edit-rating').value = review.rating || 5;
      document.getElementById('edit-comment').value = review.comment || '';
      document.getElementById('edit-status').value = review.status || 'approved';
      document.getElementById('edit-show-portfolio').checked = review.show_on_product == 1;
      modal.style.display = 'flex';
    };
    
    try {
      const data = await apiFetch('/api/reviews');
      if (data.reviews) {
        reviews = data.reviews;
        document.getElementById('reviews-tbody').innerHTML = reviews.map(r => {
          const status = r.status || 'approved';
          const statusColor = status === 'approved' ? '#d1fae5;color:#065f46' : status === 'pending' ? '#fef3c7;color:#92400e' : '#fee2e2;color:#991b1b';
          const comment = r.comment || '';
          const shortComment = comment.length > 40 ? comment.substring(0, 40) + '...' : comment;
          const reviewJson = JSON.stringify(r).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
          
          return `<tr>
            <td>${r.id}</td>
            <td>${r.author_name || 'Anonymous'}</td>
            <td style="color:#fbbf24;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</td>
            <td title="${comment}" style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${shortComment}</td>
            <td>${r.product_title || 'Product #' + r.product_id}</td>
            <td><span style="padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;background:${statusColor}">${status}</span></td>
            <td>${formatDate(r.created_at)}</td>
            <td>
              <button onclick='editReview(${reviewJson})' style="padding:5px 8px;background:#667eea;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:4px;font-size:11px;">✏️ Edit</button>
              <button onclick="deleteReview(${r.id})" style="padding:5px 8px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">🗑️</button>
            </td>
          </tr>`;
        }).join('');
      }
    } catch (err) { 
      document.getElementById('reviews-tbody').innerHTML = '<tr><td colspan="8" style="color: red;">Error loading reviews</td></tr>'; 
    }
  }

  function loadSettings(panel) {
    const webhookUrl = window.location.origin + '/api/whop/webhook';
    panel.innerHTML = `<div style="background: white; padding: 30px; border-radius: 12px;"><h3>Whop Settings</h3>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">API Key:</label>
        <input type="text" id="whop-api-key" placeholder="whop_sk_..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
        <small style="color: #6b7280;">Used for server-side API requests and membership lookups.</small>
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Webhook Secret:</label>
        <input type="text" id="whop-webhook-secret" placeholder="whop_webhook_..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
        <small style="color: #6b7280;">Secret to verify Whop webhooks.</small>
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Webhook URL:</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="whop-webhook-url" value="${webhookUrl}" readonly style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;">
          <button class="btn" id="copy-webhook-url" style="background: #6b7280; color: white;">Copy</button>
        </div>
        <small style="color: #6b7280;">Provide this URL to Whop as your webhook endpoint.</small>
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Default Plan ID:</label>
        <input type="text" id="default-plan" placeholder="plan_xxx" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Default Product ID:</label>
        <input type="text" id="default-product" placeholder="prod_xxx" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Price Map:</label>
        <textarea id="price-map" rows="5" placeholder="60|plan_60" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"></textarea>
      </div>
      <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
        <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn" id="whop-test-api" style="background: #3b82f6; color: white;">Test API</button>
          <button class="btn" id="whop-test-webhook" style="background: #3b82f6; color: white;">Test Webhook</button>
          <span id="whop-test-status" style="font-size: 0.9rem; color: #6b7280;"></span>
        </div>
      </div>
      <div style="display:flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
        <button class="btn" style="background:#ef4444;color:white;" id="purge-cache-btn">Purge Cache</button>
      </div>
    </div>

    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>Google Sheets Integration</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Connect your Google Apps Script to fetch all orders, emails, and customer data for email marketing.</p>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Google Web App URL:</label>
        <input type="text" id="google-webapp-url" placeholder="https://script.google.com/macros/s/..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
        <small style="color: #6b7280;">Your Google Apps Script deployment URL (optional, for syncing data to Google Sheets)</small>
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">API Endpoint for Google Sheets:</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" value="${window.location.origin}/api/admin/export-data" readonly style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;">
          <button class="btn" id="copy-export-url" style="background: #6b7280; color: white;">Copy</button>
        </div>
        <small style="color: #6b7280;">Use this endpoint in your Google Apps Script to fetch all D1 data</small>
      </div>
      <div style="margin: 20px 0;">
        <button class="btn" id="test-google-sync" style="background: #10b981; color: white;">Test Google Sync</button>
        <span id="google-sync-status" style="margin-left: 10px; font-size: 0.9rem; color: #6b7280;"></span>
      </div>
    </div>

    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>System Maintenance</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Manage temporary files and pending checkouts.</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
        <button class="btn" style="background: #f59e0b; color: white;" id="clear-temp-files-btn">Clear Temp Files</button>
        <button class="btn" style="background: #f59e0b; color: white;" id="clear-pending-checkouts-btn">Clear Pending Checkouts</button>
        <span id="maintenance-status" style="margin-left: 10px; font-size: 0.9rem; color: #6b7280;"></span>
      </div>
      <div style="margin-top: 15px; padding: 10px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <small style="color: #92400e;"><strong>Note:</strong> Clearing temp files removes uploaded files that haven't been attached to orders. Clearing pending checkouts removes incomplete checkout sessions.</small>
      </div>
    </div>
    
    <!-- Export/Import Section -->
    <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
      <h3>📦 Export / Import Data</h3>
      <p style="color: #6b7280; margin-bottom: 20px;">Backup your data or migrate to another instance.</p>
      
      <!-- Full Website Export -->
      <div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #667eea15, #764ba215); border-radius: 10px; border: 1px solid #667eea30;">
        <h4 style="margin: 0 0 10px; color: #667eea;">🌐 Full Website Export</h4>
        <p style="color: #6b7280; font-size: 0.9em; margin-bottom: 15px;">Export all products, pages, reviews, orders, and settings.</p>
        <button class="btn" id="export-full-btn" style="background: #667eea; color: white;">📥 Export Full Website</button>
      </div>
      
      <!-- Products Export/Import -->
      <div style="margin-bottom: 25px; padding: 20px; background: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0;">
        <h4 style="margin: 0 0 10px; color: #16a34a;">🎥 Products</h4>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn" id="export-products-btn" style="background: #16a34a; color: white;">📥 Export Products</button>
          <label class="btn" style="background: #22c55e; color: white; cursor: pointer;">
            📤 Import Products
            <input type="file" id="import-products-file" accept=".json" style="display: none;">
          </label>
          <span id="products-import-status" style="font-size: 0.85em; color: #6b7280;"></span>
        </div>
      </div>
      
      <!-- Pages Export/Import -->
      <div style="margin-bottom: 25px; padding: 20px; background: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe;">
        <h4 style="margin: 0 0 10px; color: #2563eb;">📄 Pages</h4>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn" id="export-pages-btn" style="background: #2563eb; color: white;">📥 Export Pages</button>
          <label class="btn" style="background: #3b82f6; color: white; cursor: pointer;">
            📤 Import Pages
            <input type="file" id="import-pages-file" accept=".json" style="display: none;">
          </label>
          <span id="pages-import-status" style="font-size: 0.85em; color: #6b7280;"></span>
        </div>
      </div>
      
      <!-- Reviews Export/Import -->
      <div style="margin-bottom: 25px; padding: 20px; background: #fefce8; border-radius: 10px; border: 1px solid #fef08a;">
        <h4 style="margin: 0 0 10px; color: #ca8a04;">⭐ Reviews</h4>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn" id="export-reviews-btn" style="background: #ca8a04; color: white;">📥 Export Reviews</button>
          <label class="btn" style="background: #eab308; color: white; cursor: pointer;">
            📤 Import Reviews
            <input type="file" id="import-reviews-file" accept=".json" style="display: none;">
          </label>
          <span id="reviews-import-status" style="font-size: 0.85em; color: #6b7280;"></span>
        </div>
      </div>
      
      <!-- Orders Export -->
      <div style="padding: 20px; background: #fdf4ff; border-radius: 10px; border: 1px solid #f5d0fe;">
        <h4 style="margin: 0 0 10px; color: #a855f7;">📦 Orders</h4>
        <p style="color: #6b7280; font-size: 0.9em; margin-bottom: 10px;">Export only (orders contain customer data and are not importable).</p>
        <button class="btn" id="export-orders-btn" style="background: #a855f7; color: white;">📥 Export Orders</button>
      </div>
      
      <!-- Full Import -->
      <div style="margin-top: 25px; padding: 20px; background: #fef2f2; border-radius: 10px; border: 1px solid #fecaca;">
        <h4 style="margin: 0 0 10px; color: #dc2626;">⚠️ Full Website Import</h4>
        <p style="color: #6b7280; font-size: 0.9em; margin-bottom: 15px;">Import full website backup. This will add new items (won't overwrite existing).</p>
        <label class="btn" style="background: #dc2626; color: white; cursor: pointer;">
          📤 Import Full Backup
          <input type="file" id="import-full-file" accept=".json" style="display: none;">
        </label>
        <span id="full-import-status" style="margin-left: 10px; font-size: 0.85em; color: #6b7280;"></span>
      </div>
    </div>`;

    loadWhopSettings();
    document.getElementById('save-settings-btn').addEventListener('click', saveWhopSettings);
    document.getElementById('purge-cache-btn').addEventListener('click', purgeCache);
    
    // Export/Import handlers
    setupExportImportHandlers();

    // Google Sheets Integration handlers
    document.getElementById('copy-export-url').addEventListener('click', () => {
      const exportUrlEl = document.getElementById('copy-export-url').previousElementSibling;
      if (exportUrlEl && exportUrlEl.value) {
        navigator.clipboard.writeText(exportUrlEl.value)
          .then(() => alert('✅ Export URL copied to clipboard!'))
          .catch(() => alert('❌ Failed to copy URL'));
      }
    });

    document.getElementById('test-google-sync').addEventListener('click', async () => {
      const statusSpan = document.getElementById('google-sync-status');
      const googleUrl = document.getElementById('google-webapp-url').value.trim();

      if (!googleUrl) {
        statusSpan.textContent = '⚠️ Please enter Google Web App URL first';
        statusSpan.style.color = '#f59e0b';
        return;
      }

      statusSpan.textContent = 'Testing sync...';
      statusSpan.style.color = '#6b7280';

      try {
        const res = await apiFetch('/api/admin/test-google-sync', {
          method: 'POST',
          body: JSON.stringify({ googleUrl })
        });

        if (res && res.success) {
          statusSpan.textContent = '✅ Sync OK - Data sent to Google Sheets';
          statusSpan.style.color = '#10b981';
        } else {
          statusSpan.textContent = '❌ Sync failed: ' + (res.error || 'Unknown error');
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ Test failed: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });

    // Maintenance handlers
    document.getElementById('clear-temp-files-btn').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all temporary files? This cannot be undone.')) return;

      const statusSpan = document.getElementById('maintenance-status');
      statusSpan.textContent = 'Clearing temp files...';
      statusSpan.style.color = '#6b7280';

      try {
        const res = await apiFetch('/api/admin/clear-temp-files', { method: 'POST' });

        if (res && res.success) {
          statusSpan.textContent = `✅ Cleared ${res.count || 0} temp files`;
          statusSpan.style.color = '#10b981';
        } else {
          statusSpan.textContent = '❌ Failed: ' + (res.error || 'Unknown error');
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ Error: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });

    document.getElementById('clear-pending-checkouts-btn').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all pending checkout sessions? This cannot be undone.')) return;

      const statusSpan = document.getElementById('maintenance-status');
      statusSpan.textContent = 'Clearing pending checkouts...';
      statusSpan.style.color = '#6b7280';

      try {
        const res = await apiFetch('/api/admin/clear-pending-checkouts', { method: 'POST' });

        if (res && res.success) {
          statusSpan.textContent = `✅ Cleared ${res.count || 0} pending checkouts`;
          statusSpan.style.color = '#10b981';
        } else {
          statusSpan.textContent = '❌ Failed: ' + (res.error || 'Unknown error');
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ Error: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });

    // Copy webhook URL button
    document.getElementById('copy-webhook-url').addEventListener('click', () => {
      const webhookUrlEl = document.getElementById('whop-webhook-url');
      if (webhookUrlEl && webhookUrlEl.value) {
        navigator.clipboard.writeText(webhookUrlEl.value)
          .then(() => alert('✅ Webhook URL copied to clipboard!'))
          .catch(() => alert('❌ Failed to copy URL'));
      }
    });

    // Test API button
    document.getElementById('whop-test-api').addEventListener('click', async () => {
      const statusSpan = document.getElementById('whop-test-status');
      statusSpan.textContent = 'Testing API...';
      statusSpan.style.color = '#6b7280';
      try {
        const res = await apiFetch('/api/whop/test-api');
        if (res && res.success) {
          statusSpan.textContent = '✅ API OK';
          statusSpan.style.color = '#10b981';
        } else {
          // Handle error properly - convert object to string if needed
          let errorMsg = 'Unknown error';
          if (res.error) {
            errorMsg = typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
          }
          statusSpan.textContent = '❌ API Error: ' + errorMsg;
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ API test failed: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });

    // Test Webhook button
    document.getElementById('whop-test-webhook').addEventListener('click', async () => {
      const statusSpan = document.getElementById('whop-test-status');
      statusSpan.textContent = 'Testing webhook...';
      statusSpan.style.color = '#6b7280';
      try {
        const res = await apiFetch('/api/whop/test-webhook');
        if (res && res.success) {
          statusSpan.textContent = '✅ Webhook OK';
          statusSpan.style.color = '#10b981';
        } else {
          // Handle error properly - convert object to string if needed
          let errorMsg = 'Unknown error';
          if (res.error) {
            errorMsg = typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
          }
          statusSpan.textContent = '❌ Webhook Error: ' + errorMsg;
          statusSpan.style.color = '#ef4444';
        }
      } catch (err) {
        statusSpan.textContent = '❌ Webhook test failed: ' + err.message;
        statusSpan.style.color = '#ef4444';
      }
    });
  }

  // Export/Import functionality
  function setupExportImportHandlers() {
    // Helper to download JSON
    const downloadJSON = (data, filename) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    // Export Full Website
    document.getElementById('export-full-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/full');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `website-backup-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Full website exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Export Products
    document.getElementById('export-products-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/products');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `products-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Products exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Export Pages
    document.getElementById('export-pages-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/pages');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `pages-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Pages exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Export Reviews
    document.getElementById('export-reviews-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/reviews');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `reviews-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Reviews exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Export Orders
    document.getElementById('export-orders-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/export/orders');
        const data = await res.json();
        if (data.success) {
          downloadJSON(data.data, `orders-${new Date().toISOString().split('T')[0]}.json`);
          alert('✅ Orders exported!');
        } else {
          alert('Error: ' + (data.error || 'Export failed'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    // Import Products
    document.getElementById('import-products-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('products-import-status');
      statusEl.textContent = 'Importing...';
      statusEl.style.color = '#6b7280';
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        const res = await fetch('/api/admin/import/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: data.products || data })
        });
        const result = await res.json();
        
        if (result.success) {
          statusEl.textContent = `✅ Imported ${result.count || 0} products`;
          statusEl.style.color = '#16a34a';
        } else {
          statusEl.textContent = '❌ ' + (result.error || 'Import failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
      e.target.value = '';
    });

    // Import Pages
    document.getElementById('import-pages-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('pages-import-status');
      statusEl.textContent = 'Importing...';
      statusEl.style.color = '#6b7280';
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        const res = await fetch('/api/admin/import/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages: data.pages || data })
        });
        const result = await res.json();
        
        if (result.success) {
          statusEl.textContent = `✅ Imported ${result.count || 0} pages`;
          statusEl.style.color = '#2563eb';
        } else {
          statusEl.textContent = '❌ ' + (result.error || 'Import failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
      e.target.value = '';
    });

    // Import Reviews
    document.getElementById('import-reviews-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('reviews-import-status');
      statusEl.textContent = 'Importing...';
      statusEl.style.color = '#6b7280';
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        const res = await fetch('/api/admin/import/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviews: data.reviews || data })
        });
        const result = await res.json();
        
        if (result.success) {
          statusEl.textContent = `✅ Imported ${result.count || 0} reviews`;
          statusEl.style.color = '#ca8a04';
        } else {
          statusEl.textContent = '❌ ' + (result.error || 'Import failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
      e.target.value = '';
    });

    // Import Full Backup
    document.getElementById('import-full-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (!confirm('This will import all data from the backup. Existing items with same IDs will be skipped. Continue?')) {
        e.target.value = '';
        return;
      }
      
      const statusEl = document.getElementById('full-import-status');
      statusEl.textContent = 'Importing...';
      statusEl.style.color = '#6b7280';
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        const res = await fetch('/api/admin/import/full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success) {
          statusEl.textContent = `✅ Imported: ${result.products || 0} products, ${result.pages || 0} pages, ${result.reviews || 0} reviews`;
          statusEl.style.color = '#16a34a';
        } else {
          statusEl.textContent = '❌ ' + (result.error || 'Import failed');
          statusEl.style.color = '#dc2626';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.style.color = '#dc2626';
      }
      e.target.value = '';
    });
  }

  async function loadWhopSettings() {
    try {
      const data = await apiFetch('/api/settings/whop');
      if (data.settings) {
        const apiKeyEl = document.getElementById('whop-api-key');
        const webhookSecretEl = document.getElementById('whop-webhook-secret');
        const defaultPlanEl = document.getElementById('default-plan');
        const defaultProductEl = document.getElementById('default-product');
        const priceMapEl = document.getElementById('price-map');
        const googleUrlEl = document.getElementById('google-webapp-url');

        if (apiKeyEl) apiKeyEl.value = data.settings.api_key || '';
        if (webhookSecretEl) webhookSecretEl.value = data.settings.webhook_secret || '';
        if (defaultPlanEl) defaultPlanEl.value = data.settings.default_plan || data.settings.default_plan_id || '';
        if (defaultProductEl) defaultProductEl.value = data.settings.default_product_id || '';
        if (priceMapEl) priceMapEl.value = data.settings.price_map || '';
        if (googleUrlEl) googleUrlEl.value = data.settings.google_webapp_url || '';
      }
    } catch (err) { console.error('Settings error:', err); }
  }

  async function saveWhopSettings() {
    const apiKey = document.getElementById('whop-api-key') ? document.getElementById('whop-api-key').value.trim() : '';
    const webhookSecret = document.getElementById('whop-webhook-secret') ? document.getElementById('whop-webhook-secret').value.trim() : '';
    const defaultPlan = document.getElementById('default-plan').value.trim();
    const defaultProduct = document.getElementById('default-product') ? document.getElementById('default-product').value.trim() : '';
    const priceMap = document.getElementById('price-map').value.trim();
    const googleUrl = document.getElementById('google-webapp-url') ? document.getElementById('google-webapp-url').value.trim() : '';

    try {
      const payload = {
        api_key: apiKey,
        webhook_secret: webhookSecret,
        default_plan: defaultPlan,
        price_map: priceMap,
        google_webapp_url: googleUrl
      };
      if (defaultProduct) payload.default_product_id = defaultProduct;
      const res = await fetch('/api/settings/whop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) alert('✅ Settings saved!');
      else alert('❌ Failed to save');
    } catch (err) { alert('Error: ' + err.message); }
  }

  // Purge Cloudflare cache via the worker API.  Displays an alert based on success or failure.
  async function purgeCache() {
    if (!confirm('This will purge the Cloudflare cache for all assets. Continue?')) return;
    try {
      const res = await fetch('/api/purge-cache', { method: 'POST' });
      const data = await res.json();
      // Cloudflare API response uses 'success' boolean
      if (data && data.success) {
        alert('✅ Cache purged successfully!');
        // Force reload to fetch fresh assets
        hardRefresh();
      } else {
        const msg = (data && data.errors && data.errors[0] && data.errors[0].message) || 'Unknown error';
        alert('❌ Failed to purge cache: ' + msg);
      }
    } catch (err) {
      alert('Error purging cache: ' + err.message);
    }
  }

  /**
   * Load the landing pages manager into the provided panel element.  This
   * function fetches the list of pages from the backend and renders a
   * simple grid of cards with actions to view, copy, delete and embed
   * pages.  Creating a new page navigates to the stand‑alone builder
   * (/page-builder.html).  This helper is invoked when the user selects
   * the "Pages" view in the admin sidebar.
   *
   * @param {HTMLElement} panel The DOM element to populate
   */
  async function loadPages(panel) {
    // Header with create button
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <h2 style="margin:0;font-size:1.5em;color:#1f2937;">Your Landing Pages</h2>
        <button id="create-page-btn" class="btn btn-primary">+ Create New Page</button>
      </div>
      <div id="admin-pages-container">Loading pages...</div>`;

    // Bind create button to navigate to the builder
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
      // Render cards
      const cards = data.pages.map(p => renderAdminPageCard(p)).join('');
      container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;">${cards}</div>`;
    } catch (err) {
      console.error('Failed to load pages:', err);
      container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:red;">Error loading pages: ${err.message}</div>`;
    }
  }

  /**
   * Render a single page card for the admin landing pages view.  Displays
   * the page name, URL, meta information and action buttons.  Click
   * handlers are attached inline and call global helpers defined below.
   *
   * @param {Object} page Page object returned from the backend
   * @returns {string} HTML markup for the card
   */
  function renderAdminPageCard(page) {
    const uploadDate = new Date(page.uploaded).toLocaleDateString();
    const sizeKB = ((page.size || 0) / 1024).toFixed(1);
    const fullURL = window.location.origin + page.url;
    // Determine status badge and toggle label
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

  /**
   * Copy a page URL to the clipboard.  The URL passed here should be the
   * relative URL returned from the backend (e.g. '/pages/my-page.html').
   * This helper constructs an absolute URL using window.location.origin
   * before writing it to the clipboard.  A toast alert is displayed
   * upon success.
   *
   * @param {string} url Relative URL of the page
   */
  window.copyAdminPageURL = function(url) {
    const fullURL = window.location.origin + url;
    navigator.clipboard.writeText(fullURL);
    alert('✅ URL copied to clipboard!\n\n' + fullURL);
  };

  /**
   * Show an embed code prompt for the given page.  Constructs a simple
   * iframe code snippet that can be embedded on external websites.  The
   * prompt allows quick copying; no UI is displayed otherwise.
   *
   * @param {string} name The page name (unused but provided for future)
   * @param {string} url Relative URL of the page
   */
  window.showAdminEmbedCode = function(name, url) {
    const fullURL = window.location.origin + url;
    const embedCode = `<iframe src="${fullURL}" width="100%" height="800" frameborder="0"></iframe>`;
    prompt('Copy this embed code:', embedCode);
  };

  /**
   * Delete a landing page by name.  Confirms with the user and then
   * performs a POST request to /api/pages/delete.  Upon success the
   * page list is refreshed.  Errors are reported via alert().
   *
   * @param {string} name Name of the page to delete
   */
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
        // Reload pages into the current panel
        const panel = document.getElementById('main-panel');
        if (panel) loadPages(panel);
      } else {
        alert('❌ Failed to delete: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Navigate to the page builder for editing a page
  window.editAdminPage = function(slug) {
    if (!slug) return;
    window.location.href = '/page-builder.html?name=' + encodeURIComponent(slug);
  };

  // Duplicate a page by slug.  Makes a POST request to /api/pages/duplicate
  // and reloads the pages list on success.
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
        if (panel) loadPages(panel);
      } else {
        alert('❌ Failed to duplicate: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Change the publish status of a page.  Accepts slug and new status
  // ('published' or 'draft'). Reloads the page list after update.
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
        if (panel) loadPages(panel);
      } else {
        alert('❌ Failed to update status: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  function getCountdown(o) {
    if (o.status === 'delivered') return '<span style="color: #10b981;">✅ Done</span>';
    const created = new Date(o.created_at).getTime();
    const delivery = created + (o.delivery_time_minutes || 60) * 60 * 1000;
    const remaining = delivery - Date.now();
    if (remaining <= 0) return '<span style="color: #ef4444;">⏰ Overdue</span>';
    const mins = Math.floor(remaining / 60000);
    return `<span style="color: #7c3aed; font-weight: bold;">${mins} min</span>`;
  }

  window.showOrderDetail = function(orderId) {
    const order = orders.find(o => o.order_id === orderId);
    if (!order) return;
    const panel = document.getElementById('right-panel');
    
    // Find product info
    const product = products.find(p => p.id === order.product_id);
    const productName = order.product_title || (product ? product.title : 'Product #' + order.product_id);
    const productLink = product ? `/product?id=${product.id}` : '#';
    
    panel.innerHTML = `
      <h3 style="margin-bottom:15px;">Order #${order.order_id}</h3>
      
      <!-- Product Link -->
      <div style="margin-bottom:15px; padding:12px; background:linear-gradient(135deg,#667eea,#764ba2); border-radius:8px;">
        <div style="font-size:0.8em; color:rgba(255,255,255,0.8);">Product</div>
        <a href="${productLink}" target="_blank" style="color:white; font-weight:600; text-decoration:none; display:flex; align-items:center; gap:6px;">
          🎬 ${productName}
          <span style="font-size:12px;">↗</span>
        </a>
      </div>
      
      <div style="margin:15px 0; padding:10px; background:#f9fafb; border-radius:6px;">
        <div style="font-size:0.85em; color:#6b7280;">Email</div>
        <div style="font-weight:600;">${order.email || 'N/A'}</div>
      </div>
      
      <div style="margin:15px 0; padding:10px; background:#f9fafb; border-radius:6px;">
        <div style="font-size:0.85em; color:#6b7280;">Amount</div>
        <div style="font-weight:600;">$${order.amount || 0}</div>
      </div>
      
      <!-- Status with Edit -->
      <div style="margin:15px 0; padding:10px; background:#f9fafb; border-radius:6px;">
        <div style="font-size:0.85em; color:#6b7280; margin-bottom:8px;">Status</div>
        <select id="order-status-select" style="width:100%; padding:8px; border:1px solid #d1d5db; border-radius:6px; font-weight:600;">
          <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Paid</option>
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          <option value="revision" ${order.status === 'revision' ? 'selected' : ''}>Revision</option>
          <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      
      <div style="margin:15px 0; padding:10px; background:#f9fafb; border-radius:6px;">
        <div style="font-size:0.85em; color:#6b7280;">Date</div>
        <div style="font-weight:600;">${formatDate(order.created_at)}</div>
      </div>
      
      <!-- Action Buttons -->
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
        <button onclick="updateOrderStatus('${order.order_id}')" class="btn btn-primary" style="width:100%;">💾 Save Status</button>
        <a href="/order-detail.html?id=${order.order_id}&admin=1" class="btn" style="width:100%; text-align:center; background:#10b981; color:white;">👁️ Full Details</a>
        <a href="/buyer-order.html?id=${order.order_id}" target="_blank" class="btn" style="width:100%; text-align:center; background:#6366f1; color:white;">👤 Buyer Link</a>
        <button onclick="deleteOrder('${order.order_id}', ${order.id})" class="btn" style="width:100%; background:#ef4444; color:white;">🗑️ Delete Order</button>
      </div>
    `;
  };

  // Update order status
  window.updateOrderStatus = async function(orderId) {
    const statusSelect = document.getElementById('order-status-select');
    if (!statusSelect) return;
    
    const newStatus = statusSelect.value;
    
    try {
      const res = await fetch('/api/order/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      const result = await res.json();
      if (result.success) {
        alert('✅ Order status updated!');
        // Update local data
        const order = orders.find(o => o.order_id === orderId);
        if (order) order.status = newStatus;
        // Reload orders list
        const mainPanel = document.getElementById('main-panel');
        if (mainPanel && currentView === 'orders') loadOrders(mainPanel);
      } else {
        alert('Error: ' + (result.error || 'Update failed'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Delete order
  window.deleteOrder = async function(orderId, id) {
    if (!confirm('Are you sure you want to delete this order? This cannot be undone!')) return;
    
    try {
      const res = await fetch(`/api/order/delete?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        alert('✅ Order deleted!');
        // Clear right panel
        const rightPanel = document.getElementById('right-panel');
        if (rightPanel) {
          rightPanel.innerHTML = '<h3 style="margin-bottom:15px;">Quick Actions</h3><div style="text-align:center;color:#6b7280;padding:40px 0;">Select an item</div>';
        }
        // Reload orders list
        const mainPanel = document.getElementById('main-panel');
        if (mainPanel && currentView === 'orders') loadOrders(mainPanel);
      } else {
        alert('Error: ' + (result.error || 'Delete failed'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.showProductDetail = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const panel = document.getElementById('right-panel');
    // Determine status badge and next status/label
    const statusBadge = product.status === 'draft'
      ? '<span style="background:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:4px;font-size:0.75em;">Draft</span>'
      : '<span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-size:0.75em;">Published</span>';
    const nextStatus = product.status === 'draft' ? 'active' : 'draft';
    const toggleLabel = product.status === 'draft' ? 'Publish' : 'Unpublish';
    panel.innerHTML = `
      <h3 style="display:flex;justify-content:space-between;align-items:center;">
        <a href="/product?id=${product.id}" target="_blank" style="color:#1f2937;text-decoration:underline;">${product.title}</a>
        ${statusBadge}
      </h3>
      <img src="${product.thumbnail_url}" style="width: 100%; border-radius: 8px; margin: 15px 0;">
      <div style="font-size: 1.3em; font-weight: bold; color: #3b82f6; margin-bottom: 15px;">$${product.sale_price || product.normal_price}</div>
      <div style="color: #6b7280; margin-bottom: 15px;">${product.description || ''}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="/admin/product-form.html?id=${product.id}" class="btn btn-primary" style="width: 100%; text-align: center;">Edit Product</a>
        <button class="btn btn-info" onclick="duplicateProduct(${product.id})" style="width:100%;">Duplicate</button>
        <button class="btn btn-warning" onclick="changeProductStatus(${product.id}, '${nextStatus}')" style="width:100%;">${toggleLabel}</button>
      </div>
    `;
  };

  // Duplicate a product by id.  Sends POST to /api/products/duplicate and reloads products.
  window.duplicateProduct = async function(productId) {
    if (!productId) return;
    if (!confirm('Duplicate this product?')) return;
    try {
      const res = await fetch('/api/products/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Product duplicated!');
        // Reload products view
        const panel = document.getElementById('main-panel');
        if (panel) loadProducts(panel);
      } else {
        alert('❌ Failed to duplicate: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Change the status of a product.  Accepts id and new status ('active' or 'draft').
  window.changeProductStatus = async function(productId, status) {
    if (!productId || !status) return;
    const confirmMsg = status === 'active'
      ? 'Publish this product? It will appear in your shop.'
      : 'Unpublish this product? It will be hidden from your shop.';
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch('/api/products/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, status })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Product status updated!');
        const panel = document.getElementById('main-panel');
        if (panel) loadProducts(panel);
        // If the detail panel is showing this product, update it too
        const product = products.find(p => p.id === productId);
        if (product) {
          product.status = status;
          showProductDetail(productId);
        }
      } else {
        alert('❌ Failed to update product status: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  /**
   * Load the components manager into the provided panel element. This
   * function renders tabs for managing Header, Footer, Product Lists, and
   * Review Lists. All data is stored in localStorage and can be used in
   * landing pages.
   *
   * @param {HTMLElement} panel The DOM element to populate
   */
  async function loadComponents(panel) {
    panel.innerHTML = `
      <style>
        .component-tabs {
          display: flex;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 25px;
        }
        .component-tab {
          padding: 12px 20px;
          cursor: pointer;
          border: none;
          background: none;
          border-bottom: 3px solid transparent;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.2s;
        }
        .component-tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }
        .component-tab-content {
          display: none;
        }
        .component-tab-content.active {
          display: block;
        }
        .component-textarea {
          width: 100%;
          min-height: 200px;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #1f2937;
          margin-bottom: 10px;
        }
        .component-list-container {
          margin-top: 20px;
        }
        .component-list-item {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }
        .component-list-item h4 {
          margin: 0 0 8px;
          font-size: 1rem;
          color: #1f2937;
        }
        .component-list-item pre {
          background: #f3f4f6;
          padding: 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          overflow-x: auto;
          color: #374151;
        }
        .component-list-item .actions {
          margin-top: 10px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .component-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .component-modal-content {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        .component-modal-content h3 {
          margin-top: 0;
          margin-bottom: 15px;
        }
        .component-modal-content .item-list {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 15px;
        }
        .component-modal-content .item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        .component-modal-content .item img {
          width: 40px;
          height: 40px;
          object-fit: cover;
          margin-right: 8px;
          border-radius: 4px;
        }
        .component-modal-content .item .title {
          flex: 1;
        }
        .component-modal-content .fields {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 15px;
        }
        .component-modal-content .fields label {
          display: block;
          font-size: 0.85rem;
          margin-bottom: 2px;
        }
        .component-modal-content .fields input,
        .component-modal-content .fields select {
          padding: 5px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          width: 100%;
          min-width: 100px;
        }
        .component-modal-content .options {
          margin-bottom: 10px;
        }
        .component-modal-content .actions {
          text-align: right;
          margin-top: 10px;
        }
        .component-modal-content .actions button {
          margin-left: 8px;
        }
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

        <!-- Header management -->
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

        <!-- Footer management -->
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

        <!-- Product lists management -->
        <div id="product-tab" class="component-tab-content">
          <p>Create reusable product lists that you can embed into your landing pages. Each list is saved in your browser and can be copied into your page builder.</p>
          <button id="create-product-list" class="btn btn-primary" style="margin-bottom:15px;">+ Create Product List</button>
          <div id="product-lists" class="component-list-container"></div>
          <div id="product-preview" style="display:none;"></div>
        </div>

        <!-- Review lists management -->
        <div id="review-tab" class="component-tab-content">
          <p>Create reusable review lists that you can embed into your landing pages.</p>
          <button id="create-review-list" class="btn btn-primary" style="margin-bottom:15px;">+ Create Review List</button>
          <div id="review-lists" class="component-list-container"></div>
          <div id="review-preview" style="display:none;"></div>
        </div>
      </div>
    `;

    // Load product and review widgets dynamically
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
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

    // Tab switching logic
    panel.querySelectorAll('.component-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.component-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-target');
        panel.querySelectorAll('.component-tab-content').forEach(c => c.classList.remove('active'));
        panel.querySelector('#' + target).classList.add('active');
      });
    });

    // Load existing header/footer from localStorage
    function loadHeaderFooter() {
      const header = localStorage.getItem('defaultHeader') || '';
      panel.querySelector('#header-editor').value = header;
      const footer = localStorage.getItem('defaultFooter') || '';
      panel.querySelector('#footer-editor').value = footer;
    }
    loadHeaderFooter();

    // Save header
    panel.querySelector('#save-header').addEventListener('click', () => {
      const code = panel.querySelector('#header-editor').value.trim();
      if (!code) {
        alert('Header HTML cannot be empty.');
        return;
      }
      localStorage.setItem('defaultHeader', code);
      alert('✅ Default header saved! It will be used in future pages.');
    });

    // Clear header
    panel.querySelector('#clear-header').addEventListener('click', () => {
      if (confirm('Delete the saved default header?')) {
        localStorage.removeItem('defaultHeader');
        panel.querySelector('#header-editor').value = '';
        alert('Default header cleared.');
      }
    });

    // Preview header
    panel.querySelector('#preview-header').addEventListener('click', () => {
      const previewEl = panel.querySelector('#header-preview');
      const code = panel.querySelector('#header-editor').value.trim();
      if (!code) { alert('No header to preview.'); return; }
      previewEl.style.display = 'block';
      previewEl.innerHTML = code;
    });

    // Save footer
    panel.querySelector('#save-footer').addEventListener('click', () => {
      const code = panel.querySelector('#footer-editor').value.trim();
      if (!code) {
        alert('Footer HTML cannot be empty.');
        return;
      }
      localStorage.setItem('defaultFooter', code);
      alert('✅ Default footer saved!');
    });

    // Clear footer
    panel.querySelector('#clear-footer').addEventListener('click', () => {
      if (confirm('Delete the saved default footer?')) {
        localStorage.removeItem('defaultFooter');
        panel.querySelector('#footer-editor').value = '';
        alert('Default footer cleared.');
      }
    });

    // Preview footer
    panel.querySelector('#preview-footer').addEventListener('click', () => {
      const previewEl = panel.querySelector('#footer-preview');
      const code = panel.querySelector('#footer-editor').value.trim();
      if (!code) { alert('No footer to preview.'); return; }
      previewEl.style.display = 'block';
      previewEl.innerHTML = code;
    });

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

    // Open modal for creating/editing product list
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
        <div style="flex:1;min-width:120px;">
          <label>Filter</label>
          <select id="prod-filter">
            <option value="all">All</option>
            <option value="featured">Featured</option>
            <option value="top-sales">Top Sales</option>
          </select>
        </div>
        <div style="flex:1;min-width:120px;">
          <label>Number to show</label>
          <input type="number" id="prod-limit" min="1" value="6">
        </div>
        <div style="flex:1;min-width:120px;">
          <label>Columns</label>
          <input type="number" id="prod-cols" min="1" max="4" value="3">
        </div>
      `;
      modal.appendChild(fieldsDiv);

      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'options';
      optionsDiv.innerHTML = `
        <label><input type="checkbox" id="prod-show-reviews" checked> Show ratings</label>
        <label style="margin-left:20px;"><input type="checkbox" id="prod-show-delivery" checked> Show delivery info</label>
      `;
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
      } catch (e) {
        console.error('Failed to load products:', e);
      }

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
            if (existing.options.ids.map(x => Number(x)).includes(Number(p.id))) {
              checkbox.checked = true;
            }
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
        const selected = Array.from(listDiv.querySelectorAll('input[type="checkbox"]'))
          .filter(cb => cb.checked)
          .map(cb => Number(cb.dataset.id));
        const filter = document.getElementById('prod-filter').value || 'all';
        const limit = parseInt(document.getElementById('prod-limit').value, 10) || 6;
        const columns = parseInt(document.getElementById('prod-cols').value, 10) || 3;
        const showReviews = document.getElementById('prod-show-reviews').checked;
        const showDelivery = document.getElementById('prod-show-delivery').checked;
        const options = {
          filter: filter,
          limit: limit,
          columns: columns,
          ids: selected,
          showReviews: showReviews,
          showDelivery: showDelivery
        };
        const lists = JSON.parse(localStorage.getItem('savedProductLists') || '[]');
        if (existing && index !== null && index >= 0) {
          lists[index] = { id: existing.id, options };
        } else {
          const id = 'product-list-' + Date.now();
          lists.push({ id, options });
        }
        localStorage.setItem('savedProductLists', JSON.stringify(lists));
        overlay.remove();
        renderProductLists();
      });
    }

    // Open modal for creating/editing review list
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
        <div style="flex:1;min-width:120px;">
          <label>Filter by rating</label>
          <select id="review-rating">
            <option value="">All</option>
            <option value="5">5★</option>
            <option value="4">4★</option>
            <option value="3">3★</option>
            <option value="2">2★</option>
            <option value="1">1★</option>
          </select>
        </div>
        <div style="flex:1;min-width:120px;">
          <label>Number to show</label>
          <input type="number" id="review-limit" min="1" value="6">
        </div>
        <div style="flex:1;min-width:120px;">
          <label>Columns</label>
          <input type="number" id="review-cols" min="1" max="4" value="2">
        </div>
      `;
      modal.appendChild(fieldsDiv);

      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'options';
      optionsDiv.innerHTML = `
        <label><input type="checkbox" id="review-show-avatar" checked> Show reviewer avatars</label>
      `;
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
      } catch (e) {
        console.error('Failed to load reviews:', e);
      }

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
            if (existing.options.ids.map(x => Number(x)).includes(Number(r.id))) {
              checkbox.checked = true;
            }
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
        if (existing.options.rating) {
          document.getElementById('review-rating').value = existing.options.rating.toString();
        } else {
          document.getElementById('review-rating').value = '';
        }
        document.getElementById('review-limit').value = existing.options.limit || 6;
        document.getElementById('review-cols').value = existing.options.columns || 2;
        document.getElementById('review-show-avatar').checked = !!existing.options.showAvatar;
      }

      cancelBtn.addEventListener('click', () => overlay.remove());

      saveBtn.addEventListener('click', () => {
        const selected = Array.from(listDiv.querySelectorAll('input[type="checkbox"]'))
          .filter(cb => cb.checked)
          .map(cb => Number(cb.dataset.id));
        const ratingVal = document.getElementById('review-rating').value;
        const limit = parseInt(document.getElementById('review-limit').value, 10) || 6;
        const columns = parseInt(document.getElementById('review-cols').value, 10) || 2;
        const showAvatar = document.getElementById('review-show-avatar').checked;
        const options = {
          productIds: [],
          ids: selected,
          rating: ratingVal ? parseInt(ratingVal, 10) : null,
          limit: limit,
          columns: columns,
          showAvatar: showAvatar
        };
        const lists = JSON.parse(localStorage.getItem('savedReviewLists') || '[]');
        if (existing && index !== null && index >= 0) {
          lists[index] = { id: existing.id, options };
        } else {
          const id = 'reviews-list-' + Date.now();
          lists.push({ id, options });
        }
        localStorage.setItem('savedReviewLists', JSON.stringify(lists));
        overlay.remove();
        renderReviewLists();
      });
    }

    // Render saved product lists
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
      } catch (e) {
        console.warn('Could not load products for list display', e);
      }

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
          try {
            if (window.ProductCards) {
              window.ProductCards.render(item.id, item.options);
            }
          } catch (e) {
            preview.textContent = 'Error rendering preview';
          }
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => openProductModal(item, index));

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-secondary';
        copyBtn.textContent = 'Copy Embed Code';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(buildProductEmbed(item.id, item.options)).then(() => {
            alert('Embed code copied to clipboard!');
          });
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

    // Render saved review lists
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

        let reviewSnippets = '';
        if (item.options && Array.isArray(item.options.ids) && item.options.ids.length > 0) {
          try {
            const params = new URLSearchParams();
            params.set('ids', item.options.ids.join(','));
            const res = await fetch('/api/reviews?' + params.toString());
            const data = await res.json();
            const revs = data.reviews || [];
            const parts = revs.map(r => {
              const text = r.comment || r.comment_text || '';
              const snippet = text ? text.slice(0, 30) + (text.length > 30 ? '…' : '') : '';
              const rating = r.rating || '';
              return `${rating}★ ${snippet}`;
            });
            if (parts.length) {
              reviewSnippets = `<small style="color:#6b7280;">Reviews: ${parts.slice(0,5).join(', ')}${parts.length>5?'…':''}</small>`;
            }
            } catch (e) {
            console.warn('Could not load review snippets', e);
            }
            }

            div.innerHTML = `<h4>Review List #${index + 1}</h4>${reviewSnippets}<pre>${buildReviewEmbed(item.id, item.options)}</pre>`;

            const actions = document.createElement('div');
            actions.className = 'actions';

        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn btn-secondary';
        previewBtn.textContent = 'Preview';
        previewBtn.addEventListener('click', () => {
          const preview = panel.querySelector('#review-preview');
          preview.style.display = 'block';
          preview.innerHTML = `<div id="${item.id}"></div>`;
          try {
            if (window.ReviewsWidget) {
              window.ReviewsWidget.render(item.id, item.options);
            }
          } catch (e) {
            preview.textContent = 'Error rendering preview';
          }
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => openReviewModal(item, index));

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-secondary';
        copyBtn.textContent = 'Copy Embed Code';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(buildReviewEmbed(item.id, item.options)).then(() => {
            alert('Embed code copied to clipboard!');
          });
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

    // Initialize lists
    renderProductLists();
    renderReviewLists();
  }

  // ------------------------------
  // Chats (Admin support inbox)
  // ------------------------------
  async function loadChats(panel) {
    panel.innerHTML = `
      <div style="display:flex; gap:12px; height:calc(100vh - 170px); min-height:520px;">
        <div id="chats-sessions" style="width:320px; border:1px solid #e6e6e6; border-radius:12px; overflow:auto; background:#fff;">
          <div style="padding:10px 12px; border-bottom:1px solid #eee; font-weight:700;">Chats</div>
          <div id="chats-sessions-list"></div>
        </div>

        <div style="flex:1; border:1px solid #e6e6e6; border-radius:12px; overflow:hidden; background:#fff; display:flex; flex-direction:column;">
          <div id="chats-header" style="padding:10px 12px; border-bottom:1px solid #eee; font-weight:700;">Select a chat</div>
          <div id="chats-messages" style="flex:1; overflow:auto; padding:12px; background:#fafafa;"></div>
          <div style="display:flex; gap:10px; padding:10px 12px; border-top:1px solid #eee;">
            <input id="chats-input" placeholder="Type your reply…" style="flex:1; border:1px solid #ddd; border-radius:10px; padding:10px; font:14px system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial;" />
            <button id="chats-send" style="background:#111; color:#fff; border:0; border-radius:10px; padding:10px 14px; cursor:pointer; font-weight:700;">Send</button>
          </div>
        </div>
      </div>
    `;

    const sessionsListEl = panel.querySelector('#chats-sessions-list');
    const headerEl = panel.querySelector('#chats-header');
    const messagesEl = panel.querySelector('#chats-messages');
    const inputEl = panel.querySelector('#chats-input');
    const sendBtn = panel.querySelector('#chats-send');

    let activeSessionId = null;
    let lastId = 0;

    function escapeHtml(str) {
      return String(str || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function renderBubble(msg) {
      const mine = msg.role === 'admin';
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.margin = '8px 0';
      wrap.style.justifyContent = mine ? 'flex-end' : 'flex-start';

      const bubble = document.createElement('div');
      bubble.style.maxWidth = '78%';
      bubble.style.padding = '10px 12px';
      bubble.style.borderRadius = '12px';
      bubble.style.whiteSpace = 'pre-wrap';
      bubble.style.wordBreak = 'break-word';

      if (mine) {
        bubble.style.background = '#111';
        bubble.style.color = '#fff';
        bubble.style.borderBottomRightRadius = '4px';
      } else {
        bubble.style.background = '#fff';
        bubble.style.border = '1px solid #e6e6e6';
        bubble.style.borderBottomLeftRadius = '4px';
      }

      const meta = document.createElement('div');
      meta.style.fontSize = '11px';
      meta.style.opacity = '0.7';
      meta.style.marginTop = '6px';
      meta.textContent = new Date(msg.created_at || Date.now()).toLocaleString();

      bubble.innerHTML = `${escapeHtml(msg.content || '')}`;
      bubble.appendChild(meta);

      wrap.appendChild(bubble);
      return wrap;
    }

    async function refreshSessions() {
      const data = await apiFetch('/api/admin/chats/sessions');
      const sessions = data.sessions || [];

      sessionsListEl.innerHTML = '';
      if (!sessions.length) {
        sessionsListEl.innerHTML = '<div style="padding:12px; opacity:.7;">No chats yet.</div>';
        return;
      }

      for (const s of sessions) {
        const item = document.createElement('div');
        item.style.padding = '10px 12px';
        item.style.borderBottom = '1px solid #f0f0f0';
        item.style.cursor = 'pointer';
        item.dataset.sessionId = s.id;

        if (s.id === activeSessionId) {
          item.style.background = '#f7f7f7';
        }

        const title = document.createElement('div');
        title.style.fontWeight = '700';
        title.textContent = s.name ? `${s.name}` : s.email || s.id;

        const sub = document.createElement('div');
        sub.style.fontSize = '12px';
        sub.style.opacity = '0.75';
        sub.textContent = s.email || '';

        const preview = document.createElement('div');
        preview.style.fontSize = '12px';
        preview.style.opacity = '0.7';
        preview.style.marginTop = '6px';
        preview.textContent = (s.last_message || '').slice(0, 60);

        item.appendChild(title);
        item.appendChild(sub);
        if (s.last_message) item.appendChild(preview);

        item.addEventListener('click', async () => {
          activeSessionId = s.id;
          lastId = 0;
          headerEl.textContent = `${s.name || 'Customer'} • ${s.email || ''}`.trim();
          messagesEl.innerHTML = '';
          await syncMessages(true);
          await refreshSessions();
        });

        sessionsListEl.appendChild(item);
      }
    }

    async function syncMessages(forceScroll) {
      if (!activeSessionId) return;
      const data = await apiFetch(`/api/chat/sync?sessionId=${encodeURIComponent(activeSessionId)}&sinceId=${encodeURIComponent(String(lastId || 0))}`);
      const msgs = data.messages || [];
      for (const m of msgs) {
        messagesEl.appendChild(renderBubble(m));
      }
      if (msgs.length) {
        lastId = Number(data.lastId || msgs[msgs.length - 1].id) || lastId;
        if (forceScroll) messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    }

    async function sendReply() {
      const text = (inputEl.value || '').trim();
      if (!text) return;
      if (!activeSessionId) return alert('Select a chat first.');

      sendBtn.disabled = true;
      try {
        await apiFetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSessionId, role: 'admin', content: text })
        });
        inputEl.value = '';
        await syncMessages(true);
        await refreshSessions();
      } finally {
        sendBtn.disabled = false;
      }
    }

    sendBtn.addEventListener('click', sendReply);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendReply();
      }
    });

    await refreshSessions();

    // Poll sessions and active thread
    window.__chatPollTimer = setInterval(async () => {
      try {
        await refreshSessions();
        await syncMessages(false);
      } catch (e) {
        // ignore polling errors
      }
    }, 5000);
  }

})();
