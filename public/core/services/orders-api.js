import { safeFetch } from '../api.js';

export const OrdersAPI = {
  async list() {
    return safeFetch('/api/orders');
  }
};
