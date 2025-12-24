/**
 * Products table builder.
 */

import DataTable from '../components/data-table.js';
import { formatDate } from '../utils/date-utils.js';
import { createElement } from '../utils/dom-helper.js';
import { formatPrice } from '../utils/format-utils.js';

export function createProductsTable(products, handlers) {
  return new DataTable({
    columns: [
      {
        key: 'title',
        label: 'Product',
        sortable: true,
        formatter: (value, row) => {
          const container = createElement('div', {
            className: 'product-cell'
          });

          if (row.image_url) {
            const img = createElement('img', {
              src: row.image_url,
              className: 'product-thumbnail',
              style: 'width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 10px;'
            });
            container.appendChild(img);
          }

          const title = createElement('strong', {
            textContent: value
          });
          container.appendChild(title);

          return container;
        }
      },
      {
        key: 'slug',
        label: 'Slug',
        sortable: true,
        formatter: (value, row) => {
          const slug = value || '';
          const href = row && row.id
            ? `/product-${encodeURIComponent(row.id)}/${encodeURIComponent(slug)}`
            : `/product/${encodeURIComponent(slug)}`;
          return createElement('a', {
            href,
            target: '_blank',
            textContent: slug,
            className: 'product-link'
          });
        }
      },
      {
        key: 'normal_price',
        label: 'Price',
        sortable: true,
        formatter: (value, row) => {
          if (row.sale_price) {
            const container = createElement('div');
            const original = createElement('span', {
              textContent: formatPrice(value),
              style: 'text-decoration: line-through; color: #999; margin-right: 5px;'
            });
            const sale = createElement('span', {
              textContent: formatPrice(row.sale_price),
              className: 'text-success',
              style: 'font-weight: bold;'
            });
            container.appendChild(original);
            container.appendChild(sale);
            return container;
          }
          return formatPrice(value);
        }
      },
      {
        key: 'enabled',
        label: 'Status',
        sortable: true,
        formatter: (value) => {
          return createElement('span', {
            className: value ? 'status-badge status-active' : 'status-badge status-inactive',
            textContent: value ? 'Active' : 'Inactive'
          });
        }
      },
      {
        key: 'created_at',
        label: 'Created',
        sortable: true,
        formatter: formatDate
      }
    ],
    data: products,
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 20,
    actions: (product) => [
      {
        label: 'Edit',
        className: 'btn btn-sm btn-primary',
        icon: 'icon-edit',
        onClick: handlers.onEdit
      },
      {
        label: product.enabled ? 'Disable' : 'Enable',
        className: product.enabled ? 'btn btn-sm btn-warning' : 'btn btn-sm btn-success',
        onClick: handlers.onToggleStatus
      },
      {
        label: 'Duplicate',
        className: 'btn btn-sm btn-info',
        icon: 'icon-copy',
        onClick: handlers.onDuplicate
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
