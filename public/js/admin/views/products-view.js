/**
 * Products View
 * Manages products display and CRUD operations
 * Extracted from dashboard.js
 */

import apiClient from '../../core/api-client.js';
import stateManager from '../../core/state-manager.js';
import DataTable from '../../components/table/data-table.js';
import ConfirmModal from '../../components/modal/confirm-modal.js';
import Toast from '../../components/shared/toast-notification.js';
import LoadingSpinner from '../../components/shared/loading-spinner.js';
import { formatDate } from '../../utils/date-utils.js';
import { createElement } from '../../utils/dom-helper.js';
import { formatPrice } from '../../utils/format-utils.js';

export class ProductsView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.products = [];
  }

  /**
   * Render products view
   */
  async render() {
    // Clear container
    this.container.innerHTML = '';

    // Create header with actions
    const header = this._createHeader();
    this.container.appendChild(header);

    // Create table container
    const tableContainer = createElement('div', {
      className: 'table-container',
      id: 'products-table-container'
    });
    this.container.appendChild(tableContainer);

    // Load products
    await this.loadProducts();
  }

  /**
   * Create header with buttons
   */
  _createHeader() {
    const header = createElement('div', {
      className: 'view-header'
    });

    const createBtn = createElement('button', {
      className: 'btn btn-primary',
      textContent: '➕ Create New Product'
    });

    createBtn.addEventListener('click', () => {
      window.location.href = '/admin/product-form.html';
    });

    header.appendChild(createBtn);
    return header;
  }

  /**
   * Load products from API
   */
  async loadProducts() {
    const spinner = LoadingSpinner.show({ text: 'Loading products...' });

    try {
      const response = await apiClient.get('/api/products');

      if (response.products) {
        this.products = response.products;
        stateManager.set('products', this.products);
        this._renderTable();
      }

    } catch (error) {
      console.error('Error loading products:', error);
      Toast.error('Failed to load products: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  /**
   * Render products table
   */
  _renderTable() {
    // Destroy existing table
    if (this.table) {
      this.table.destroy();
    }

    // Create new table
    this.table = new DataTable({
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
          formatter: (value) => {
            const link = createElement('a', {
              href: `/product.html?slug=${value}`,
              target: '_blank',
              textContent: value,
              className: 'product-link'
            });
            return link;
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
            const badge = createElement('span', {
              className: value ? 'status-badge status-active' : 'status-badge status-inactive',
              textContent: value ? 'Active' : 'Inactive'
            });
            return badge;
          }
        },
        {
          key: 'created_at',
          label: 'Created',
          sortable: true,
          formatter: formatDate
        }
      ],
      data: this.products,
      sortable: true,
      filterable: true,
      pagination: true,
      pageSize: 20,
      actions: (product) => [
        {
          label: 'Edit',
          className: 'btn btn-sm btn-primary',
          icon: 'icon-edit',
          onClick: (product) => {
            window.location.href = `/admin/product-form.html?id=${product.id}`;
          }
        },
        {
          label: product.enabled ? 'Disable' : 'Enable',
          className: product.enabled ? 'btn btn-sm btn-warning' : 'btn btn-sm btn-success',
          onClick: (product) => this.toggleProductStatus(product)
        },
        {
          label: 'Duplicate',
          className: 'btn btn-sm btn-info',
          icon: 'icon-copy',
          onClick: (product) => this.duplicateProduct(product)
        },
        {
          label: 'Delete',
          className: 'btn btn-sm btn-danger',
          icon: 'icon-trash',
          onClick: (product) => this.deleteProduct(product)
        }
      ]
    });

    this.table.render('#products-table-container');
  }

  /**
   * Toggle product status (enable/disable)
   */
  async toggleProductStatus(product) {
    const action = product.enabled ? 'disable' : 'enable';
    const spinner = LoadingSpinner.show({ text: `${action}ing product...` });

    try {
      const response = await apiClient.post('/api/products/status', {
        id: product.id,
        enabled: !product.enabled
      });

      if (response.success) {
        Toast.success(`Product ${action}d successfully!`);
        await this.loadProducts(); // Reload products
      } else {
        throw new Error(response.error || `Failed to ${action} product`);
      }

    } catch (error) {
      console.error(`Error ${action}ing product:`, error);
      Toast.error(`Failed to ${action} product: ` + error.message);

    } finally {
      spinner.hide();
    }
  }

  /**
   * Duplicate product
   */
  async duplicateProduct(product) {
    const confirmed = await ConfirmModal.confirm({
      title: 'Duplicate Product',
      message: `Create a copy of "${product.title}"?`,
      confirmText: 'Duplicate',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: async () => {
        const spinner = LoadingSpinner.show({ text: 'Duplicating product...' });

        try {
          const response = await apiClient.post('/api/products/duplicate', {
            id: product.id
          });

          if (response.success) {
            Toast.success('Product duplicated successfully!');
            await this.loadProducts(); // Reload products
          } else {
            throw new Error(response.error || 'Failed to duplicate product');
          }

        } catch (error) {
          console.error('Error duplicating product:', error);
          Toast.error('Failed to duplicate product: ' + error.message);

        } finally {
          spinner.hide();
        }
      }
    });
  }

  /**
   * Delete product
   */
  async deleteProduct(product) {
    const confirmed = await ConfirmModal.delete(
      product.title,
      async () => {
        const spinner = LoadingSpinner.show({ text: 'Deleting product...' });

        try {
          const response = await apiClient.post('/api/product/delete', {
            id: product.id
          });

          if (response.success) {
            Toast.success('Product deleted successfully!');
            await this.loadProducts(); // Reload products
          } else {
            throw new Error(response.error || 'Failed to delete product');
          }

        } catch (error) {
          console.error('Error deleting product:', error);
          Toast.error('Failed to delete product: ' + error.message);

        } finally {
          spinner.hide();
        }
      }
    );
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.table) {
      this.table.destroy();
    }
  }
}

export default ProductsView;
