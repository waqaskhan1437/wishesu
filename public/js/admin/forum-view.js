/**
 * Forum View
 * Manage topics and replies.
 */

import apiClient from '../core/api-client.js';
import FormModal from '../components/form-modal.js';
import ConfirmModal from '../components/confirm-modal.js';
import Toast from '../components/toast-notification.js';
import LoadingSpinner from '../components/loading-spinner.js';
import { createTableContainer } from './shared-containers.js';
import { withSpinner } from './shared-spinner.js';
import { createViewHeader } from './view-helpers.js';
import { createForumTopicsTable, createForumRepliesTable } from './forum-table.js';
import {
  fetchForumTopics,
  fetchForumReplies,
  setForumTopicStatus,
  setForumReplyStatus,
  updateForumTopic,
  updateForumReply,
  deleteForumTopic,
  deleteForumReply
} from './forum-api.js';

export class ForumView {
  constructor(container) {
    this.container = container;
    this.topicsTable = null;
    this.repliesTable = null;
    this.topics = [];
    this.replies = [];
    this.filterStatus = '';
  }

  async render() {
    this.container.innerHTML = '';

    const filter = document.createElement('select');
    filter.className = 'btn';
    filter.innerHTML = `
      <option value="">All</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    `;
    filter.onchange = () => {
      this.filterStatus = filter.value;
      this.loadData();
    };

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-primary';
    refreshBtn.textContent = 'Refresh';
    refreshBtn.onclick = () => this.loadData();

    this.container.appendChild(createViewHeader('Forum', [filter, refreshBtn]));

    const topicsTitle = document.createElement('h3');
    topicsTitle.textContent = 'Topics';
    topicsTitle.style.margin = '10px 0 12px';
    this.container.appendChild(topicsTitle);
    this.container.appendChild(createTableContainer('forum-topics-container'));

    const repliesTitle = document.createElement('h3');
    repliesTitle.textContent = 'Replies';
    repliesTitle.style.margin = '24px 0 12px';
    this.container.appendChild(repliesTitle);
    this.container.appendChild(createTableContainer('forum-replies-container'));

    await this.loadData();
  }

  async loadData() {
    await withSpinner('Loading forum data...', async () => {
      try {
        this.topics = await fetchForumTopics(apiClient, this.filterStatus || undefined);
        this.replies = await fetchForumReplies(apiClient, this.filterStatus || undefined);
        this._renderTables();
      } catch (error) {
        console.error('Error loading forum data:', error);
        Toast.error('Failed to load forum data: ' + error.message);
      }
    });
  }

  _renderTables() {
    if (this.topicsTable) this.topicsTable.destroy();
    if (this.repliesTable) this.repliesTable.destroy();

    const topicHandlers = {
      onStatus: (row, status) => this.updateTopicStatus(row, status),
      onEdit: (row) => this.editTopic(row),
      onDelete: (row) => this.removeTopic(row)
    };
    const replyHandlers = {
      onStatus: (row, status) => this.updateReplyStatus(row, status),
      onEdit: (row) => this.editReply(row),
      onDelete: (row) => this.removeReply(row)
    };

    this.topicsTable = createForumTopicsTable(this.topics, topicHandlers);
    this.topicsTable.render('#forum-topics-container');

    this.repliesTable = createForumRepliesTable(this.replies, replyHandlers);
    this.repliesTable.render('#forum-replies-container');
  }

  async updateTopicStatus(row, status) {
    const spinner = LoadingSpinner.show({ text: 'Updating topic...' });
    try {
      await setForumTopicStatus(apiClient, row.id, status);
      Toast.success('Topic updated');
      await this.loadData();
    } catch (error) {
      console.error('Error updating topic:', error);
      Toast.error('Failed to update topic: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  async updateReplyStatus(row, status) {
    const spinner = LoadingSpinner.show({ text: 'Updating reply...' });
    try {
      await setForumReplyStatus(apiClient, row.id, status);
      Toast.success('Reply updated');
      await this.loadData();
    } catch (error) {
      console.error('Error updating reply:', error);
      Toast.error('Failed to update reply: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  editTopic(row) {
    FormModal.prompt({
      title: 'Edit Topic',
      size: 'large',
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true, value: row.title || '' },
        { name: 'body', label: 'Body', type: 'textarea', rows: 6, value: '' }
      ],
      onSubmit: async (data) => {
        const spinner = LoadingSpinner.show({ text: 'Saving topic...' });
        try {
          await updateForumTopic(apiClient, { id: row.id, title: data.title, body: data.body });
          Toast.success('Topic saved');
          await this.loadData();
        } catch (error) {
          console.error('Error saving topic:', error);
          Toast.error('Failed to save topic: ' + error.message);
        } finally {
          spinner.hide();
        }
      }
    });
  }

  editReply(row) {
    FormModal.prompt({
      title: 'Edit Reply',
      size: 'large',
      fields: [
        { name: 'body', label: 'Body', type: 'textarea', rows: 6, value: '' }
      ],
      onSubmit: async (data) => {
        const spinner = LoadingSpinner.show({ text: 'Saving reply...' });
        try {
          await updateForumReply(apiClient, { id: row.id, body: data.body });
          Toast.success('Reply saved');
          await this.loadData();
        } catch (error) {
          console.error('Error saving reply:', error);
          Toast.error('Failed to save reply: ' + error.message);
        } finally {
          spinner.hide();
        }
      }
    });
  }

  async removeTopic(row) {
    await ConfirmModal.delete(row.title || row.id, async () => {
      const spinner = LoadingSpinner.show({ text: 'Deleting topic...' });
      try {
        await deleteForumTopic(apiClient, row.id);
        Toast.success('Topic deleted');
        await this.loadData();
      } catch (error) {
        console.error('Error deleting topic:', error);
        Toast.error('Failed to delete topic: ' + error.message);
      } finally {
        spinner.hide();
      }
    });
  }

  async removeReply(row) {
    await ConfirmModal.delete(row.id, async () => {
      const spinner = LoadingSpinner.show({ text: 'Deleting reply...' });
      try {
        await deleteForumReply(apiClient, row.id);
        Toast.success('Reply deleted');
        await this.loadData();
      } catch (error) {
        console.error('Error deleting reply:', error);
        Toast.error('Failed to delete reply: ' + error.message);
      } finally {
        spinner.hide();
      }
    });
  }

  destroy() {
    if (this.topicsTable) this.topicsTable.destroy();
    if (this.repliesTable) this.repliesTable.destroy();
  }
}

export default ForumView;
