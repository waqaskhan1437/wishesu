/**
 * Data Table Component
 * Reusable data table with sorting, filtering, and pagination
 * Replaces duplicate table rendering code in dashboard views
 */

import { createElement } from '../../utils/dom-helper.js';
import eventBus from '../../core/event-bus.js';
import { createHeader, updateSortIndicators } from './table-header.js';
import { createPagination, updatePagination } from './table-pagination.js';
import { renderRows } from './table-renderer.js';

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
    const thead = createHeader(
      this.options.columns,
      this.options.sortable,
      this.options.actions,
      (key) => this._sort(key)
    );
    this.table.appendChild(thead);

    // Create tbody
    this.tbody = createElement('tbody');
    this.table.appendChild(this.tbody);

    wrapper.appendChild(this.table);

    // Create pagination if enabled
    if (this.options.pagination) {
      const pagination = createPagination(
        this.options.currentPage,
        this.filteredData.length,
        this.options.pageSize,
        (page) => this._changePage(page)
      );
      wrapper.appendChild(pagination);
    }

    this.container.appendChild(wrapper);

    // Render data
    this._renderRows();

    return this;
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
    renderRows(
      this.tbody,
      this.filteredData,
      this.options.currentPage,
      this.options.pageSize,
      this.options.pagination,
      this.options.columns,
      this.options.actions,
      this.options.rowClass,
      this.options.rowClick,
      this.options.emptyMessage
    );
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
    updateSortIndicators(this.table, columnKey, this.sortDirection);

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
      updatePagination(
        this.container,
        this.options.currentPage,
        this.filteredData.length,
        this.options.pageSize,
        (page) => this._changePage(page)
      );
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
    updatePagination(
      this.container,
      this.options.currentPage,
      this.filteredData.length,
      this.options.pageSize,
      (page) => this._changePage(page)
    );

    eventBus.emitSync('table:page-change', { page });
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
      updatePagination(
        this.container,
        this.options.currentPage,
        this.filteredData.length,
        this.options.pageSize,
        (page) => this._changePage(page)
      );
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
