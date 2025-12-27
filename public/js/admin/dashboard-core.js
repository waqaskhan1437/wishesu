/**
 * Dashboard Core - Shared state, utilities, and initialization
 * All modules share state via window.AdminDashboard namespace
 */

window.AdminDashboard = window.AdminDashboard || {};

(function(AD) {
  // Shared state
  AD.currentView = 'dashboard';
  AD.orders = [];
  AD.products = [];
  AD.reviews = [];
  AD.VERSION = Date.now();

  // Format date properly
  AD.formatDate = function(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // API fetch with cache busting
  AD.apiFetch = async function(url, options = {}) {
    const sep = url.includes('?') ? '&' : '?';
    const fetchUrl = url + sep + '_t=' + AD.VERSION;
    const res = await fetch(fetchUrl, options);
    return res.json();
  };

  // Countdown helper for orders
  AD.getCountdown = function(o) {
    if (o.status === 'delivered') return '<span style="color:#10b981">✅ Delivered</span>';
    if (o.status === 'cancelled') return '<span style="color:#ef4444">❌ Cancelled</span>';
    
    const created = new Date(o.created_at);
    if (isNaN(created.getTime())) return 'N/A';
    
    const deliveryMins = parseInt(o.delivery_time) || 60;
    const deadline = new Date(created.getTime() + deliveryMins * 60000);
    const now = new Date();
    const diff = deadline - now;
    
    if (diff <= 0) return '<span style="color:#ef4444;font-weight:700">⏰ OVERDUE</span>';
    
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) {
      return `<span style="color:#f59e0b">${hours}h ${mins}m</span>`;
    }
    return `<span style="color:${mins < 15 ? '#ef4444' : '#f59e0b'}">${mins}m</span>`;
  };

  // Initialize dashboard
  AD.init = function() {
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
          AD.currentView = this.dataset.view;
          AD.loadView(AD.currentView);
        });
      });
      AD.loadView('dashboard');
    } catch (err) {
      console.error('Init error:', err);
    }
  };

  // Main view router
  AD.loadView = async function(view) {
    document.getElementById('page-title').textContent = view.charAt(0).toUpperCase() + view.slice(1);
    const panel = document.getElementById('main-panel');
    
    switch(view) {
      case 'dashboard': 
        if (AD.loadDashboard) await AD.loadDashboard(panel); 
        break;
      case 'orders': 
        if (AD.loadOrders) await AD.loadOrders(panel); 
        break;
      case 'products': 
        if (AD.loadProducts) await AD.loadProducts(panel); 
        break;
      case 'reviews': 
        if (AD.loadReviews) await AD.loadReviews(panel); 
        break;
      case 'chats': 
        if (AD.loadChats) await AD.loadChats(panel); 
        break;
      case 'settings': 
        if (AD.loadSettings) AD.loadSettings(panel); 
        break;
      case 'pages':
        if (AD.loadPages) await AD.loadPages(panel);
        break;
      case 'components':
        if (AD.loadComponents) await AD.loadComponents(panel);
        break;
    }
  };

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', AD.init);
  } else {
    AD.init();
  }

  console.log('✅ Dashboard Core loaded');
})(window.AdminDashboard);
