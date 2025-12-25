/**
 * Blog table builder.
 */

import DataTable from '../components/data-table.js';
import { formatDate } from '../utils/date-utils.js';
import { createElement } from '../utils/dom-helper.js';

export function createBlogTable(posts, handlers) {
  return new DataTable({
    columns: [
      { key: 'slug', label: 'Slug', sortable: true },
      { key: 'title', label: 'Title', sortable: true },
      { key: 'author_name', label: 'Author', formatter: v => v || 'N/A' },
      { key: 'author_email', label: 'Email', formatter: v => v || 'N/A' },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        formatter: value => {
          const pill = createElement('span', {
            className: value === 'published' ? 'status-delivered' : 'status-pending',
            textContent: value || 'published'
          });
          return pill;
        }
      },
      { key: 'created_at', label: 'Created', sortable: true, formatter: formatDate }
    ],
    data: posts,
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 15,
    actions: (row) => [
      {
        label: 'Edit',
        className: 'btn btn-sm btn-primary',
        onClick: () => handlers.onEdit(row)
      },
      {
        label: 'Publish',
        className: 'btn btn-sm btn-primary',
        onClick: () => handlers.onStatus(row, 'published')
      },
      {
        label: 'Reject',
        className: 'btn btn-sm btn-danger',
        onClick: () => handlers.onStatus(row, 'rejected')
      },
      {
        label: 'Delete',
        className: 'btn btn-sm btn-danger',
        onClick: () => handlers.onDelete(row)
      }
    ]
  });
}
