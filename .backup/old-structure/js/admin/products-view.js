/**
 * Products View
 * Manages products display and CRUD operations
 */

import apiClient from '../core/api-client.js';
import stateManager from '../core/state-manager.js';
import ConfirmModal from '../components/confirm-modal.js';
import Toast from '../components/toast-notification.js';
import LoadingSpinner from '../components/loading-spinner.js';
import { createTableContainer } from './shared-containers.js';
import { withSpinner } from './shared-spinner.js';
import { createProductsHeader } from './products-header.js';
import { createProductsTable } from './products-table.js';
import { fetchProducts, toggleProductStatus, duplicateProduct, deleteProduct } from './products-api.js';

export class ProductsView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.products = [];
  }

  async render() {
    this.container.innerHTML = '';

    const header = createProductsHeader(() => {
      window.location.href = '/admin/product-form.html';
    });
    this.container.appendChild(header);

    const tableContainer = createTableContainer('products-table-container');
    this.container.appendChild(tableContainer);

    await this.loadProducts();
  }

  async loadProducts() {
    await withSpinner('Loading products...', async () => {
      try {
        this.products = await fetchProducts(apiClient);
        stateManager.set('products', this.products);
        this._renderTable();
      } catch (error) {
        console.error('Error loading products:', error);
        Toast.error('Failed to load products: ' + error.message);
      }
    });
  }

  _renderTable() {
    if (this.table) {
      this.table.destroy();
    }

    const handlers = {
      onEdit: (product) => {
        window.location.href = `/admin/product-form.html?id=${product.id}`;
      },
      onToggleStatus: (product) => this.toggleProductStatus(product),
      onDuplicate: (product) => this.duplicateProduct(product),
      onDelete: (product) => this.deleteProduct(product)
    };

    this.table = createProductsTable(this.products, handlers);
    this.table.render('#products-table-container');
  }

  async toggleProductStatus(product) {
    const action = product.enabled ? 'disable' : 'enable';
    const spinner = LoadingSpinner.show({ text: `${action}ing product...` });

    try {
      await toggleProductStatus(apiClient, product.id, !product.enabled);
      Toast.success(`Product ${action}d successfully!`);
      await this.loadProducts();
    } catch (error) {
      console.error(`Error ${action}ing product:`, error);
      Toast.error(`Failed to ${action} product: ` + error.message);
    } finally {
      spinner.hide();
    }
  }

  async duplicateProduct(product) {
    await ConfirmModal.confirm({
      title: 'Duplicate Product',
      message: `Create a copy of "${product.title}"?`,
      confirmText: 'Duplicate',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: async () => {
        const spinner = LoadingSpinner.show({ text: 'Duplicating product...' });

        try {
          await duplicateProduct(apiClient, product.id);
          Toast.success('Product duplicated successfully!');
          await this.loadProducts();
        } catch (error) {
          console.error('Error duplicating product:', error);
          Toast.error('Failed to duplicate product: ' + error.message);
        } finally {
          spinner.hide();
        }
      }
    });
  }

  async deleteProduct(product) {
    await ConfirmModal.delete(
      product.title,
      async () => {
        const spinner = LoadingSpinner.show({ text: 'Deleting product...' });

        try {
          await deleteProduct(apiClient, product.id);
          Toast.success('Product deleted successfully!');
          await this.loadProducts();
        } catch (error) {
          console.error('Error deleting product:', error);
          Toast.error('Failed to delete product: ' + error.message);
        } finally {
          spinner.hide();
        }
      }
    );
  }

  destroy() {
    if (this.table) {
      this.table.destroy();
    }
  }
}

export default ProductsView;
