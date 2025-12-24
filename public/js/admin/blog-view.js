/**
 * Blog View
 * Manage blog posts.
 */

import apiClient from '../core/api-client.js';
import FormModal from '../components/form-modal.js';
import ConfirmModal from '../components/confirm-modal.js';
import Toast from '../components/toast-notification.js';
import LoadingSpinner from '../components/loading-spinner.js';
import { createTableContainer } from './shared-containers.js';
import { withSpinner } from './shared-spinner.js';
import { createViewHeader } from './view-helpers.js';
import { createBlogTable } from './blog-table.js';
import {
  fetchBlogPosts,
  getBlogPost,
  saveBlogPost,
  setBlogStatus,
  deleteBlogPost
} from './blog-api.js';

export class BlogView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.posts = [];
  }

  async render() {
    this.container.innerHTML = '';

    const newBtn = document.createElement('button');
    newBtn.className = 'btn btn-primary';
    newBtn.textContent = 'New Post';
    newBtn.onclick = () => this.openEditor();

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-primary';
    refreshBtn.textContent = 'Refresh';
    refreshBtn.onclick = () => this.loadPosts();

    this.container.appendChild(createViewHeader('Blog', [newBtn, refreshBtn]));
    this.container.appendChild(createTableContainer('blog-table-container'));

    await this.loadPosts();
  }

  async loadPosts() {
    await withSpinner('Loading blog posts...', async () => {
      try {
        this.posts = await fetchBlogPosts(apiClient);
        this._renderTable();
      } catch (error) {
        console.error('Error loading blog posts:', error);
        Toast.error('Failed to load blog posts: ' + error.message);
      }
    });
  }

  _renderTable() {
    if (this.table) this.table.destroy();
    const handlers = {
      onEdit: (row) => this.openEditor(row.slug),
      onStatus: (row, status) => this.updateStatus(row.slug, status),
      onDelete: (row) => this.removePost(row.slug)
    };
    this.table = createBlogTable(this.posts, handlers);
    this.table.render('#blog-table-container');
  }

  async openEditor(slug = '') {
    let post = null;
    if (slug) {
      try {
        post = await getBlogPost(apiClient, slug);
      } catch (error) {
        Toast.error('Failed to load post: ' + error.message);
        return;
      }
    }

    FormModal.prompt({
      title: slug ? 'Edit Blog Post' : 'New Blog Post',
      size: 'large',
      fields: [
        { name: 'slug', label: 'Slug', type: 'text', required: false, value: post?.slug || '' },
        { name: 'title', label: 'Title', type: 'text', required: true, value: post?.title || '' },
        { name: 'status', label: 'Status', type: 'select', required: true, value: post?.status || 'published', options: [
          { value: 'published', label: 'Published' },
          { value: 'pending', label: 'Pending' },
          { value: 'draft', label: 'Draft' },
          { value: 'rejected', label: 'Rejected' }
        ]},
        { name: 'author_name', label: 'Author Name', type: 'text', required: false, value: post?.author_name || '' },
        { name: 'author_email', label: 'Author Email', type: 'email', required: false, value: post?.author_email || '' },
        { name: 'html', label: 'HTML', type: 'textarea', rows: 8, value: post?.html || '' },
        { name: 'css', label: 'CSS', type: 'textarea', rows: 6, value: post?.css || '' }
      ],
      onSubmit: async (data) => {
        const spinner = LoadingSpinner.show({ text: 'Saving post...' });
        try {
          await saveBlogPost(apiClient, data);
          Toast.success('Blog post saved');
          await this.loadPosts();
        } catch (error) {
          console.error('Error saving post:', error);
          Toast.error('Failed to save post: ' + error.message);
        } finally {
          spinner.hide();
        }
      }
    });
  }

  async updateStatus(slug, status) {
    const spinner = LoadingSpinner.show({ text: 'Updating status...' });
    try {
      await setBlogStatus(apiClient, slug, status);
      Toast.success('Status updated');
      await this.loadPosts();
    } catch (error) {
      console.error('Error updating status:', error);
      Toast.error('Failed to update status: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  async removePost(slug) {
    await ConfirmModal.delete(slug, async () => {
      const spinner = LoadingSpinner.show({ text: 'Deleting post...' });
      try {
        await deleteBlogPost(apiClient, slug);
        Toast.success('Post deleted');
        await this.loadPosts();
      } catch (error) {
        console.error('Error deleting post:', error);
        Toast.error('Failed to delete post: ' + error.message);
      } finally {
        spinner.hide();
      }
    });
  }

  destroy() {
    if (this.table) this.table.destroy();
  }
}

export default BlogView;
