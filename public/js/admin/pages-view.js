/**
 * Pages View
 * Manage custom pages and builder entries.
 */

import apiClient from '../core/api-client.js';
import FormModal from '../components/form-modal.js';
import ConfirmModal from '../components/confirm-modal.js';
import Toast from '../components/toast-notification.js';
import LoadingSpinner from '../components/loading-spinner.js';
import { createTableContainer } from './shared-containers.js';
import { withSpinner } from './shared-spinner.js';
import { createViewHeader } from './view-helpers.js';
import { createPagesTable } from './pages-table.js';
import { fetchPages, getPage, savePage, deletePage, duplicatePage, setPageStatus } from './pages-api.js';

export class PagesView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.pages = [];
  }

  async render() {
    this.container.innerHTML = '';

    const newBtn = document.createElement('button');
    newBtn.className = 'btn btn-primary';
    newBtn.textContent = 'New Page';
    newBtn.onclick = () => this.openEditor();

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-primary';
    refreshBtn.textContent = 'Refresh';
    refreshBtn.onclick = () => this.loadPages();

    this.container.appendChild(createViewHeader('Pages', [newBtn, refreshBtn]));
    this.container.appendChild(createTableContainer('pages-table-container'));

    await this.loadPages();
  }

  async loadPages() {
    await withSpinner('Loading pages...', async () => {
      try {
        this.pages = await fetchPages(apiClient);
        this._renderTable();
      } catch (error) {
        console.error('Error loading pages:', error);
        Toast.error('Failed to load pages: ' + error.message);
      }
    });
  }

  _renderTable() {
    if (this.table) this.table.destroy();

    const handlers = {
      onEdit: (row) => this.openEditor(row),
      onOpen: (row) => window.open(row.url, '_blank'),
      onDuplicate: (row) => this.duplicatePage(row),
      onToggleStatus: (row) => this.toggleStatus(row),
      onDelete: (row) => this.removePage(row)
    };

    this.table = createPagesTable(this.pages, handlers);
    this.table.render('#pages-table-container');
  }

  async openEditor(row) {
    let page = null;
    if (row?.name) {
      try {
        page = await getPage(apiClient, row.name);
      } catch (error) {
        Toast.error('Failed to load page: ' + error.message);
      }
    }

    const pageId = page?.id || row?.id || null;

    FormModal.prompt({
      title: pageId ? 'Edit Page' : 'New Page',
      size: 'large',
      fields: [
        { name: 'slug', label: 'Slug', type: 'text', required: true, value: page?.slug || row?.name || '' },
        { name: 'title', label: 'Title', type: 'text', required: true, value: page?.title || row?.title || '' },
        { name: 'status', label: 'Status', type: 'select', required: true, value: page?.status || row?.status || 'published', options: [
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' }
        ]},
        { name: 'meta_description', label: 'Meta Description', type: 'textarea', rows: 3, value: page?.meta_description || '' },
        { name: 'content', label: 'Content', type: 'textarea', rows: 10, value: page?.content || '' }
      ],
      onSubmit: async (data) => {
        const spinner = LoadingSpinner.show({ text: 'Saving page...' });
        try {
          await savePage(apiClient, { ...data, id: pageId });
          Toast.success('Page saved');
          await this.loadPages();
        } catch (error) {
          console.error('Error saving page:', error);
          Toast.error('Failed to save page: ' + error.message);
        } finally {
          spinner.hide();
        }
      }
    });
  }

  async duplicatePage(row) {
    const spinner = LoadingSpinner.show({ text: 'Duplicating page...' });
    try {
      await duplicatePage(apiClient, row.id);
      Toast.success('Page duplicated');
      await this.loadPages();
    } catch (error) {
      console.error('Error duplicating page:', error);
      Toast.error('Failed to duplicate page: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  async toggleStatus(row) {
    const next = row.status === 'published' ? 'draft' : 'published';
    const spinner = LoadingSpinner.show({ text: 'Updating status...' });
    try {
      await setPageStatus(apiClient, row.id, next);
      Toast.success('Status updated');
      await this.loadPages();
    } catch (error) {
      console.error('Error updating status:', error);
      Toast.error('Failed to update status: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  async removePage(row) {
    await ConfirmModal.delete(row.name || row.id, async () => {
      const spinner = LoadingSpinner.show({ text: 'Deleting page...' });
      try {
        await deletePage(apiClient, row.name);
        Toast.success('Page deleted');
        await this.loadPages();
      } catch (error) {
        console.error('Error deleting page:', error);
        Toast.error('Failed to delete page: ' + error.message);
      } finally {
        spinner.hide();
      }
    });
  }

  destroy() {
    if (this.table) this.table.destroy();
  }
}

export default PagesView;
