/**
 * Chats View
 * Manages chat sessions display and moderation
 */

import apiClient from '../../core/api-client.js';
import stateManager from '../../core/state-manager.js';
import DataTable from '../../components/table/data-table.js';
import ConfirmModal from '../../components/modal/confirm-modal.js';
import Toast from '../../components/shared/toast-notification.js';
import LoadingSpinner from '../../components/shared/loading-spinner.js';
import { formatDate } from '../../utils/date-utils.js';
import { createElement } from '../../utils/dom-helper.js';

export class ChatsView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.sessions = [];
  }

  async render() {
    this.container.innerHTML = '';

    const header = this._createHeader();
    this.container.appendChild(header);

    const tableContainer = createElement('div', {
      className: 'table-container',
      id: 'chats-table-container'
    });
    this.container.appendChild(tableContainer);

    await this.loadSessions();
  }

  _createHeader() {
    const header = createElement('div', {
      className: 'view-header',
      style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;'
    });

    const title = createElement('h2', {
      textContent: 'Chat Sessions',
      style: 'margin: 0;'
    });

    const refreshBtn = createElement('button', {
      className: 'btn btn-secondary',
      innerHTML: '🔄 Refresh'
    });

    refreshBtn.addEventListener('click', () => this.loadSessions());

    header.appendChild(title);
    header.appendChild(refreshBtn);
    return header;
  }

  async loadSessions() {
    const spinner = LoadingSpinner.show({ text: 'Loading chat sessions...' });

    try {
      const response = await apiClient.get('/api/admin/chats/sessions');

      if (response.sessions) {
        this.sessions = response.sessions;
        stateManager.set('chatSessions', this.sessions);
        this._renderTable();
      }

    } catch (error) {
      console.error('Error loading sessions:', error);
      Toast.show({ message: 'Failed to load chat sessions', type: 'error' });
    } finally {
      LoadingSpinner.hide(spinner);
    }
  }

  _renderTable() {
    const container = document.getElementById('chats-table-container');
    if (!container) return;

    if (this.sessions.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No chat sessions found</p></div>';
      return;
    }

    const columns = [
      { key: 'session_id', label: 'Session ID', width: '200px' },
      { key: 'email', label: 'Email', width: '200px' },
      { key: 'message_count', label: 'Messages', width: '100px' },
      { key: 'blocked', label: 'Status', width: '100px', render: (val) => val ? '🚫 Blocked' : '✅ Active' },
      { key: 'created_at', label: 'Created', width: '150px', render: (val) => formatDate(val) },
      { key: 'actions', label: 'Actions', width: '150px' }
    ];

    this.table = new DataTable({
      container,
      columns,
      data: this.sessions,
      actions: [
        {
          label: '🚫 Block',
          className: 'btn-warning btn-sm',
          condition: (row) => !row.blocked,
          onClick: (row) => this.blockSession(row.session_id)
        },
        {
          label: '✅ Unblock',
          className: 'btn-success btn-sm',
          condition: (row) => row.blocked,
          onClick: (row) => this.unblockSession(row.session_id)
        },
        {
          label: '🗑️',
          className: 'btn-danger btn-sm',
          onClick: (row) => this.deleteSession(row.session_id)
        }
      ]
    });

    this.table.render();
  }

  async blockSession(sessionId) {
    try {
      await apiClient.post('/api/admin/chats/block', { sessionId, blocked: true });
      Toast.show({ message: 'Session blocked', type: 'success' });
      await this.loadSessions();
    } catch (error) {
      Toast.show({ message: 'Failed to block session', type: 'error' });
    }
  }

  async unblockSession(sessionId) {
    try {
      await apiClient.post('/api/admin/chats/block', { sessionId, blocked: false });
      Toast.show({ message: 'Session unblocked', type: 'success' });
      await this.loadSessions();
    } catch (error) {
      Toast.show({ message: 'Failed to unblock session', type: 'error' });
    }
  }

  async deleteSession(sessionId) {
    const confirmed = await ConfirmModal.show({
      title: 'Delete Session',
      message: 'Are you sure you want to delete this chat session? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/admin/chats/delete?sessionId=${sessionId}`);
      Toast.show({ message: 'Session deleted', type: 'success' });
      await this.loadSessions();
    } catch (error) {
      Toast.show({ message: 'Failed to delete session', type: 'error' });
    }
  }
}

export default ChatsView;
