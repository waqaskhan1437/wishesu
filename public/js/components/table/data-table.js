/**
 * Data Table Component
 * Reusable data table with sorting, filtering, and pagination
 * Replaces duplicate table rendering code in dashboard views
 */

import { createElement } from '../../utils/dom-helper.js';
import { formatDate } from '../../utils/date-utils.js';
import eventBus from '../../core/event-bus.js';

export class DataTable {
  constructor(options = {}) {
    this.options = {
      columns: options.columns || [],
      data: options.data || [],
      sortable: options.sortable !== false,
      filterable: options.filterable || false,
      pagination: options.pagination || false,
      pageSize: options.pageSize || 10,
      currentPage: options.currentPage || 1,
      emptyMessage: options.emptyMessage || 'No data available',
      rowClick: options.rowClick || null,
      rowClass: options.rowClass || null,
      className: options.className || '',
      actions: options.actions || null
    };

    this.container = null;
    this.table = null;
    this.tbody = null;
    this.filteredData = [...this.options.data];
    this.sortColumn = null;
    this.sortDirection = 'asc';
  }

  /**
   * Render table
   */
  render(container) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      console.error('Table container not found');
      return;
    }

    // Clear container
    this.container.innerHTML = '';

    // Create table wrapper
    const wrapper = createElement('div', {
      className: `data-table-wrapper ${this.options.className}`
    });

    // Create filter if enabled
    if (this.options.filterable) {
      const filterBox = this._createFilter();
      wrapper.appendChild(filterBox);
    }

    // Create table
    this.table = createElement('table', {
      className: 'data-table'
    });

    // Create thead
    const thead = this._createHeader();
    this.table.appendChild(thead);

    // Create tbody
    this.tbody = createElement('tbody');
    this.table.appendChild(tbody);

    wrapper.appendChild(this.table);

    // Create pagination if enabled
    if (this.options.pagination) {
      const pagination = this._createPagination();
      wrapper.appendChild(pagination);
    }

    this.container.appendChild(wrapper);

    // Render data
    this._renderRows();

    return this;
  }

  /**
   * Create table header
   */
  _createHeader() {
    const thead = createElement('thead');
    const tr = createElement('tr');

    this.options.columns.forEach(column => {
      const th = createElement('th', {
        textContent: column.label,
        dataset: { key: column.key }
      });

      if (this.options.sortable && column.sortable !== false) {
        th.classList.add('sortable');
        th.addEventListener('click', () => this._sort(column.key));
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
    if (this.options.actions) {
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
   * Create filter box
   */
  _createFilter() {
    const filterBox = createElement('div', {
      className: 'table-filter'
    });

    const input = createElement('input', {
      type: 'text',
      className: 'form-control',
      placeholder: 'Search...'
    });

    input.addEventListener('input', (e) => {
      this._filter(e.target.value);
    });

    filterBox.appendChild(input);
    return filterBox;
  }

  /**
   * Render table rows
   */
  _renderRows() {
    // Clear tbody
    this.tbody.innerHTML = '';

    // Get data for current page
    const startIndex = this.options.pagination
      ? (this.options.currentPage - 1) * this.options.pageSize
      : 0;

    const endIndex = this.options.pagination
      ? startIndex + this.options.pageSize
      : this.filteredData.length;

    const pageData = this.filteredData.slice(startIndex, endIndex);

    // Check if empty
    if (pageData.length === 0) {
      const tr = createElement('tr');
      const td = createElement('td', {
        colspan: this.options.columns.length + (this.options.actions ? 1 : 0),
        className: 'text-center empty-message',
        textContent: this.options.emptyMessage
      });
      tr.appendChild(td);
      this.tbody.appendChild(tr);
      return;
    }

    // Render rows
    pageData.forEach((row, index) => {
      const tr = this._createRow(row, startIndex + index);
      this.tbody.appendChild(tr);
    });
  }

  /**
   * Create table row
   */
  _createRow(rowData, index) {
    const tr = createElement('tr', {
      dataset: { index }
    });

    // Apply row class
    if (this.options.rowClass) {
      const className = typeof this.options.rowClass === 'function'
        ? this.options.rowClass(rowData, index)
        : this.options.rowClass;
      if (className) tr.classList.add(className);
    }

    // Add click handler
    if (this.options.rowClick) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        this.options.rowClick(rowData, index);
      });
    }

    // Create cells
    this.options.columns.forEach(column => {
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
    if (this.options.actions) {
      const td = createElement('td', {
        className: 'actions-cell'
      });

      const actions = typeof this.options.actions === 'function'
        ? this.options.actions(rowData, index)
        : this.options.actions;

      if (Array.isArray(actions)) {
        actions.forEach(action => {
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
   * Create pagination
   */
  _createPagination() {
    const pagination = createElement('div', {
      className: 'table-pagination'
    });

    const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);

    // Previous button
    const prevBtn = createElement('button', {
      className: 'btn btn-sm',
      textContent: 'Previous',
      disabled: this.options.currentPage === 1
    });
    prevBtn.addEventListener('click', () => this._changePage(this.options.currentPage - 1));
    pagination.appendChild(prevBtn);

    // Page info
    const pageInfo = createElement('span', {
      className: 'page-info',
      textContent: `Page ${this.options.currentPage} of ${totalPages}`
    });
    pagination.appendChild(pageInfo);

    // Next button
    const nextBtn = createElement('button', {
      className: 'btn btn-sm',
      textContent: 'Next',
      disabled: this.options.currentPage === totalPages
    });
    nextBtn.addEventListener('click', () => this._changePage(this.options.currentPage + 1));
    pagination.appendChild(nextBtn);

    return pagination;
  }

  /**
   * Sort table
   */
  _sort(columnKey) {
    if (this.sortColumn === columnKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columnKey;
      this.sortDirection = 'asc';
    }

    this.filteredData.sort((a, b) => {
      let valA = a[columnKey];
      let valB = b[columnKey];

      // Handle null/undefined
      if (valA == null) return 1;
      if (valB == null) return -1;

      // Compare
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Update UI
    this.table.querySelectorAll('th.sortable').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.key === columnKey) {
        th.classList.add(`sort-${this.sortDirection}`);
      }
    });

    this._renderRows();
    eventBus.emitSync('table:sort', { column: columnKey, direction: this.sortDirection });
  }

  /**
   * Filter table
   */
  _filter(query) {
    const lowerQuery = query.toLowerCase();

    this.filteredData = this.options.data.filter(row => {
      return this.options.columns.some(column => {
        const value = row[column.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowerQuery);
      });
    });

    this.options.currentPage = 1;
    this._renderRows();

    if (this.options.pagination) {
      this._updatePagination();
    }

    eventBus.emitSync('table:filter', { query });
  }

  /**
   * Change page
   */
  _changePage(page) {
    const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);

    if (page < 1 || page > totalPages) return;

    this.options.currentPage = page;
    this._renderRows();
    this._updatePagination();

    eventBus.emitSync('table:page-change', { page });
  }

  /**
   * Update pagination UI
   */
  _updatePagination() {
    const pagination = this.container.querySelector('.table-pagination');
    if (!pagination) return;

    pagination.innerHTML = '';
    const newPagination = this._createPagination();
    pagination.parentNode.replaceChild(newPagination, pagination);
  }

  /**
   * Update table data
   */
  setData(data) {
    this.options.data = data;
    this.filteredData = [...data];
    this.options.currentPage = 1;
    this._renderRows();

    if (this.options.pagination) {
      this._updatePagination();
    }
  }

  /**
   * Refresh table
   */
  refresh() {
    this._renderRows();
  }

  /**
   * Destroy table
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export default DataTable;
