/**
 * Pages View
 * Manages dynamic pages display and CRUD operations
 */

import apiClient from '../../../../core/scripts/api-client.js';
import stateManager from '../../../../core/scripts/state-manager.js';
import DataTable from '../../../../core/components/table/data-table.js';
import FormModal from '../../../../core/components/modal/form-modal.js';
import ConfirmModal from '../../../../core/components/modal/confirm-modal.js';
import Toast from '../../../../core/components/shared/toast-notification.js';
import LoadingSpinner from '../../../../core/components/shared/loading-spinner.js';
import { formatDate } from '../../../../core/utils/date-utils.js';
import { createElement } from '../../../../core/utils/dom-helper.js';

export class PagesView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.pages = [];
  }

  async render() {
    this.container.innerHTML = '';

    const header = this._createHeader();
    this.container.appendChild(header);

    const tableContainer = createElement('div', {
      className: 'table-container',
      id: 'pages-table-container'
    });
    this.container.appendChild(tableContainer);

    await this.loadPages();
  }

  _createHeader() {
    const header = createElement('div', {
      className: 'view-header',
      style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;'
    });

    const title = createElement('h2', {
      textContent: 'Pages',
      style: 'margin: 0;'
    });

    const actions = createElement('div', { className: 'header-actions' });

    const createBtn = createElement('button', {
      className: 'btn btn-primary',
      innerHTML: '➕ New Page'
    });
    createBtn.addEventListener('click', () => this.openCreateModal());

    const builderBtn = createElement('button', {
      className: 'btn btn-secondary',
      innerHTML: '🎨 Page Builder',
      style: 'margin-left: 10px;'
    });
    builderBtn.addEventListener('click', () => window.open('/page-builder.html', '_blank'));

    const refreshBtn = createElement('button', {
      className: 'btn btn-secondary',
      innerHTML: '🔄 Refresh',
      style: 'margin-left: 10px;'
    });
    refreshBtn.addEventListener('click', () => this.loadPages());

    actions.appendChild(createBtn);
    actions.appendChild(builderBtn);
    actions.appendChild(refreshBtn);

    header.appendChild(title);
    header.appendChild(actions);
    return header;
  }

  async loadPages() {
    const spinner = LoadingSpinner.show({ text: 'Loading pages...' });

    try {
      const response = await apiClient.get('/api/pages/list');

      if (response.pages) {
        this.pages = response.pages;
        stateManager.set('pages', this.pages);
        this._renderTable();
      }

    } catch (error) {
      console.error('Error loading pages:', error);
      Toast.show({ message: 'Failed to load pages', type: 'error' });
    } finally {
      LoadingSpinner.hide(spinner);
    }
  }

  _renderTable() {
    const container = document.getElementById('pages-table-container');
    if (!container) return;

    if (this.pages.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No pages found. Create your first page!</p></div>';
      return;
    }

    const columns = [
      { key: 'title', label: 'Title', width: '200px' },
      { key: 'slug', label: 'Slug', width: '150px' },
      { key: 'path', label: 'Path', width: '150px' },
      { key: 'status', label: 'Status', width: '100px', render: (val) => this._renderStatus(val) },
      { key: 'updated_at', label: 'Updated', width: '150px', render: (val) => formatDate(val) },
      { key: 'actions', label: 'Actions', width: '250px' }
    ];

    this.table = new DataTable({
      container,
      columns,
      data: this.pages,
      actions: [
        {
          label: '✏️ Edit',
          className: 'btn-primary btn-sm',
          onClick: (row) => this.openEditModal(row)
        },
        {
          label: '🎨',
          className: 'btn-info btn-sm',
          onClick: (row) => window.open(`/page-builder.html?page=${row.slug}`, '_blank')
        },
        {
          label: '👁️',
          className: 'btn-secondary btn-sm',
          onClick: (row) => window.open(row.path || `/${row.slug}`, '_blank')
        },
        {
          label: '📋',
          className: 'btn-secondary btn-sm',
          onClick: (row) => this.duplicatePage(row.id)
        },
        {
          label: '🗑️',
          className: 'btn-danger btn-sm',
          condition: (row) => !row.is_builtin,
          onClick: (row) => this.deletePage(row.id)
        }
      ]
    });

    this.table.render();
  }

  _renderStatus(status) {
    const statusMap = {
      'published': '<span style="color: green;">✅ Published</span>',
      'draft': '<span style="color: orange;">📝 Draft</span>',
      'active': '<span style="color: green;">✅ Active</span>'
    };
    return statusMap[status] || status || 'Draft';
  }

  async openCreateModal() {
    const fields = [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true, placeholder: 'my-page' },
      { name: 'status', label: 'Status', type: 'select', options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' }
      ]}
    ];

    const result = await FormModal.show({
      title: 'Create New Page',
      fields,
      submitText: 'Create'
    });

    if (result) {
      await this.savePage(result);
    }
  }

  async openEditModal(page) {
    const fields = [
      { name: 'title', label: 'Title', type: 'text', required: true, value: page.title },
      { name: 'slug', label: 'Slug', type: 'text', required: true, value: page.slug, disabled: page.is_builtin },
      { name: 'status', label: 'Status', type: 'select', value: page.status || 'draft', options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' }
      ]}
    ];

    const result = await FormModal.show({
      title: 'Edit Page',
      fields,
      submitText: 'Save'
    });

    if (result) {
      result.id = page.id;
      result.slug = page.slug;
      await this.savePage(result);
    }
  }

  async savePage(data) {
    const spinner = LoadingSpinner.show({ text: 'Saving page...' });

    try {
      await apiClient.post('/api/pages/save', data);
      Toast.show({ message: 'Page saved successfully', type: 'success' });
      await this.loadPages();
    } catch (error) {
      Toast.show({ message: 'Failed to save page', type: 'error' });
    } finally {
      LoadingSpinner.hide(spinner);
    }
  }

  async duplicatePage(id) {
    const spinner = LoadingSpinner.show({ text: 'Duplicating page...' });

    try {
      await apiClient.post('/api/pages/duplicate', { id });
      Toast.show({ message: 'Page duplicated', type: 'success' });
      await this.loadPages();
    } catch (error) {
      Toast.show({ message: 'Failed to duplicate page', type: 'error' });
    } finally {
      LoadingSpinner.hide(spinner);
    }
  }

  async deletePage(id) {
    const confirmed = await ConfirmModal.show({
      title: 'Delete Page',
      message: 'Are you sure you want to delete this page? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/page/delete?id=${id}`);
      Toast.show({ message: 'Page deleted', type: 'success' });
      await this.loadPages();
    } catch (error) {
      Toast.show({ message: 'Failed to delete page', type: 'error' });
    }
  }
}

export default PagesView;
