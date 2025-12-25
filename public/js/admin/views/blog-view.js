/**
 * Blog View
 * Manages blog posts display and CRUD operations
 */

import apiClient from '../../core/api-client.js';
import stateManager from '../../core/state-manager.js';
import DataTable from '../../components/table/data-table.js';
import FormModal from '../../components/modal/form-modal.js';
import ConfirmModal from '../../components/modal/confirm-modal.js';
import Toast from '../../components/shared/toast-notification.js';
import LoadingSpinner from '../../components/shared/loading-spinner.js';
import { formatDate } from '../../utils/date-utils.js';
import { createElement } from '../../utils/dom-helper.js';

export class BlogView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.posts = [];
  }

  async render() {
    this.container.innerHTML = '';

    const header = this._createHeader();
    this.container.appendChild(header);

    const tableContainer = createElement('div', {
      className: 'table-container',
      id: 'blog-table-container'
    });
    this.container.appendChild(tableContainer);

    await this.loadPosts();
  }

  _createHeader() {
    const header = createElement('div', {
      className: 'view-header',
      style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;'
    });

    const title = createElement('h2', {
      textContent: 'Blog Posts',
      style: 'margin: 0;'
    });

    const actions = createElement('div', { className: 'header-actions' });

    const createBtn = createElement('button', {
      className: 'btn btn-primary',
      innerHTML: '➕ New Post'
    });
    createBtn.addEventListener('click', () => this.openCreateModal());

    const refreshBtn = createElement('button', {
      className: 'btn btn-secondary',
      innerHTML: '🔄 Refresh',
      style: 'margin-left: 10px;'
    });
    refreshBtn.addEventListener('click', () => this.loadPosts());

    actions.appendChild(createBtn);
    actions.appendChild(refreshBtn);

    header.appendChild(title);
    header.appendChild(actions);
    return header;
  }

  async loadPosts() {
    const spinner = LoadingSpinner.show({ text: 'Loading blog posts...' });

    try {
      const response = await apiClient.get('/api/blog/list');

      if (response.posts) {
        this.posts = response.posts;
        stateManager.set('blogPosts', this.posts);
        this._renderTable();
      }

    } catch (error) {
      console.error('Error loading posts:', error);
      Toast.show({ message: 'Failed to load blog posts', type: 'error' });
    } finally {
      LoadingSpinner.hide(spinner);
    }
  }

  _renderTable() {
    const container = document.getElementById('blog-table-container');
    if (!container) return;

    if (this.posts.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No blog posts found. Create your first post!</p></div>';
      return;
    }

    const columns = [
      { key: 'title', label: 'Title', width: '250px' },
      { key: 'slug', label: 'Slug', width: '150px' },
      { key: 'author', label: 'Author', width: '120px' },
      { key: 'status', label: 'Status', width: '100px', render: (val) => this._renderStatus(val) },
      { key: 'created_at', label: 'Created', width: '150px', render: (val) => formatDate(val) },
      { key: 'actions', label: 'Actions', width: '200px' }
    ];

    this.table = new DataTable({
      container,
      columns,
      data: this.posts,
      actions: [
        {
          label: '✏️ Edit',
          className: 'btn-primary btn-sm',
          onClick: (row) => this.openEditModal(row)
        },
        {
          label: '👁️',
          className: 'btn-secondary btn-sm',
          onClick: (row) => window.open(`/blog/${row.slug}`, '_blank')
        },
        {
          label: '🗑️',
          className: 'btn-danger btn-sm',
          onClick: (row) => this.deletePost(row.slug)
        }
      ]
    });

    this.table.render();
  }

  _renderStatus(status) {
    const statusMap = {
      'published': '<span style="color: green;">✅ Published</span>',
      'draft': '<span style="color: orange;">📝 Draft</span>',
      'pending': '<span style="color: blue;">⏳ Pending</span>'
    };
    return statusMap[status] || status;
  }

  async openCreateModal() {
    const fields = [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true },
      { name: 'author', label: 'Author', type: 'text', required: true },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea' },
      { name: 'content', label: 'Content', type: 'textarea', required: true },
      { name: 'status', label: 'Status', type: 'select', options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' }
      ]}
    ];

    const result = await FormModal.show({
      title: 'Create Blog Post',
      fields,
      submitText: 'Create'
    });

    if (result) {
      await this.savePost(result);
    }
  }

  async openEditModal(post) {
    const fields = [
      { name: 'title', label: 'Title', type: 'text', required: true, value: post.title },
      { name: 'slug', label: 'Slug', type: 'text', required: true, value: post.slug, disabled: true },
      { name: 'author', label: 'Author', type: 'text', required: true, value: post.author },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', value: post.excerpt },
      { name: 'content', label: 'Content', type: 'textarea', required: true, value: post.content },
      { name: 'status', label: 'Status', type: 'select', value: post.status, options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' }
      ]}
    ];

    const result = await FormModal.show({
      title: 'Edit Blog Post',
      fields,
      submitText: 'Save'
    });

    if (result) {
      result.slug = post.slug;
      await this.savePost(result);
    }
  }

  async savePost(data) {
    const spinner = LoadingSpinner.show({ text: 'Saving post...' });

    try {
      await apiClient.post('/api/blog/save', data);
      Toast.show({ message: 'Post saved successfully', type: 'success' });
      await this.loadPosts();
    } catch (error) {
      Toast.show({ message: 'Failed to save post', type: 'error' });
    } finally {
      LoadingSpinner.hide(spinner);
    }
  }

  async deletePost(slug) {
    const confirmed = await ConfirmModal.show({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this blog post? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/blog/delete?slug=${slug}`);
      Toast.show({ message: 'Post deleted', type: 'success' });
      await this.loadPosts();
    } catch (error) {
      Toast.show({ message: 'Failed to delete post', type: 'error' });
    }
  }
}

export default BlogView;
