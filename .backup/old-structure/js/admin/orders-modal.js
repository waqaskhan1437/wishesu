/**
 * Orders modal helpers.
 */

import { fetchOrderProducts } from './orders-api.js';

export async function openCreateOrderModal(deps) {
  const { apiClient, Toast, FormModal, onSubmit } = deps;

  let products = [];
  try {
    products = await fetchOrderProducts(apiClient);
  } catch (_) {
    Toast.error('Failed to load products');
    return;
  }

  if (products.length === 0) {
    Toast.warning('No products available. Please create a product first.');
    return;
  }

  FormModal.prompt({
    title: 'Create New Order',
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
    onSubmit: onSubmit
  });
}
