/**
 * Users table builder.
 */

import DataTable from '../components/data-table.js';
import { formatDate } from '../utils/date-utils.js';
import { createElement } from '../utils/dom-helper.js';

export function createUsersTable(users, handlers) {
  return new DataTable({
    columns: [
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
      { key: 'created_at', label: 'Created', sortable: true, formatter: formatDate }
    ],
    data: users,
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 20,
    actions: (row) => [
      {
        label: row.blocked ? 'Unblock' : 'Block',
        className: 'btn btn-sm btn-primary',
        onClick: () => handlers.onToggle(row)
      }
    ]
  });
}
