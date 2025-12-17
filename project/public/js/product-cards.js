/**
 * Beautiful Product Cards System
 * Can be embedded anywhere - landing pages, home, featured lists
 */

(function() {
  window.ProductCards = {
    // Render product cards in a container
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
        showDelivery = true    // show delivery information
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

        // If there are no products after filtering and limiting, show a helpful
        // message instead of rendering an empty grid.  This provides better
        // feedback to the user when the database is empty or an API error
        // occurs.
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
          ${products.map(p => this.renderCard(p, { showReviews, showDelivery })).join('')}
        </div>
      `;

      // Schema now injected server-side for better SEO and to prevent duplicates

      // Add CSS
      this.addStyles();
    },

    // Render single card
    renderCard: function(product, opts = {}) {
      const { showReviews = true, showDelivery = true } = opts;
      const {
        id,
        title,
        slug,
        thumbnail_url,
        normal_price,
        sale_price,
        normal_delivery_text,
        average_rating,
        review_count
      } = product;

      // Price calculation
      const originalPrice = parseFloat(normal_price || 0);
      const salePrice = parseFloat(sale_price || originalPrice);
      const hasDiscount = salePrice < originalPrice;
      const discount = hasDiscount ? Math.round((1 - salePrice / originalPrice) * 100) : 0;

      // Delivery text
      const deliveryText = this.getDeliveryText(normal_delivery_text);
      const deliveryIcon = this.getDeliveryIcon(normal_delivery_text);

      // Rating stars
      const rating = parseFloat(average_rating || 5);
      const stars = this.renderStars(rating);

      const priceHtml = `
        <div class="product-prices">
          ${hasDiscount ? `<span class="original-price">$${originalPrice}</span>` : ''}
          <span class="sale-price">$${salePrice}</span>
        </div>
      `;
      const reviewHtml = `
        <div class="product-reviews">
          ${stars}
          <span class="review-count">(${review_count || 0})</span>
        </div>
      `;
      const deliveryHtml = `
        <div class="product-delivery">
          <span class="delivery-icon">${deliveryIcon}</span>
          <span class="delivery-text">${deliveryText}</span>
        </div>
      `;
      return `
        <div class="product-card" data-product-id="${id}" onclick="window.location.href='/product?id=${id}'">
          <!-- Thumbnail -->
          <div class="product-thumbnail">
            <img src="${thumbnail_url || '/placeholder.jpg'}" alt="${title}">
            ${hasDiscount ? `<div class="discount-badge">${discount}% OFF</div>` : ''}
          </div>

          <!-- Content -->
          <div class="product-content">
            <!-- Title -->
            <h3 class="product-title">${title}</h3>

            <!-- Price & Reviews Row -->
            <div class="product-meta-row">
              ${priceHtml}
              ${showReviews ? reviewHtml : ''}
            </div>

            <!-- Delivery Info -->
            ${showDelivery ? deliveryHtml : ''}

            <!-- Book Now Button -->
            <button class="book-now-btn" onclick="event.stopPropagation(); window.location.href='/product?id=${id}'">
              Book Now
            </button>
          </div>
        </div>
      `;
    },

    // Get delivery text based on time
    getDeliveryText: function(deliveryText) {
      if (!deliveryText) return 'Instant Delivery in 60 Minutes';

      const text = deliveryText.toLowerCase();
      const minutes = parseInt(text.match(/\d+/)?.[0] || 60);

      if (text.includes('instant') || minutes <= 60) {
        return `⚡ Instant Delivery in ${minutes} Minutes`;
      } else if (text.includes('24 hours') || text.includes('1 day')) {
        return '🚀 24 Hours Express Delivery';
      } else if (text.includes('2 days')) {
        return '📦 2 Days Delivery';
      } else if (text.includes('3 days')) {
        return '📦 3 Days Delivery';
      } else {
        return deliveryText;
      }
    },

    // Get delivery icon
    getDeliveryIcon: function(deliveryText) {
      const text = (deliveryText || '').toLowerCase();
      if (text.includes('instant') || text.includes('60')) return '⚡';
      if (text.includes('24') || text.includes('1 day')) return '🚀';
      return '📦';
    },

    // Render rating stars
    renderStars: function(rating) {
      const fullStars = Math.floor(rating);
      const hasHalfStar = rating % 1 >= 0.5;
      let stars = '';

      for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
          stars += '<span class="star star-full">★</span>';
        } else if (i === fullStars && hasHalfStar) {
          stars += '<span class="star star-half">★</span>';
        } else {
          stars += '<span class="star star-empty">☆</span>';
        }
      }

      return `<div class="rating-stars">${stars}</div>`;
    },

    // Add CSS styles
    addStyles: function() {
      if (document.getElementById('product-cards-styles')) return;

      const style = document.createElement('style');
      style.id = 'product-cards-styles';
      style.textContent = `
        .product-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          cursor: pointer;
          display: flex;
          flex-direction: column;
        }

        .product-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.15);
        }

        .product-thumbnail {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
          background: #f3f4f6;
        }

        .product-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-thumbnail img {
          transform: scale(1.05);
        }

        .discount-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.85em;
          box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
        }

        .product-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        .product-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          line-height: 1.4;
          min-height: 2.8em;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .product-prices {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .original-price {
          font-size: 0.9rem;
          color: #9ca3af;
          text-decoration: line-through;
        }

        .sale-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: #3b82f6;
        }

        .product-reviews {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .rating-stars {
          display: flex;
          gap: 2px;
        }

        .star {
          font-size: 1rem;
          line-height: 1;
        }

        .star-full {
          color: #fbbf24;
        }

        .star-half {
          color: #fbbf24;
          opacity: 0.5;
        }

        .star-empty {
          color: #d1d5db;
        }

        .review-count {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .product-delivery {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #f0f9ff;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #1e40af;
          font-weight: 500;
        }

        .delivery-icon {
          font-size: 1.1em;
        }

        .book-now-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: auto;
        }

        .book-now-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
        }

        .book-now-btn:active {
          transform: translateY(0);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .product-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }
        }

        @media (max-width: 480px) {
          .product-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  };

  console.log('✅ Product Cards System Ready');
})();
