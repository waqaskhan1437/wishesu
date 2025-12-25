/**
 * Pages table builder.
 */

import DataTable from '../components/data-table.js';
import { createElement } from '../utils/dom-helper.js';

export function createPagesTable(pages, handlers) {
  return new DataTable({
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'title', label: 'Title', sortable: true },
      { key: 'url', label: 'URL' },
      { key: 'size', label: 'Size' },
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
      }
    ],
    data: pages,
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 15,
    actions: (row) => [
      { label: 'Edit', className: 'btn btn-sm btn-primary', onClick: () => handlers.onEdit(row) },
      { label: 'Open', className: 'btn btn-sm btn-primary', onClick: () => handlers.onOpen(row) },
      { label: 'Duplicate', className: 'btn btn-sm btn-primary', onClick: () => handlers.onDuplicate(row) },
      { label: row.status === 'published' ? 'Draft' : 'Publish', className: 'btn btn-sm btn-primary', onClick: () => handlers.onToggleStatus(row) },
      { label: 'Delete', className: 'btn btn-sm btn-danger', onClick: () => handlers.onDelete(row) }
    ]
  });
}
