/**
 * Orders View
 * Manages orders display and CRUD operations
 */

import apiClient from '../core/api-client.js';
import stateManager from '../core/state-manager.js';
import FormModal from '../components/form-modal.js';
import ConfirmModal from '../components/confirm-modal.js';
import Toast from '../components/toast-notification.js';
import LoadingSpinner from '../components/loading-spinner.js';
import { createTableContainer } from './shared-containers.js';
import { withSpinner } from './shared-spinner.js';
import { createOrdersHeader } from './orders-header.js';
import { getCountdownDisplay } from './orders-countdown.js';
import { createOrdersTable } from './orders-table.js';
import { openCreateOrderModal } from './orders-modal.js';
import { fetchOrders, createOrder, deleteOrder } from './orders-api.js';

export class OrdersView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.orders = [];
  }

  async render() {
    this.container.innerHTML = '';

    const header = createOrdersHeader(() => this.openCreateOrderModal());
    this.container.appendChild(header);

    const tableContainer = createTableContainer('orders-table-container');
    this.container.appendChild(tableContainer);

    await this.loadOrders();
  }

  async loadOrders() {
    await withSpinner('Loading orders...', async () => {
      try {
        this.orders = await fetchOrders(apiClient);
        stateManager.set('orders', this.orders);
        this._renderTable();
      } catch (error) {
        console.error('Error loading orders:', error);
        Toast.error('Failed to load orders: ' + error.message);
      }
    });
  }

  _renderTable() {
    if (this.table) {
      this.table.destroy();
    }

    const handlers = {
      getCountdownDisplay: getCountdownDisplay,
      onRowClick: (order) => {
        window.location.href = `/order-detail.html?id=${order.order_id}&admin=1`;
      },
      onDelete: (order) => this.deleteOrder(order)
    };

    this.table = createOrdersTable(this.orders, handlers);
    this.table.render('#orders-table-container');
  }

  async openCreateOrderModal() {
    await openCreateOrderModal({
      apiClient,
      Toast,
      FormModal,
      onSubmit: async (formData) => this.createOrder(formData)
    });
  }

  async createOrder(formData) {
    const spinner = LoadingSpinner.show({ text: 'Creating order...' });

    try {
      await createOrder(apiClient, formData);
      Toast.success('Order created successfully!');
      await this.loadOrders();
      return true;
    } catch (error) {
      console.error('Error creating order:', error);
      Toast.error('Failed to create order: ' + error.message);
      return false;
    } finally {
      spinner.hide();
    }
  }

  async deleteOrder(order) {
    await ConfirmModal.delete(
      `Order #${order.order_id}`,
      async () => {
        const spinner = LoadingSpinner.show({ text: 'Deleting order...' });

        try {
          await deleteOrder(apiClient, order.order_id);
          Toast.success('Order deleted successfully!');
          await this.loadOrders();
        } catch (error) {
          console.error('Error deleting order:', error);
          Toast.error('Failed to delete order: ' + error.message);
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

export default OrdersView;
