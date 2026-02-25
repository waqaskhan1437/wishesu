/*
 * Entry point for the product page.  This script orchestrates
 * fetching product data from the API, updating SEO tags, constructing
 * the page layout and wiring up the price/checkout logic.  It relies
 * on helper functions defined in the product submodules (seo-utils.js,
 * addon-ui.js, layout-main.js, layout-extra.js and checkout.js).
 */

;(function(){
  if (window.__productPageInitBound) return;
  window.__productPageInitBound = true;

  window.basePrice = 0;
  window.currentTotal = 0;
  window.productData = null;

  function readProductBootstrap(expectedId) {
    const el = document.getElementById('product-bootstrap');
    if (!el) return null;
    try {
      const data = JSON.parse(el.textContent || '{}');
      const bootId = data && data.product ? data.product.id : null;
      if (expectedId && bootId != null && String(bootId) !== String(expectedId)) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  async function initProductPage() {
    if (window.__productPageInitialized || window.__productPageInitInProgress) return;
    window.__productPageInitInProgress = true;

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
      container.innerHTML = '<div class="loading-state"><p>Product link is invalid.</p><a href="/" class="btn">Go Home</a></div>';
      return;
    }

    const boot = readProductBootstrap(productId);

    // Step 8: prefer server-embedded Whop settings to avoid extra API call on product page.
    if (boot && boot.whopSettings && typeof boot.whopSettings === 'object') {
      window.whopSettings = boot.whopSettings;
    } else {
      try {
        const whopResp = await (typeof window.getWhopSettings === 'function' ? window.getWhopSettings() : Promise.resolve(null));
        window.whopSettings = whopResp && whopResp.settings ? whopResp.settings : {};
      } catch (e) {
        window.whopSettings = {};
      }
    }

    try {
      const data = boot || await getProduct(productId);
      const product = data.product;
      const addons = data.addons || product?.addons || [];
      if (!product) {
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
      window.__productPageInitialized = true;
    } catch (err) {
      window.__productPageInitialized = false;
      container.innerHTML = '<div class="loading-state"><p>Error loading product.</p><a href="/" class="btn">Go Home</a></div>';
    } finally {
      window.__productPageInitInProgress = false;
    }
  }
  document.addEventListener('DOMContentLoaded', initProductPage);
})();
