/*
 * Entry point for the product page.  This script orchestrates
 * fetching product data from the API, updating SEO tags, constructing
 * the page layout and wiring up the price/checkout logic.  It relies
 * on helper functions defined in the product submodules (seo-utils.js,
 * addon-ui.js, layout-main.js, layout-extra.js and checkout.js).
 */

;(function(){
  console.log('🔵 Product main.js loaded');
  window.basePrice = 0;
  window.currentTotal = 0;
  window.productData = null;
  async function initProductPage() {
    console.log('🔵 initProductPage started');
    console.log('🔵 Path:', location.pathname);
    // Load global Whop settings early so checkout can use them.  The
    // settings include theme, default plan ID and price map.
    try {
      const whopResp = await (typeof window.getWhopSettings === 'function' ? window.getWhopSettings() : Promise.resolve(null));
      window.whopSettings = whopResp && whopResp.settings ? whopResp.settings : {};
      console.log('🔵 Whop settings loaded');
    } catch (e) {
      console.warn('Unable to load Whop settings:', e);
      window.whopSettings = {};
    }
    const params = new URLSearchParams(location.search);
    let productId = params.get('id');
    console.log('🔵 Product ID from query:', productId);
    // Canonical URLs are /product-<id>/<slug>. If the worker forgets to
    // inject ?id=, we can still recover the numeric id from the path.
    if (!productId) {
      const m = (location.pathname || '').match(/^\/product-(\d+)\//);
      if (m && m[1]) {
        productId = m[1];
        console.log('🔵 Product ID from path:', productId);
      }
    }
    const container = document.getElementById('product-container');
    console.log('🔵 Container found:', !!container);
    if (!container) return;
    if (!productId) {
      console.error('🔴 No product ID found');
      container.innerHTML = '<div class="loading-state"><p>Product link is invalid.</p><a href="/" class="btn">Go Home</a></div>';
      return;
    }
    try {
      console.log('🔵 Fetching product:', productId);
      const data = await getProduct(productId);
      console.log('🔵 API response:', data);
      const product = data.product;
      const addons = data.addons;
      if (!product) {
        console.error('🔴 Product not found in response');
        container.innerHTML = '<div class="loading-state"><p>Product not found.</p><a href="/" class="btn">Go Home</a></div>';
        return;
      }
      console.log('🔵 Product loaded:', product.title);
      console.log('🔵 Addons count:', addons ? addons.length : 0);
      window.productData = product;
      const sale = product.sale_price && parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : null;
      window.basePrice = sale !== null ? sale : parseFloat(product.normal_price || 0);
      window.currentTotal = window.basePrice;
      console.log('🔵 Base price:', window.basePrice);
      if (typeof updateSEO === 'function') updateSEO(product);
      console.log('🔵 Rendering product main...');
      console.log('🔵 renderProductMain exists:', typeof window.renderProductMain);
      const result = window.renderProductMain(container, product, addons);
      console.log('🔵 Rendering description...');
      window.renderProductDescription(result.wrapper, product);
      if (typeof updateTotal === 'function') updateTotal();
      window.initializePlayer(result.hasVideo);
      console.log('✅ Product page loaded successfully');
    } catch (err) {
      console.error('🔴 Error loading product:', err);
      container.innerHTML = '<div class="loading-state"><p>Error loading product.</p><a href="/" class="btn">Go Home</a></div>';
    }
  }
  document.addEventListener('DOMContentLoaded', initProductPage);
})();
