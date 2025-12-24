/**
 * Users View
 * Manage customer block status.
 */

import apiClient from '../core/api-client.js';
import Toast from '../components/toast-notification.js';
import LoadingSpinner from '../components/loading-spinner.js';
import { createTableContainer } from './shared-containers.js';
import { withSpinner } from './shared-spinner.js';
import { createViewHeader } from './view-helpers.js';
import { createUsersTable } from './users-table.js';
import { fetchUsers, setUserBlocked } from './users-api.js';

export class UsersView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.users = [];
  }

  async render() {
    this.container.innerHTML = '';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-primary';
    refreshBtn.textContent = 'Refresh';
    refreshBtn.onclick = () => this.loadUsers();

    this.container.appendChild(createViewHeader('Users', [refreshBtn]));
    this.container.appendChild(createTableContainer('users-table-container'));

    await this.loadUsers();
  }

  async loadUsers() {
    await withSpinner('Loading users...', async () => {
      try {
        this.users = await fetchUsers(apiClient);
        this._renderTable();
      } catch (error) {
        console.error('Error loading users:', error);
        Toast.error('Failed to load users: ' + error.message);
      }
    });
  }

  _renderTable() {
    if (this.table) this.table.destroy();

    const handlers = {
      onToggle: (row) => this.toggleBlock(row)
    };

    this.table = createUsersTable(this.users, handlers);
    this.table.render('#users-table-container');
  }

  async toggleBlock(row) {
    const next = !row.blocked;
    const spinner = LoadingSpinner.show({ text: next ? 'Blocking user...' : 'Unblocking user...' });
    try {
      await setUserBlocked(apiClient, row.email, next);
      Toast.success(next ? 'User blocked' : 'User unblocked');
      await this.loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      Toast.error('Failed to update user: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  destroy() {
    if (this.table) this.table.destroy();
  }
}

export default UsersView;
