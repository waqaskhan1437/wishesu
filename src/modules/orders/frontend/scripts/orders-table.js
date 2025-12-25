/**
 * Orders table builder.
 */

import DataTable from '../components/data-table.js';
import { formatDate } from '../utils/date-utils.js';
import { createElement } from '../utils/dom-helper.js';

export function createOrdersTable(orders, handlers) {
  const getCountdown = handlers.getCountdownDisplay;

  return new DataTable({
    columns: [
      {
        key: 'order_id',
        label: 'Order ID',
        sortable: true,
        formatter: (value) => `<strong>#${value}</strong>`
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        formatter: (value) => value || 'N/A'
      },
      {
        key: 'product',
        label: 'Product',
        sortable: true
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        formatter: (value) => `$${parseFloat(value || 0).toFixed(2)}`
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        formatter: (value) => {
          const span = createElement('span', {
            className: `status-badge status-${value}`,
            textContent: value
          });
          return span;
        }
      },
      {
        key: 'delivery_deadline',
        label: 'Time Left',
        formatter: (value, row) => getCountdown(value, row.status)
      },
      {
        key: 'created_at',
        label: 'Date',
        sortable: true,
        formatter: formatDate
      }
    ],
    data: orders,
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 20,
    rowClick: handlers.onRowClick,
    actions: (order) => [
      {
        label: 'View',
        className: 'btn btn-sm btn-primary',
        icon: 'icon-eye',
        onClick: handlers.onRowClick
      },
      {
        label: 'Delete',
        className: 'btn btn-sm btn-danger',
        icon: 'icon-trash',
        onClick: handlers.onDelete
      }
    ]
  });
}
