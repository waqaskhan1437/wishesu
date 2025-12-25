/**
 * Users View
 * Manages users/customers display and blocking
 */

import apiClient from '../../core/api-client.js';
import stateManager from '../../core/state-manager.js';
import DataTable from '../../components/table/data-table.js';
import ConfirmModal from '../../components/modal/confirm-modal.js';
import Toast from '../../components/shared/toast-notification.js';
import LoadingSpinner from '../../components/shared/loading-spinner.js';
import { formatDate } from '../../utils/date-utils.js';
import { createElement } from '../../utils/dom-helper.js';

export class UsersView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.users = [];
  }

  async render() {
    this.container.innerHTML = '';

    const header = this._createHeader();
    this.container.appendChild(header);

    const tableContainer = createElement('div', {
      className: 'table-container',
      id: 'users-table-container'
    });
    this.container.appendChild(tableContainer);

    await this.loadUsers();
  }

  _createHeader() {
    const header = createElement('div', {
      className: 'view-header',
      style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;'
    });

    const title = createElement('h2', {
      textContent: 'Users / Customers',
      style: 'margin: 0;'
    });

    const refreshBtn = createElement('button', {
      className: 'btn btn-secondary',
      innerHTML: '🔄 Refresh'
    });
    refreshBtn.addEventListener('click', () => this.loadUsers());

    header.appendChild(title);
    header.appendChild(refreshBtn);
    return header;
  }

  async loadUsers() {
    const spinner = LoadingSpinner.show({ text: 'Loading users...' });

    try {
      const response = await apiClient.get('/api/admin/users/list');

      if (response.users) {
        this.users = response.users;
        stateManager.set('users', this.users);
        this._renderTable();
      }

    } catch (error) {
      console.error('Error loading users:', error);
      Toast.show({ message: 'Failed to load users', type: 'error' });
    } finally {
      LoadingSpinner.hide(spinner);
    }
  }

  _renderTable() {
    const container = document.getElementById('users-table-container');
    if (!container) return;

    if (this.users.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
      return;
    }

    const columns = [
      { key: 'email', label: 'Email', width: '250px' },
      { key: 'name', label: 'Name', width: '150px' },
      { key: 'orders_count', label: 'Orders', width: '80px' },
      { key: 'total_spent', label: 'Total Spent', width: '120px', render: (val) => val ? `$${parseFloat(val).toFixed(2)}` : '$0.00' },
      { key: 'blocked', label: 'Status', width: '100px', render: (val) => val ? '🚫 Blocked' : '✅ Active' },
      { key: 'created_at', label: 'Joined', width: '150px', render: (val) => formatDate(val) },
      { key: 'actions', label: 'Actions', width: '150px' }
    ];

    this.table = new DataTable({
      container,
      columns,
      data: this.users,
      actions: [
        {
          label: '🚫 Block',
          className: 'btn-warning btn-sm',
          condition: (row) => !row.blocked,
          onClick: (row) => this.blockUser(row.email, true)
        },
        {
          label: '✅ Unblock',
          className: 'btn-success btn-sm',
          condition: (row) => row.blocked,
          onClick: (row) => this.blockUser(row.email, false)
        }
      ]
    });

    this.table.render();
  }

  async blockUser(email, blocked) {
    const action = blocked ? 'block' : 'unblock';
    const confirmed = await ConfirmModal.show({
      title: `${blocked ? 'Block' : 'Unblock'} User`,
      message: `Are you sure you want to ${action} ${email}?`,
      confirmText: blocked ? 'Block' : 'Unblock',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await apiClient.post('/api/admin/users/block', { email, blocked });
      Toast.show({ message: `User ${action}ed successfully`, type: 'success' });
      await this.loadUsers();
    } catch (error) {
      Toast.show({ message: `Failed to ${action} user`, type: 'error' });
    }
  }
}

export default UsersView;
