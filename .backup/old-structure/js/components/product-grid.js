/**
 * Product Grid Component
 * Unified product grid renderer for all pages
 * Replaces duplicate product-cards.js implementations
 */

import apiClient from '../core/api-client.js';
import { ProductCard } from './product-card.js';
import { createElement } from '../utils/dom-helper.js';
import LoadingSpinner from './loading-spinner.js';
import Toast from './toast-notification.js';

export class ProductGrid {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.getElementById(container)
      : container;

    this.options = {
      filter: options.filter || 'all', // all, featured, top-sales
      limit: options.limit || 9,
      columns: options.columns || 3,
      ids: options.ids || [],
      showReviews: options.showReviews !== false,
      showDelivery: options.showDelivery !== false,
      showDiscount: options.showDiscount !== false,
      cardStyle: options.cardStyle || 'default',
      responsive: options.responsive !== false,
      ...options
    };

    this.products = [];
    this.spinner = null;
  }

  /**
   * Load products from API
   */
  async loadProducts() {
    try {
      const response = await apiClient.get('/api/products');
      let products = response.products || [];

      // Apply filters
      if (this.options.filter === 'featured') {
        products = products.filter(p => p.featured);
      } else if (this.options.filter === 'top-sales') {
        products = products.sort((a, b) => (b.sales || 0) - (a.sales || 0));
      }

      // Filter by specific IDs if provided
      if (this.options.ids && Array.isArray(this.options.ids) && this.options.ids.length > 0) {
        const idSet = new Set(this.options.ids.map(x => String(x)));
        products = products.filter(p =>
          idSet.has(String(p.id)) || idSet.has(String(p.slug))
        );
      }

      // Limit
      products = products.slice(0, this.options.limit);

      this.products = products;
      return products;

    } catch (error) {
      console.error('Failed to load products:', error);
      throw error;
    }
  }

  /**
   * Render grid
   */
  async render() {
    if (!this.container) {
      console.error('Product grid container not found');
      return;
    }

    // Show loading
    this.spinner = LoadingSpinner.show({ text: 'Loading products...' });
    this.container.innerHTML = '';

    try {
      // Load products
      await this.loadProducts();

      // Hide spinner
      this.spinner.hide();

      // Check if empty
      if (this.products.length === 0) {
        this._renderEmpty();
        return;
      }

      // Create grid
      this._renderGrid();

      // Add styles
      this._addStyles();

    } catch (error) {
      this.spinner.hide();
      Toast.error('Failed to load products');
      this._renderError();
    }
  }

  /**
   * Render grid structure
   */
  _renderGrid() {
    const grid = createElement('div', {
      className: 'product-grid'
    });

    // Set grid columns
    const columns = this.options.responsive
      ? `repeat(auto-fill, minmax(280px, 1fr))`
      : `repeat(${this.options.columns}, 1fr)`;

    grid.style.cssText = `
      display: grid;
      grid-template-columns: ${columns};
      gap: 30px;
      max-width: 1200px;
      margin: 0 auto;
    `;

    // Render product cards
    this.products.forEach(product => {
      const card = ProductCard.create(product, {
        showReviews: this.options.showReviews,
        showDelivery: this.options.showDelivery,
        showDiscount: this.options.showDiscount,
        cardStyle: this.options.cardStyle
      });
      grid.appendChild(card);
    });

    this.container.appendChild(grid);
  }

  /**
   * Render empty state
   */
  _renderEmpty() {
    const message = createElement('div', {
      className: 'product-grid-empty',
      style: 'text-align: center; padding: 40px 20px; color: #6b7280; font-size: 1.1rem;'
    });

    const text = createElement('p', {
      textContent: 'No products found.'
    });

    message.appendChild(text);
    this.container.appendChild(message);
  }

  /**
   * Render error state
   */
  _renderError() {
    const message = createElement('div', {
      className: 'product-grid-error',
      style: 'text-align: center; padding: 40px 20px; color: #ef4444; font-size: 1.1rem;'
    });

    const text = createElement('p', {
      textContent: 'Failed to load products. Please try again.'
    });

    message.appendChild(text);
    this.container.appendChild(message);
  }

  /**
   * Add CSS styles
   */
  _addStyles() {
    // Check if styles already added
    if (document.getElementById('product-grid-styles')) {
      return;
    }

    const style = createElement('style', {
      id: 'product-grid-styles'
    });

    style.textContent = `
      .product-card {
        display: block;
        text-decoration: none;
        color: inherit;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .product-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      }

      .product-thumbnail {
        position: relative;
        width: 100%;
        padding-top: 56.25%; /* 16:9 aspect ratio */
        overflow: hidden;
        background: #f3f4f6;
      }

      .product-thumbnail img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .discount-badge {
        position: absolute;
        top: 12px;
        right: 12px;
        background: #ef4444;
        color: white;
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .product-content {
        padding: 16px;
      }

      .product-title {
        margin: 0 0 12px;
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        line-height: 1.4;
      }

      .product-meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .product-prices {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .original-price {
        text-decoration: line-through;
        color: #9ca3af;
        font-size: 0.875rem;
      }

      .sale-price {
        color: #10b981;
        font-size: 1.25rem;
        font-weight: 700;
      }

      .product-reviews {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .product-delivery {
        font-size: 0.875rem;
        color: #6b7280;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
      }

      .delivery-text {
        font-weight: 500;
      }

      .product-book-btn {
        width: 100%;
        margin-top: 12px;
        padding: 12px;
        background: #4f46e5;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }

      .product-book-btn:hover {
        background: #4338ca;
      }

      @media (max-width: 768px) {
        .product-grid {
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
          gap: 20px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Static render method
   */
  static async render(container, options = {}) {
    const grid = new ProductGrid(container, options);
    await grid.render();
    return grid;
  }
}

// Backward compatibility: Export as global
window.ProductGrid = ProductGrid;

export default ProductGrid;

