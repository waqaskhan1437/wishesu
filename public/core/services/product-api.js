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
  },
  async remove(id) {
    return safeFetch(`/api/product/delete?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },
  async duplicate(id) {
    return safeFetch('/api/product/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  }
};
