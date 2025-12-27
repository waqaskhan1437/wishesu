/**
 * Dashboard Products - Product management
 */

(function(AD) {
  AD.loadProducts = async function(panel) {
    panel.innerHTML = `
      <button class="btn btn-primary" onclick="window.location.href='/admin/product-form.html'" style="margin-bottom: 20px;">+ Add Product</button>
      <div id="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;"></div>`;
    
    try {
      const data = await AD.apiFetch('/api/products/list');
      if (data.products) {
        AD.products = data.products;
        document.getElementById('products-grid').innerHTML = AD.products.map(p => `
          <div class="product-card" onclick="showProductDetail(${p.id})" style="cursor:pointer;">
            <img src="${p.thumbnail_url || 'https://via.placeholder.com/300x180'}" class="product-thumb">
            <div class="product-info">
              <div class="product-title">${p.title}</div>
              <div class="product-price">$${p.sale_price || p.normal_price}</div>
              <div class="product-meta">
                <span>⏱️ ${p.normal_delivery_text || '60 min'}</span>
              </div>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Products error:', err);
    }
  };

  // Show product detail
  window.showProductDetail = function(id) {
    window.location.href = `/admin/product-form.html?id=${id}`;
  };

  console.log('✅ Dashboard Products loaded');
})(window.AdminDashboard);
