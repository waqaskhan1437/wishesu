/**
 * Chats View
 * Manage chat sessions (block/unblock, delete).
 */

import apiClient from '../core/api-client.js';
import ConfirmModal from '../components/confirm-modal.js';
import Toast from '../components/toast-notification.js';
import LoadingSpinner from '../components/loading-spinner.js';
import { createTableContainer } from './shared-containers.js';
import { withSpinner } from './shared-spinner.js';
import { createViewHeader } from './view-helpers.js';
import { createChatsTable } from './chats-table.js';
import { fetchChatSessions, blockChatSession, deleteChatSession } from './chats-api.js';

export class ChatsView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.sessions = [];
  }

  async render() {
    this.container.innerHTML = '';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-primary';
    refreshBtn.textContent = 'Refresh';
    refreshBtn.onclick = () => this.loadSessions();

    this.container.appendChild(createViewHeader('Chats', [refreshBtn]));
    this.container.appendChild(createTableContainer('chats-table-container'));

    await this.loadSessions();
  }

  async loadSessions() {
    await withSpinner('Loading chats...', async () => {
      try {
        this.sessions = await fetchChatSessions(apiClient);
        this._renderTable();
      } catch (error) {
        console.error('Error loading chats:', error);
        Toast.error('Failed to load chats: ' + error.message);
      }
    });
  }

  _renderTable() {
    if (this.table) this.table.destroy();

    const handlers = {
      onSelect: () => {},
      onToggleBlock: (row) => this.toggleBlock(row),
      onDelete: (row) => this.deleteSession(row)
    };

    this.table = createChatsTable(this.sessions, handlers);
    this.table.render('#chats-table-container');
  }

  async toggleBlock(row) {
    const next = !row.blocked;
    const spinner = LoadingSpinner.show({ text: next ? 'Blocking chat...' : 'Unblocking chat...' });
    try {
      await blockChatSession(apiClient, row.id, next);
      Toast.success(next ? 'Chat blocked' : 'Chat unblocked');
      await this.loadSessions();
    } catch (error) {
      console.error('Error updating chat:', error);
      Toast.error('Failed to update chat: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  async deleteSession(row) {
    await ConfirmModal.delete(
      row.email || row.id,
      async () => {
        const spinner = LoadingSpinner.show({ text: 'Deleting chat...' });
        try {
          await deleteChatSession(apiClient, row.id);
          Toast.success('Chat deleted');
          await this.loadSessions();
        } catch (error) {
          console.error('Error deleting chat:', error);
          Toast.error('Failed to delete chat: ' + error.message);
        } finally {
          spinner.hide();
        }
      }
    );
  }

  destroy() {
    if (this.table) this.table.destroy();
  }
}

export default ChatsView;
