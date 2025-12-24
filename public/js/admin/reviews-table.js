/**
 * Reviews table builder.
 */

import DataTable from '../../../components/data-table.js';
import { formatDate } from '../../../utils/date-utils.js';
import { createElement } from '../../../utils/dom-helper.js';

function renderStars(value) {
  const count = parseInt(value, 10) || 0;
  return '*'.repeat(count);
}

export function createReviewsTable(reviews, handlers) {
  return new DataTable({
    columns: [
      {
        key: 'author',
        label: 'Author',
        sortable: true
      },
      {
        key: 'product_title',
        label: 'Product',
        sortable: true
      },
      {
        key: 'rating',
        label: 'Rating',
        sortable: true,
        formatter: (value) => {
          return createElement('span', {
            textContent: renderStars(value),
            title: `${value}/5 stars`
          });
        }
      },
      {
        key: 'review_text',
        label: 'Review',
        formatter: (value) => {
          if (!value) return 'N/A';
          const truncated = value.length > 100
            ? value.substring(0, 100) + '...'
            : value;
          return createElement('div', {
            textContent: truncated,
            title: value,
            style: 'max-width: 300px;'
          });
        }
      },
      {
        key: 'approved',
        label: 'Status',
        sortable: true,
        formatter: (value) => {
          return createElement('span', {
            className: value ? 'status-badge status-approved' : 'status-badge status-pending',
            textContent: value ? 'Approved' : 'Pending'
          });
        }
      },
      {
        key: 'created_at',
        label: 'Date',
        sortable: true,
        formatter: formatDate
      }
    ],
    data: reviews,
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 20,
    rowClass: (review) => review.approved ? '' : 'review-pending',
    actions: (review) => {
      const actions = [];

      if (!review.approved) {
        actions.push({
          label: 'Approve',
          className: 'btn btn-sm btn-success',
          icon: 'icon-check',
          onClick: handlers.onApprove
        });
      }

      actions.push({
        label: 'Delete',
        className: 'btn btn-sm btn-danger',
        icon: 'icon-trash',
        onClick: handlers.onDelete
      });

      return actions;
    }
  });
}
