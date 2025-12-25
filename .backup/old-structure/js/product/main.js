/*
 * Entry point for the product page.  This script orchestrates
 * fetching product data from the API, updating SEO tags, constructing
 * the page layout and wiring up the price/checkout logic.  It relies
 * on helper functions defined in the product submodules (seo-utils.js,
 * addon-ui.js, layout-main.js, layout-extra.js and checkout.js).
 */

;(function(){
  window.basePrice = 0;
  window.currentTotal = 0;
  window.productData = null;
  async function initProductPage() {
    // Load global Whop settings early so checkout can use them.  The
    // settings include theme, default plan ID and price map.
    try {
      const whopResp = await (typeof window.getWhopSettings === 'function' ? window.getWhopSettings() : Promise.resolve(null));
      window.whopSettings = whopResp && whopResp.settings ? whopResp.settings : {};
    } catch (e) {
      console.warn('Unable to load Whop settings:', e);
      window.whopSettings = {};
    }
    const params = new URLSearchParams(location.search);
    let productId = params.get('id');
    // Canonical URLs are /product-<id>/<slug>. If the worker forgets to
    // inject ?id=, we can still recover the numeric id from the path.
    if (!productId) {
      const m = (location.pathname || '').match(/^\/product-(\d+)\//);
      if (m && m[1]) {
        productId = m[1];
      }
    }
    const container = document.getElementById('product-container');
    if (!container) return;
    if (!productId) {
      console.error(' No product ID found');
      container.innerHTML = '<div class="loading-state"><p>Product link is invalid.</p><a href="/" class="btn">Go Home</a></div>';
      return;
    }
    try {
      const data = await getProduct(productId);
      const product = data.product;
      const addons = data.addons;
      if (!product) {
        console.error(' Product not found in response');
        container.innerHTML = '<div class="loading-state"><p>Product not found.</p><a href="/" class="btn">Go Home</a></div>';
        return;
      }
      window.productData = product;
      const sale = product.sale_price && parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : null;
      window.basePrice = sale !== null ? sale : parseFloat(product.normal_price || 0);
      window.currentTotal = window.basePrice;
      if (typeof updateSEO === 'function') updateSEO(product);
      const result = window.renderProductMain(container, product, addons);
      window.renderProductDescription(result.wrapper, product);
      if (typeof updateTotal === 'function') updateTotal();
      window.initializePlayer(result.hasVideo);
    } catch (err) {
      console.error(' Error loading product:', err);
      container.innerHTML = '<div class="loading-state"><p>Error loading product.</p><a href="/" class="btn">Go Home</a></div>';
    }
  }
  document.addEventListener('DOMContentLoaded', initProductPage);
})();

