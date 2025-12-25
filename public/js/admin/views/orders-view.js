/**
 * Orders View
 * Manages orders display and CRUD operations
 * Extracted from dashboard.js (lines ~159-700)
 */

import apiClient from '../../core/api-client.js';
import stateManager from '../../core/state-manager.js';
import DataTable from '../../components/table/data-table.js';
import FormModal from '../../components/modal/form-modal.js';
import ConfirmModal from '../../components/modal/confirm-modal.js';
import Toast from '../../components/shared/toast-notification.js';
import LoadingSpinner from '../../components/shared/loading-spinner.js';
import { formatDate } from '../../utils/date-utils.js';
import { createElement } from '../../utils/dom-helper.js';

export class OrdersView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.orders = [];
  }

  /**
   * Render orders view
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
      id: 'orders-table-container'
    });
    this.container.appendChild(tableContainer);

    // Load orders
    await this.loadOrders();
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
      textContent: '➕ Create New Order'
    });

    createBtn.addEventListener('click', () => this.openCreateOrderModal());

    header.appendChild(createBtn);
    return header;
  }

  /**
   * Load orders from API
   */
  async loadOrders() {
    const spinner = LoadingSpinner.show({ text: 'Loading orders...' });

    try {
      const response = await apiClient.get('/api/orders');

      if (response.orders) {
        this.orders = response.orders;
        stateManager.set('orders', this.orders);
        this._renderTable();
      }

    } catch (error) {
      console.error('Error loading orders:', error);
      Toast.error('Failed to load orders: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  /**
   * Render orders table
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
          formatter: (value, row) => {
            if (row.status === 'delivered') {
              return 'Delivered';
            }
            return this._getCountdownDisplay(value);
          }
        },
        {
          key: 'created_at',
          label: 'Date',
          sortable: true,
          formatter: formatDate
        }
      ],
      data: this.orders,
      sortable: true,
      filterable: true,
      pagination: true,
      pageSize: 20,
      rowClick: (order) => {
        // Navigate to order detail
        window.location.href = `/order-detail.html?id=${order.order_id}&admin=1`;
      },
      actions: (order) => [
        {
          label: 'View',
          className: 'btn btn-sm btn-primary',
          icon: 'icon-eye',
          onClick: (order) => {
            window.location.href = `/order-detail.html?id=${order.order_id}&admin=1`;
          }
        },
        {
          label: 'Delete',
          className: 'btn btn-sm btn-danger',
          icon: 'icon-trash',
          onClick: (order) => this.deleteOrder(order)
        }
      ]
    });

    this.table.render('#orders-table-container');
  }

  /**
   * Get countdown display
   */
  _getCountdownDisplay(deadline) {
    if (!deadline) return 'N/A';

    const now = new Date();
    const target = new Date(deadline);
    const diffMs = target - now;

    if (diffMs <= 0) {
      return '<span class="text-danger">Expired</span>';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  /**
   * Open create order modal
   */
  async openCreateOrderModal() {
    // Load products for dropdown
    let products = [];
    try {
      const response = await apiClient.get('/api/products/list');
      products = response.products || [];
    } catch (error) {
      Toast.error('Failed to load products');
      return;
    }

    if (products.length === 0) {
      Toast.warning('No products available. Please create a product first.');
      return;
    }

    // Show form modal
    FormModal.prompt({
      title: '➕ Create New Order',
      size: 'medium',
      fields: [
        {
          name: 'productId',
          label: 'Product',
          type: 'select',
          required: true,
          options: products.map(p => ({
            value: p.id,
            label: `${p.title} - $${p.sale_price || p.normal_price}`
          }))
        },
        {
          name: 'email',
          label: 'Customer Email',
          type: 'email',
          required: true,
          placeholder: 'customer@example.com'
        },
        {
          name: 'amount',
          label: 'Amount ($)',
          type: 'number',
          required: true,
          min: 0,
          step: 0.01
        },
        {
          name: 'deliveryTime',
          label: 'Delivery Time (minutes)',
          type: 'number',
          required: true,
          defaultValue: 60,
          min: 1
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'paid',
          options: [
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
            { value: 'delivered', label: 'Delivered' }
          ]
        },
        {
          name: 'notes',
          label: 'Notes (Optional)',
          type: 'textarea',
          rows: 3,
          placeholder: 'Any special requirements...'
        }
      ],
      onSubmit: async (formData) => {
        return this.createOrder(formData);
      }
    });
  }

  /**
   * Create new order
   */
  async createOrder(formData) {
    const spinner = LoadingSpinner.show({ text: 'Creating order...' });

    try {
      const response = await apiClient.post('/api/order/manual', formData);

      if (response.success) {
        Toast.success('Order created successfully!');
        await this.loadOrders(); // Reload orders
        return true;
      } else {
        throw new Error(response.error || 'Failed to create order');
      }

    } catch (error) {
      console.error('Error creating order:', error);
      Toast.error('Failed to create order: ' + error.message);
      return false; // Keep modal open

    } finally {
      spinner.hide();
    }
  }

  /**
   * Delete order
   */
  async deleteOrder(order) {
    const confirmed = await ConfirmModal.delete(
      `Order #${order.order_id}`,
      async () => {
        const spinner = LoadingSpinner.show({ text: 'Deleting order...' });

        try {
          const response = await apiClient.post('/api/order/delete', {
            orderId: order.order_id
          });

          if (response.success) {
            Toast.success('Order deleted successfully!');
            await this.loadOrders(); // Reload orders
          } else {
            throw new Error(response.error || 'Failed to delete order');
          }

        } catch (error) {
          console.error('Error deleting order:', error);
          Toast.error('Failed to delete order: ' + error.message);

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

export default OrdersView;
