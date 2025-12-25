(async function() {
  let orders = [];
  loadOrders();

  async function loadOrders() {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok && data.orders) {
        orders = data.orders;
        displayOrders(orders);
      } else throw new Error(data.error || 'Failed');
    } catch (err) {
      document.getElementById('orders-list').innerHTML = '<p style="color: red;">Error: ' + err.message + '</p>';
    }
  }

  function displayOrders(list) {
    const container = document.getElementById('orders-list');
    if (list.length === 0) {
      container.innerHTML = '<p style="text-align: center;">No orders</p>';
      return;
    }
    container.innerHTML = list.map(order => createCard(order)).join('');
    attachEvents();
  }

  function createCard(o) {
    const statusClass = o.status === 'delivered' ? 'status-delivered' : o.revision_requested ? 'status-revision' : 'status-PAID';
    return `
      <div class="order-card" data-order-id="${o.order_id}">
        <div class="order-header">
          <div>
            <div class="order-id">Order #${o.order_id}</div>
            <div style="color: #6b7280; margin-top: 5px;">${new Date(o.created_at).toLocaleString()}</div>
          </div>
          <div>
            <span class="order-status ${statusClass}">${o.status}</span>
            ${getCountdown(o)}
          </div>
        </div>
        <div class="order-details">
          <div class="detail-box"><div class="detail-label">Email</div><div class="detail-value">${o.email || 'N/A'}</div></div>
          <div class="detail-box"><div class="detail-label">Amount</div><div class="detail-value">$${o.amount || 0}</div></div>
          <div class="detail-box"><div class="detail-label">Delivery Time</div><div class="detail-value">${o.delivery_time_minutes || 60} min</div></div>
        </div>
        ${renderAddons(o)}
        ${renderDelivery(o)}
        ${renderDelivered(o)}
        <div style="margin-top: 15px;">
          ${o.status !== 'delivered' ? '<button class="btn btn-primary deliver-btn">📦 Deliver</button>' : ''}
          <button class="btn btn-secondary copy-btn">🔗 Copy Link</button>
          <button class="btn btn-danger delete-btn">🗑️ Delete</button>
        </div>
      </div>
    `;
  }

  function getCountdown(o) {
    if (o.status === 'delivered') return '';
    const created = new Date(o.created_at).getTime();
    const delivery = created + (o.delivery_time_minutes || 60) * 60 * 1000;
    const remaining = delivery - Date.now();
    if (remaining <= 0) return '<span class="countdown-badge" style="background: #ef4444;">⏰ Overdue</span>';
    const mins = Math.floor(remaining / 60000);
    return `<span class="countdown-badge">${mins} min</span>`;
  }

  function renderAddons(o) {
    if (!o.addons || o.addons.length === 0) return '';
    const html = o.addons.filter(a => a.field !== '_temp_session').map(a => {
      let val = a.value || '';
      if (val.includes('[TEMP_FILE]') || val.includes('[PHOTO LINK]')) {
        const url = val.split(']:')[1]?.trim();
        if (url) return `<div class="addon-item"><span class="addon-label">${a.field}:</span> <a href="${url}" target="_blank">View Photo</a></div>`;
      }
      return `<div class="addon-item"><span class="addon-label">${a.field}:</span> ${val}</div>`;
    }).join('');
    return `<div class="addons-list"><h4 style="margin-top: 0;">📝 Requirements:</h4>${html}</div>`;
  }

  function renderDelivery(o) {
    if (o.status === 'delivered') return '';
    return `
      <div class="delivery-section" id="delivery-${o.order_id}">
        <h4>📤 Deliver Video</h4>
        <div class="form-group"><label>Video URL:</label><input type="text" class="delivery-url" placeholder="https://..."></div>
        <div class="form-group"><label>OR Upload:</label><input type="file" class="delivery-file" accept="video/*"></div>
        <div class="form-group"><label>Thumbnail (optional):</label><input type="text" class="thumbnail-url"></div>
        <button class="btn btn-primary submit-delivery-btn">✅ Submit</button>
        <button class="btn btn-secondary cancel-delivery-btn">❌ Cancel</button>
      </div>
    `;
  }

  function renderDelivered(o) {
    if (!o.delivered_video_url) return '';
    return `<div class="delivered-video"><video controls><source src="${o.delivered_video_url}"></video></div>`;
  }

  function attachEvents() {
    document.querySelectorAll('.deliver-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const card = this.closest('.order-card');
        const id = card.dataset.orderId;
        card.querySelector(`#delivery-${id}`).style.display = 'block';
        this.style.display = 'none';
      });
    });

    document.querySelectorAll('.submit-delivery-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const card = this.closest('.order-card');
        submitDelivery(card.dataset.orderId, card);
      });
    });

    document.querySelectorAll('.cancel-delivery-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const card = this.closest('.order-card');
        const id = card.dataset.orderId;
        card.querySelector(`#delivery-${id}`).style.display = 'none';
        card.querySelector('.deliver-btn').style.display = 'inline-block';
      });
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.closest('.order-card').dataset.orderId;
        const link = window.location.origin + '/buyer-order.html?id=' + id;
        navigator.clipboard.writeText(link);
        alert('✅ Link copied:\n' + link);
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.closest('.order-card').dataset.orderId;
        if (confirm('Delete order #' + id + '?')) {
          const order = orders.find(o => o.order_id === id);
          fetch(`/api/order/delete?id=${order.id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(d => { if (d.success) { alert('✅ Deleted'); loadOrders(); } else alert('Error'); })
            .catch(e => alert('Error: ' + e.message));
        }
      });
    });
  }

  async function submitDelivery(orderId, card) {
    const url = card.querySelector('.delivery-url').value.trim();
    const file = card.querySelector('.delivery-file').files[0];
    const thumb = card.querySelector('.thumbnail-url').value.trim();

    if (!url && !file) { alert('Provide URL or file'); return; }

    let videoUrl = url;
    if (file) {
      try {
        const itemId = 'delivery_' + orderId + '_' + Date.now();
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uploadUrl = `/api/upload/customer-file?itemId=${itemId}&filename=${encodeURIComponent(filename)}&originalFilename=${encodeURIComponent(file.name)}&orderId=${encodeURIComponent(orderId)}`;
        const res = await fetch(uploadUrl, { method: 'POST', body: file });
        const data = await res.json();
        if (res.ok && data.url) videoUrl = data.url;
        else throw new Error(data.error || 'Upload failed');
      } catch (err) {
        alert('Upload failed: ' + err.message);
        return;
      }
    }

    try {
      const res = await fetch('/api/order/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, videoUrl, thumbnailUrl: thumb })
      });
      const data = await res.json();
      if (res.ok && data.success) { alert('✅ Delivered!'); loadOrders(); }
      else throw new Error(data.error || 'Failed');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // Manual refresh only - NO AUTO-RELOAD
  window.loadOrders = loadOrders;
})();
