/**
 * Forum View
 * Manages forum topics and replies moderation
 */

import apiClient from '../../core/api-client.js';
import stateManager from '../../core/state-manager.js';
import DataTable from '../../components/table/data-table.js';
import ConfirmModal from '../../components/modal/confirm-modal.js';
import Toast from '../../components/shared/toast-notification.js';
import LoadingSpinner from '../../components/shared/loading-spinner.js';
import { formatDate } from '../../utils/date-utils.js';
import { createElement } from '../../utils/dom-helper.js';

export class ForumView {
  constructor(container) {
    this.container = container;
    this.topics = [];
    this.replies = [];
    this.activeTab = 'topics';
  }

  async render() {
    this.container.innerHTML = '';

    const header = this._createHeader();
    this.container.appendChild(header);

    const tabs = this._createTabs();
    this.container.appendChild(tabs);

    const tableContainer = createElement('div', {
      className: 'table-container',
      id: 'forum-table-container'
    });
    this.container.appendChild(tableContainer);

    await this.loadData();
  }

  _createHeader() {
    const header = createElement('div', {
      className: 'view-header',
      style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;'
    });

    const title = createElement('h2', {
      textContent: 'Forum Management',
      style: 'margin: 0;'
    });

    const refreshBtn = createElement('button', {
      className: 'btn btn-secondary',
      innerHTML: '🔄 Refresh'
    });
    refreshBtn.addEventListener('click', () => this.loadData());

    header.appendChild(title);
    header.appendChild(refreshBtn);
    return header;
  }

  _createTabs() {
    const tabContainer = createElement('div', {
      className: 'tabs',
      style: 'display: flex; gap: 10px; margin-bottom: 20px;'
    });

    const topicsTab = createElement('button', {
      className: `btn ${this.activeTab === 'topics' ? 'btn-primary' : 'btn-secondary'}`,
      textContent: '📋 Topics',
      id: 'tab-topics'
    });
    topicsTab.addEventListener('click', () => this.switchTab('topics'));

    const repliesTab = createElement('button', {
      className: `btn ${this.activeTab === 'replies' ? 'btn-primary' : 'btn-secondary'}`,
      textContent: '💬 Replies',
      id: 'tab-replies'
    });
    repliesTab.addEventListener('click', () => this.switchTab('replies'));

    tabContainer.appendChild(topicsTab);
    tabContainer.appendChild(repliesTab);
    return tabContainer;
  }

  async switchTab(tab) {
    this.activeTab = tab;
    
    // Update tab buttons
    document.getElementById('tab-topics').className = `btn ${tab === 'topics' ? 'btn-primary' : 'btn-secondary'}`;
    document.getElementById('tab-replies').className = `btn ${tab === 'replies' ? 'btn-primary' : 'btn-secondary'}`;
    
    this._renderTable();
  }

  async loadData() {
    const spinner = LoadingSpinner.show({ text: 'Loading forum data...' });

    try {
      const [topicsRes, repliesRes] = await Promise.all([
        apiClient.get('/api/admin/forum/topics'),
        apiClient.get('/api/admin/forum/replies')
      ]);

      this.topics = topicsRes.topics || [];
      this.replies = repliesRes.replies || [];
      
      stateManager.set('forumTopics', this.topics);
      stateManager.set('forumReplies', this.replies);
      
      this._renderTable();

    } catch (error) {
      console.error('Error loading forum data:', error);
      Toast.show({ message: 'Failed to load forum data', type: 'error' });
    } finally {
      LoadingSpinner.hide(spinner);
    }
  }

  _renderTable() {
    const container = document.getElementById('forum-table-container');
    if (!container) return;

    if (this.activeTab === 'topics') {
      this._renderTopicsTable(container);
    } else {
      this._renderRepliesTable(container);
    }
  }

  _renderTopicsTable(container) {
    if (this.topics.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No forum topics found</p></div>';
      return;
    }

    const columns = [
      { key: 'title', label: 'Title', width: '250px' },
      { key: 'author_name', label: 'Author', width: '150px' },
      { key: 'email', label: 'Email', width: '180px' },
      { key: 'status', label: 'Status', width: '100px', render: (val) => this._renderStatus(val) },
      { key: 'created_at', label: 'Created', width: '150px', render: (val) => formatDate(val) },
      { key: 'actions', label: 'Actions', width: '200px' }
    ];

    const table = new DataTable({
      container,
      columns,
      data: this.topics,
      actions: [
        {
          label: '✅ Approve',
          className: 'btn-success btn-sm',
          condition: (row) => row.status !== 'approved',
          onClick: (row) => this.updateTopicStatus(row.id, 'approved')
        },
        {
          label: '🚫 Reject',
          className: 'btn-warning btn-sm',
          condition: (row) => row.status !== 'rejected',
          onClick: (row) => this.updateTopicStatus(row.id, 'rejected')
        },
        {
          label: '🗑️',
          className: 'btn-danger btn-sm',
          onClick: (row) => this.deleteTopic(row.id)
        }
      ]
    });

    table.render();
  }

  _renderRepliesTable(container) {
    if (this.replies.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No forum replies found</p></div>';
      return;
    }

    const columns = [
      { key: 'content', label: 'Content', width: '300px', render: (val) => val?.substring(0, 100) + '...' },
      { key: 'author_name', label: 'Author', width: '150px' },
      { key: 'status', label: 'Status', width: '100px', render: (val) => this._renderStatus(val) },
      { key: 'created_at', label: 'Created', width: '150px', render: (val) => formatDate(val) },
      { key: 'actions', label: 'Actions', width: '200px' }
    ];

    const table = new DataTable({
      container,
      columns,
      data: this.replies,
      actions: [
        {
          label: '✅ Approve',
          className: 'btn-success btn-sm',
          condition: (row) => row.status !== 'approved',
          onClick: (row) => this.updateReplyStatus(row.id, 'approved')
        },
        {
          label: '🚫 Reject',
          className: 'btn-warning btn-sm',
          condition: (row) => row.status !== 'rejected',
          onClick: (row) => this.updateReplyStatus(row.id, 'rejected')
        },
        {
          label: '🗑️',
          className: 'btn-danger btn-sm',
          onClick: (row) => this.deleteReply(row.id)
        }
      ]
    });

    table.render();
  }

  _renderStatus(status) {
    const statusMap = {
      'approved': '<span style="color: green;">✅ Approved</span>',
      'pending': '<span style="color: orange;">⏳ Pending</span>',
      'rejected': '<span style="color: red;">🚫 Rejected</span>'
    };
    return statusMap[status] || status;
  }

  async updateTopicStatus(id, status) {
    try {
      await apiClient.post('/api/admin/forum/topic/status', { id, status });
      Toast.show({ message: `Topic ${status}`, type: 'success' });
      await this.loadData();
    } catch (error) {
      Toast.show({ message: 'Failed to update topic', type: 'error' });
    }
  }

  async updateReplyStatus(id, status) {
    try {
      await apiClient.post('/api/admin/forum/reply/status', { id, status });
      Toast.show({ message: `Reply ${status}`, type: 'success' });
      await this.loadData();
    } catch (error) {
      Toast.show({ message: 'Failed to update reply', type: 'error' });
    }
  }

  async deleteTopic(id) {
    const confirmed = await ConfirmModal.show({
      title: 'Delete Topic',
      message: 'Are you sure you want to delete this topic and all its replies?',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await apiClient.post('/api/admin/forum/topic/delete', { id });
      Toast.show({ message: 'Topic deleted', type: 'success' });
      await this.loadData();
    } catch (error) {
      Toast.show({ message: 'Failed to delete topic', type: 'error' });
    }
  }

  async deleteReply(id) {
    const confirmed = await ConfirmModal.show({
      title: 'Delete Reply',
      message: 'Are you sure you want to delete this reply?',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await apiClient.post('/api/admin/forum/reply/delete', { id });
      Toast.show({ message: 'Reply deleted', type: 'success' });
      await this.loadData();
    } catch (error) {
      Toast.show({ message: 'Failed to delete reply', type: 'error' });
    }
  }
}

export default ForumView;
