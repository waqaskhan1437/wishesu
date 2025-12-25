/**
 * Table Renderer Module
 * Handles row and cell rendering
 */

import { createElement } from '../utils/dom-helper.js';

/**
 * Create table row
 */
export function createRow(rowData, index, columns, actions, rowClass, rowClick) {
  const tr = createElement('tr', {
    dataset: { index }
  });

  // Apply row class
  if (rowClass) {
    const className = typeof rowClass === 'function'
      ? rowClass(rowData, index)
      : rowClass;
    if (className) tr.classList.add(className);
  }

  // Add click handler
  if (rowClick) {
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      rowClick(rowData, index);
    });
  }

  // Create cells
  columns.forEach(column => {
    const td = createElement('td', {
      dataset: { key: column.key }
    });

    let value = rowData[column.key];

    // Apply formatter
    if (column.formatter) {
      value = column.formatter(value, rowData, index);
    }

    // Set cell content
    if (typeof value === 'string' || typeof value === 'number') {
      td.textContent = value;
    } else if (value instanceof Node) {
      td.appendChild(value);
    } else if (value !== null && value !== undefined) {
      td.textContent = String(value);
    }

    if (column.className) {
      td.classList.add(column.className);
    }

    tr.appendChild(td);
  });

  // Add actions cell
  if (actions) {
    const td = createElement('td', {
      className: 'actions-cell'
    });

    const actionsList = typeof actions === 'function'
      ? actions(rowData, index)
      : actions;

    if (Array.isArray(actionsList)) {
      actionsList.forEach(action => {
        const btn = createElement('button', {
          className: action.className || 'btn btn-sm',
          textContent: action.label,
          title: action.title || action.label
        });

        if (action.icon) {
          btn.innerHTML = `<i class="${action.icon}"></i> ${action.label}`;
        }

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          action.onClick(rowData, index);
        });

        td.appendChild(btn);
      });
    }

    tr.appendChild(td);
  }

  return tr;
}

/**
 * Render rows for current page
 */
export function renderRows(tbody, filteredData, currentPage, pageSize, pagination, columns, actions, rowClass, rowClick, emptyMessage) {
  tbody.innerHTML = '';

  // Get data for current page
  const startIndex = pagination
    ? (currentPage - 1) * pageSize
    : 0;

  const endIndex = pagination
    ? startIndex + pageSize
    : filteredData.length;

  const pageData = filteredData.slice(startIndex, endIndex);

  // Check if empty
  if (pageData.length === 0) {
    const tr = createElement('tr');
    const td = createElement('td', {
      colspan: columns.length + (actions ? 1 : 0),
      className: 'text-center empty-message',
      textContent: emptyMessage
    });
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  // Render rows
  pageData.forEach((row, index) => {
    const tr = createRow(row, startIndex + index, columns, actions, rowClass, rowClick);
    tbody.appendChild(tr);
  });
}
