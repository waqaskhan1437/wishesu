/**
 * Dashboard View
 * Main dashboard with statistics and recent orders
 * Extracted from dashboard.js (lines ~138-157)
 */

import apiClient from '../../../../core/scripts/api-client.js';
import stateManager from '../../../../core/scripts/state-manager.js';
import Toast from '../../../../core/components/shared/toast-notification.js';
import LoadingSpinner from '../../../../core/components/shared/loading-spinner.js';
import { formatDate } from '../../../../core/utils/date-utils.js';
import { createElement } from '../../../../core/utils/dom-helper.js';
import { formatPrice } from '../../../../core/utils/format-utils.js';

export class DashboardView {
  constructor(container) {
    this.container = container;
    this.orders = [];
    this.products = [];
  }

  /**
   * Render dashboard view
   */
  async render() {
    // Clear container
    this.container.innerHTML = '';

    // Create stats grid
    const statsGrid = this._createStatsGrid();
    this.container.appendChild(statsGrid);

    // Create recent orders section
    const recentOrdersSection = this._createRecentOrdersSection();
    this.container.appendChild(recentOrdersSection);

    // Load data
    await this.loadDashboardData();
  }

  /**
   * Create statistics grid
   */
  _createStatsGrid() {
    const grid = createElement('div', {
      className: 'stats-grid'
    });

    const stats = [
      { id: 'total-orders', label: 'Total Orders', value: '0' },
      { id: 'pending-orders', label: 'Pending', value: '0' },
      { id: 'total-revenue', label: 'Revenue', value: '$0' },
      { id: 'total-products', label: 'Products', value: '0' }
    ];

    stats.forEach(stat => {
      const card = createElement('div', {
        className: 'stat-card'
      });

      const value = createElement('div', {
        className: 'stat-value',
        id: stat.id,
        textContent: stat.value
      });

      const label = createElement('div', {
        className: 'stat-label',
        textContent: stat.label
      });

      card.appendChild(value);
      card.appendChild(label);
      grid.appendChild(card);
    });

    return grid;
  }

  /**
   * Create recent orders section
   */
  _createRecentOrdersSection() {
    const section = createElement('div', {
      className: 'table-container'
    });

    const header = createElement('h3', {
      textContent: 'Recent Orders',
      style: 'padding: 20px; margin: 0;'
    });

    const table = createElement('table');

    // Create thead
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    ['Order ID', 'Email', 'Amount', 'Status', 'Date'].forEach(header => {
      const th = createElement('th', { textContent: header });
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create tbody
    const tbody = createElement('tbody', {
      id: 'recent-orders'
    });
    const loadingRow = createElement('tr');
    const loadingCell = createElement('td', {
      colspan: 5,
      textContent: 'Loading...',
      style: 'text-align: center;'
    });
    loadingRow.appendChild(loadingCell);
    tbody.appendChild(loadingRow);
    table.appendChild(tbody);

    section.appendChild(header);
    section.appendChild(table);

    return section;
  }

  /**
   * Load dashboard data
   */
  async loadDashboardData() {
    const spinner = LoadingSpinner.show({ text: 'Loading dashboard...' });

    try {
      // Load orders
      const ordersResponse = await apiClient.get('/api/orders');
      if (ordersResponse.orders) {
        this.orders = ordersResponse.orders;
        this._updateStats();
        this._updateRecentOrders();
      }

      // Load products
      const productsResponse = await apiClient.get('/api/products');
      if (productsResponse.products) {
        this.products = productsResponse.products;
        this._updateProductCount();
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      Toast.error('Failed to load dashboard data');
    } finally {
      spinner.hide();
    }
  }

  /**
   * Update statistics
   */
  _updateStats() {
    // Total orders
    const totalOrders = document.getElementById('total-orders');
    if (totalOrders) {
      totalOrders.textContent = this.orders.length;
    }

    // Pending orders
    const pendingOrders = document.getElementById('pending-orders');
    if (pendingOrders) {
      const pending = this.orders.filter(o => o.status !== 'delivered').length;
      pendingOrders.textContent = pending;
    }

    // Total revenue
    const totalRevenue = document.getElementById('total-revenue');
    if (totalRevenue) {
      const revenue = this.orders.reduce((sum, o) => {
        return sum + (parseFloat(o.amount) || 0);
      }, 0);
      totalRevenue.textContent = formatPrice(revenue);
    }
  }

  /**
   * Update product count
   */
  _updateProductCount() {
    const totalProducts = document.getElementById('total-products');
    if (totalProducts) {
      totalProducts.textContent = this.products.length;
    }
  }

  /**
   * Update recent orders table
   */
  _updateRecentOrders() {
    const tbody = document.getElementById('recent-orders');
    if (!tbody) return;

    // Clear loading message
    tbody.innerHTML = '';

    // Get 10 most recent orders
    const recentOrders = this.orders.slice(0, 10);

    if (recentOrders.length === 0) {
      const row = createElement('tr');
      const cell = createElement('td', {
        colspan: 5,
        textContent: 'No orders yet',
        style: 'text-align: center;'
      });
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    // Create rows
    recentOrders.forEach(order => {
      const row = createElement('tr', {
        style: 'cursor: pointer;'
      });

      row.addEventListener('click', () => {
        window.location.href = `/order-detail.html?id=${order.order_id}&admin=1`;
      });

      // Order ID
      const idCell = createElement('td');
      const idStrong = createElement('strong', {
        textContent: `#${order.order_id}`
      });
      idCell.appendChild(idStrong);
      row.appendChild(idCell);

      // Email
      const emailCell = createElement('td', {
        textContent: order.email || 'N/A'
      });
      row.appendChild(emailCell);

      // Amount
      const amountCell = createElement('td', {
        textContent: formatPrice(order.amount || 0)
      });
      row.appendChild(amountCell);

      // Status
      const statusCell = createElement('td');
      const statusBadge = createElement('span', {
        className: `status-${order.status}`,
        textContent: order.status
      });
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      // Date
      const dateCell = createElement('td', {
        textContent: formatDate(order.created_at)
      });
      row.appendChild(dateCell);

      tbody.appendChild(row);
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    // No cleanup needed
  }
}

export default DashboardView;
