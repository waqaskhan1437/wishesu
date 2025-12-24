/**
 * Chats table builder.
 */

import DataTable from '../components/data-table.js';
import { formatDate } from '../utils/date-utils.js';
import { createElement } from '../utils/dom-helper.js';

function formatMessage(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  if (value.length <= 60) return value;
  return value.slice(0, 57) + '...';
}

export function createChatsTable(sessions, handlers) {
  return new DataTable({
    columns: [
      { key: 'id', label: 'Session ID', sortable: true },
      { key: 'name', label: 'Name', sortable: true, formatter: v => v || 'N/A' },
      { key: 'email', label: 'Email', sortable: true },
      {
        key: 'blocked',
        label: 'Blocked',
        sortable: true,
        formatter: value => {
          const pill = createElement('span', {
            className: value ? 'status-revision' : 'status-delivered',
            textContent: value ? 'Yes' : 'No'
          });
          return pill;
        }
      },
      { key: 'last_message', label: 'Last Message', formatter: formatMessage },
      { key: 'last_message_at', label: 'Last Activity', sortable: true, formatter: formatDate },
      { key: 'created_at', label: 'Created', sortable: true, formatter: formatDate }
    ],
    data: sessions,
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 20,
    rowClick: handlers.onSelect,
    actions: (row) => [
      {
        label: row.blocked ? 'Unblock' : 'Block',
        className: 'btn btn-sm btn-primary',
        onClick: () => handlers.onToggleBlock(row)
      },
      {
        label: 'Delete',
        className: 'btn btn-sm btn-danger',
        onClick: () => handlers.onDelete(row)
      }
    ]
  });
}
