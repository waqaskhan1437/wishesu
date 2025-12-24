/**
 * Dashboard recent orders table helpers.
 */

import { createElement } from '../../../utils/dom-helper.js';
import { formatDate } from '../../../utils/date-utils.js';
import { formatPrice } from '../../../utils/format-utils.js';

export function createRecentOrdersSection() {
  const section = createElement('div', {
    className: 'table-container'
  });

  const header = createElement('h3', {
    textContent: 'Recent Orders',
    style: 'padding: 20px; margin: 0;'
  });

  const table = createElement('table');

  const thead = createElement('thead');
  const headerRow = createElement('tr');
  ['Order ID', 'Email', 'Amount', 'Status', 'Date'].forEach(headerText => {
    const th = createElement('th', { textContent: headerText });
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

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

export function updateRecentOrders(orders) {
  const tbody = document.getElementById('recent-orders');
  if (!tbody) return;

  tbody.innerHTML = '';

  const recentOrders = orders.slice(0, 10);
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

  recentOrders.forEach(order => {
    const row = createElement('tr', {
      style: 'cursor: pointer;'
    });

    row.addEventListener('click', () => {
      window.location.href = `/order-detail.html?id=${order.order_id}&admin=1`;
    });

    const idCell = createElement('td');
    const idStrong = createElement('strong', {
      textContent: `#${order.order_id}`
    });
    idCell.appendChild(idStrong);
    row.appendChild(idCell);

    const emailCell = createElement('td', {
      textContent: order.email || 'N/A'
    });
    row.appendChild(emailCell);

    const amountCell = createElement('td', {
      textContent: formatPrice(order.amount || 0)
    });
    row.appendChild(amountCell);

    const statusCell = createElement('td');
    const statusBadge = createElement('span', {
      className: `status-${order.status}`,
      textContent: order.status
    });
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    const dateCell = createElement('td', {
      textContent: formatDate(order.created_at)
    });
    row.appendChild(dateCell);

    tbody.appendChild(row);
  });
}
