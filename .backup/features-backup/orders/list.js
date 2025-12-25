/**
 * Order list handlers.
 */

import { json } from '../../utils/response.js';

export async function getOrders(env) {
  const r = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const orders = (r.results || []).map(row => {
    let email = row.customer_email || '', amount = null, addons = [];
    try {
      if (row.encrypted_data && row.encrypted_data[0] === '{') {
        const d = JSON.parse(row.encrypted_data);
        email = email || d.email || '';
        amount = d.amount;
        addons = d.addons || [];
      }
    } catch (e) {
      console.error('Failed to parse order encrypted_data for order:', row.order_id, e.message);
    }
    return { ...row, email, amount, addons };
  });
  return json({ orders });
}
