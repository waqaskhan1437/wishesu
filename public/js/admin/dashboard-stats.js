/**
 * Dashboard Stats - Main dashboard statistics view
 */

(function(AD) {
  AD.loadDashboard = 
// Stats cache
let statsCache = null;
let statsCacheTime = 0;
const STATS_CACHE_TTL = 60000; // 1 minute

async function loadStats(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && statsCache && (now - statsCacheTime) < STATS_CACHE_TTL) {
    return statsCache;
  }
  
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    statsCache = data;
    statsCacheTime = now;
    return statsCache;
  } catch (e) {
    console.error('Load stats error:', e);
    return statsCache || {};
  }
}

async function(panel) {
    panel.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" id="total-orders">0</div>
          <div class="stat-label">Total Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="pending-orders">0</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="total-revenue">$0</div>
          <div class="stat-label">Revenue</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="total-products">0</div>
          <div class="stat-label">Products</div>
        </div>
      </div>
      <div class="table-container">
        <h3 style="padding: 20px; margin: 0;">Recent Orders</h3>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="recent-orders">
            <tr><td colspan="5" style="text-align: center;">Loading...</td></tr>
          </tbody>
        </table>
      </div>`;

    try {
      const data = await AD.apiFetch('/api/orders');
      if (data.orders) {
        AD.orders = data.orders;
        document.getElementById('total-orders').textContent = AD.orders.length;
        document.getElementById('pending-orders').textContent = AD.orders.filter(o => o.status !== 'delivered').length;
        const revenue = AD.orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
        document.getElementById('total-revenue').textContent = '$' + revenue.toFixed(2);
        
        const recent = AD.orders.slice(0, 10);
        document.getElementById('recent-orders').innerHTML = recent.map(o => `
          <tr onclick="window.location.href='/order-detail.html?id=${o.order_id}&admin=1'" style="cursor:pointer;">
            <td><strong>#${o.order_id}</strong></td>
            <td>${o.email || 'N/A'}</td>
            <td>$${o.amount || 0}</td>
            <td><span class="status-${o.status}">${o.status}</span></td>
            <td>${AD.formatDate(o.created_at)}</td>
          </tr>
        `).join('');
      }

      const pdata = await AD.apiFetch('/api/products');
      if (pdata.products) {
        document.getElementById('total-products').textContent = pdata.products.length;
      }
    } catch (err) {
      console.error('Dashboard error:', err);
    }
  };

  console.log('✅ Dashboard Stats loaded');
})(window.AdminDashboard);
