/**
 * Dashboard stats helpers.
 */

import { createElement } from '../utils/dom-helper.js';
import { formatPrice } from '../utils/format-utils.js';

export function createStatsGrid() {
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

export function updateStats(orders) {
  const totalOrders = document.getElementById('total-orders');
  if (totalOrders) {
    totalOrders.textContent = orders.length;
  }

  const pendingOrders = document.getElementById('pending-orders');
  if (pendingOrders) {
    const pending = orders.filter(o => o.status !== 'delivered').length;
    pendingOrders.textContent = pending;
  }

  const totalRevenue = document.getElementById('total-revenue');
  if (totalRevenue) {
    const revenue = orders.reduce((sum, o) => {
      return sum + (parseFloat(o.amount) || 0);
    }, 0);
    totalRevenue.textContent = formatPrice(revenue);
  }
}

export function updateProductCount(products) {
  const totalProducts = document.getElementById('total-products');
  if (totalProducts) {
    totalProducts.textContent = products.length;
  }
}
