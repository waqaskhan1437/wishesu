import { safeFetch } from '../../api/api.js';

export const OrdersAPI = {
  async list() {
    return safeFetch('/api/orders');
  }
};

