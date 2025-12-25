import { safeFetch } from '../api.js';

export const ProductAPI = {
  async list() {
    return safeFetch('/api/products');
  },
  async save(data) {
    return safeFetch('/api/product/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    });
  }
};
