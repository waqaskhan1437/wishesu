/**
 * Forum table builders.
 */

import DataTable from '../components/data-table.js';
import { formatDate } from '../utils/date-utils.js';
import { createElement } from '../utils/dom-helper.js';

function statusPill(value) {
  const cls = value === 'approved' ? 'status-delivered' : (value === 'rejected' ? 'status-revision' : 'status-pending');
  return createElement('span', { className: cls, textContent: value || 'pending' });
}

export function createForumTopicsTable(topics, handlers) {
  return new DataTable({
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'title', label: 'Title', sortable: true },
      { key: 'author_name', label: 'Author', formatter: v => v || 'N/A' },
      { key: 'author_email', label: 'Email', formatter: v => v || 'N/A' },
      { key: 'status', label: 'Status', sortable: true, formatter: statusPill },
      { key: 'created_at', label: 'Created', sortable: true, formatter: formatDate }
    ],
    data: topics,
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 15,
    actions: (row) => [
      { label: 'Approve', className: 'btn btn-sm btn-primary', onClick: () => handlers.onStatus(row, 'approved') },
      { label: 'Reject', className: 'btn btn-sm btn-danger', onClick: () => handlers.onStatus(row, 'rejected') },
      { label: 'Edit', className: 'btn btn-sm btn-primary', onClick: () => handlers.onEdit(row) },
      { label: 'Delete', className: 'btn btn-sm btn-danger', onClick: () => handlers.onDelete(row) }
    ]
  });
}

export function createForumRepliesTable(replies, handlers) {
  return new DataTable({
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'topic_title', label: 'Topic', sortable: true },
      { key: 'author_name', label: 'Author', formatter: v => v || 'N/A' },
      { key: 'author_email', label: 'Email', formatter: v => v || 'N/A' },
      { key: 'status', label: 'Status', sortable: true, formatter: statusPill },
      { key: 'created_at', label: 'Created', sortable: true, formatter: formatDate }
    ],
    data: replies,
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 15,
    actions: (row) => [
      { label: 'Approve', className: 'btn btn-sm btn-primary', onClick: () => handlers.onStatus(row, 'approved') },
      { label: 'Reject', className: 'btn btn-sm btn-danger', onClick: () => handlers.onStatus(row, 'rejected') },
      { label: 'Edit', className: 'btn btn-sm btn-primary', onClick: () => handlers.onEdit(row) },
      { label: 'Delete', className: 'btn btn-sm btn-danger', onClick: () => handlers.onDelete(row) }
    ]
  });
}
