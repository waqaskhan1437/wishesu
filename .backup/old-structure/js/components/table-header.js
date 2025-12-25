/**
 * Table Header Module
 * Handles table header creation and sorting functionality
 */

import { createElement } from '../utils/dom-helper.js';

/**
 * Create table header
 */
export function createHeader(columns, sortable, actions, onSort) {
  const thead = createElement('thead');
  const tr = createElement('tr');

  columns.forEach(column => {
    const th = createElement('th', {
      textContent: column.label,
      dataset: { key: column.key }
    });

    if (sortable && column.sortable !== false) {
      th.classList.add('sortable');
      th.addEventListener('click', () => onSort(column.key));
    }

    if (column.width) {
      th.style.width = column.width;
    }

    if (column.className) {
      th.classList.add(column.className);
    }

    tr.appendChild(th);
  });

  // Actions column
  if (actions) {
    const th = createElement('th', {
      textContent: 'Actions',
      className: 'actions-column'
    });
    tr.appendChild(th);
  }

  thead.appendChild(tr);
  return thead;
}

/**
 * Update sort indicators in header
 */
export function updateSortIndicators(table, columnKey, direction) {
  table.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.key === columnKey) {
      th.classList.add(`sort-${direction}`);
    }
  });
}
