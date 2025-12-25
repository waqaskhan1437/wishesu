/**
 * Product Cards System
 * Beautiful product cards that can be embedded anywhere
 * Landing pages, home, featured lists
 */

import { renderCard } from './modules/card-renderer.js';
import { addStyles } from './modules/card-styles.js';

(function() {
  window.ProductCards = {
    /**
     * Render product cards in a container
     */
    render: async function(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('Container not found:', containerId);
        return;
      }

      const {
        filter = 'all',        // 'all', 'featured', 'top-sales'
        limit = 9,             // How many products
        columns = 3,           // Cards per row
        ids = [],              // array of product IDs or slugs to include (optional)
        showReviews = true,    // show rating stars and count
        showDelivery = true,   // show delivery information
        showButton = true      // show "Book Now" button
      } = options;

      // Fetch products
      let products = [];
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        products = data.products || [];

        // Apply filters
        if (filter === 'featured') {
          products = products.filter(p => p.featured);
        } else if (filter === 'top-sales') {
          products = products.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        }

        // If specific ids provided, filter by them (id or slug)
        if (ids && Array.isArray(ids) && ids.length > 0) {
          const idSet = new Set(ids.map(x => String(x)));
          products = products.filter(p => idSet.has(String(p.id)) || idSet.has(String(p.slug)));
        }

        // Limit
        products = products.slice(0, limit);

        if (!products || products.length === 0) {
          container.innerHTML = '<p style="text-align:center;padding:40px 20px;color:#6b7280;font-size:1.1rem;">No products found.</p>';
          return;
        }

      } catch (err) {
        console.error('Failed to load products:', err);
        container.innerHTML = '<p style="color: red;">Failed to load products</p>';
        return;
      }

      // Render grid
      container.innerHTML = `
        <div class="product-cards-grid" style="
          display: grid;
          grid-template-columns: repeat(${columns}, 1fr);
          gap: 30px;
          max-width: 1200px;
          margin: 0 auto;
        ">
          ${products.map(p => renderCard(p, { showReviews, showDelivery, showButton })).join('')}
        </div>
      `;

      // Add CSS
      addStyles();
    },

    // Export card renderer for external use
    renderCard,
    addStyles
  };

  console.log('✅ Product Cards System Ready');
})();
