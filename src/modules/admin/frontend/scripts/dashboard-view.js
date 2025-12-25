/**
 * Dashboard View
 * Main dashboard with statistics and recent orders
 */

import apiClient from '../core/api-client.js';
import Toast from '../components/toast-notification.js';
import { withSpinner } from './shared-spinner.js';
import { createStatsGrid, updateStats, updateProductCount } from './dashboard-stats.js';
import { createRecentOrdersSection, updateRecentOrders } from './dashboard-recent-orders.js';
import { fetchDashboardOrders, fetchDashboardProducts } from './dashboard-api.js';

export class DashboardView {
  constructor(container) {
    this.container = container;
    this.orders = [];
    this.products = [];
  }

  async render() {
    this.container.innerHTML = '';

    const statsGrid = createStatsGrid();
    this.container.appendChild(statsGrid);

    const recentOrdersSection = createRecentOrdersSection();
    this.container.appendChild(recentOrdersSection);

    await this.loadDashboardData();
  }

  async loadDashboardData() {
    await withSpinner('Loading dashboard...', async () => {
      try {
        this.orders = await fetchDashboardOrders(apiClient);
        updateStats(this.orders);
        updateRecentOrders(this.orders);

        this.products = await fetchDashboardProducts(apiClient);
        updateProductCount(this.products);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        Toast.error('Failed to load dashboard data');
      }
    });
  }

  destroy() {
    // No cleanup needed
  }
}

export default DashboardView;
